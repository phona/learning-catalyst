/**
 * Mock Multi-Agent System
 *
 * Comprehensive mock framework for multi-agent architecture including
 * agent managers, specialized agents, orchestration patterns, and
 * agent lifecycle management. Enables testing of agent systems
 * without requiring actual LangChain agent implementations.
 */

import { vi } from 'vitest';

// Mock Base Agent Interface
export const mockBaseAgent = vi.fn().mockImplementation(function (config: any = {}) {
  const agent: any = {
    id: config?.id || 'mock-agent',
    name: config?.name || 'Mock Agent',
    type: config?.type || 'general',
    status: 'idle',
    initialized: false,
    disposed: false,

    // Agent configuration
    config: config,
    modelConfig: config?.modelConfig || {
      provider: 'openai',
      modelId: 'gpt-3.5-turbo',
      temperature: 0.7,
      maxTokens: 1000,
      timeout: 30000,
    },
    tools: config?.tools || [],
    capabilities: config?.capabilities || ['text-generation'],
    systemPrompt: config?.systemPrompt || 'You are a helpful AI assistant.',

    // Core agent methods
    initialize: vi.fn().mockImplementation(async function (this: any) {
      this.initialized = true;
      this.status = 'ready';
      return { success: true, message: 'Agent initialized' };
    }),

    dispose: vi.fn().mockImplementation(async function (this: any) {
      this.disposed = true;
      this.status = 'disposed';
      return { success: true, message: 'Agent disposed' };
    }),

    // Processing methods
    process: vi.fn().mockImplementation(async function (this: any, input: string, context?: any) {
      if (!this.initialized) {
        throw new Error('Agent not initialized');
      }

      this.status = 'processing';

      // Simulate processing delay
      await new Promise((resolve) => setTimeout(resolve, 100 + Math.random() * 400));

      const response = this._generateMockResponse(input, context);

      this.status = 'ready';
      return response;
    }),

    processStream: vi.fn().mockImplementation(async function* (
      this: any,
      input: string,
      context?: any,
    ) {
      if (!this.initialized) {
        throw new Error('Agent not initialized');
      }

      this.status = 'processing';

      const response = this._generateMockResponse(input, context);
      const chunks = response.content.split(' ').map((word: string) => word + ' ');

      for (const chunk of chunks) {
        yield {
          content: chunk,
          metadata: {
            agentId: this.id,
            agentType: this.type,
            timestamp: Date.now(),
          },
        };
        await new Promise((resolve) => setTimeout(resolve, 50 + Math.random() * 50));
      }

      this.status = 'ready';
    }),

    // Internal mock response generation
    _generateMockResponse: vi.fn().mockImplementation(function (
      this: any,
      input: string,
      context?: any,
    ) {
      return {
        content: `${this.name} response to: ${input}`,
        metadata: {
          agentId: this.id,
          agentType: this.type,
          model: this.modelConfig.modelId,
          tokensUsed: 50 + Math.floor(Math.random() * 100),
          processingTime: 100 + Math.floor(Math.random() * 400),
          confidence: 0.8 + Math.random() * 0.2,
          context: context || {},
        },
        reasoning: `I analyzed the request "${input}" and provided a comprehensive response based on my ${this.type} capabilities.`,
      };
    }),

    // Agent state management
    getStatus: vi.fn().mockImplementation(function (this: any) {
      return this.status;
    }),

    getConfig: vi.fn().mockImplementation(function (this: any) {
      return this.config;
    }),

    getStats: vi.fn().mockReturnValue({
      processedRequests: 0,
      totalProcessingTime: 0,
      averageProcessingTime: 0,
      errorCount: 0,
    }),

    // Test helpers
    _simulateError: vi.fn().mockImplementation(function (this: any, error: Error) {
      this.status = 'error';
      throw error;
    }),

    _resetStats: vi.fn().mockImplementation(function (this: any) {
      this.process?.mockClear();
      this.processStream?.mockClear();
    }),
  };

  return agent;
});

