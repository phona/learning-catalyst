/**
 * Specialized Tutoring Agent
 *
 * A comprehensive tutoring agent that provides personalized guidance,
 * step-by-step support, and adaptive teaching. This agent acts as a
 * personal tutor that can adjust teaching methods based on student
 * performance and learning style.
 */

import { BaseLanguageModel } from '@langchain/core/language_models/base';
import { HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';
import { AgentExecutionRequest, AgentExecutionContext, AgentExecutionChunk } from '../types';
import { ToolExecutorService } from '../tool-executor';
import { ServiceDependencies } from '../types';

export interface TutoringSession {
  id: string;
  studentId: string;
  subject: string;
  topic: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  learningStyle: 'visual' | 'auditory' | 'kinesthetic' | 'reading';
  startTime: number;
  currentStep: number;
  totalSteps: number;
  objectives: string[];
  progress: {
    conceptsMastered: string[];
    skillsLearned: string[];
    problemsSolved: number;
    hintsGiven: number;
    timeSpent: number;
  };
  adaptations: {
    difficultyAdjustments: number;
    styleChanges: number;
    paceChanges: number;
  };
}

export interface TeachingStrategy {
  approach: 'socratic' | 'direct' | 'discovery' | 'collaborative' | 'demonstration';
  pace: 'slow' | 'moderate' | 'fast';
  interactivity: 'low' | 'medium' | 'high';
  scaffolding: number; // 0-10, level of support provided
  feedback: 'immediate' | 'delayed' | 'guided';
}

export interface TutoringStep {
  id: string;
  type: 'introduction' | 'explanation' | 'example' | 'practice' | 'assessment' | 'feedback' | 'next_step';
  title: string;
  content: string;
  examples?: string[];
  questions?: string[];
  hints?: string[];
  expectedOutcome: string;
  estimatedTime: number;
  difficulty: 'easy' | 'medium' | 'hard';
  resources?: Array<{
    type: 'visual' | 'text' | 'interactive' | 'practice';
    content: string;
    description: string;
  }>;
}

export interface TutoringAgentConfig {
  defaultTeachingStyle: 'socratic' | 'direct' | 'discovery';
  adaptiveness: 'high' | 'medium' | 'low';
  maxHintsPerStep: number;
  encourageSelfDiscovery: boolean;
  provideDetailedFeedback: boolean;
  trackProgress: boolean;
}

/**
 * Specialized Tutoring Agent
 */
export class TutoringAgent {
  private model: BaseLanguageModel;
  private toolExecutor: ToolExecutorService;
  private dependencies: ServiceDependencies;
  private config: TutoringAgentConfig;
  private activeSessions = new Map<string, TutoringSession>();

  constructor(
    model: BaseLanguageModel,
    toolExecutor: ToolExecutorService,
    dependencies: ServiceDependencies,
    config: TutoringAgentConfig
  ) {
    this.model = model;
    this.toolExecutor = toolExecutor;
    this.dependencies = dependencies;
    this.config = config;
  }

  /**
   * Execute tutoring agent
   */
  async *execute(
    request: AgentExecutionRequest,
    executionContext: AgentExecutionContext
  ): AsyncIterable<AgentExecutionChunk> {
    this.dependencies.logger.info(`Starting Tutoring Agent execution`, {
      executionId: executionContext.id,
      inputType: typeof request.input
    });

    try {
      // Parse tutoring request
      const tutoringRequest = await this.analyzeTutoringRequest(request.input);

      yield {
        type: 'progress',
        content: {
          phase: 'request_analyzed',
          message: `Tutoring request identified: ${tutoringRequest.type}`,
          request: tutoringRequest
        },
        timestamp: Date.now()
      };

      // Route to appropriate tutoring function
      switch (tutoringRequest.type) {
        case 'start_session':
          yield* this.startTutoringSession(request.input, tutoringRequest, executionContext);
          break;

        case 'continue_session':
          yield* this.continueTutoringSession(request.input, tutoringRequest, executionContext);
          break;

        case 'provide_guidance':
          yield* this.provideGuidance(request.input, tutoringRequest, executionContext);
          break;

        case 'explain_concept':
          yield* this.explainConcept(request.input, tutoringRequest, executionContext);
          break;

        case 'give_hint':
          yield* this.giveHint(request.input, tutoringRequest, executionContext);
          break;

        case 'assess_understanding':
          yield* this.assessUnderstanding(request.input, tutoringRequest, executionContext);
          break;

        default:
          yield* this.provideGeneralTutoringHelp(request.input, tutoringRequest, executionContext);
          break;
      }

    } catch (error) {
      this.dependencies.logger.error(`Tutoring Agent execution failed`, error as Error);
      throw error;
    }
  }

  /**
   * Analyze tutoring request to determine intent
   */
  private async analyzeTutoringRequest(input: any): Promise<{
    type: string;
    subject?: string;
    topic?: string;
    studentLevel?: string;
    learningStyle?: string;
    sessionId?: string;
    context: string;
  }> {
    const currentInput = typeof input === 'string' ? input : JSON.stringify(input);

    const requestPrompt = `You are a tutoring request analyzer. Analyze the user's request to determine what kind of tutoring help they need.

User request: ${currentInput}

Possible request types:
- start_session: User wants to start a new tutoring session
- continue_session: User wants to continue an existing session
- provide_guidance: User needs step-by-step guidance
- explain_concept: User needs a concept explained in detail
- give_hint: User needs a hint for a problem
- assess_understanding: User wants their understanding assessed
- general_help: General tutoring assistance

Response format:
{
  "type": "request_type",
  "subject": "subject_name_or_null",
  "topic": "topic_name_or_null",
  "studentLevel": "beginner|intermediate|advanced|null",
  "learningStyle": "visual|auditory|kinesthetic|reading|null",
  "sessionId": "session_id_or_null",
  "context": "Brief context of the tutoring request"
}`;

    const messages = [
      new SystemMessage("You are an expert at analyzing tutoring requests."),
      new HumanMessage(requestPrompt)
    ];

    try {
      const response = await this.model.invoke(messages);
      const content = response.content as string;

      let parsed;
      try {
        parsed = JSON.parse(content);
      } catch (parseError) {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        } else {
          // Default to general help if parsing fails
          return {
            type: 'general_help',
            context: currentInput
          };
        }
      }

      return {
        type: parsed.type || 'general_help',
        subject: parsed.subject,
        topic: parsed.topic,
        studentLevel: parsed.studentLevel,
        learningStyle: parsed.learningStyle,
        sessionId: parsed.sessionId,
        context: parsed.context || currentInput
      };

    } catch (error) {
      this.dependencies.logger.warn(`Tutoring request analysis failed`, error as Error);
      return {
        type: 'general_help',
        context: currentInput
      };
    }
  }

  /**
   * Start a new tutoring session
   */
  private async *startTutoringSession(
    input: any,
    tutoringRequest: any,
    executionContext: AgentExecutionContext
  ): AsyncIterable<AgentExecutionChunk> {
    const subject = tutoringRequest.subject || 'the subject';
    const topic = tutoringRequest.topic || 'the topic';
    const studentLevel = tutoringRequest.studentLevel || 'intermediate';
    const learningStyle = tutoringRequest.learningStyle || 'reading';

    yield {
      type: 'progress',
      content: { phase: 'planning', message: `Planning tutoring session for ${subject}...` },
      timestamp: Date.now()
    };

    // Create session plan
    const sessionPlan = await this.createSessionPlan(subject, topic, studentLevel, learningStyle, tutoringRequest.context);

    yield {
      type: 'progress',
      content: { phase: 'initializing', message: 'Initializing tutoring session...' },
      timestamp: Date.now()
    };

    // Create tutoring session
    const session: TutoringSession = {
      id: `session_${executionContext.id}`,
      studentId: input.studentId || 'anonymous',
      subject,
      topic,
      difficulty: studentLevel as 'beginner' | 'intermediate' | 'advanced',
      learningStyle: learningStyle as 'visual' | 'auditory' | 'kinesthetic' | 'reading',
      startTime: Date.now(),
      currentStep: 0,
      totalSteps: sessionPlan.steps.length,
      objectives: sessionPlan.objectives,
      progress: {
        conceptsMastered: [],
        skillsLearned: [],
        problemsSolved: 0,
        hintsGiven: 0,
        timeSpent: 0
      },
      adaptations: {
        difficultyAdjustments: 0,
        styleChanges: 0,
        paceChanges: 0
      }
    };

    this.activeSessions.set(session.id, session);

    yield {
      type: 'data',
        content: {
          type: 'session_started',
          session,
          plan: sessionPlan
        },
        timestamp: Date.now()
    };

    // Start with first step
    yield* this.executeTutoringStep(session, sessionPlan.steps[0], executionContext);
  }

  /**
   * Continue an existing tutoring session
   */
  private async *continueTutoringSession(
    input: any,
    tutoringRequest: any,
    executionContext: AgentExecutionContext
  ): AsyncIterable<AgentExecutionChunk> {
    const sessionId = input.sessionId || tutoringRequest.sessionId;

    if (!sessionId) {
      yield {
        type: 'error',
        content: {
          error: 'No session ID provided to continue session'
        },
        timestamp: Date.now()
      };
      return;
    }

    const session = this.activeSessions.get(sessionId);
    if (!session) {
      yield {
        type: 'error',
        content: {
          error: `Tutoring session ${sessionId} not found`
        },
        timestamp: Date.now()
      };
      return;
    }

    yield {
      type: 'progress',
      content: { phase: 'continuing', message: `Continuing tutoring session (Step ${session.currentStep + 1}/${session.totalSteps})` },
      timestamp: Date.now()
    };

    // Determine next step based on user input
    const nextStep = await this.determineNextStep(session, input);

    if (nextStep) {
      yield* this.executeTutoringStep(session, nextStep, executionContext);
    } else {
      // Session complete
      yield* this.completeSession(session, executionContext);
    }
  }

  /**
   * Provide step-by-step guidance
   */
  private async *provideGuidance(
    input: any,
    tutoringRequest: any,
    executionContext: AgentExecutionContext
  ): AsyncIterable<AgentExecutionChunk> {
    yield {
      type: 'progress',
      content: { phase: 'guiding', message: 'Providing step-by-step guidance...' },
      timestamp: Date.now()
    };

    const problem = input.problem || input.question || tutoringRequest.context;

    const guidancePrompt = `You are an expert tutor providing step-by-step guidance. Break down the problem into clear, manageable steps.

Problem: ${problem}
Student level: ${tutoringRequest.studentLevel || 'intermediate'}
Learning style: ${tutoringRequest.learningStyle || 'reading'}

Provide guidance that:
1. Breaks the problem into logical steps
2. Explains the reasoning behind each step
3. Uses ${tutoringRequest.learningStyle || 'reading'} learning style approaches
4. Encourages active participation
5. Provides hints rather than complete solutions
6. Asks guiding questions to promote understanding
7. Checks for understanding at key points

Format your response as structured, encouraging guidance that promotes learning.`;

    const messages = [
      new SystemMessage("You are an expert tutor providing step-by-step guidance."),
      new HumanMessage(guidancePrompt)
    ];

    try {
      const response = await this.model.invoke(messages);

      yield {
        type: 'data',
        content: {
          type: 'guidance_provided',
          guidance: response.content,
          steps: this.extractSteps(response.content),
          questions: this.extractQuestions(response.content)
        },
        timestamp: Date.now()
      };

    } catch (error) {
      yield {
        type: 'error',
        content: {
          error: `Failed to provide guidance: ${(error as Error).message}`
        },
        timestamp: Date.now()
      };
    }
  }

  /**
   * Explain a concept in detail
   */
  private async *explainConcept(
    input: any,
    tutoringRequest: any,
    executionContext: AgentExecutionContext
  ): AsyncIterable<AgentExecutionChunk> {
    const concept = input.concept || tutoringRequest.topic || 'the concept';
    const studentLevel = tutoringRequest.studentLevel || 'intermediate';
    const learningStyle = tutoringRequest.learningStyle || 'reading';

    yield {
      type: 'progress',
      content: { phase: 'explaining', message: `Explaining ${concept} in detail...` },
      timestamp: Date.now()
    };

    const explanationPrompt = `You are an expert tutor explaining concepts. Provide a comprehensive explanation of "${concept}".

Concept: ${concept}
Student level: ${studentLevel}
Learning style: ${learningStyle}
Context: ${tutoringRequest.context}

Provide an explanation that:
1. Starts with a simple, clear definition
2. Builds complexity progressively
3. Uses relatable examples and analogies
4. Addresses common misconceptions
5. Connects to related concepts
6. Uses ${learningStyle} learning approaches
7. Includes checking for understanding questions
8. Provides ways to practice or apply the concept

Make the explanation interactive and engaging.`;

    const messages = [
      new SystemMessage("You are an expert tutor specializing in concept explanation."),
      new HumanMessage(explanationPrompt)
    ];

    try {
      const response = await this.model.invoke(messages);

      yield {
        type: 'data',
        content: {
          type: 'concept_explained',
          explanation: response.content,
          concept,
          examples: this.extractExamples(response.content),
          analogies: this.extractAnalogies(response.content),
          questions: this.extractQuestions(response.content)
        },
        timestamp: Date.now()
      };

    } catch (error) {
      yield {
        type: 'error',
        content: {
          error: `Failed to explain concept: ${(error as Error).message}`
        },
        timestamp: Date.now()
      };
    }
  }

  /**
   * Give a hint to help the student
   */
  private async *giveHint(
    input: any,
    tutoringRequest: any,
    executionContext: AgentExecutionContext
  ): AsyncIterable<AgentExecutionChunk> {
    const problem = input.problem || input.question;
    const sessionId = input.sessionId;

    if (!sessionId) {
      yield {
        type: 'error',
        content: {
          error: 'No session ID provided for hint'
        },
        timestamp: Date.now()
      };
      return;
    }

    const session = this.activeSessions.get(sessionId);
    if (session) {
      session.progress.hintsGiven++;
    }

    yield {
      type: 'progress',
      content: { phase: 'hinting', message: 'Providing helpful hint...' },
      timestamp: Date.now()
    };

    const hintPrompt = `You are a helpful tutor providing hints, not answers. Give a strategic hint that helps the student solve the problem themselves.

Problem: ${problem}
Hints already given: ${session?.progress.hintsGiven || 0}
Max hints allowed: ${this.config.maxHintsPerStep}

Provide a hint that:
1. Points in the right direction without giving away the answer
2. Asks a guiding question to stimulate thinking
3. Suggests a strategy or approach
4. References a relevant concept or technique
5. Encourages the student to think through the problem
6. Is appropriate for ${tutoringRequest.studentLevel || 'intermediate'} level

Make the hint thought-provoking and educational.`;

    const messages = [
      new SystemMessage("You are an expert tutor providing strategic hints."),
      new HumanMessage(hintPrompt)
    ];

    try {
      const response = await this.model.invoke(messages);

      yield {
        type: 'data',
        content: {
          type: 'hint_given',
          hint: response.content,
          question: this.extractMainQuestion(response.content),
          strategy: this.extractStrategy(response.content)
        },
        timestamp: Date.now()
      };

    } catch (error) {
      yield {
        type: 'error',
        content: {
          error: `Failed to provide hint: ${(error as Error).message}`
        },
        timestamp: Date.now()
      };
    }
  }

  /**
   * Assess student understanding
   */
  private async *assessUnderstanding(
    input: any,
    tutoringRequest: any,
    executionContext: AgentExecutionContext
  ): AsyncIterable<AgentExecutionChunk> {
    const topic = input.topic || tutoringRequest.topic;
    const studentAnswer = input.answer || input.response;

    yield {
      type: 'progress',
      content: { phase: 'assessing', message: 'Assessing understanding and providing feedback...' },
      timestamp: Date.now()
    };

    const assessmentPrompt = `You are an expert tutor assessing student understanding.

Topic: ${topic}
Student's response: ${studentAnswer}
Context: ${tutoringRequest.context}

Assess the understanding and provide feedback that:
1. Evaluates the correctness and completeness of the answer
2. Identifies what the student understands well
3. Pinpoints areas of confusion or misunderstanding
4. Provides constructive feedback for improvement
5. Suggests next steps for deeper learning
6. Is encouraging and supportive
7. Includes specific examples if needed

Make the assessment educational and motivating.`;

    const messages = [
      new SystemMessage("You are an expert tutor providing understanding assessment."),
      new HumanMessage(assessmentPrompt)
    ];

    try {
      const response = await this.model.invoke(messages);

      yield {
        type: 'data',
        content: {
          type: 'understanding_assessed',
          assessment: response.content,
          strengths: this.extractStrengths(response.content),
          improvements: this.extractImprovements(response.content),
          nextSteps: this.extractNextSteps(response.content)
        },
        timestamp: Date.now()
      };

    } catch (error) {
      yield {
        type: 'error',
        content: {
          error: `Failed to assess understanding: ${(error as Error).message}`
        },
        timestamp: Date.now()
      };
    }
  }

  /**
   * Provide general tutoring help
   */
  private async *provideGeneralTutoringHelp(
    input: any,
    tutoringRequest: any,
    executionContext: AgentExecutionContext
  ): AsyncIterable<AgentExecutionChunk> {
    yield {
      type: 'progress',
      content: { phase: 'general_help', message: 'Providing general tutoring assistance...' },
      timestamp: Date.now()
    };

    const helpPrompt = `You are a helpful tutoring assistant. The user needs general tutoring help.

Learning context: ${tutoringRequest.context}
Subject of interest: ${tutoringRequest.subject || 'general'}

Provide helpful tutoring assistance that:
1. Addresses their specific needs
2. Offers educational guidance
3. Suggests effective learning strategies
4. Is encouraging and supportive
5. Provides actionable recommendations
6. Is appropriate for ${tutoringRequest.studentLevel || 'intermediate'} level
7. Considers their ${tutoringRequest.learningStyle || 'reading'} learning style

Format your response as helpful, encouraging, and educational advice.`;

    const messages = [
      new SystemMessage("You are a helpful AI tutoring assistant."),
      new HumanMessage(helpPrompt)
    ];

    try {
      const response = await this.model.invoke(messages);

      yield {
        type: 'data',
        content: {
          type: 'general_help',
          response: response.content,
          suggestions: this.extractSuggestions(response.content)
        },
        timestamp: Date.now()
      };

    } catch (error) {
      yield {
        type: 'error',
        content: {
          error: `Failed to provide general tutoring help: ${(error as Error).message}`
        },
        timestamp: Date.now()
      };
    }
  }

  /**
   * Create session plan
   */
  private async createSessionPlan(
    subject: string,
    topic: string,
    studentLevel: string,
    learningStyle: string,
    context: string
  ): Promise<{ objectives: string[]; steps: TutoringStep[] }> {
    const planPrompt = `You are an expert tutor planning a tutoring session.

Subject: ${subject}
Topic: ${topic}
Student level: ${studentLevel}
Learning style: ${learningStyle}
Context: ${context}

Create a tutoring session plan that includes:
1. Clear learning objectives (3-5 objectives)
2. Logical progression of steps (5-8 steps)
3. Mix of teaching methods appropriate for the learning style
4. Assessment points to check understanding
5. Estimated time for each step

Format your response as:
{
  "objectives": ["Objective 1", "Objective 2", "Objective 3"],
  "steps": [
    {
      "type": "introduction|explanation|example|practice|assessment|feedback|next_step",
      "title": "Step Title",
      "content": "Step content",
      "examples": ["Example 1"],
      "questions": ["Question 1"],
      "expectedOutcome": "What should be achieved",
      "estimatedTime": 10,
      "difficulty": "easy|medium|hard"
    }
  ]
}`;

    const messages = [
      new SystemMessage("You are an expert tutor planning educational sessions."),
      new HumanMessage(planPrompt)
    ];

    try {
      const response = await this.model.invoke(messages);
      return JSON.parse(response.content as string);
    } catch (error) {
      // Fallback plan
      return {
        objectives: [`Understand ${topic}`, `Apply ${topic} concepts`, `Practice ${topic} skills`],
        steps: [{
          id: 'step_1',
          type: 'introduction',
          title: `Introduction to ${topic}`,
          content: `Let's start learning about ${topic}`,
          expectedOutcome: 'Basic understanding',
          estimatedTime: 10,
          difficulty: 'easy'
        }]
      };
    }
  }

  /**
   * Execute a tutoring step
   */
  private async *executeTutoringStep(
    session: TutoringSession,
    step: TutoringStep,
    executionContext: AgentExecutionContext
  ): AsyncIterable<AgentExecutionChunk> {
    session.currentStep++;

    yield {
      type: 'step_start',
      content: {
        stepId: step.id,
        stepType: step.type,
        stepTitle: step.title,
        currentStep: session.currentStep,
        totalSteps: session.totalSteps
      },
      timestamp: Date.now()
    };

    // Execute step based on type
    const stepContent = await this.generateStepContent(session, step);

    yield {
      type: 'data',
      content: {
        type: 'step_content',
        step: {
          ...step,
          content: stepContent
        }
      },
      timestamp: Date.now()
    };

    // Check for understanding after explanation steps
    if (step.type === 'explanation' || step.type === 'example') {
      yield {
        type: 'understanding_check',
        content: {
          question: 'Do you understand this concept? Would you like me to explain it differently or provide an example?',
          type: 'understanding_check'
        },
        timestamp: Date.now()
      };
    }
  }

  /**
   * Generate content for a tutoring step
   */
  private async generateStepContent(session: TutoringSession, step: TutoringStep): Promise<string> {
    const contentPrompt = `You are a tutor generating content for a tutoring step.

Session context:
- Subject: ${session.subject}
- Topic: ${session.topic}
- Student level: ${session.difficulty}
- Learning style: ${session.learningStyle}
- Current step: ${step.title} (${step.type})

Step details:
- Type: ${step.type}
- Content: ${step.content}
- Expected outcome: ${step.expectedOutcome}
- Difficulty: ${step.difficulty}

Generate appropriate content for this step that:
1. Matches the student's level and learning style
2. Achieves the expected outcome
3. Is engaging and interactive
4. Uses appropriate teaching methods
5. Includes examples when beneficial

Provide clear, educational content.`;

    const messages = [
      new SystemMessage("You are an expert tutor generating educational content."),
      new HumanMessage(contentPrompt)
    ];

    try {
      const response = await this.model.invoke(messages);
      return response.content as string;
    } catch (error) {
      return step.content; // Fallback to original content
    }
  }

  /**
   * Determine next step based on user input
   */
  private async determineNextStep(session: TutoringSession, input: any): Promise<TutoringStep | null> {
    // In a real implementation, this would analyze user responses and progress
    // to determine the appropriate next step or if the session should end
    return null; // Session complete
  }

  /**
   * Complete tutoring session
   */
  private async *completeSession(
    session: TutoringSession,
    executionContext: AgentExecutionContext
  ): AsyncIterable<AgentExecutionChunk> {
    session.progress.timeSpent = Date.now() - session.startTime;

    yield {
      type: 'progress',
      content: { phase: 'completing', message: 'Completing tutoring session...' },
      timestamp: Date.now()
    };

    const completionPrompt = `You are a tutor completing a tutoring session.

Session summary:
- Subject: ${session.subject}
- Topic: ${session.topic}
- Duration: ${Math.round(session.progress.timeSpent / 60000)} minutes
- Steps completed: ${session.currentStep}/${session.totalSteps}
- Concepts mastered: ${session.progress.conceptsMastered.length}
- Skills learned: ${session.progress.skillsLearned.length}
- Problems solved: ${session.progress.problemsSolved}
- Hints given: ${session.progress.hintsGiven}

Provide a completion message that:
1. Summarizes what was accomplished
2. Highlights key achievements
3. Identifies next learning goals
4. Provides encouragement
5. Suggests resources for further practice
6. Is personalized and motivating

Make the completion message encouraging and inspiring.`;

    const messages = [
      new SystemMessage("You are an expert tutor providing session completion feedback."),
      new HumanMessage(completionPrompt)
    ];

    try {
      const response = await this.model.invoke(messages);

      yield {
        type: 'session_complete',
        content: {
          type: 'session_completed',
          sessionSummary: {
            duration: session.progress.timeSpent,
            stepsCompleted: session.currentStep,
            conceptsMastered: session.progress.conceptsMastered,
            skillsLearned: session.progress.skillsLearned,
            problemsSolved: session.progress.problemsSolved,
            adaptations: session.adaptations
          },
          completionMessage: response.content,
          recommendations: this.extractRecommendations(response.content),
          nextSteps: this.extractNextSteps(response.content)
        },
        timestamp: Date.now()
      };

    } catch (error) {
      yield {
        type: 'error',
        content: {
          error: `Failed to complete session: ${(error as Error).message}`
        },
        timestamp: Date.now()
      };
    }

    // Clean up session
    this.activeSessions.delete(session.id);
  }

  // Helper methods for text extraction
  private extractSteps(text: string): string[] {
    const pattern = /(?:Step|First|Second|Third|Next|Then):\s*([^\n]+)/gi;
    const steps = [];
    let match;
    while ((match = pattern.exec(text)) !== null) {
      steps.push(match[1].trim());
    }
    return steps;
  }

  private extractQuestions(text: string): string[] {
    const pattern = /(?:Question|Ask|Consider):?\s*([^\n\?]+)/gi;
    const questions = [];
    let match;
    while ((match = pattern.exec(text)) !== null) {
      questions.push(match[1].trim());
    }
    return questions;
  }

  private extractExamples(text: string): string[] {
    const pattern = /(?:Example|For instance|Like):?\s*([^\n]+)/gi;
    const examples = [];
    let match;
    while ((match = pattern.exec(text)) !== null) {
      examples.push(match[1].trim());
    }
    return examples;
  }

  private extractAnalogies(text: string): string[] {
    const pattern = /(?:Analogy|Like|Similar to):?\s*([^\n]+)/gi;
    const analogies = [];
    let match;
    while ((match = pattern.exec(text)) !== null) {
      analogies.push(match[1].trim());
    }
    return analogies;
  }

  private extractMainQuestion(text: string): string | null {
    const questionMatch = text.match(/.*\?(.*)/);
    return questionMatch ? questionMatch[1].trim() : null;
  }

  private extractStrategy(text: string): string | null {
    const strategyMatch = text.match(/strategy|approach|try|use:\s*([^\n]+)/i);
    return strategyMatch ? strategyMatch[1].trim() : null;
  }

  private extractStrengths(text: string): string[] {
    const pattern = /(?:Strength|Well done|Good|Excellent):?\s*([^\n]+)/gi;
    const strengths = [];
    let match;
    while ((match = pattern.exec(text)) !== null) {
      strengths.push(match[1].trim());
    }
    return strengths;
  }

  private extractImprovements(text: string): string[] {
    const pattern = /(?:Improvement|Work on|Focus on):?\s*([^\n]+)/gi;
    const improvements = [];
    let match;
    while ((match = pattern.exec(text)) !== null) {
      improvements.push(match[1].trim());
    }
    return improvements;
  }

  private extractNextSteps(text: string): string[] {
    const pattern = /(?:Next step|Then|After this):?\s*([^\n]+)/gi;
    const nextSteps = [];
    let match;
    while ((match = pattern.exec(text)) !== null) {
      nextSteps.push(match[1].trim());
    }
    return nextSteps;
  }

  private extractRecommendations(text: string): string[] {
    const pattern = /(?:Recommendation|Suggestion|Try|Consider):?\s*([^\n]+)/gi;
    const recommendations = [];
    let match;
    while ((match = pattern.exec(text)) !== null) {
      recommendations.push(match[1].trim());
    }
    return recommendations;
  }

  private extractSuggestions(text: string): string[] {
    const pattern = /(?:Suggestion|Consider|Try):?\s*([^\n]+)/gi;
    const suggestions = [];
    let match;
    while ((match = pattern.exec(text)) !== null) {
      suggestions.push(match[1].trim());
    }
    return suggestions;
  }

  /**
   * Get active tutoring session
   */
  getSession(sessionId: string): TutoringSession | undefined {
    return this.activeSessions.get(sessionId);
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<TutoringAgentConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get tutoring statistics
   */
  getTutoringStatistics(): {
    activeSessions: number;
    totalSessions: number;
    averageSessionDuration: number;
    mostCommonSubject: string;
    mostCommonLevel: string;
    averageAdaptations: number;
  } {
    const sessions = Array.from(this.activeSessions.values());

    return {
      activeSessions: sessions.length,
      totalSessions: sessions.length,
      averageSessionDuration: sessions.length > 0
        ? sessions.reduce((sum, s) => sum + (Date.now() - s.startTime), 0) / sessions.length / 60000
        : 0,
      mostCommonSubject: 'general', // Would calculate from actual data
      mostCommonLevel: 'intermediate',
      averageAdaptations: sessions.length > 0
        ? sessions.reduce((sum, s) => sum + (s.adaptations.difficultyAdjustments + s.adaptations.styleChanges + s.adaptations.paceChanges), 0) / sessions.length
        : 0
    };
  }
}

/**
 * Default tutoring agent configuration
 */
export const DEFAULT_TUTORING_AGENT_CONFIG: TutoringAgentConfig = {
  defaultTeachingStyle: 'socratic',
  adaptiveness: 'high',
  maxHintsPerStep: 3,
  encourageSelfDiscovery: true,
  provideDetailedFeedback: true,
  trackProgress: true
};