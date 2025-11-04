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
}

/**
 * Specialized Practice Agent
 */
export class PracticeAgent {
  private model: BaseLanguageModel;
  private toolExecutor: ToolExecutorService;
  private dependencies: ServiceDependencies;
  private config: PracticeAgentConfig;
  private activeSessions = new Map<string, PracticeSession>();

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

    yield {
      type: 'progress',
      content: { phase: 'generating', message: `Generating ${exerciseType} exercise for ${topic}...` },
      timestamp: Date.now()
    };

    // Get existing exercises for context
    let existingExercises = [];
    try {
      const searchResult = await this.toolExecutor.executeTool('searchSessions', {
        query: `${topic} exercises ${difficulty}`,
        limit: 5
      });

      if (searchResult.success) {
        existingExercises = searchResult.data;
      }
    } catch (error) {
      this.dependencies.logger.warn(`Exercise search failed`, error);
    }

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
  gamificationElements: false
};