// Mock Learning Agent
export const mockLearningAgent = vi.fn().mockImplementation(function (config: any = {}) {
  const agent = {
    ...mockBaseAgent(config),
    type: 'learning',
    capabilities: ['concept-explanation', 'learning-path', 'knowledge-assessment'],
    specializedTools: ['concept-parser', 'knowledge-graph', 'assessment-generator'],

    // Learning-specific methods
    explainConcept: vi.fn().mockImplementation(async function (
      this: any,
      concept: string,
      depth = 'intermediate',
    ) {
      const depthMap = {
        basic: 'simple explanation',
        intermediate: 'detailed explanation with examples',
        advanced: 'comprehensive explanation with advanced concepts',
      };

      return {
        concept,
        explanation: `${concept}: ${depthMap[depth as keyof typeof depthMap]}`,
        examples: [`Example 1 for ${concept}`, `Example 2 for ${concept}`],
        relatedConcepts: [`Related to ${concept} A`, `Related to ${concept} B`],
        difficulty: depth,
        estimatedLearningTime: '15-30 minutes',
        prerequisites: [`Prerequisite for ${concept}`],
      };
    }),

    generateLearningPath: vi.fn().mockImplementation(async function (
      this: any,
      topic: string,
      currentLevel: string,
      targetLevel: string,
    ) {
      return {
        topic,
        currentLevel,
        targetLevel,
        path: [
          {
            step: 1,
            title: `Foundation of ${topic}`,
            description: 'Basic concepts and terminology',
            estimatedTime: '30 minutes',
            resources: ['Resource 1', 'Resource 2'],
            exercises: ['Exercise 1'],
          },
          {
            step: 2,
            title: `Intermediate ${topic}`,
            description: 'Practical applications and examples',
            estimatedTime: '45 minutes',
            resources: ['Resource 3', 'Resource 4'],
            exercises: ['Exercise 2', 'Exercise 3'],
          },
          {
            step: 3,
            title: `Advanced ${topic}`,
            description: 'Complex concepts and best practices',
            estimatedTime: '60 minutes',
            resources: ['Resource 5'],
            exercises: ['Exercise 4', 'Exercise 5'],
          },
        ],
        totalEstimatedTime: '2 hours 15 minutes',
      };
    }),

    assessKnowledge: vi.fn().mockImplementation(async function (
      this: any,
      topic: string,
      userResponses: string[],
    ) {
      return {
        topic,
        score: 75 + Math.floor(Math.random() * 25),
        strengthAreas: ['Basic understanding', 'Practical application'],
        improvementAreas: ['Advanced concepts', 'Best practices'],
        recommendations: [
          'Review advanced concepts',
          'Practice more complex scenarios',
          'Study best practices',
        ],
        nextSteps: ['Complete advanced exercises', 'Take on real-world projects'],
      };
    }),
  };
  return agent;
});

