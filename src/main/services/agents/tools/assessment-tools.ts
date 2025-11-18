/**
 * Assessment Tools Implementation
 *
 * Provides specialized tools for assessment agents including quiz generation,
 * evaluation, feedback generation, and progress tracking.
 * Implements secure tool execution with comprehensive error handling.
 */

import { DynamicTool } from '@langchain/core/tools';
import { SecurityLevel, PermissionType, SecureToolExecutor } from '../../security/secure-tool-executor';
import { ServiceDependencies } from '../../types';

/**
 * Quiz question structure
 */
export interface QuizQuestion {
  id: string;
  type: 'multiple_choice' | 'true_false' | 'short_answer' | 'essay' | 'fill_blank';
  question: string;
  options?: string[]; // For multiple choice
  correctAnswer: string | string[];
  explanation: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  topic: string;
  points: number;
  timeLimit?: number; // seconds
  hints?: string[];
}

/**
 * Quiz structure
 */
export interface Quiz {
  id: string;
  title: string;
  description: string;
  instructions: string;
  questions: QuizQuestion[];
  timeLimit: number; // total minutes
  passingScore: number; // percentage
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  topics: string[];
  metadata: {
    createdAt: number;
    estimatedDuration: number;
    adaptationLevel: number;
  };
}

/**
 * Quiz submission result
 */
export interface QuizSubmission {
  quizId: string;
  sessionId: string;
  answers: Array<{
    questionId: string;
    answer: string | string[];
    timeSpent: number;
    confidence?: number; // 0-1
  }>;
  totalTime: number;
  metadata: {
    submittedAt: number;
    userAgent?: string;
  };
}

/**
 * Quiz evaluation result
 */
export interface QuizEvaluation {
  submissionId: string;
  score: {
    total: number;
    earned: number;
    percentage: number;
    passed: boolean;
  };
  results: Array<{
    questionId: string;
    correct: boolean;
    points: {
      possible: number;
      earned: number;
    };
    feedback: string;
    improvement: string;
  }>;
  summary: {
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
  };
  metadata: {
    evaluatedAt: number;
    evaluationTime: number;
    confidence: number;
  };
}

/**
 * Performance analytics
 */
export interface PerformanceAnalytics {
  sessionId: string;
  timeframe: {
    start: number;
    end: number;
  };
  metrics: {
    totalQuizzes: number;
    averageScore: number;
    bestScore: number;
    worstScore: number;
    improvementRate: number;
    timeSpent: number; // total minutes
    conceptsMastered: number;
    conceptsStruggling: number;
  };
  trends: {
    scoreProgression: Array<{
      date: number;
      score: number;
      difficulty: string;
    }>;
    topicPerformance: Record<string, {
      attempts: number;
      averageScore: number;
      trend: 'improving' | 'stable' | 'declining';
    }>;
    learningVelocity: number; // concepts per week
  };
  recommendations: Array<{
    type: 'review' | 'practice' | 'advance' | 'remediation';
    priority: 'high' | 'medium' | 'low';
    description: string;
    resources: string[];
  }>;
}

/**
 * Assessment Tools Factory
 *
 * Creates LangChain-compatible tools for assessment operations
 * with secure execution and comprehensive error handling.
 */
export class AssessmentToolsFactory {
  private readonly secureToolExecutor: SecureToolExecutor;
  private readonly dependencies: ServiceDependencies;

  constructor(dependencies: ServiceDependencies, secureToolExecutor: SecureToolExecutor) {
    this.dependencies = dependencies;
    this.secureToolExecutor = secureToolExecutor;
  }

