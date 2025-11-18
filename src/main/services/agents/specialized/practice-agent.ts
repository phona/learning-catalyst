/**
 * Specialized Practice Agent
 *
 * A comprehensive practice agent that generates exercises, problems,
 and hands-on activities for skill development. This agent creates
 * adaptive practice materials that adjust to user performance and
 * provide immediate feedback.
 */

import { BaseLanguageModel } from '@langchain/core/language_models/base';
import { HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';
import { AgentExecutionRequest, AgentExecutionContext, AgentExecutionChunk } from '../types';
import { ToolExecutorService } from '../tool-executor';
import { ServiceDependencies } from '../types';
import {
  VibeType,
  PracticeVibeResult,
  UserContext,
  ConversationContext,
  PracticeOpportunity,
  VibeDetectionConfig,
  PracticeSuggestionRequest,
  PracticeSuggestionResult,
  VIBE_TYPE_DESCRIPTIONS,
  DEFAULT_VIBE_DETECTION_CONFIG,
  PRACTICE_TEMPLATES,
  VibeDetectionRequest
} from '@/shared/types/practice';
import { contextualExerciseGenerator } from '../../practice/contextual-exercise-generator';
import { VibeDetector } from '../../analysis/vibe-detector';
import { NaturalPromptGenerator } from '../../practice/natural-prompt-generator';

export interface Exercise {
  id: string;
  title: string;
  description: string;
  type: 'multiple-choice' | 'short-answer' | 'coding' | 'practical' | 'simulation' | 'project';
  difficulty: 'easy' | 'medium' | 'hard';
  topic: string;
  subtopics: string[];
  instructions: string;
  problem: string;
  hints: string[];
  solution: {
    answer: string | string[];
    explanation: string;
    steps?: string[];
    code?: string;
  };
  timeLimit?: number; // minutes
  prerequisites: string[];
  learningObjectives: string[];
  estimatedTime: number;
}

export interface PracticeSession {
  id: string;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  exercises: Exercise[];
  adaptiveMode: boolean;
  startTime: number;
  endTime?: number;
  performance: {
    totalExercises: number;
    completedExercises: number;
    correctAnswers: number;
    averageTimePerExercise: number;
    difficultyProgression: number[];
  };
}

export interface SolutionValidation {
  exerciseId: string;
  userAnswer: any;
  isCorrect: boolean;
  feedback: string;
  detailedFeedback?: string;
  hints?: string[];
  nextExerciseId?: string;
  difficultyAdjustment: 'easier' | 'same' | 'harder';
}

export interface PracticeAgentConfig {
  defaultDifficulty: 'easy' | 'medium' | 'hard';
  adaptiveMode: boolean;
  maxHints: number;
  includeDetailedFeedback: boolean;
  timePressureMode: boolean;
  gamificationElements: boolean;
  vibeDetection: VibeDetectionConfig;
}

/**
 * Specialized Practice Agent
 */
export class PracticeAgent {
  private readonly model: BaseLanguageModel;
  private readonly toolExecutor: ToolExecutorService;
  private readonly dependencies: ServiceDependencies;
  private config: PracticeAgentConfig;
  private readonly activeSessions = new Map<string, PracticeSession>();
  private readonly vibeDetector: VibeDetector;

  private readonly naturalPromptGenerator: NaturalPromptGenerator;

  constructor(
    model: BaseLanguageModel,
    toolExecutor: ToolExecutorService,
    dependencies: ServiceDependencies,
    config: PracticeAgentConfig
  ) {
    this.model = model;
    this.toolExecutor = toolExecutor;
    this.dependencies = dependencies;
    this.config = config;
    this.vibeDetector = new VibeDetector(dependencies.logger, model);
    this.naturalPromptGenerator = new NaturalPromptGenerator(dependencies);
  }

  /**
   * Execute practice agent
   */
  async *execute(
    request: AgentExecutionRequest,
    executionContext: AgentExecutionContext
  ): AsyncIterable<AgentExecutionChunk> {
    this.dependencies.logger.info(`Starting Practice Agent execution`, {
      executionId: executionContext.id,
      inputType: typeof request.input
    });

    try {
      // Parse practice request
      const practiceRequest = await this.analyzePracticeRequest(request.input);

      yield {
        type: 'progress',
        content: {
          phase: 'request_analyzed',
          message: `Practice request identified: ${practiceRequest.type}`,
          request: practiceRequest
        },
        timestamp: Date.now()
      };

      // Route to appropriate practice function
      switch (practiceRequest.type) {
      case 'generate_exercise':
        yield* this.generateExercise(request.input, practiceRequest, executionContext);
        break;

      case 'create_session':
        yield* this.createPracticeSession(request.input, practiceRequest, executionContext);
        break;

      case 'validate_solution':
        yield* this.validateSolution(request.input, practiceRequest, executionContext);
        break;

      case 'provide_feedback':
        yield* this.provideFeedback(request.input, practiceRequest, executionContext);
        break;

      case 'adaptive_practice':
        yield* this.adaptivePractice(request.input, practiceRequest, executionContext);
        break;

      case 'detect_vibe':
        yield* this.detectPracticeVibe(request.input, practiceRequest, executionContext);
        break;

      case 'generate_suggestion':
        yield* this.generateNaturalPracticeSuggestion(request.input, practiceRequest, executionContext);
        break;

      case 'generate_contextual_exercise':
        yield* this.generateContextualExercise(request.input, practiceRequest, executionContext);
        break;

      default:
        yield* this.provideGeneralPracticeHelp(request.input, practiceRequest, executionContext);
        break;
      }

    } catch (error) {
      this.dependencies.logger.error(`Practice Agent execution failed`, error as Error);
      throw error;
    }
  }

  /**
   * Analyze practice request to determine intent
   */
  private async analyzePracticeRequest(input: any): Promise<{
    type: string;
    topic?: string;
    difficulty?: string;
    exerciseType?: string;
    context: string;
    userLevel?: string;
  }> {
    const currentInput = typeof input === 'string' ? input : JSON.stringify(input);

    const requestPrompt = `You are a practice request analyzer. Analyze the user's request to determine what kind of practice help they need.

User request: ${currentInput}

Possible request types:
- generate_exercise: User wants a specific exercise or problem
- create_session: User wants a series of exercises for practice
- validate_solution: User wants to check their solution to an exercise
- provide_feedback: User wants detailed feedback on their performance
- adaptive_practice: User wants adaptive practice that adjusts to their level
- general_help: General practice assistance

Response format:
{
  "type": "request_type",
  "topic": "topic_name_or_null",
  "difficulty": "easy|medium|hard|null",
  "exerciseType": "multiple-choice|coding|practical|null",
  "context": "Brief context of the practice request",
  "userLevel": "beginner|intermediate|advanced|null"
}`;

    const messages = [
      new SystemMessage("You are an expert at analyzing practice learning requests."),
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
        topic: parsed.topic,
        difficulty: parsed.difficulty,
        exerciseType: parsed.exerciseType,
        context: parsed.context || currentInput,
        userLevel: parsed.userLevel
      };

    } catch (error) {
      this.dependencies.logger.warn(`Practice request analysis failed`, error as Error);
      return {
        type: 'general_help',
        context: currentInput
      };
    }
  }

  /**
   * Generate a single exercise
   */
  private async *generateExercise(
    input: any,
    practiceRequest: any,
    executionContext: AgentExecutionContext
  ): AsyncIterable<AgentExecutionChunk> {
    const topic = practiceRequest.topic || 'the topic';
    const difficulty = practiceRequest.difficulty || this.config.defaultDifficulty;
    const exerciseType = practiceRequest.exerciseType || 'multiple-choice';

    // Check if we should use natural language approach
    const useNaturalLanguage = practiceRequest.useNaturalLanguage ||
      practiceRequest.type === 'generate_natural_challenge' ||
      practiceRequest.format === 'natural';

    yield {
      type: 'progress',
      content: {
        phase: 'generating',
        message: useNaturalLanguage
          ? `Generating natural practice challenge for ${topic}...`
          : `Generating ${exerciseType} exercise for ${topic}...`
      },
      timestamp: Date.now()
    };

    // Get existing exercises for context
    let existingExercises = [];
    try {
      const searchResult = await this.toolExecutor.executeTool({
        toolId: 'searchSessions',
        method: 'execute',
        parameters: {
          query: `${topic} exercises ${difficulty}`,
          limit: 5
        },
        context: {
          id: `practice_${Date.now()}`,
          sessionId: executionContext.sessionId,
          requestId: `search_${Date.now()}`,
          timestamp: Date.now(),
          operation: 'tool_call',
          metadata: {}
        }
      });

      if (searchResult.success) {
        existingExercises = searchResult.result;
      }
    } catch (error) {
      this.dependencies.logger.warn(`Exercise search failed`, error);
    }

    if (useNaturalLanguage) {
      // Generate natural language practice challenge
      yield {
        type: 'progress',
        content: { phase: 'creating', message: 'Creating natural language practice challenge...' },
        timestamp: Date.now()
      };

      const naturalPrompt = `You are an expert learning guide. Create a natural, conversational practice suggestion that feels like a continuation of the conversation.

Topic: ${topic}
Difficulty: ${difficulty}
Current conversation context: ${practiceRequest.context}
User level: ${practiceRequest.userLevel || 'intermediate'}
User project context: ${practiceRequest.userProjectContext || 'None specified'}

Instead of creating a structured exercise, provide a natural language challenge that:
1. Feels like a natural continuation of the current conversation
2. Uses conversational language rather than formal exercise format
3. References the user's current project/context when possible
4. Includes encouragement and motivation
5. Provides clear but casual instructions
6. Suggests a realistic timeframe based on difficulty

Format your response as:
{
  "naturalPrompt": "Natural, conversational practice suggestion",
  "instructions": "Casual instructions on how to approach the challenge",
  "timeEstimate": "Estimated time in minutes",
  "encouragement": "Motivational message to inspire the user"
}

Example of natural format:
- "Since you're working on that todo app, how about making one of your items actually toggle between complete and incomplete?"
- "Now that you understand hooks, try implementing a counter component in your project."
- "Why not take the useEffect you just learned and apply it to the data fetching in your component?"`;

      const messages = [
        new SystemMessage("You are an expert learning guide creating natural, conversational practice challenges."),
        new HumanMessage(naturalPrompt)
      ];

      try {
        const response = await this.model.invoke(messages);
        const content = response.content as string;

        let parsed;
        try {
          parsed = JSON.parse(content);
        } catch (parseError) {
          // If parsing fails, return the raw content as a natural prompt
          parsed = { naturalPrompt: content, instructions: '', timeEstimate: '10-15 mins', encouragement: '' };
        }

        // Create a natural exercise response
        const exercise = {
          id: `natural_exercise_${executionContext.id}`,
          title: `Natural Challenge: ${topic}`,
          description: parsed.naturalPrompt || `Natural practice challenge for ${topic}`,
          type: 'natural-challenge',
          difficulty: difficulty,
          topic: topic,
          subtopics: [],
          instructions: parsed.instructions || `Try this challenge: ${parsed.naturalPrompt}`,
          problem: parsed.naturalPrompt || content,
          hints: [],
          solution: {
            answer: 'Completed based on natural challenge',
            explanation: parsed.encouragement || 'Great job tackling this natural challenge!',
            steps: [],
            code: ''
          },
          timeLimit: parsed.timeEstimate ? Math.min(60, Math.max(5, parseInt(parsed.timeEstimate) || 15)) : 15,
          prerequisites: [],
          learningObjectives: [`${topic} practical application`],
          estimatedTime: parsed.timeEstimate ? parseInt(parsed.timeEstimate) || 15 : 15
        };

        yield {
          type: 'data',
          content: {
            type: 'exercise_generated',
            exercise,
            metadata: { format: 'natural-language' }
          },
          timestamp: Date.now()
        };

      } catch (error) {
        this.dependencies.logger.error('Natural exercise generation failed', error as Error);

        // Fallback: Generate using the original method
        const fallbackResult = await this.fallbackGenerateExercise(topic, difficulty, exerciseType, practiceRequest, executionContext);
        yield* fallbackResult;
      }

      return;
    } else {
      // Original structured exercise generation
      yield {
        type: 'progress',
        content: { phase: 'creating', message: 'Creating detailed exercise with solution...' },
        timestamp: Date.now()
      };

      const exercisePrompt = `You are an expert educational content creator. Generate a high-quality practice exercise.

Topic: ${topic}
Difficulty: ${difficulty}
Exercise Type: ${exerciseType}
Learning context: ${practiceRequest.context}
User level: ${practiceRequest.userLevel || 'intermediate'}
Existing exercises for reference: ${JSON.stringify(existingExercises)}

Create an exercise that:
1. Tests understanding of key concepts
2. Is appropriate for the difficulty level
3. Has clear instructions and expectations
4. Includes meaningful hints if needed
5. Has a comprehensive solution with detailed explanation
6. Provides learning objectives
7. Estimates reasonable completion time

Format your response as:
{
  "title": "Exercise Title",
  "description": "Brief description of what this exercise tests",
  "type": "${exerciseType}",
  "difficulty": "${difficulty}",
  "topic": "${topic}",
  "subtopics": ["subtopic1", "subtopic2"],
  "instructions": "Clear step-by-step instructions",
  "problem": "The actual problem or question",
  "hints": ["Hint 1", "Hint 2"],
  "solution": {
    "answer": "Correct answer(s)",
    "explanation": "Detailed explanation of the solution",
    "steps": ["Step 1", "Step 2", "Step 3"],
    "code": "Relevant code snippets if applicable"
  },
  "timeLimit": 15,
  "prerequisites": ["Prerequisite 1"],
  "learningObjectives": ["Objective 1", "Objective 2"],
  "estimatedTime": 20
}`;

      const messages = [
        new SystemMessage("You are an expert educational exercise creator."),
        new HumanMessage(exercisePrompt)
      ];

      try {
        const response = await this.model.invoke(messages);
        const content = response.content as string;

        let exercise: Exercise;
        try {
          const parsed = JSON.parse(content);
          exercise = {
            id: `exercise_${executionContext.id}`,
            title: parsed.title || `Exercise: ${topic}`,
            description: parsed.description || 'Practice exercise',
            type: parsed.type || exerciseType,
            difficulty: parsed.difficulty || difficulty,
            topic: parsed.topic || topic,
            subtopics: parsed.subtopics || [],
            instructions: parsed.instructions || 'Complete the following exercise',
            problem: parsed.problem || content,
            hints: parsed.hints || [],
            solution: {
              answer: parsed.solution?.answer || 'See explanation',
              explanation: parsed.solution?.explanation || 'Solution explanation',
              steps: parsed.solution?.steps,
              code: parsed.solution?.code
            },
            timeLimit: parsed.timeLimit,
            prerequisites: parsed.prerequisites || [],
            learningObjectives: parsed.learningObjectives || [],
            estimatedTime: parsed.estimatedTime || 20
          };
        } catch (parseError) {
          // Fallback exercise
          exercise = {
            id: `exercise_${executionContext.id}`,
            title: `Exercise: ${topic}`,
            description: 'Practice exercise',
            type: exerciseType,
            difficulty,
            topic,
            subtopics: [],
            instructions: 'Complete the following exercise',
            problem: content,
            hints: [],
            solution: {
              answer: 'See explanation below',
              explanation: content
            },
            prerequisites: [],
            learningObjectives: [],
            estimatedTime: 20
          };
        }

        yield {
          type: 'data',
          content: {
            type: 'exercise_generated',
            exercise
          },
          timestamp: Date.now()
        };

      } catch (error) {
        yield {
          type: 'error',
          content: {
            error: `Failed to generate exercise: ${(error as Error).message}`
          },
          timestamp: Date.now()
        };
      }
    }
  }

  /**
   * Create a practice session with multiple exercises
   */
  private async *createPracticeSession(
    input: any,
    practiceRequest: any,
    executionContext: AgentExecutionContext
  ): AsyncIterable<AgentExecutionChunk> {
    const topic = practiceRequest.topic || 'the topic';
    const difficulty = practiceRequest.difficulty || this.config.defaultDifficulty;
    const sessionId = `session_${executionContext.id}`;

    yield {
      type: 'progress',
      content: { phase: 'planning_session', message: `Planning practice session for ${topic}...` },
      timestamp: Date.now()
    };

    const sessionPrompt = `You are an expert practice session designer. Create a comprehensive practice session plan.

Topic: ${topic}
Difficulty: ${difficulty}
Learning context: ${practiceRequest.context}
User level: ${practiceRequest.userLevel || 'intermediate'}
Adaptive mode: ${this.config.adaptiveMode}

Plan a practice session that includes:
1. Progressive difficulty (start easier, build up)
2. Variety of exercise types
3. Clear learning objectives
4. Appropriate number of exercises (5-10)
5. Estimated total duration (30-90 minutes)
6. Assessment points to check progress
7. Breakdown by subtopics

Format your response as:
{
  "title": "Session Title",
  "description": "Session description",
  "objectives": ["Objective 1", "Objective 2"],
  "difficulty": "${difficulty}",
  "estimatedDuration": 45,
  "exerciseTypes": ["multiple-choice", "coding", "practical"],
  "subtopics": ["subtopic1", "subtopic2"],
  "structure": [
    {
      "phase": "warmup",
      "exercises": 2,
      "difficulty": "easy",
      "duration": 10
    },
    {
      "phase": "main",
      "exercises": 4,
      "difficulty": "medium",
      "duration": 25
    },
    {
      "phase": "challenge",
      "exercises": 2,
      "difficulty": "hard",
      "duration": 10
    }
  ]
}`;

    const messages = [
      new SystemMessage("You are an expert practice session designer."),
      new HumanMessage(sessionPrompt)
    ];

    try {
      const response = await this.model.invoke(messages);
      const content = response.content as string;

      let sessionPlan;
      try {
        sessionPlan = JSON.parse(content);
      } catch (parseError) {
        // Fallback session plan
        sessionPlan = {
          title: `Practice Session: ${topic}`,
          description: content,
          objectives: [`Practice ${topic} skills`],
          difficulty,
          estimatedDuration: 45,
          exerciseTypes: ['multiple-choice'],
          subtopics: [topic],
          structure: [{
            phase: 'main',
            exercises: 5,
            difficulty,
            duration: 45
          }]
        };
      }

      yield {
        type: 'progress',
        content: { phase: 'generating_exercises', message: 'Generating exercises for the session...' },
        timestamp: Date.now()
      };

      // Generate exercises for the session
      const exercises: Exercise[] = [];
      for (const phase of sessionPlan.structure) {
        for (let i = 0; i < phase.exercises; i++) {
          const exerciseData = {
            input: {
              topic,
              context: `Part of ${sessionPlan.title} - ${phase.phase} phase`,
              exerciseType: sessionPlan.exerciseTypes[Math.floor(Math.random() * sessionPlan.exerciseTypes.length)],
              subtopics: sessionPlan.subtopics
            },
            type: 'generate_exercise',
            topic,
            difficulty: phase.difficulty,
            context: `Part of practice session - ${phase.phase}`
          };

          // Generate exercise
          const exerciseResult = await this.generateExercise(exerciseData, exerciseData, executionContext);
          let exercise: Exercise | null = null;

          for await (const chunk of exerciseResult) {
            if (chunk.type === 'data' && chunk.content.exercise) {
              exercise = chunk.content.exercise;
              break;
            }
          }

          if (exercise) {
            exercises.push(exercise);
          }
        }
      }

      // Create session object
      const session: PracticeSession = {
        id: sessionId,
        topic,
        difficulty,
        exercises,
        adaptiveMode: this.config.adaptiveMode,
        startTime: Date.now(),
        performance: {
          totalExercises: exercises.length,
          completedExercises: 0,
          correctAnswers: 0,
          averageTimePerExercise: 0,
          difficultyProgression: []
        }
      };

      this.activeSessions.set(sessionId, session);

      yield {
        type: 'data',
        content: {
          type: 'practice_session_created',
          session,
          plan: sessionPlan
        },
        timestamp: Date.now()
      };

    } catch (error) {
      yield {
        type: 'error',
        content: {
          error: `Failed to create practice session: ${(error as Error).message}`
        },
        timestamp: Date.now()
      };
    }
  }

  /**
   * Validate user's solution to an exercise
   */
  private async *validateSolution(
    input: any,
    practiceRequest: any,
    executionContext: AgentExecutionContext
  ): AsyncIterable<AgentExecutionChunk> {
    yield {
      type: 'progress',
      content: { phase: 'analyzing', message: 'Analyzing your solution...' },
      timestamp: Date.now()
    };

    // Extract exercise and solution from input
    const exerciseId = input.exerciseId || 'unknown';
    const userAnswer = input.userAnswer || input.answer || input.solution;
    const expectedAnswer = input.expectedAnswer || input.correctAnswer;

    if (!userAnswer) {
      yield {
        type: 'error',
        content: {
          error: 'No user answer provided for validation'
        },
        timestamp: Date.now()
      };
      return;
    }

    const validationPrompt = `You are an expert grader. Validate the user's solution to an exercise.

Exercise ID: ${exerciseId}
Expected answer: ${JSON.stringify(expectedAnswer)}
User's answer: ${JSON.stringify(userAnswer)}
Exercise context: ${practiceRequest.context}

Analyze the solution and provide:
1. Correct/incorrect assessment
2. Detailed feedback on what's right and what needs improvement
3. Hints for improvement if incorrect
4. Suggestion for next difficulty level (easier/same/harder)
5. Encouraging and constructive feedback

Format your response as:
{
  "isCorrect": true/false,
  "feedback": "Overall assessment feedback",
  "detailedFeedback": "Detailed analysis of the solution",
  "hints": ["Hint 1", "Hint 2"],
  "difficultyAdjustment": "easier|same|harder",
  "score": 0.85,
  "suggestions": ["Suggestion 1", "Suggestion 2"]
}`;

    const messages = [
      new SystemMessage("You are an expert educational grader providing constructive feedback."),
      new HumanMessage(validationPrompt)
    ];

    try {
      const response = await this.model.invoke(messages);
      const content = response.content as string;

      let validation: SolutionValidation;
      try {
        const parsed = JSON.parse(content);
        validation = {
          exerciseId,
          userAnswer,
          isCorrect: parsed.isCorrect || false,
          feedback: parsed.feedback || 'Solution processed',
          detailedFeedback: parsed.detailedFeedback,
          hints: parsed.hints || [],
          difficultyAdjustment: parsed.difficultyAdjustment || 'same'
        };
      } catch (parseError) {
        // Fallback validation
        validation = {
          exerciseId,
          userAnswer,
          isCorrect: content.toLowerCase().includes('correct'),
          feedback: content,
          difficultyAdjustment: 'same'
        };
      }

      yield {
        type: 'data',
        content: {
          type: 'solution_validated',
          validation
        },
        timestamp: Date.now()
      };

    } catch (error) {
      yield {
        type: 'error',
        content: {
          error: `Failed to validate solution: ${(error as Error).message}`
        },
        timestamp: Date.now()
      };
    }
  }

  /**
   * Provide detailed feedback on performance
   */
  private async *provideFeedback(
    input: any,
    practiceRequest: any,
    executionContext: AgentExecutionContext
  ): AsyncIterable<AgentExecutionChunk> {
    yield {
      type: 'progress',
      content: { phase: 'analyzing_performance', message: 'Analyzing performance and generating feedback...' },
      timestamp: Date.now()
    };

    const performance = input.performance || {};
    const sessionId = input.sessionId;

    const feedbackPrompt = `You are an expert learning coach. Provide detailed feedback based on the user's practice performance.

Performance data: ${JSON.stringify(performance)}
Session context: ${practiceRequest.context}
Session ID: ${sessionId}

Provide comprehensive feedback that includes:
1. Overall performance assessment
2. Strengths and accomplishments
3. Areas for improvement
4. Specific recommendations for next steps
5. Encouragement and motivation
6. Study strategies and techniques
7. Topics to review or practice further

Format your response as encouraging, specific, and actionable feedback.`;

    const messages = [
      new SystemMessage("You are an expert learning coach providing motivational and actionable feedback."),
      new HumanMessage(feedbackPrompt)
    ];

    try {
      const response = await this.model.invoke(messages);

      yield {
        type: 'data',
        content: {
          type: 'performance_feedback',
          feedback: response.content,
          recommendations: this.extractRecommendations(response.content),
          strengths: this.extractStrengths(response.content),
          improvements: this.extractImprovements(response.content)
        },
        timestamp: Date.now()
      };

    } catch (error) {
      yield {
        type: 'error',
        content: {
          error: `Failed to generate performance feedback: ${(error as Error).message}`
        },
        timestamp: Date.now()
      };
    }
  }

  /**
   * Adaptive practice that adjusts to user performance
   */
  private async *adaptivePractice(
    input: any,
    practiceRequest: any,
    executionContext: AgentExecutionContext
  ): AsyncIterable<AgentExecutionChunk> {
    const sessionId = input.sessionId || `adaptive_${executionContext.id}`;
    const performance = input.performance || {};

    yield {
      type: 'progress',
      content: { phase: 'analyzing_progress', message: 'Analyzing your progress and adapting practice...' },
      timestamp: Date.now()
    };

    const adaptationPrompt = `You are an adaptive learning system. Analyze the user's performance and recommend the next appropriate exercise.

Performance data: ${JSON.stringify(performance)}
Learning context: ${practiceRequest.context}
Session ID: ${sessionId}

Analyze the performance and determine:
1. Current skill level and mastery
2. Appropriate difficulty for next exercise
3. Topics that need more practice
4. Exercise types that would be most beneficial
5. Whether to move to new topics or reinforce current ones
6. Specific adaptations needed

Format your response as:
{
  "currentLevel": "beginner|intermediate|advanced",
  "recommendedDifficulty": "easy|medium|hard",
  "focusTopics": ["topic1", "topic2"],
  "recommendedExerciseType": "multiple-choice|coding|practical",
  "adaptationReason": "Why this adaptation is recommended",
  "nextSteps": ["Step 1", "Step 2"],
  "confidence": 0.85
}`;

    const messages = [
      new SystemMessage("You are an adaptive learning system that personalizes practice based on performance."),
      new HumanMessage(adaptationPrompt)
    ];

    try {
      const response = await this.model.invoke(messages);
      const content = response.content as string;

      let adaptation;
      try {
        adaptation = JSON.parse(content);
      } catch (parseError) {
        // Fallback adaptation
        adaptation = {
          currentLevel: 'intermediate',
          recommendedDifficulty: 'medium',
          focusTopics: practiceRequest.topic ? [practiceRequest.topic] : [],
          recommendedExerciseType: 'multiple-choice',
          adaptationReason: content,
          nextSteps: ['Continue practicing']
        };
      }

      // Generate adapted exercise
      yield {
        type: 'data',
        content: {
          type: 'adaptation_analysis',
          adaptation
        },
        timestamp: Date.now()
      };

      // Generate next exercise based on adaptation
      const exerciseInput = {
        input: {
          topic: adaptation.focusTopics[0] || practiceRequest.topic,
          context: `Adaptive practice based on performance`,
          exerciseType: adaptation.recommendedExerciseType
        },
        type: 'generate_exercise',
        topic: adaptation.focusTopics[0] || practiceRequest.topic,
        difficulty: adaptation.recommendedDifficulty,
        exerciseType: adaptation.recommendedExerciseType,
        context: `Adaptive exercise based on: ${adaptation.adaptationReason}`
      };

      yield* this.generateExercise(exerciseInput, exerciseInput, executionContext);

    } catch (error) {
      yield {
        type: 'error',
        content: {
          error: `Failed to generate adaptive practice: ${(error as Error).message}`
        },
        timestamp: Date.now()
      };
    }
  }

  /**
   * Provide general practice help
   */
  private async *provideGeneralPracticeHelp(
    input: any,
    practiceRequest: any,
    executionContext: AgentExecutionContext
  ): AsyncIterable<AgentExecutionChunk> {
    yield {
      type: 'progress',
      content: { phase: 'general_help', message: 'Providing general practice assistance...' },
      timestamp: Date.now()
    };

    const helpPrompt = `You are a helpful practice assistant. The user needs general practice help.

Learning context: ${practiceRequest.context}
Topics of interest: ${practiceRequest.topic || 'general'}

Provide helpful practice assistance that:
1. Addresses their specific needs
2. Offers practical advice for skill development
3. Suggests effective practice strategies
4. Is encouraging and supportive
5. Provides actionable recommendations
6. Is appropriate for ${this.config.defaultDifficulty} level

Format your response as helpful, encouraging, and actionable advice.`;

    const messages = [
      new SystemMessage("You are a helpful AI practice assistant."),
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
          error: `Failed to provide general practice help: ${(error as Error).message}`
        },
        timestamp: Date.now()
      };
    }
  }

  /**
   * Detect practice vibe from conversation context
   */
  private async *detectPracticeVibe(
    input: any,
    practiceRequest: any,
    executionContext: AgentExecutionContext
  ): AsyncIterable<AgentExecutionChunk> {
    yield {
      type: 'progress',
      content: { phase: 'detecting_vibe', message: 'Analyzing conversation for practice readiness...' },
      timestamp: Date.now()
    };

    try {
      const { conversationHistory, userContext, currentTopic } = input as PracticeSuggestionRequest;

      if (!conversationHistory || conversationHistory.length < this.config.vibeDetection.minMessagesForDetection) {
        yield {
          type: 'data',
          content: {
            type: 'vibe_detected',
            vibe: {
              vibe: 'understanding' as VibeType,
              confidence: 0.5,
              reasoning: 'Insufficient conversation history for accurate vibe detection',
              practiceReadiness: 0.3,
              suggestedTopics: currentTopic ? [currentTopic] : [],
              detectedFrom: ['insufficient_data'],
              timestamp: Date.now()
            },
            shouldSuggest: false
          },
          timestamp: Date.now()
        };
        return;
      }

      // Detect vibe using AI model
      const vibeResult = await this.detectVibeType(conversationHistory, userContext, currentTopic);

      // Determine if practice should be suggested
      const shouldSuggest = this.shouldSuggestPractice(vibeResult, userContext);

      // Extract practice ideas if vibe suggests readiness
      let practiceOpportunities: PracticeOpportunity[] = [];
      if (shouldSuggest && vibeResult.practiceReadiness > this.config.vibeDetection.practiceReadinessThreshold) {
        practiceOpportunities = await this.extractPracticeIdea(vibeResult, userContext, currentTopic);
      }

      yield {
        type: 'data',
        content: {
          type: 'vibe_detected',
          vibe: vibeResult,
          shouldSuggest,
          practiceOpportunities,
          analysis: {
            messagesAnalyzed: conversationHistory.length,
            confidenceScore: vibeResult.confidence,
            practiceReadiness: vibeResult.practiceReadiness,
            detectedTopics: vibeResult.suggestedTopics
          }
        },
        timestamp: Date.now()
      };

    } catch (error) {
      this.dependencies.logger.error(`Vibe detection failed`, error as Error);
      yield {
        type: 'error',
        content: {
          error: `Failed to detect practice vibe: ${(error as Error).message}`
        },
        timestamp: Date.now()
      };
    }
  }

  /**
   * Detect the type of vibe from conversation
   */
  private async detectVibeType(
    conversationHistory: Array<{ role: string; content: string; timestamp: number }>,
    userContext: UserContext,
    currentTopic?: string
  ): Promise<PracticeVibeResult> {
    // Create a proper VibeDetectionRequest
    const request: VibeDetectionRequest = {
      conversationHistory: conversationHistory.map(msg => ({
        ...msg,
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        concepts: [],
        sentiment: 0,
        confidence: 0.5
      })),
      userContext: {
        currentTopic: currentTopic,
        confidenceLevel: userContext.confidenceLevel,
        learningVelocity: userContext.learningVelocity,
        stuckPoints: userContext.stuckPoints,
        recentConcepts: userContext.recentConcepts.map(c => c.concept), // Simplified for now
        lastPracticeTime: userContext.lastPracticeTime
      },
      config: {
        minMessages: this.config.vibeDetection.minMessagesForDetection,
        confidenceThreshold: this.config.vibeDetection.confidenceThreshold,
        maxConversationAge: this.config.vibeDetection.maxConversationAge,
        contextWindow: this.config.vibeDetection.contextWindow
      }
    };

    try {
      // Use the VibeDetector for actual analysis
      const result = await this.vibeDetector.detectVibe(request);

      // Map the result to PracticeVibeResult format
      return {
        vibe: result.vibe,
        confidence: result.confidence,
        reasoning: result.reasoning,
        practiceReadiness: result.practiceReadiness,
        suggestedTopics: result.suggestedTopics,
        detectedFrom: result.detectedFrom,
        timestamp: result.timestamp
      };
    } catch (error) {
      this.dependencies.logger.warn(`Enhanced vibe detection failed, falling back to original method`, error);

      // Fallback to original method
      const recentMessages = conversationHistory.slice(-this.config.vibeDetection.contextWindow);
      const conversationText = recentMessages.map(m => `${m.role}: ${m.content}`).join('\n');

      const vibeDetectionPrompt = `You are an expert learning vibe detector. Analyze the conversation to detect the user's current learning state.

Conversation History (last ${recentMessages.length} messages):
${conversationText}

Current Topic: ${currentTopic || 'Not specified'}
User Confidence Level: ${userContext.confidenceLevel}
Recent Concepts: ${userContext.recentConcepts.map(c => c.concept).join(', ')}
Last Practice: ${userContext.lastPracticeTime ? new Date(userContext.lastPracticeTime).toLocaleString() : 'Never'}

Analyze the conversation and determine the user's learning vibe. Consider:
1. Language patterns and emotional indicators
2. Questions asked and understanding demonstrated
3. Recent successes or struggles
4. Engagement and motivation level
5. Readiness for practice application

Vibe Types:
- understanding: User shows comprehension and clarity
- confused: User expresses uncertainty or confusion
- breakthrough: User has sudden insight or "aha!" moment
- practicing: User is actively applying concepts
- misunderstanding: User demonstrates incorrect understanding

Provide your analysis as:
{
  "vibe": "vibe_type",
  "confidence": 0.85,
  "reasoning": "Detailed explanation of why this vibe was detected",
  "practiceReadiness": 0.8,
  "suggestedTopics": ["topic1", "topic2"],
  "detectedFrom": ["message1_content", "pattern_identified"],
  "keyIndicators": ["indicator1", "indicator2"]
}`;

      const messages = [
        new SystemMessage("You are an expert at detecting learning states and readiness for practice."),
        new HumanMessage(vibeDetectionPrompt)
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
            // Fallback to understanding vibe
            return {
              vibe: 'understanding' as VibeType,
              confidence: 0.5,
              reasoning: 'Unable to parse AI response, defaulting to understanding vibe',
              practiceReadiness: 0.6,
              suggestedTopics: currentTopic ? [currentTopic] : [],
              detectedFrom: ['fallback'],
              timestamp: Date.now()
            };
          }
        }

        return {
          vibe: parsed.vibe || 'understanding',
          confidence: Math.min(1, Math.max(0, parsed.confidence || 0.5)),
          reasoning: parsed.reasoning || 'Vibe detected based on conversation analysis',
          practiceReadiness: Math.min(1, Math.max(0, parsed.practiceReadiness || 0.5)),
          suggestedTopics: Array.isArray(parsed.suggestedTopics) ? parsed.suggestedTopics : (currentTopic ? [currentTopic] : []),
          detectedFrom: Array.isArray(parsed.detectedFrom) ? parsed.detectedFrom : ['ai_analysis'],
          timestamp: Date.now()
        };
      } catch (fallbackError) {
        this.dependencies.logger.warn(`Fallback vibe detection also failed`, fallbackError);
        return {
          vibe: 'understanding' as VibeType,
          confidence: 0.4,
          reasoning: 'Both enhanced and fallback vibe detection failed, using default understanding vibe',
          practiceReadiness: 0.5,
          suggestedTopics: currentTopic ? [currentTopic] : [],
          detectedFrom: ['fallback'],
          timestamp: Date.now()
        };
      }
    }
  }

  /**
   * Determine if practice should be suggested based on vibe and context
   */
  private shouldSuggestPractice(vibeResult: PracticeVibeResult, userContext: UserContext): boolean {
    const { vibe, confidence, practiceReadiness } = vibeResult;

    // Check if confidence meets threshold
    if (confidence < this.config.vibeDetection.confidenceThreshold) {
      return false;
    }

    // Check practice cooldown
    const now = Date.now();
    const timeSinceLastPractice = userContext.lastPracticeTime ? now - userContext.lastPracticeTime : Infinity;
    if (timeSinceLastPractice < this.config.vibeDetection.practiceCooldown) {
      return false;
    }

    // Check practice readiness threshold
    if (practiceReadiness < this.config.vibeDetection.practiceReadinessThreshold) {
      return false;
    }

    // Vibe-specific logic
    switch (vibe) {
    case 'understanding':
    case 'breakthrough':
      return true; // Good time to practice

    case 'practicing':
      return false; // Already practicing

    case 'confused':
      // Suggest practice only if user has some confidence and it might clarify understanding
      return userContext.confidenceLevel > 0.4 && practiceReadiness > 0.6;

    case 'misunderstanding':
      // Don't suggest practice if there's a fundamental misunderstanding
      return false;

    default:
      return false;
    }
  }

  /**
   * Extract practice ideas based on detected vibe and context
   */
  private async extractPracticeIdea(
    vibeResult: PracticeVibeResult,
    userContext: UserContext,
    currentTopic?: string
  ): Promise<PracticeOpportunity[]> {
    const practiceIdeaPrompt = `You are an expert practice opportunity creator. Generate contextual practice suggestions based on the user's learning state.

Detected Vibe: ${vibeResult.vibe}
Confidence: ${vibeResult.confidence}
Practice Readiness: ${vibeResult.practiceReadiness}
Suggested Topics: ${vibeResult.suggestedTopics.join(', ')}
Current Topic: ${currentTopic || 'Not specified'}

User Context:
- Current Project: ${userContext.currentProject?.name || 'None specified'}
- Confidence Level: ${userContext.confidenceLevel}
- Recent Concepts: ${userContext.recentConcepts.map(c => c.concept).join(', ')}
- Stuck Points: ${userContext.stuckPoints.join(', ')}
- User Preferences: Difficulty - ${userContext.preferences.difficultyPreference}, Style - ${userContext.preferences.feedbackStyle}

Generate 1-3 specific practice opportunities that:
1. Are appropriate for the detected vibe (${vibeResult.vibe})
2. Match the user's confidence level (${userContext.confidenceLevel})
3. Use the user's actual project context when available
4. Provide natural, conversational suggestions (not structured exercises)
5. Are realistic and actionable

For each opportunity, provide:
{
  "id": "unique_id",
  "type": "${vibeResult.vibe}",
  "concept": "specific_concept",
  "suggestedPractice": "natural language suggestion",
  "difficulty": "easy|medium|hard",
  "reasoning": "why this practice makes sense",
  "timing": "immediate|soon|later",
  "confidence": 0.8,
  "userProject": "user project if applicable",
  "naturalLanguagePrompt": "exact text to suggest to user",
  "prerequisites": ["prerequisite1"],
  "estimatedTime": 15,
  "successProbability": 0.7
}`;

    const messages = [
      new SystemMessage("You are an expert at creating natural, contextual practice opportunities."),
      new HumanMessage(practiceIdeaPrompt)
    ];

    try {
      const response = await this.model.invoke(messages);
      const content = response.content as string;

      let opportunities: PracticeOpportunity[] = [];

      // Try to parse as JSON array or individual objects
      try {
        const parsed = JSON.parse(content);
        opportunities = Array.isArray(parsed) ? parsed : [parsed];
      } catch (parseError) {
        // Extract individual JSON objects from the response
        const jsonMatches = content.match(/\{[\s\S]*?\}/g);
        if (jsonMatches) {
          opportunities = jsonMatches.map(match => JSON.parse(match));
        }
      }

      // Validate and filter opportunities
      return opportunities.slice(0, this.config.vibeDetection.maxPracticeOpportunities).map(opp => ({
        id: opp.id || `practice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: opp.type || vibeResult.vibe,
        concept: opp.concept || currentTopic || 'practice',
        suggestedPractice: opp.suggestedPractice || 'Try applying what you\'ve learned',
        difficulty: opp.difficulty || 'medium',
        reasoning: opp.reasoning || 'Practice based on current learning state',
        timing: opp.timing || 'immediate',
        confidence: Math.min(1, Math.max(0, opp.confidence || 0.7)),
        userProject: opp.userProject || userContext.currentProject?.name,
        naturalLanguagePrompt: opp.naturalLanguagePrompt || this.generateNaturalPrompt(vibeResult.vibe, opp.concept || currentTopic),
        prerequisites: Array.isArray(opp.prerequisites) ? opp.prerequisites : [],
        estimatedTime: opp.estimatedTime || 15,
        successProbability: Math.min(1, Math.max(0, opp.successProbability || 0.7))
      }));

    } catch (error) {
      this.dependencies.logger.warn(`Practice idea extraction failed, using fallback`, error);

      // Fallback practice opportunity
      return [{
        id: `fallback_${Date.now()}`,
        type: vibeResult.vibe,
        concept: currentTopic || 'practice',
        suggestedPractice: 'Try applying what you\'ve learned to a small exercise',
        difficulty: 'medium',
        reasoning: 'Fallback suggestion due to AI processing error',
        timing: 'immediate',
        confidence: 0.5,
        userProject: userContext.currentProject?.name,
        naturalLanguagePrompt: this.generateNaturalPrompt(vibeResult.vibe, currentTopic),
        prerequisites: [],
        estimatedTime: 15,
        successProbability: 0.6
      }];
    }
  }

  /**
   * Generate natural language prompt based on vibe
   */
  private generateNaturalPrompt(vibe: VibeType, concept?: string): string {
    // Create a mock PracticeVibeResult for the generator
    const vibeResult: PracticeVibeResult = {
      vibe,
      confidence: 0.7, // default confidence
      reasoning: `Natural prompt for ${vibe} vibe`,
      practiceReadiness: 0.7,
      suggestedTopics: concept ? [concept] : ['current topic'],
      detectedFrom: ['practice-agent'],
      timestamp: Date.now()
    };

    // Use the NaturalPromptGenerator to create the prompt
    try {
      return this.naturalPromptGenerator.generatePracticePrompt(
        vibeResult,
        {
          id: 'temp',
          sessionId: 'temp',
          currentTopic: concept,
          confidenceLevel: 0.5,
          learningVelocity: 1.0,
          stuckPoints: [],
          recentConcepts: [],
          practiceHistory: [],
          engagementLevel: 0.5,
          preferences: {
            practiceFrequency: 'medium',
            difficultyPreference: 'adaptive',
            feedbackStyle: 'encouraging'
          },
          statistics: {
            totalPracticeSessions: 0,
            successRate: 0,
            averageSessionLength: 0,
            preferredPracticeTimes: []
          }
        } as UserContext
      );
    } catch (error) {
      this.dependencies.logger.warn('Natural prompt generation failed, using fallback', error as Error);

      // Fallback to original logic if the generator fails
      const templates = PRACTICE_TEMPLATES[vibe];
      if (templates && templates.length > 0) {
        const template = templates[Math.floor(Math.random() * templates.length)];
        return template
          .replace('{concept}', concept || 'this concept')
          .replace('{practice_suggestion}', 'try a small practice exercise');
      }

      // Ultimate fallback templates
      const fallbacks = {
        understanding: `Great! Now that you understand ${concept || 'this'}, try applying it in practice.`,
        confused: `Let's clarify ${concept || 'this concept'} with some hands-on practice.`,
        breakthrough: `Excellent insight! Let's solidify that understanding of ${concept || 'this'} with practice.`,
        practicing: `Great work practicing ${concept || 'this'}! Here's a related challenge.`,
        misunderstanding: `Let's clear up that misunderstanding about ${concept || 'this'} with some practice.`
      };

      return fallbacks[vibe] || `Try practicing ${concept || 'this concept'}.`;
    }
  }

  /**
   * Extract recommendations from feedback text
   */
  private extractRecommendations(text: string): string[] {
    const recommendationPattern = /(?:Recommendation|Suggestion|Try):?\s*([^\n]+)/gi;
    const recommendations = [];
    let match;
    while ((match = recommendationPattern.exec(text)) !== null) {
      recommendations.push(match[1].trim());
    }
    return recommendations;
  }

  /**
   * Extract strengths from feedback text
   */
  private extractStrengths(text: string): string[] {
    const strengthPattern = /(?:Strength|Well done|Good):?\s*([^\n]+)/gi;
    const strengths = [];
    let match;
    while ((match = strengthPattern.exec(text)) !== null) {
      strengths.push(match[1].trim());
    }
    return strengths;
  }

  /**
   * Extract improvements from feedback text
   */
  private extractImprovements(text: string): string[] {
    const improvementPattern = /(?:Improvement|Work on|Focus on):?\s*([^\n]+)/gi;
    const improvements = [];
    let match;
    while ((match = improvementPattern.exec(text)) !== null) {
      improvements.push(match[1].trim());
    }
    return improvements;
  }

  /**
   * Extract suggestions from help text
   */
  private extractSuggestions(text: string): string[] {
    const suggestionPattern = /(?:Suggestion|Consider|Try):?\s*([^\n]+)/gi;
    const suggestions = [];
    let match;
    while ((match = suggestionPattern.exec(text)) !== null) {
      suggestions.push(match[1].trim());
    }
    return suggestions;
  }

  /**
   * Get active practice session
   */
  getSession(sessionId: string): PracticeSession | undefined {
    return this.activeSessions.get(sessionId);
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<PracticeAgentConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Generate natural practice suggestion
   */
  private async *generateNaturalPracticeSuggestion(
    input: any,
    practiceRequest: any,
    executionContext: AgentExecutionContext
  ): AsyncIterable<AgentExecutionChunk> {
    yield {
      type: 'progress',
      content: { phase: 'generating_suggestion', message: 'Creating natural practice suggestion...' },
      timestamp: Date.now()
    };

    try {
      const { opportunity, userContext } = input;

      if (!opportunity) {
        yield {
          type: 'error',
          content: {
            error: 'No opportunity provided for suggestion generation'
          },
          timestamp: Date.now()
        };
        return;
      }

      const suggestionPrompt = `You are an expert learning mentor who creates natural, conversational practice suggestions.

Practice Opportunity:
- Type: ${opportunity.type}
- Concept: ${opportunity.concept}
- Confidence: ${opportunity.confidence}
- Timing: ${opportunity.timing}
- Reasoning: ${opportunity.reasoning}
- Suggested Topics: ${opportunity.suggestedTopics.join(', ')}

User Context:
- Confidence Level: ${userContext?.confidenceLevel || 0.5}
- Learning Velocity: ${userContext?.learningVelocity || 1.0}
- Engagement Level: ${userContext?.engagementLevel || 0.5}
- Difficulty Preference: ${userContext?.preferences?.difficultyPreference || 'medium'}
- Feedback Style: ${userContext?.preferences?.feedbackStyle || 'encouraging'}

Create a natural practice suggestion that:
1. Feels like a conversational continuation, not a structured exercise
2. Matches the detected vibe (${opportunity.type})
3. Uses encouraging, natural language appropriate for the user's level
4. References the conversation context naturally
5. Provides a specific, actionable practice challenge
6. Includes estimated time and difficulty assessment
7. Offers clear options for accepting, declining, or postponing

Format your response as:
{
  "id": "suggestion_${Date.now()}",
  "type": "gentle-nudge|direct-suggestion|collaborative-invite|challenge",
  "introduction": "Natural opening line that continues the conversation",
  "challenge": "Specific practice challenge or suggestion",
  "context": "How this relates to what we were discussing",
  "estimatedTime": 15,
  "difficulty": "easy|medium|hard",
  "vibe": "${opportunity.type}",
  "timing": {
    "when": "right now|in a few minutes|when you're ready",
    "urgency": "low|medium|high"
  },
  "options": {
    "accept": "Natural way to say yes",
    "decline": "Natural way to say no",
    "postpone": "Natural way to say later"
  },
  "metadata": {
    "concept": "${opportunity.concept}",
    "relatedTopics": ["topic1", "topic2"],
    "prerequisites": ["prereq1"],
    "nextSteps": ["step1", "step2"]
  }
}`;

      const messages = [
        new SystemMessage("You are an expert learning mentor creating natural practice suggestions."),
        new HumanMessage(suggestionPrompt)
      ];

      const response = await this.model.invoke(messages);
      const content = response.content as string;

      let suggestion;
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          suggestion = JSON.parse(jsonMatch[0]);
        } else {
          // Fallback suggestion
          suggestion = this.createFallbackSuggestion(opportunity, userContext);
        }
      } catch (parseError) {
        this.dependencies.logger.warn(`Failed to parse suggestion JSON, using fallback`, parseError);
        suggestion = this.createFallbackSuggestion(opportunity, userContext);
      }

      // Ensure suggestion has required properties
      suggestion = {
        id: suggestion.id || `suggestion_${Date.now()}`,
        type: suggestion.type || 'gentle-nudge',
        introduction: suggestion.introduction || this.generateVibeBasedIntroduction(opportunity.type),
        challenge: suggestion.challenge || `Try applying ${opportunity.concept} in practice.`,
        context: suggestion.context || 'This builds on what we were discussing.',
        estimatedTime: suggestion.estimatedTime || 15,
        difficulty: suggestion.difficulty || userContext?.preferences?.difficultyPreference || 'medium',
        vibe: suggestion.vibe || opportunity.type,
        timing: suggestion.timing || { when: 'when you\'re ready', urgency: 'low' },
        options: suggestion.options || {
          accept: "Sure, let's practice!",
          decline: "Maybe later, thanks.",
          postpone: "In a few minutes?"
        },
        metadata: {
          concept: suggestion.metadata?.concept || opportunity.concept,
          relatedTopics: suggestion.metadata?.relatedTopics || opportunity.suggestedTopics,
          prerequisites: suggestion.metadata?.prerequisites || [],
          nextSteps: suggestion.metadata?.nextSteps || ['Practice', 'Apply', 'Review'],
          ...suggestion.metadata
        }
      };

      yield {
        type: 'data',
        content: {
          suggestion
        },
        timestamp: Date.now()
      };

    } catch (error) {
      this.dependencies.logger.error(`Failed to generate natural practice suggestion`, error as Error);
      yield {
        type: 'error',
        content: {
          error: `Failed to generate practice suggestion: ${(error as Error).message}`
        },
        timestamp: Date.now()
      };
    }
  }

  /**
   * Create fallback suggestion
   */
  private createFallbackSuggestion(opportunity: any, userContext?: any): any {
    return {
      id: `fallback_${Date.now()}`,
      type: 'gentle-nudge',
      introduction: this.generateVibeBasedIntroduction(opportunity.type),
      challenge: `Would you like to try a quick practice exercise with ${opportunity.concept}?`,
      context: 'This will help solidify your understanding.',
      estimatedTime: 15,
      difficulty: userContext?.preferences?.difficultyPreference || 'medium',
      vibe: opportunity.type,
      timing: {
        when: 'when you\'re ready',
        urgency: 'low'
      },
      options: {
        accept: "Yes, let's practice!",
        decline: "Maybe later",
        postpone: "In a few minutes?"
      },
      metadata: {
        concept: opportunity.concept,
        relatedTopics: opportunity.suggestedTopics || [],
        prerequisites: [],
        nextSteps: ['Practice', 'Apply', 'Review']
      }
    };
  }

  /**
   * Generate vibe-based introduction
   */
  private generateVibeBasedIntroduction(vibe: string): string {
    const introductions = {
      understanding: "Great! It looks like you're getting comfortable with this concept.",
      confused: "No worries - sometimes the best way to clear up confusion is through practice.",
      breakthrough: "Excellent breakthrough! Let's solidify that understanding.",
      practicing: "Perfect timing for building on what you're practicing.",
      misunderstanding: "Let's work through this with a practical exercise to clarify things."
    };

    return introductions[vibe as keyof typeof introductions] || introductions.understanding;
  }

  /**
   * Generate contextual exercise using the new contextual exercise generator
   */
  private async *generateContextualExercise(
    input: any,
    practiceRequest: any,
    executionContext: AgentExecutionContext
  ): AsyncIterable<AgentExecutionChunk> {
    yield {
      type: 'progress',
      content: { phase: 'analyzing_context', message: 'Analyzing context for exercise generation...' },
      timestamp: Date.now()
    };

    try {
      // Extract request information
      const {
        conversationId,
        userMessage,
        sessionId,
        currentTopic,
        userContext,
        conversationContext,
        preferences = {},
        requirements = {}
      } = input;

      yield {
        type: 'progress',
        content: { phase: 'generating', message: 'Generating contextual exercise...' },
        timestamp: Date.now()
      };

      // Build exercise generation request
      const exerciseRequest = {
        conversationId: conversationId || executionContext.id,
        userMessage,
        sessionId,
        currentTopic: currentTopic || practiceRequest.topic,
        userContext,
        conversationContext: {
          detectedVibe: conversationContext?.detectedVibe || 'understanding',
          keyConcepts: conversationContext?.keyConcepts || [currentTopic || 'programming'],
          practiceReadiness: conversationContext?.practiceReadiness || 0.7
        },
        preferences: {
          exerciseType: preferences.exerciseType || practiceRequest.exerciseType,
          difficulty: preferences.difficulty || practiceRequest.difficulty || this.config.defaultDifficulty,
          category: preferences.category,
          maxTime: preferences.maxTime,
          focusAreas: preferences.focusAreas || []
        },
        requirements: {
          practiceSpecificConcept: requirements.practiceSpecificConcept,
          avoidRepetition: requirements.avoidRepetition,
          buildOnRecentWork: requirements.buildOnRecentWork,
          incorporateProjectContext: requirements.incorporateProjectContext
        }
      };

      // Generate contextual exercise
      const result = await contextualExerciseGenerator.generateExercise(exerciseRequest);

      yield {
        type: 'progress',
        content: { phase: 'validating', message: 'Validating and finalizing exercise...' },
        timestamp: Date.now()
      };

      // Convert to standard exercise format
      const exercise: Exercise = {
        id: result.exercise.id,
        title: result.exercise.generatedExercise.title || `Contextual Exercise`,
        description: result.exercise.generatedExercise.description || 'Contextually generated practice exercise',
        type: result.exercise.generatedExercise.type || 'coding',
        difficulty: result.exercise.difficulty,
        topic: result.exercise.generatedExercise.topic || currentTopic || 'Practice',
        subtopics: result.exercise.generatedExercise.subtopics || [],
        instructions: result.exercise.generatedExercise.instructions || 'Complete the exercise below',
        problem: result.exercise.generatedExercise.problem || result.exercise.generatedExercise.instructions || 'Practice exercise',
        hints: result.exercise.generatedExercise.hints || [],
        solution: {
          answer: result.exercise.generatedExercise.solution?.answer || 'Solution provided in guidance',
          explanation: result.exercise.generatedExercise.solution?.explanation || 'Detailed explanation available',
          steps: result.exercise.generatedExercise.solution?.steps,
          code: result.exercise.generatedExercise.solution?.code
        },
        timeLimit: result.exercise.estimatedTime,
        prerequisites: result.exercise.prerequisites || [],
        learningObjectives: result.exercise.learningObjectives || [],
        estimatedTime: result.exercise.estimatedTime
      };

      yield {
        type: 'data',
        content: {
          type: 'contextual_exercise_generated',
          exercise,
          metadata: result.metadata,
          confidence: result.confidence,
          reasoning: result.reasoning,
          alternatives: result.alternatives
        },
        timestamp: Date.now()
      };

    } catch (error) {
      this.dependencies.logger.error(`Contextual exercise generation failed`, error as Error);
      yield {
        type: 'error',
        content: {
          error: `Failed to generate contextual exercise: ${(error as Error).message}`
        },
        timestamp: Date.now()
      };
    }
  }

  /**
   * Get practice statistics
   */
  getPracticeStatistics(): {
    activeSessions: number;
    totalExercisesGenerated: number;
    averageSessionDuration: number;
    completionRate: number;
    difficultyDistribution: Record<string, number>;
    } {
    const sessions = Array.from(this.activeSessions.values());

    return {
      activeSessions: sessions.length,
      totalExercisesGenerated: sessions.reduce((sum, session) => sum + session.exercises.length, 0),
      averageSessionDuration: sessions.length > 0
        ? sessions.reduce((sum, session) => sum + (session.endTime || Date.now() - session.startTime), 0) / sessions.length
        : 0,
      completionRate: sessions.length > 0
        ? sessions.reduce((sum, session) => sum + (session.performance.completedExercises / session.performance.totalExercises), 0) / sessions.length
        : 0,
      difficultyDistribution: sessions.reduce((dist, session) => {
        dist[session.difficulty] = (dist[session.difficulty] || 0) + 1;
        return dist;
      }, {} as Record<string, number>)
    };
  }
}

/**
 * Default practice agent configuration
 */
export const DEFAULT_PRACTICE_AGENT_CONFIG: PracticeAgentConfig = {
  defaultDifficulty: 'medium',
  adaptiveMode: true,
  maxHints: 3,
  includeDetailedFeedback: true,
  timePressureMode: false,
  gamificationElements: false,
  vibeDetection: DEFAULT_VIBE_DETECTION_CONFIG
};