// Mock Practice Agent
export const mockPracticeAgent = vi.fn().mockImplementation(function (config: any = {}) {
  const agent = {
    ...mockBaseAgent(config),
    type: 'practice',
    capabilities: ['exercise-generation', 'solution-validation', 'feedback-provision'],
    specializedTools: ['exercise-generator', 'code-validator', 'feedback-analyzer'],

    // Practice-specific methods
    generateExercise: vi.fn().mockImplementation(async function (
      this: any,
      topic: string,
      difficulty: string,
      exerciseType: string,
    ) {
      const exerciseTypes = {
        coding: 'Write a function to solve...',
        quiz: 'Multiple choice questions about...',
        project: 'Build a small project that...',
        theoretical: 'Explain the concept of...',
      };

      return {
        id: `exercise-${Date.now()}`,
        topic,
        difficulty,
        type: exerciseType,
        title: `${difficulty} ${exerciseType} exercise for ${topic}`,
        description: exerciseTypes[exerciseType as keyof typeof exerciseTypes],
        instructions: [
          'Step 1: Analyze the requirements',
          'Step 2: Plan your approach',
          'Step 3: Implement the solution',
          'Step 4: Test and refine',
        ],
        constraints: [
          'Time limit: 30 minutes',
          'Use only concepts covered in the learning materials',
        ],
        hints: ['Hint 1: Start with the basic structure', 'Hint 2: Consider edge cases'],
        estimatedTime: '20-30 minutes',
        points: 100,
      };
    }),

    validateSolution: vi.fn().mockImplementation(async function (
      this: any,
      exerciseId: string,
      solution: any,
    ) {
      const score = 70 + Math.floor(Math.random() * 30);
      const passed = score >= 80;

      return {
        exerciseId,
        score,
        passed,
        feedback: {
          overall: passed
            ? 'Great job! Your solution works correctly.'
            : 'Your solution needs some improvements.',
          strengths: [
            'Good problem understanding',
            'Clean code structure',
            'Proper error handling',
          ],
          improvements: ['Consider edge cases', 'Optimize performance', 'Add more comments'],
          suggestions: ['Try using a different approach', 'Review the requirements again'],
        },
        testResults: {
          totalTests: 10,
          passedTests: Math.floor(score / 10),
          failedTests: 10 - Math.floor(score / 10),
          details: [
            { test: 'Test 1', passed: true, message: 'Correct output' },
            {
              test: 'Test 2',
              passed: score >= 90,
              message: score >= 90 ? 'Correct output' : 'Wrong output',
            },
          ],
        },
      };
    }),

    provideFeedback: vi.fn().mockImplementation(async function (
      this: any,
      exerciseId: string,
      userSolution: any,
      improvementAreas: string[],
    ) {
      return {
        exerciseId,
        feedback: {
          detailed: 'Here is detailed feedback on your solution...',
          actionable: [
            'Specific action 1 to improve',
            'Specific action 2 to improve',
            'Specific action 3 to improve',
          ],
          resources: [
            'Resource to help with improvement area 1',
            'Resource to help with improvement area 2',
          ],
          nextSteps: ['Practice similar exercises', 'Review related concepts'],
        },
        personalizedTips: [
          'Tip based on your specific solution approach',
          'Tip for your coding style',
        ],
      };
    }),
  };
  return agent;
});

// Mock Tutoring Agent
export const mockTutoringAgent = vi.fn().mockImplementation(function (config: any = {}) {
  const agent = {
    ...mockBaseAgent(config),
    type: 'tutoring',
    capabilities: ['personalized-guidance', 'socratic-questioning', 'adaptive-explanations'],
    specializedTools: ['learning-style-analyzer', 'question-generator', 'explanation-adapters'],

    // Tutoring-specific methods
    providePersonalizedGuidance: vi.fn().mockImplementation(async function (
      this: any,
      userId: string,
      topic: string,
      userLevel: string,
      learningStyle: string,
    ) {
      const learningStyles = {
        visual: 'visual aids and diagrams',
        auditory: 'verbal explanations and discussions',
        kinesthetic: 'hands-on practice and real-world examples',
        reading: 'written materials and documentation',
      };

      return {
        userId,
        topic,
        userLevel,
        learningStyle,
        personalizedPlan: {
          approach: `Use ${learningStyles[learningStyle as keyof typeof learningStyles]} to teach ${topic}`,
          sessionStructure: [
            'Assess current understanding',
            'Introduce new concepts using preferred learning style',
            'Practice with appropriate exercises',
            'Review and reinforce learning',
          ],
          adaptation: 'Adjust pace and approach based on real-time feedback',
          estimatedSessions: 3,
          estimatedDuration: '1.5 hours',
        },
        recommendations: {
          studyMaterials: [
            `${learningStyle}-friendly resource for ${topic}`,
            'Practice exercises tailored to learning style',
          ],
          studyTips: [
            `Focus on ${learningStyle} learning methods`,
            'Take breaks every 25 minutes',
            'Review concepts regularly',
          ],
        },
      };
    }),

    askSocraticQuestions: vi.fn().mockImplementation(async function (
      this: any,
      topic: string,
      userResponse: string,
    ) {
      const questionSequence = [
        `What do you already know about ${topic}?`,
        `Why do you think ${topic} is important?`,
        `How would you explain ${topic} to someone else?`,
        `What aspects of ${topic} are confusing to you?`,
        `How can you apply what you've learned about ${topic}?`,
      ];

      const currentQuestionIndex = Math.floor(Math.random() * questionSequence.length);

      return {
        currentQuestion: questionSequence[currentQuestionIndex],
        questionPurpose: 'To stimulate critical thinking and self-reflection',
        expectedResponse: 'Should encourage deeper thinking about the topic',
        followUpSuggestions: [
          'Think about real-world applications',
          'Consider the underlying principles',
          'Connect to previous knowledge',
        ],
        progressTracking: {
          questionNumber: currentQuestionIndex + 1,
          totalQuestions: questionSequence.length,
          completedPercentage: Math.round(
            ((currentQuestionIndex + 1) / questionSequence.length) * 100,
          ),
        },
      };
    }),

    adaptExplanation: vi.fn().mockImplementation(async function (
      this: any,
      concept: string,
      userUnderstanding: string,
      confusionPoints: string[],
    ) {
      return {
        concept,
        adaptedExplanation: {
          level:
            userUnderstanding === 'beginner'
              ? 'simple'
              : userUnderstanding === 'intermediate'
                ? 'moderate'
                : 'advanced',
          approach: 'Address specific confusion points directly',
          content: `Adapted explanation of ${concept} focusing on: ${confusionPoints.join(', ')}`,
          examples: [
            `Example addressing ${confusionPoints[0] || 'common confusion'}`,
            'Practical application example',
            'Analogy to understand the concept better',
          ],
          visualAids:
            userUnderstanding === 'beginner'
              ? ['Simple diagram showing basic concept', 'Step-by-step visualization']
              : ['Complex diagram showing relationships', 'Flow diagram of processes'],
        },
        checkUnderstanding: [
          `Can you explain ${concept} in your own words?`,
          `How does ${concept} relate to what you already know?`,
          `What questions do you still have about ${concept}?`,
        ],
        nextSteps: [
          'Practice with guided exercises',
          'Apply concept to real scenarios',
          'Teach the concept to someone else',
        ],
      };
    }),
  };
  return agent;
});