  /**
   * Create quiz generation tool
   */
  createQuizGeneratorTool(): DynamicTool {
    // Create a custom tool that implements the BaseTool interface instead of DynamicTool
    // since schema might not be supported in this version of LangChain
    const tool = {
      name: 'quiz_generator',
      description: 'Generate personalized quizzes based on learning objectives and difficulty level',
      schema: {
        type: 'object',
        properties: {
          topics: {
            type: 'array',
            description: 'Topics to include in the quiz',
            items: { type: 'string' }
          },
          difficulty: {
            type: 'string',
            description: 'Difficulty level of the quiz',
            enum: ['beginner', 'intermediate', 'advanced'],
            default: 'intermediate'
          },
          questionCount: {
            type: 'number',
            description: 'Number of questions to generate',
            default: 10
          },
          questionTypes: {
            type: 'array',
            description: 'Types of questions to include',
            items: { type: 'string' },
            default: ['multiple_choice', 'short_answer']
          },
          timeLimit: {
            type: 'number',
            description: 'Time limit in minutes',
            default: 30
          },
          adaptive: {
            type: 'boolean',
            description: 'Generate adaptive quiz based on performance',
            default: false
          },
          sessionContext: {
            type: 'object',
            description: 'Session context for personalization',
            properties: {
              sessionId: { type: 'string' },
              recentTopics: { type: 'array', items: { type: 'string' } },
              performanceLevel: { type: 'string' }
            }
          }
        },
        required: ['topics']
      },
      _call: async (input: string) => {
        try {
          const quizRequest = JSON.parse(input);
          this.dependencies.logger.info('Executing quiz generation', {
            topics: quizRequest.topics,
            difficulty: quizRequest.difficulty,
            questionCount: quizRequest.questionCount
          });

          const result = await this.secureToolExecutor.executeSecureTool({
            toolId: 'quiz-generator',
            operation: 'generate_quiz',
            parameters: {
              topics: quizRequest.topics,
              difficulty: quizRequest.difficulty || 'intermediate',
              questionCount: quizRequest.questionCount || 10,
              questionTypes: quizRequest.questionTypes || ['multiple_choice', 'short_answer'],
              timeLimit: quizRequest.timeLimit || 30, // minutes
              adaptive: quizRequest.adaptive || false,
              sessionContext: quizRequest.sessionContext
            },
            agentId: 'assessment-agent',
            securityLevel: SecurityLevel.STANDARD,
            permissions: [PermissionType.DATABASE_READ, PermissionType.DATABASE_WRITE]
          });

          if (!result.success) {
            throw new Error(`Quiz generation failed: ${result.error?.message}`);
          }

          const quiz: Quiz = result.data;

          // Format result for LangChain
          return JSON.stringify({
            quizId: quiz.id,
            title: quiz.title,
            description: quiz.description,
            questionCount: quiz.questions.length,
            timeLimit: quiz.timeLimit,
            passingScore: quiz.passingScore,
            topics: quiz.topics,
            estimatedDuration: quiz.metadata.estimatedDuration,
            questionTypes: [...new Set(quiz.questions.map(q => q.type))],
            adaptationLevel: quiz.metadata.adaptationLevel
          }, null, 2);

        } catch (error) {
          this.dependencies.logger.error('Quiz generation tool failed', error as Error);
          throw error;
        }
      }
    };
    
    // Return the tool with the proper LangChain interface
    return tool as any;
  }

  /**
   * Create quiz evaluation tool
   */
  createQuizEvaluatorTool(): DynamicTool {
    return new DynamicTool({
      name: 'quiz_evaluator',
      description: 'Evaluate quiz submissions and provide detailed feedback',
      func: async (input: string) => {
        try {
          const evaluationRequest = JSON.parse(input);
          this.dependencies.logger.info('Executing quiz evaluation', {
            quizId: evaluationRequest.quizId,
            submissionId: evaluationRequest.submissionId
          });

          const result = await this.secureToolExecutor.executeSecureTool({
            toolId: 'quiz-evaluator',
            operation: 'evaluate_submission',
            parameters: {
              quizId: evaluationRequest.quizId,
              submissionId: evaluationRequest.submissionId,
              detailedFeedback: evaluationRequest.detailedFeedback !== false,
              includeRecommendations: evaluationRequest.includeRecommendations !== false,
              gradingRubric: evaluationRequest.gradingRubric
            },
            agentId: 'assessment-agent',
            securityLevel: SecurityLevel.STANDARD,
            permissions: [PermissionType.DATABASE_READ, PermissionType.DATABASE_WRITE]
          });

          if (!result.success) {
            throw new Error(`Quiz evaluation failed: ${result.error?.message}`);
          }

          const evaluation: QuizEvaluation = result.data;

          // Format result for LangChain
          return JSON.stringify({
            score: {
              percentage: evaluation.score.percentage,
              total: evaluation.score.total,
              earned: evaluation.score.earned,
              passed: evaluation.score.passed
            },
            summary: {
              strengths: evaluation.summary.strengths,
              weaknesses: evaluation.summary.weaknesses,
              topRecommendations: evaluation.summary.recommendations.slice(0, 3)
            },
            performance: {
              correctAnswers: evaluation.results.filter(r => r.correct).length,
              totalQuestions: evaluation.results.length,
              averageConfidence: evaluation.metadata.confidence
            },
            evaluationTime: evaluation.metadata.evaluationTime
          }, null, 2);

        } catch (error) {
          this.dependencies.logger.error('Quiz evaluation tool failed', error as Error);
          throw error;
        }
      },
      schema: {
        type: 'object',
        properties: {
          quizId: {
            type: 'string',
            description: 'ID of the quiz to evaluate'
          },
          submissionId: {
            type: 'string',
            description: 'ID of the submission to evaluate'
          },
          detailedFeedback: {
            type: 'boolean',
            description: 'Include detailed feedback for each question',
            default: true
          },
          includeRecommendations: {
            type: 'boolean',
            description: 'Include improvement recommendations',
            default: true
          },
          gradingRubric: {
            type: 'object',
            description: 'Custom grading rubric',
            properties: {
              correctness: { type: 'number' },
              completeness: { type: 'number' },
              clarity: { type: 'number' }
            }
          }
        },
        required: ['quizId', 'submissionId']
      }
    });
  }

