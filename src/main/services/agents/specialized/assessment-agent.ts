/**
 * Specialized Assessment Agent
 *
 * A comprehensive assessment agent that creates quizzes, tests, evaluations,
 * and competency assessments. This agent can generate various assessment
 * types, evaluate responses, and provide detailed performance analytics.
 */

import { BaseLanguageModel } from '@langchain/core/language_models/base';
import { HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';
import { AgentExecutionRequest, AgentExecutionContext, AgentExecutionChunk } from '../types';
import { ToolExecutorService } from '../tool-executor';
import { ServiceDependencies } from '../types';

export interface Question {
  id: string;
  type: 'multiple-choice' | 'true-false' | 'short-answer' | 'essay' | 'fill-blank' | 'matching' | 'practical' | 'coding';
  question: string;
  options?: string[];
  correctAnswer: string | string[];
  explanation: string;
  points: number;
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
  tags: string[];
  timeLimit?: number; // seconds
  hints?: string[];
  rubric?: {
    criteria: string[];
    scale: string[];
    descriptions: string[];
  };
}

export interface Assessment {
  id: string;
  title: string;
  description: string;
  type: 'quiz' | 'test' | 'exam' | 'assignment' | 'project' | 'competency-check';
  subject: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  questions: Question[];
  settings: {
    randomizeQuestions: boolean;
    randomizeOptions: boolean;
    allowBacktrack: boolean;
    showResults: boolean;
    passingScore: number;
    timeLimit?: number; // minutes
    attempts: number;
    showFeedback: boolean;
    showCorrectAnswers: boolean;
  };
  metadata: {
    totalPoints: number;
    estimatedTime: number; // minutes
    questionCount: number;
    difficulty: Record<string, number>;
    categories: string[];
    tags: string[];
    created: number;
    createdBy: string;
  };
}

export interface AssessmentResult {
  assessmentId: string;
  userId: string;
  sessionId: string;
  answers: Array<{
    questionId: string;
    answer: any;
    timeSpent: number;
    attempts: number;
    hintsUsed: number;
  }>;
  scores: {
    totalPoints: number;
    earnedPoints: number;
    percentage: number;
    grade: string;
    passed: boolean;
  };
  performance: {
    timeSpent: number;
    averageTimePerQuestion: number;
    categoryScores: Record<string, { points: number; earned: number; percentage: number }>;
    difficultyScores: Record<string, { points: number; earned: number; percentage: number }>;
    questionAnalysis: Array<{
      questionId: string;
      correct: boolean;
      points: number;
      timeSpent: number;
      hintsUsed: number;
    }>;
  };
  feedback: {
    overall: string;
    strengths: string[];
    improvements: string[];
    recommendations: string[];
    nextSteps: string[];
  };
  completedAt: number;
}

export interface AssessmentAgentConfig {
  defaultDifficulty: 'easy' | 'medium' | 'hard';
  defaultTimeLimit: number; // minutes
  includeFeedback: boolean;
  adaptiveMode: boolean;
  questionBank: boolean;
  analyticsEnabled: boolean;
}

/**
 * Specialized Assessment Agent
 */
export class AssessmentAgent {
  private model: BaseLanguageModel;
  private toolExecutor: ToolExecutorService;
  private dependencies: ServiceDependencies;
  private config: AssessmentAgentConfig;
  private assessmentBank = new Map<string, Assessment>();
  private resultsHistory = new Map<string, AssessmentResult[]>();

  constructor(
    model: BaseLanguageModel,
    toolExecutor: ToolExecutorService,
    dependencies: ServiceDependencies,
    config: AssessmentAgentConfig
  ) {
    this.model = model;
    this.toolExecutor = toolExecutor;
    this.dependencies = dependencies;
    this.config = config;
  }

  /**
   * Execute assessment agent
   */
  async *execute(
    request: AgentExecutionRequest,
    executionContext: AgentExecutionContext
  ): AsyncIterable<AgentExecutionChunk> {
    this.dependencies.logger.info(`Starting Assessment Agent execution`, {
      executionId: executionContext.id,
      inputType: typeof request.input
    });

    try {
      // Parse assessment request
      const assessmentRequest = await this.analyzeAssessmentRequest(request.input);

      yield {
        type: 'progress',
        content: {
          phase: 'request_analyzed',
          message: `Assessment request identified: ${assessmentRequest.type}`,
          request: assessmentRequest
        },
        timestamp: Date.now()
      };

      // Route to appropriate assessment function
      switch (assessmentRequest.type) {
        case 'create_assessment':
          yield* this.createAssessment(request.input, assessmentRequest, executionContext);
          break;

        case 'evaluate_answers':
          yield* this.evaluateAnswers(request.input, assessmentRequest, executionContext);
          break;

        case 'generate_feedback':
          yield* this.generateFeedback(request.input, assessmentRequest, executionContext);
          break;

        case 'analyze_performance':
          yield* this.analyzePerformance(request.input, assessmentRequest, executionContext);
          break;

        case 'create_adaptive_assessment':
          yield* this.createAdaptiveAssessment(request.input, assessmentRequest, executionContext);
          break;

        default:
          yield* this.provideGeneralAssessmentHelp(request.input, assessmentRequest, executionContext);
          break;
      }

    } catch (error) {
      this.dependencies.logger.error(`Assessment Agent execution failed`, error as Error);
      throw error;
    }
  }

  /**
   * Analyze assessment request to determine intent
   */
  private async analyzeAssessmentRequest(input: any): Promise<{
    type: string;
    subject?: string;
    topic?: string;
    difficulty?: string;
    assessmentType?: string;
    questionCount?: number;
    timeLimit?: number;
    context: string;
  }> {
    const currentInput = typeof input === 'string' ? input : JSON.stringify(input);

    const requestPrompt = `You are an assessment request analyzer. Analyze the user's request to determine what kind of assessment help they need.

User request: ${currentInput}

Possible request types:
- create_assessment: User wants to create a new quiz/test/assessment
- evaluate_answers: User wants to evaluate answers to questions
- generate_feedback: User wants detailed feedback on assessment performance
- analyze_performance: User wants performance analysis and insights
- create_adaptive_assessment: User wants adaptive assessment based on performance
- general_help: General assessment assistance

Response format:
{
  "type": "request_type",
  "subject": "subject_name_or_null",
  "topic": "topic_name_or_null",
  "difficulty": "easy|medium|hard|null",
  "assessmentType": "quiz|test|exam|assignment|project|null",
  "questionCount": number_or_null,
  "timeLimit": number_or_null,
  "context": "Brief context of the assessment request"
}`;

    const messages = [
      new SystemMessage("You are an expert at analyzing assessment requests."),
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
        difficulty: parsed.difficulty,
        assessmentType: parsed.assessmentType,
        questionCount: parsed.questionCount,
        timeLimit: parsed.timeLimit,
        context: parsed.context || currentInput
      };

    } catch (error) {
      this.dependencies.logger.warn(`Assessment request analysis failed`, error as Error);
      return {
        type: 'general_help',
        context: currentInput
      };
    }
  }

  /**
   * Create a new assessment
   */
  private async *createAssessment(
    input: any,
    assessmentRequest: any,
    executionContext: AgentExecutionContext
  ): AsyncIterable<AgentExecutionChunk> {
    const subject = assessmentRequest.subject || 'the subject';
    const topic = assessmentRequest.topic || 'the topic';
    const difficulty = assessmentRequest.difficulty || this.config.defaultDifficulty;
    const assessmentType = assessmentRequest.assessmentType || 'quiz';
    const questionCount = assessmentRequest.questionCount || 10;

    yield {
      type: 'progress',
      content: { phase: 'planning', message: `Planning ${assessmentType} for ${subject}...` },
      timestamp: Date.now()
    };

    // Search for existing assessments and questions
    let existingContent = [];
    try {
      const searchResult = await this.toolExecutor.executeTool('searchSessions', {
        query: `${subject} ${topic} assessment questions ${difficulty}`,
        limit: 10
      });

      if (searchResult.success) {
        existingContent = searchResult.data;
      }
    } catch (error) {
      this.dependencies.logger.warn(`Assessment search failed`, error);
    }

    yield {
      type: 'progress',
      content: { phase: 'generating', message: `Generating ${questionCount} questions for assessment...` },
      timestamp: Date.now()
    };

    const assessmentPrompt = `You are an expert assessment designer. Create a comprehensive ${assessmentType} assessment.

Subject: ${subject}
Topic: ${topic}
Difficulty: ${difficulty}
Assessment Type: ${assessmentType}
Question Count: ${questionCount}
Time Limit: ${assessmentRequest.timeLimit || this.config.defaultTimeLimit} minutes
Learning context: ${assessmentRequest.context}
Existing content for reference: ${JSON.stringify(existingContent)}

Create a ${assessmentType} that:
1. Covers key concepts and learning objectives
2. Has appropriate difficulty progression
3. Includes various question types when suitable
4. Tests different cognitive levels (recall, application, analysis, synthesis)
5. Has clear instructions and expectations
6. Includes detailed explanations for correct answers
7. Is fair and unbiased
8. Provides meaningful assessment of understanding

Generate ${questionCount} questions with different types:
- Multiple choice questions with clear options
- True/false questions
- Short answer questions
- Practical/coding questions if applicable

Format your response as:
{
  "title": "Assessment Title",
  "description": "Brief description of what this assessment covers",
  "type": "${assessmentType}",
  "subject": "${subject}",
  "level": "${difficulty}",
  "questions": [
    {
      "type": "multiple-choice",
      "question": "Question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": "A",
      "explanation": "Detailed explanation",
      "points": 10,
      "difficulty": "${difficulty}",
      "category": "subcategory",
      "tags": ["tag1", "tag2"],
      "timeLimit": 60
    }
  ],
  "settings": {
    "randomizeQuestions": true,
    "randomizeOptions": true,
    "allowBacktrack": true,
    "showResults": true,
    "passingScore": 70,
    "timeLimit": ${assessmentRequest.timeLimit || this.config.defaultTimeLimit},
    "attempts": 3,
    "showFeedback": true,
    "showCorrectAnswers": true
  }
}`;

    const messages = [
      new SystemMessage("You are an expert educational assessment designer."),
      new HumanMessage(assessmentPrompt)
    ];

    try {
      const response = await this.model.invoke(messages);
      const content = response.content as string;

      let assessmentData;
      try {
        assessmentData = JSON.parse(content);
      } catch (parseError) {
        // Fallback assessment
        assessmentData = {
          title: `${assessmentType}: ${subject} - ${topic}`,
          description: content,
          type: assessmentType,
          subject,
          level: difficulty,
          questions: [],
          settings: {
            randomizeQuestions: false,
            showResults: true,
            passingScore: 70,
            timeLimit: assessmentRequest.timeLimit || this.config.defaultTimeLimit,
            attempts: 1
          }
        };
      }

      // Calculate metadata
      const questions = assessmentData.questions || [];
      const totalPoints = questions.reduce((sum: number, q: any) => sum + (q.points || 10), 0);
      const estimatedTime = questions.reduce((sum: number, q: any) => sum + (q.timeLimit || 60), 0) / 60;

      const assessment: Assessment = {
        id: `assessment_${executionContext.id}`,
        title: assessmentData.title,
        description: assessmentData.description,
        type: assessmentData.type,
        subject: assessmentData.subject,
        level: assessmentData.level,
        questions: questions.map((q: any, index: number) => ({
          id: `question_${index + 1}`,
          type: q.type || 'multiple-choice',
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation || 'No explanation provided',
          points: q.points || 10,
          difficulty: q.difficulty || difficulty,
          category: q.category || 'general',
          tags: q.tags || [],
          timeLimit: q.timeLimit,
          hints: q.hints
        })),
        settings: {
          randomizeQuestions: assessmentData.settings?.randomizeQuestions || false,
          randomizeOptions: assessmentData.settings?.randomizeOptions || false,
          allowBacktrack: assessmentData.settings?.allowBacktrack || true,
          showResults: assessmentData.settings?.showResults !== false,
          passingScore: assessmentData.settings?.passingScore || 70,
          timeLimit: assessmentData.settings?.timeLimit,
          attempts: assessmentData.settings?.attempts || 1,
          showFeedback: assessmentData.settings?.showFeedback !== false,
          showCorrectAnswers: assessmentData.settings?.showCorrectAnswers !== false
        },
        metadata: {
          totalPoints,
          estimatedTime: Math.ceil(estimatedTime),
          questionCount: questions.length,
          difficulty: questions.reduce((dist: Record<string, number>, q) => {
            dist[q.difficulty] = (dist[q.difficulty] || 0) + 1;
            return dist;
          }, {}),
          categories: [...new Set(questions.map((q: any) => q.category).filter(Boolean))],
          tags: [...new Set(questions.flatMap((q: any) => q.tags || []))],
          created: Date.now(),
          createdBy: 'AssessmentAgent'
        }
      };

      // Store assessment in bank
      this.assessmentBank.set(assessment.id, assessment);

      yield {
        type: 'data',
        content: {
          type: 'assessment_created',
          assessment
        },
        timestamp: Date.now()
      };

    } catch (error) {
      yield {
        type: 'error',
        content: {
          error: `Failed to create assessment: ${(error as Error).message}`
        },
        timestamp: Date.now()
      };
    }
  }

  /**
   * Evaluate answers to assessment questions
   */
  private async *evaluateAnswers(
    input: any,
    assessmentRequest: any,
    executionContext: AgentExecutionContext
  ): AsyncIterable<AgentExecutionChunk> {
    const assessmentId = input.assessmentId;
    const answers = input.answers || [];

    if (!assessmentId) {
      yield {
        type: 'error',
        content: {
          error: 'No assessment ID provided for evaluation'
        },
        timestamp: Date.now()
      };
      return;
    }

    yield {
      type: 'progress',
      content: { phase: 'evaluating', message: 'Evaluating answers and calculating scores...' },
      timestamp: Date.now()
    };

    // Get assessment from bank
    const assessment = this.assessmentBank.get(assessmentId);
    if (!assessment) {
      yield {
        type: 'error',
        content: {
          error: `Assessment ${assessmentId} not found`
        },
        timestamp: Date.now()
      };
      return;
    }

    // Evaluate each answer
    const evaluationResults = [];
    let totalPoints = 0;
    let earnedPoints = 0;

    for (const answer of answers) {
      const question = assessment.questions.find(q => q.id === answer.questionId);
      if (!question) {
        continue;
      }

      totalPoints += question.points;

      const evaluation = await this.evaluateAnswer(question, answer);
      evaluationResults.push(evaluation);

      if (evaluation.correct) {
        earnedPoints += question.points;
      }
    }

    const percentage = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;
    const passed = percentage >= assessment.settings.passingScore;

    yield {
      type: 'progress',
      content: { phase: 'calculating', message: 'Calculating final scores and generating feedback...' },
      timestamp: Date.now()
    };

    // Create assessment result
    const result: AssessmentResult = {
      assessmentId,
      userId: input.userId || 'anonymous',
      sessionId: input.sessionId || executionContext.id,
      answers,
      scores: {
        totalPoints,
        earnedPoints,
        percentage,
        grade: this.calculateGrade(percentage),
        passed
      },
      performance: {
        timeSpent: input.timeSpent || 0,
        averageTimePerQuestion: input.timeSpent ? input.timeSpent / answers.length : 0,
        categoryScores: this.calculateCategoryScores(assessment, evaluationResults),
        difficultyScores: this.calculateDifficultyScores(assessment, evaluationResults),
        questionAnalysis: evaluationResults
      },
      feedback: {
        overall: '',
        strengths: [],
        improvements: [],
        recommendations: [],
        nextSteps: []
      },
      completedAt: Date.now()
    };

    // Generate detailed feedback
    yield* this.generateAssessmentFeedback(result, assessment, executionContext);

    // Store result
    const userResults = this.resultsHistory.get(result.userId) || [];
    userResults.push(result);
    this.resultsHistory.set(result.userId, userResults);

    yield {
      type: 'data',
      content: {
        type: 'assessment_evaluated',
        result
      },
      timestamp: Date.now()
    };

  }

  /**
   * Evaluate a single answer
   */
  private async evaluateAnswer(question: Question, answer: any): Promise<any> {
    const userAnswer = answer.answer;
    const correctAnswer = question.correctAnswer;

    let correct = false;
    let score = 0;

    if (question.type === 'multiple-choice' || question.type === 'true-false') {
      correct = userAnswer === correctAnswer;
      score = correct ? question.points : 0;
    } else if (question.type === 'short-answer') {
      // Use AI to evaluate short answer
      const evaluationPrompt = `Evaluate this short answer:

Question: ${question.question}
Correct answer: ${correctAnswer}
User's answer: ${userAnswer}

Determine if the user's answer is correct (1) or incorrect (0) and provide a brief explanation.

Format as JSON: {"correct": true/false, "explanation": "Explanation"}';`

      try {
        const response = await this.model.invoke([
          new SystemMessage("You are an expert grader evaluating short answers."),
          new HumanMessage(evaluationPrompt)
        ]);

        const evaluation = JSON.parse(response.content as string);
        correct = evaluation.correct;
        score = correct ? question.points : 0;
      } catch (error) {
        // Fallback to simple string comparison
        correct = userAnswer.toLowerCase().trim() === correctAnswer.toString().toLowerCase().trim();
        score = correct ? question.points : 0;
      }
    } else {
      // For other question types, do basic evaluation
      correct = userAnswer === correctAnswer;
      score = correct ? question.points : 0;
    }

    return {
      questionId: question.id,
      correct,
      points: score,
      timeSpent: answer.timeSpent || 0,
      hintsUsed: answer.hintsUsed || 0,
      maxPoints: question.points
    };
  }

  /**
   * Generate detailed assessment feedback
   */
  private async *generateAssessmentFeedback(
    result: AssessmentResult,
    assessment: Assessment,
    executionContext: AgentExecutionContext
  ): AsyncIterable<AgentExecutionChunk> {
    yield {
      type: 'progress',
      content: { phase: 'generating_feedback', message: 'Generating detailed performance feedback...' },
      timestamp: Date.now()
    };

    const feedbackPrompt = `You are an expert educational assessor. Provide comprehensive feedback based on assessment results.

Assessment Details:
- Title: ${assessment.title}
- Subject: ${assessment.subject}
- Level: ${assessment.level}
- Total Points: ${result.scores.totalPoints}
- Earned Points: ${result.scores.earnedPoints}
- Percentage: ${result.scores.percentage}%
- Grade: ${result.scores.grade}
- Passed: ${result.scores.passed}

Performance Data:
${JSON.stringify(result.performance, null, 2)}

Provide detailed feedback that includes:
1. Overall performance assessment
2. Strengths and areas of excellence
3. Areas for improvement
4. Specific recommendations for study
5. Next steps in learning journey
6. Encouragement and motivation

Format your response as structured, encouraging, and actionable feedback.`;

    const messages = [
      new SystemMessage("You are an expert educational assessor providing detailed performance feedback."),
      new HumanMessage(feedbackPrompt)
    ];

    try {
      const response = await this.model.invoke(messages);
      const content = response.content as string;

      result.feedback.overall = content;
      result.feedback.strengths = this.extractStrengths(content);
      result.feedback.improvements = this.extractImprovements(content);
      result.feedback.recommendations = this.extractRecommendations(content);
      result.feedback.nextSteps = this.extractNextSteps(content);

    } catch (error) {
      result.feedback.overall = `Your score: ${result.scores.percentage}% (${result.scores.grade})`;
      result.feedback.recommendations = ['Review incorrect answers', 'Practice more questions'];
    }
  }

  /**
   * Generate feedback for assessment performance
   */
  private async *generateFeedback(
    input: any,
    assessmentRequest: any,
    executionContext: AgentExecutionContext
  ): AsyncIterable<AgentExecutionChunk> {
    const resultId = input.resultId;
    const userId = input.userId;

    if (!resultId) {
      yield {
        type: 'error',
        content: {
          error: 'No result ID provided for feedback generation'
        },
        timestamp: Date.now()
      };
      return;
    }

    const userResults = this.resultsHistory.get(userId || 'anonymous') || [];
    const result = userResults.find(r => r.sessionId === resultId);

    if (!result) {
      yield {
        type: 'error',
        content: {
          error: `Assessment result ${resultId} not found`
        },
        timestamp: Date.now()
      };
      return;
    }

    yield {
      type: 'data',
      content: {
        type: 'assessment_feedback',
        feedback: result.feedback,
        performance: result.performance,
        scores: result.scores
      },
      timestamp: Date.now()
    };
  }

  /**
   * Analyze performance trends and insights
   */
  private async *analyzePerformance(
    input: any,
    assessmentRequest: any,
    executionContext: AgentExecutionContext
  ): AsyncIterable<AgentExecutionChunk> {
    const userId = input.userId || 'anonymous';
    const userResults = this.resultsHistory.get(userId) || [];

    if (userResults.length === 0) {
      yield {
        type: 'data',
        content: {
          type: 'performance_analysis',
          message: 'No assessment history available for analysis',
          recommendations: ['Take some assessments to build performance history']
        },
        timestamp: Date.now()
      };
      return;
    }

    yield {
      type: 'progress',
      content: { phase: 'analyzing', message: 'Analyzing performance trends and patterns...' },
      timestamp: Date.now()
    }

    const analysisPrompt = `You are an educational data analyst. Analyze this student's assessment performance history.

Assessment History:
${JSON.stringify(userResults.map(r => ({
      assessmentId: r.assessmentId,
      percentage: r.scores.percentage,
      grade: r.scores.grade,
      passed: r.scores.passed,
      timeSpent: r.performance.timeSpent,
      completedAt: r.completedAt
    })), null, 2)}

Provide analysis covering:
1. Performance trends over time
2. Strengths and consistent areas of excellence
3. Areas needing improvement
4. Learning patterns and insights
5. Recommendations for future learning
6. Progress indicators and goals

Format your response as actionable educational insights.`;

    const messages = [
      new SystemMessage("You are an expert educational data analyst providing performance insights."),
      new HumanMessage(analysisPrompt)
    ];

    try {
      const response = await this.model.invoke(messages);

      yield {
        type: 'data',
        content: {
          type: 'performance_analysis',
          analysis: response.content,
          trends: this.extractTrends(response.content),
          insights: this.extractInsights(response.content),
          recommendations: this.extractRecommendations(response.content),
          statistics: this.calculatePerformanceStatistics(userResults)
        },
        timestamp: Date.now()
      };

    } catch (error) {
      yield {
        type: 'error',
        content: {
          error: `Failed to analyze performance: ${(error as Error).message}`
        },
        timestamp: Date.now()
      };
    }
  }

  /**
   * Create adaptive assessment based on performance
   */
  private async *createAdaptiveAssessment(
    input: any,
    assessmentRequest: any,
    executionContext: AgentExecutionContext
  ): AsyncIterable<AgentExecutionChunk> {
    const userId = input.userId || 'anonymous';
    const userResults = this.resultsHistory.get(userId) || [];
    const recentPerformance = input.recentPerformance || {};

    yield {
      type: 'progress',
      content: { phase: 'analyzing', message: 'Analyzing performance to create adaptive assessment...' },
      timestamp: Date.now()
    };

    const adaptationPrompt = `You are an adaptive assessment designer. Analyze student performance and create an adaptive assessment plan.

Recent Performance: ${JSON.stringify(recentPerformance)}
Assessment History: ${JSON.stringify(userResults.slice(-5).map(r => ({
      percentage: r.scores.percentage,
      difficulty: r.assessmentId, // Would need to fetch assessment details
      categoryPerformance: r.performance.categoryScores
    })))}

Determine:
1. Current skill level and mastery
2. Appropriate difficulty for next assessment
3. Topics that need focus
4. Assessment type and structure
5. Question types that would be most beneficial
6. Number of questions and time allocation

Format your response as:
{
  "currentLevel": "beginner|intermediate|advanced",
  "recommendedDifficulty": "easy|medium|hard",
  "focusTopics": ["topic1", "topic2"],
  "recommendedType": "quiz|test|exam",
  "questionTypes": ["multiple-choice", "practical"],
  "questionCount": 10,
  "timeLimit": 30,
  "adaptationReason": "Why this adaptation is recommended"
}`;

    const messages = [
      new SystemMessage("You are an adaptive assessment designer personalizing tests based on performance."),
      new HumanMessage(adaptationPrompt)
    ];

    try {
      const response = await this.model.invoke(messages);
      const adaptation = JSON.parse(response.content as string);

      // Create assessment with adaptation parameters
      const adaptiveInput = {
        subject: assessmentRequest.subject || 'Adaptive Assessment',
        topic: adaptation.focusTopics.join(', '),
        difficulty: adaptation.recommendedDifficulty,
        assessmentType: adaptation.recommendedType,
        questionCount: adaptation.questionCount,
        timeLimit: adaptation.timeLimit,
        context: `Adaptive assessment based on: ${adaptation.adaptationReason}`
      };

      yield* this.createAssessment(adaptiveInput, adaptiveInput, executionContext);

    } catch (error) {
      yield {
        type: 'error',
        content: {
          error: `Failed to create adaptive assessment: ${(error as Error).message}`
        },
        timestamp: Date.now()
      };
    }
  }

  /**
   * Provide general assessment help
   */
  private async *provideGeneralAssessmentHelp(
    input: any,
    assessmentRequest: any,
    executionContext: AgentExecutionContext
  ): AsyncIterable<AgentExecutionChunk> {
    yield {
      type: 'progress',
      content: { phase: 'general_help', message: 'Providing general assessment assistance...' },
      timestamp: Date.now()
    };

    const helpPrompt = `You are a helpful assessment assistant. The user needs general assessment help.

Learning context: ${assessmentRequest.context}
Subject of interest: ${assessmentRequest.subject || 'general'}

Provide helpful assessment assistance that:
1. Addresses their specific needs
2. Offers practical advice for assessments
3. Suggests effective study and test-taking strategies
4. Is encouraging and supportive
5. Provides actionable recommendations
6. Is appropriate for ${this.config.defaultDifficulty} level

Format your response as helpful, encouraging, and actionable advice.`;

    const messages = [
      new SystemMessage("You are a helpful AI assessment assistant."),
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
          error: `Failed to provide general assessment help: ${(error as Error).message}`
        },
        timestamp: Date.now()
      };
    }
  }

  // Helper methods for text extraction
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
    const pattern = /(?:Improvement|Work on|Focus on|Practice):?\s*([^\n]+)/gi;
    const improvements = [];
    let match;
    while ((match = pattern.exec(text)) !== null) {
      improvements.push(match[1].trim());
    }
    return improvements;
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

  private extractNextSteps(text: string): string[] {
    const pattern = /(?:Next step|Then|After this):?\s*([^\n]+)/gi;
    const nextSteps = [];
    let match;
    while ((match = pattern.exec(text)) !== null) {
      nextSteps.push(match[1].trim());
    }
    return nextSteps;
  }

  private extractTrends(text: string): string[] {
    const pattern = /(?:Trend|Pattern|Showing):?\s*([^\n]+)/gi;
    const trends = [];
    let match;
    while ((match = pattern.exec(text)) !== null) {
      trends.push(match[1].trim());
    }
    return trends;
  }

  private extractInsights(text: string): string[] {
    const pattern = /(?:Insight|Observation|Noticed):?\s*([^\n]+)/gi;
    const insights = [];
    let match;
    while ((match = pattern.exec(text)) !== null) {
      insights.push(match[1].trim());
    }
    return insights;
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

  private calculateGrade(percentage: number): string {
    if (percentage >= 90) return 'A';
    if (percentage >= 80) return 'B';
    if (percentage >= 70) return 'C';
    if (percentage >= 60) return 'D';
    return 'F';
  }

  private calculateCategoryScores(assessment: Assessment, evaluations: any[]): Record<string, any> {
    const categoryScores: Record<string, any> = {};

    evaluations.forEach(eval => {
      const question = assessment.questions.find(q => q.id === eval.questionId);
      if (question) {
        if (!categoryScores[question.category]) {
          categoryScores[question.category] = { points: 0, earned: 0 };
        }
        categoryScores[question.category].points += question.points;
        categoryScores[question.category].earned += eval.points;
      }
    });

    // Calculate percentages
    Object.keys(categoryScores).forEach(category => {
      const score = categoryScores[category];
      score.percentage = score.points > 0 ? (score.earned / score.points) * 100 : 0;
    });

    return categoryScores;
  }

  private calculateDifficultyScores(assessment: Assessment, evaluations: any[]): Record<string, any> {
    const difficultyScores: Record<string, any> = {};

    evaluations.forEach(eval => {
      const question = assessment.questions.find(q => q.id === eval.questionId);
      if (question) {
        if (!difficultyScores[question.difficulty]) {
          difficultyScores[question.difficulty] = { points: 0, earned: 0 };
        }
        difficultyScores[question.difficulty].points += question.points;
        difficultyScores[question.difficulty].earned += eval.points;
      }
    });

    // Calculate percentages
    Object.keys(difficultyScores).forEach(difficulty => {
      const score = difficultyScores[difficulty];
      score.percentage = score.points > 0 ? (score.earned / score.points) * 100 : 0;
    });

    return difficultyScores;
  }

  private calculatePerformanceStatistics(results: AssessmentResult[]): any {
    if (results.length === 0) return {};

    const percentages = results.map(r => r.scores.percentage);
    const passed = results.filter(r => r.scores.passed).length;

    return {
      totalAssessments: results.length,
      averagePercentage: percentages.reduce((sum, p) => sum + p, 0) / percentages.length,
      highestScore: Math.max(...percentages),
      lowestScore: Math.min(...percentages),
      passRate: (passed / results.length) * 100,
      improvementTrend: this.calculateImprovementTrend(percentages),
      averageTimePerAssessment: results.reduce((sum, r) => sum + r.performance.timeSpent, 0) / results.length
    };
  }

  private calculateImprovementTrend(percentages: number[]): string {
    if (percentages.length < 2) return 'insufficient_data';

    const recent = percentages.slice(-3);
    const earlier = percentages.slice(0, -3);

    if (earlier.length === 0) return 'insufficient_data';

    const recentAvg = recent.reduce((sum, p) => sum + p, 0) / recent.length;
    const earlierAvg = earlier.reduce((sum, p) => sum + p, 0) / earlier.length;

    if (recentAvg > earlierAvg + 5) return 'improving';
    if (recentAvg < earlierAvg - 5) return 'declining';
    return 'stable';
  }

  /**
   * Get assessment from bank
   */
  getAssessment(assessmentId: string): Assessment | undefined {
    return this.assessmentBank.get(assessmentId);
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<AssessmentAgentConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get assessment statistics
   */
  getAssessmentStatistics(): {
    totalAssessments: number;
    averageDifficulty: string;
    mostCommonType: string;
    totalQuestions: number;
    averageTimeLimit: number;
    questionTypeDistribution: Record<string, number>;
  } {
    const assessments = Array.from(this.assessmentBank.values());

    return {
      totalAssessments: assessments.length,
      averageDifficulty: 'medium', // Would calculate from actual data
      mostCommonType: 'quiz',
      totalQuestions: assessments.reduce((sum, a) => sum + a.questions.length, 0),
      averageTimeLimit: assessments.reduce((sum, a) => sum + (a.settings.timeLimit || 60), 0) / assessments.length,
      questionTypeDistribution: assessments.reduce((dist, a) => {
        a.questions.forEach(q => {
          dist[q.type] = (dist[q.type] || 0) + 1;
        });
        return dist;
      }, {} as Record<string, number>)
    };
  }
}

/**
 * Default assessment agent configuration
 */
export const DEFAULT_ASSESSMENT_AGENT_CONFIG: AssessmentAgentConfig = {
  defaultDifficulty: 'medium',
  defaultTimeLimit: 30,
  includeFeedback: true,
  adaptiveMode: true,
  questionBank: true,
  analyticsEnabled: true
};