// Mock Provider Factory (replaces AgentManager for direct model access)
export const mockProviderFactory = vi.fn().mockImplementation(function (config: any = {}) {
  const factory: any = {
    config: config,
    models: new Map(),
    embeddings: new Map(),

    // Model access
    getModel: vi.fn().mockImplementation(function (this: any, providerName?: string) {
      const mockModel = {
        provider: providerName || 'openai',
        modelId: config?.modelId || 'gpt-3.5-turbo',
        invoke: vi.fn().mockResolvedValue({
          content: `Mock response from ${providerName || 'default'} model`,
          metadata: {
            tokensUsed: 50,
            processingTime: 100,
          }
        }),
        stream: vi.fn().mockImplementation(async function* () {
          yield { content: 'Mock ', type: 'token' };
          yield { content: 'stream ', type: 'token' };
          yield { content: 'response', type: 'token' };
        }),
      };
      return mockModel;
    }),

    getEmbeddings: vi.fn().mockImplementation(function (this: any) {
      return {
        embed: vi.fn().mockResolvedValue([0.1, 0.2, 0.3, 0.4, 0.5]),
        embedBatch: vi.fn().mockResolvedValue([[0.1, 0.2], [0.3, 0.4]]),
      };
    }),

    getRerankModel: vi.fn().mockImplementation(function (this: any) {
      return {
        rerank: vi.fn().mockResolvedValue([
          { index: 0, score: 0.9 },
          { index: 1, score: 0.7 },
        ]),
      };
    }),

    // Configuration
    validateConfig: vi.fn().mockResolvedValue({ valid: true }),
    updateConfig: vi.fn().mockImplementation(function (this: any, newConfig: any) {
      this.config = { ...this.config, ...newConfig };
      return Promise.resolve(this.config);
    }),
  };

  return factory;
});

// Export comprehensive mock collection
export const AgentMocks = {
  // Base agent
  BaseAgent: mockBaseAgent,

  // Specialized agents
  LearningAgent: mockLearningAgent,
  PracticeAgent: mockPracticeAgent,
  TutoringAgent: mockTutoringAgent,

  // Provider Factory (replaces AgentManager)
  ProviderFactory: mockProviderFactory,
};

// Export default mock collection
export default AgentMocks;