  /**
   * Create performance analytics tool
   */
  createPerformanceAnalyticsTool(): DynamicTool {
    return new DynamicTool({
      name: 'performance_analytics',
      description: 'Analyze learning performance and generate insights',
      func: async (input: string) => {
        try {
          const analyticsRequest = JSON.parse(input);
          this.dependencies.logger.info('Executing performance analytics', {
            sessionId: analyticsRequest.sessionId,
            timeframe: analyticsRequest.timeframe
          });

          const result = await this.secureToolExecutor.executeSecureTool({
            toolId: 'performance-analytics',
            operation: 'analyze_performance',
            parameters: {
              sessionId: analyticsRequest.sessionId,
              timeframe: analyticsRequest.timeframe || 'month',
              metrics: analyticsRequest.metrics || ['scores', 'time', 'improvement'],
              comparePrevious: analyticsRequest.comparePrevious || true,
              generatePredictions: analyticsRequest.generatePredictions || false
            },
            agentId: 'assessment-agent',
            securityLevel: SecurityLevel.RESTRICTED,
            permissions: [PermissionType.DATABASE_READ]
          });

          if (!result.success) {
            throw new Error(`Performance analytics failed: ${result.error?.message}`);
          }

          const analytics: PerformanceAnalytics = result.data;

          // Format result for LangChain
          return JSON.stringify({
            timeframe: analyticsRequest.timeframe,
            metrics: analytics.metrics,
            performance: {
              totalQuizzes: analytics.metrics.totalQuizzes,
              averageScore: Math.round(analytics.metrics.averageScore),
              bestScore: analytics.metrics.bestScore,
              improvementRate: Math.round(analytics.metrics.improvementRate * 100)
            },
            progress: {
              conceptsMastered: analytics.metrics.conceptsMastered,
              conceptsStruggling: analytics.metrics.conceptsStruggling,
              learningVelocity: analytics.trends.learningVelocity
            },
            recommendations: analytics.recommendations.slice(0, 5).map(r => ({
              type: r.type,
              priority: r.priority,
              description: r.description
            }))
          }, null, 2);

        } catch (error) {
          this.dependencies.logger.error('Performance analytics tool failed', error as Error);
          throw error;
        }
      },
      schema: {
        type: 'object',
        properties: {
          sessionId: {
            type: 'string',
            description: 'Session ID to analyze'
          },
          timeframe: {
            type: 'string',
            description: 'Time period for analysis',
            enum: ['week', 'month', 'quarter', 'year'],
            default: 'month'
          },
          metrics: {
            type: 'array',
            description: 'Metrics to include in analysis',
            items: { type: 'string' },
            default: ['scores', 'time', 'improvement']
          },
          comparePrevious: {
            type: 'boolean',
            description: 'Compare with previous time period',
            default: true
          },
          generatePredictions: {
            type: 'boolean',
            description: 'Generate performance predictions',
            default: false
          }
        },
        required: ['sessionId']
      }
    });
  }

  /**
   * Create adaptive difficulty adjustment tool
   */
  createAdaptiveDifficultyTool(): DynamicTool {
    return new DynamicTool({
      name: 'adaptive_difficulty',
      description: 'Adjust quiz difficulty based on performance and learning patterns',
      func: async (input: string) => {
        try {
          const difficultyRequest = JSON.parse(input);
          this.dependencies.logger.info('Executing adaptive difficulty adjustment', {
            sessionId: difficultyRequest.sessionId,
            currentDifficulty: difficultyRequest.currentDifficulty
          });

          const result = await this.secureToolExecutor.executeSecureTool({
            toolId: 'adaptive-difficulty',
            operation: 'adjust_difficulty',
            parameters: {
              sessionId: difficultyRequest.sessionId,
              currentDifficulty: difficultyRequest.currentDifficulty,
              recentPerformance: difficultyRequest.recentPerformance,
              learningGoal: difficultyRequest.learningGoal,
              adjustmentFactor: difficultyRequest.adjustmentFactor || 0.1
            },
            agentId: 'assessment-agent',
            securityLevel: SecurityLevel.STANDARD,
            permissions: [PermissionType.DATABASE_READ, PermissionType.DATABASE_WRITE]
          });

          if (!result.success) {
            throw new Error(`Adaptive difficulty adjustment failed: ${result.error?.message}`);
          }

          const adjustment = result.data;

          // Format result for LangChain
          return JSON.stringify({
            recommendedDifficulty: adjustment.recommendedDifficulty,
            adjustmentReason: adjustment.reason,
            confidence: adjustment.confidence,
            factors: adjustment.factors,
            nextQuizSuggestion: adjustment.nextQuizSuggestion,
            estimatedImprovement: adjustment.estimatedImprovement
          }, null, 2);

        } catch (error) {
          this.dependencies.logger.error('Adaptive difficulty tool failed', error as Error);
          throw error;
        }
      },
      schema: {
        type: 'object',
        properties: {
          sessionId: {
            type: 'string',
            description: 'Session ID for difficulty adjustment'
          },
          currentDifficulty: {
            type: 'string',
            description: 'Current difficulty level',
            enum: ['beginner', 'intermediate', 'advanced']
          },
          recentPerformance: {
            type: 'array',
            description: 'Recent quiz scores',
            items: { type: 'number' }
          },
          learningGoal: {
            type: 'string',
            description: 'Current learning goal'
          },
          adjustmentFactor: {
            type: 'number',
            description: 'How aggressively to adjust difficulty',
            default: 0.1
          }
        },
        required: ['sessionId', 'currentDifficulty']
      }
    });
  }

  /**
   * Create feedback generation tool
   */
  createFeedbackGeneratorTool(): DynamicTool {
    return new DynamicTool({
      name: 'feedback_generator',
      description: 'Generate personalized feedback for quiz submissions and learning progress',
      func: async (input: string) => {
        try {
          const feedbackRequest = JSON.parse(input);
          this.dependencies.logger.info('Executing feedback generation', {
            submissionId: feedbackRequest.submissionId,
            feedbackType: feedbackRequest.feedbackType
          });

          const result = await this.secureToolExecutor.executeSecureTool({
            toolId: 'feedback-generator',
            operation: 'generate_feedback',
            parameters: {
              submissionId: feedbackRequest.submissionId,
              feedbackType: feedbackRequest.feedbackType || 'comprehensive',
              tone: feedbackRequest.tone || 'encouraging',
              includeActionItems: feedbackRequest.includeActionItems !== false,
              focusAreas: feedbackRequest.focusAreas || []
            },
            agentId: 'assessment-agent',
            securityLevel: SecurityLevel.RESTRICTED,
            permissions: [PermissionType.DATABASE_READ]
          });

          if (!result.success) {
            throw new Error(`Feedback generation failed: ${result.error?.message}`);
          }

          const feedback = result.data;

          // Format result for LangChain
          return JSON.stringify({
            feedbackType: feedbackRequest.feedbackType,
            overallFeedback: feedback.overall,
            strengths: feedback.strengths,
            improvements: feedback.improvements,
            actionItems: feedback.actionItems.slice(0, 5),
            resources: feedback.resources || [],
            nextSteps: feedback.nextSteps || []
          }, null, 2);

        } catch (error) {
          this.dependencies.logger.error('Feedback generation tool failed', error as Error);
          throw error;
        }
      },
      schema: {
        type: 'object',
        properties: {
          submissionId: {
            type: 'string',
            description: 'ID of the quiz submission'
          },
          feedbackType: {
            type: 'string',
            description: 'Type of feedback to generate',
            enum: ['comprehensive', 'summary', 'detailed', 'encouraging'],
            default: 'comprehensive'
          },
          tone: {
            type: 'string',
            description: 'Tone of the feedback',
            enum: ['encouraging', 'constructive', 'analytical', 'motivational'],
            default: 'encouraging'
          },
          includeActionItems: {
            type: 'boolean',
            description: 'Include actionable improvement items',
            default: true
          },
          focusAreas: {
            type: 'array',
            description: 'Specific areas to focus feedback on',
            items: { type: 'string' }
          }
        },
        required: ['submissionId']
      }
    });
  }

  /**
   * Get all assessment tools
   */
  getAllAssessmentTools(): DynamicTool[] {
    return [
      this.createQuizGeneratorTool(),
      this.createQuizEvaluatorTool(),
      this.createPerformanceAnalyticsTool(),
      this.createAdaptiveDifficultyTool(),
      this.createFeedbackGeneratorTool()
    ];
  }

  /**
   * Get tools by category
   */
  getToolsByCategory(category: 'creation' | 'evaluation' | 'analytics' | 'feedback'): DynamicTool[] {
    const allTools = this.getAllAssessmentTools();

    switch (category) {
    case 'creation':
      return allTools.filter(tool => tool.name === 'quiz_generator');
    case 'evaluation':
      return allTools.filter(tool =>
        ['quiz_evaluator', 'adaptive_difficulty'].includes(tool.name)
      );
    case 'analytics':
      return allTools.filter(tool => tool.name === 'performance_analytics');
    case 'feedback':
      return allTools.filter(tool => tool.name === 'feedback_generator');
    default:
      return [];
    }
  }
}