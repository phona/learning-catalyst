/**
 * Mock Services for Testing
 *
 * Common service mocks used across integration and performance tests
 */

import { vi } from 'vitest';
import { EventEmitter } from 'events';

// Mock Agent Registry
export const mockAgentRegistry = {
  getAgent: vi.fn().mockResolvedValue({
    id: 'mock-agent-id',
    name: 'Mock Agent',
    type: 'chat',
    capabilities: ['text-generation', 'analysis'],
    status: 'ready'
  }),
  registerAgent: vi.fn().mockResolvedValue(true),
  unregisterAgent: vi.fn().mockResolvedValue(true),
  listAgents: vi.fn().mockResolvedValue([])
};

// Mock Database Service
export const mockDatabaseService = {
  connect: vi.fn().mockResolvedValue(true),
  disconnect: vi.fn().mockResolvedValue(true),
  query: vi.fn().mockResolvedValue([]),
  execute: vi.fn().mockResolvedValue({ success: true }),
  transaction: vi.fn().mockImplementation(async (fn) => {
    await fn();
    return { success: true };
  }),
  // For error simulation
  _simulateError: false,
  simulateError() {
    this._simulateError = true;
    this.query = vi.fn().mockRejectedValue(new Error('Database connection lost'));
  },
  resetError() {
    this._simulateError = false;
    this.query = vi.fn().mockResolvedValue([]);
  }
};

// Mock LangChain Service
export const mockLangChainService = {
  processMessage: vi.fn().mockResolvedValue({
    type: 'learning_explanation',
    content: 'Mock LangChain response',
    metadata: { tokensUsed: 100, modelUsed: 'gpt-3.5-turbo' }
  }),
  initialize: vi.fn().mockResolvedValue(undefined),
  cleanup: vi.fn(),
  // For error simulation
  _simulateError: false,
  simulateError() {
    this._simulateError = true;
    this.processMessage = vi.fn().mockRejectedValue(new Error('API rate limit exceeded'));
  },
  resetError() {
    this._simulateError = false;
    this.processMessage = vi.fn().mockResolvedValue({
      type: 'learning_explanation',
      content: 'Mock LangChain response',
      metadata: { tokensUsed: 100, modelUsed: 'gpt-3.5-turbo' }
    });
  }
};

// Mock Catalyst Service
export const mockCatalystService = () => {
  let sessionIdCounter = 1;
  const mockSessions = new Map();
  const globalSessionData = new Map(); // Track session data across calls
  let simulateLangChainError = false;
  let simulateDatabaseError = false;

  return {
    // For error simulation in tests
    _simulateLangChainError() {
      simulateLangChainError = true;
    },
    _simulateDatabaseError() {
      simulateDatabaseError = true;
    },
    _resetErrors() {
      simulateLangChainError = false;
      simulateDatabaseError = false;
    },
    createSession: vi.fn().mockImplementation(async (data) => {
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      mockSessions.set(sessionId, { ...data, createdAt: Date.now() });
      return sessionId;
    }),
    processUserInput: vi.fn().mockImplementation(async (data) => {
      const { message, agentId, sessionId } = data;

      // Track session data
      if (!globalSessionData.has(sessionId)) {
        globalSessionData.set(sessionId, {
          agentsInvolved: [agentId],
          conceptsDiscussed: [],
          totalTokensUsed: 0,
          agentHandoffs: []
        });
      }

      const sessionData = globalSessionData.get(sessionId);
      sessionData.totalTokensUsed += 50;

      // Simulate error conditions
      if (simulateLangChainError) {
        return {
          type: 'error',
          content: 'Service temporarily unavailable',
          metadata: {
            tokensUsed: 0,
            agentId,
            timestamp: Date.now(),
            modelUsed: 'gpt-3.5-turbo',
            retryAfter: 30000,
            errorId: 'LC_ERROR_001'
          }
        };
      }

      if (simulateDatabaseError) {
        return {
          type: 'learning_explanation',
          content: 'Default response: All systems operational',
          metadata: {
            tokensUsed: 50,
            agentId,
            timestamp: Date.now(),
            modelUsed: 'gpt-3.5-turbo',
            offlineMode: true,
            dataPersisted: false
          }
        };
      }

      // Dynamic response based on message content
      let content = 'Mock response from CatalystService';
      let type = 'learning_explanation';

      if (message.includes('React Hooks') || message.includes('What are React Hooks')) {
        content = 'React Hooks are functions that let you use state and other React features in functional components without writing a class.';
      } else if (message.includes('useCallback optimization')) {
        content = 'useCallback is a React Hook that returns a memoized callback function. It only changes when one of its dependencies changes.';
      } else if (message.includes('React performance')) {
        content = 'React performance can be optimized through memoization, lazy loading, virtualization, and proper state management.';
      } else if (message.includes('database transactions')) {
        content = 'Database transactions ensure data integrity by grouping multiple operations into a single unit of work that either completely succeeds or fails.';
      } else if (message.includes('advanced React patterns') || message.includes('React patterns')) {
        content = 'Advanced React patterns include higher-order components, render props, compound components, and custom hooks for building scalable applications.';
        type = 'learning_explanation';
      } else if (message.includes('system design')) {
        content = 'System design involves creating scalable, maintainable architectures that can handle load and provide reliability.';
        type = 'learning_explanation';
      }

      // Update concepts discussed
      if (message.includes('React')) {
        sessionData.conceptsDiscussed.push('react-hooks');
      }
      if (message.includes('database')) {
        sessionData.conceptsDiscussed.push('database-transactions');
      }
      if (message.includes('test my knowledge') || message.includes('assessment')) {
        sessionData.conceptsDiscussed.push('assessment');
        type = 'assessment_response';
      }
      if (message.includes('practice') || message.includes('exercises')) {
        type = 'practice_exercise';
        content = JSON.stringify({
          exerciseDescription: 'Practice exercise for React patterns',
          starterCode: 'function MyComponent() { return <div>...</div>; }'
        });
      }
      if (message.includes('stuck on this exercise') || message.includes('step by step')) {
        type = 'tutoring_guidance';
        content = JSON.stringify({
          stepByStepInstructions: ['Step 1: Identify the problem', 'Step 2: Break it down', 'Step 3: Implement solution'],
          hints: ['Hint: Consider using React Hooks', 'Hint: Check component lifecycle']
        });
      }

      // Add sessionRestored flag for restored sessions
      const metadata: any = { tokensUsed: 50, agentId, timestamp: Date.now(), modelUsed: 'gpt-3.5-turbo' };
      if (message.includes('Continue with the next practice problem')) {
        metadata.sessionRestored = true;
      }

      return {
        type,
        content,
        metadata
      };
    }),
    selectAgent: vi.fn().mockImplementation(async (data) => {
      const { userInput, context } = data;

      // Dynamic agent selection based on context
      let agentType = 'learning';
      let agentId = 'learning-agent-001';
      let confidence = 0.9;

      if (userInput.includes('practice') || userInput.includes('exercises')) {
        agentType = 'practice';
        agentId = 'practice-agent-001';
        confidence = 0.95;
      } else if (userInput.includes('tutoring') || userInput.includes('step by step')) {
        agentType = 'tutoring';
        agentId = 'tutoring-agent-001';
        confidence = 0.92;
      }

      return {
        agentType,
        agentId,
        confidence
      };
    }),
    generatePracticeQuestions: vi.fn().mockImplementation(async (data) => {
      const { concept, count } = data;

      // Generate dynamic questions based on concept
      const questions = [];
      for (let i = 0; i < count; i++) {
        questions.push({
          question: `Test question ${i + 1} about ${concept}`,
          options: ['Option A', 'Option B', 'Option C'],
          correctAnswer: `Option ${String.fromCharCode(65 + i % 3)}`
        });
      }

      return questions;
    }),
    evaluateAnswers: vi.fn().mockImplementation(async (data) => {
      const { answers } = data;

      // Calculate score based on answers
      const score = Math.min(0.9, answers.length * 0.3 + Math.random() * 0.2);
      const masteryLevel = Math.min(1.0, score + 0.1);

      return {
        score,
        feedback: score > 0.7 ? 'Great job!' : 'Keep practicing!',
        masteryLevel
      };
    }),
    updateSessionProgress: vi.fn().mockImplementation(async (data) => {
      const { masteryGained, conceptsCovered } = data;

      return {
        masteryLevel: masteryGained,
        totalTimeSpent: 1200,
        completedConcepts: conceptsCovered
      };
    }),
    completeSession: vi.fn().mockImplementation(async (data) => {
      const { sessionId, finalMastery, userFeedback } = data;

      return {
        sessionId,
        finalMastery,
        analyticsUpdated: true
      };
    }),
    getSessionData: vi.fn().mockImplementation(async (sessionId) => {
      const sessionData = globalSessionData.get(sessionId) || {
        agentsInvolved: ['learning-agent-001'],
        conceptsDiscussed: ['react-hooks', 'database-transactions'],
        totalTokensUsed: 150,
        agentHandoffs: []
      };

      // Add assessment agent if practice questions were generated
      if (sessionData.conceptsDiscussed.includes('assessment')) {
        sessionData.agentsInvolved.push('assessment-agent-001');
        sessionData.agentHandoffs.push({
          fromAgent: 'learning-agent-001',
          toAgent: 'assessment-agent-001',
          reason: 'assessment requested',
          timestamp: '2023-01-01T00:00:00Z'
        });
      }

      return sessionData;
    }),
    getSessionCheckpoints: vi.fn().mockResolvedValue([
      { agentState: 'test-state', contextData: 'test-context' },
      { agentState: 'test-state-2', contextData: 'test-context-2' }
    ]),
    restoreSession: vi.fn().mockImplementation(async (sessionId) => {
      return {
        sessionId,
        currentContext: { topic: 'React' },
        agentHistory: ['learning-agent-001', 'practice-agent-001'],
        lastCheckpoint: { timestamp: '2023-01-01T00:00:00Z' }
      };
    }),
    evaluateAgentHandoff: vi.fn().mockImplementation(async (data) => {
      const { userInput } = data;

      return {
        shouldHandoff: userInput.includes('practice') || userInput.includes('exercises'),
        targetAgentType: userInput.includes('practice') || userInput.includes('exercises') ? 'practice' : 'assessment',
        targetAgentId: userInput.includes('practice') || userInput.includes('exercises') ? 'practice-agent-001' : 'assessment-agent-001'
      };
    }),
    startStreamingSession: vi.fn().mockImplementation(async (data) => {
      const streamSession = new EventEmitter();
      streamSession.streamId = `stream_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      streamSession.estimatedChunks = Math.max(5, Math.ceil((data.message?.length || 1000) / 50));

      // Mock streaming chunks
      setTimeout(() => {
        streamSession.emit('chunk', {
          index: 0,
          content: 'Microservices architecture is an approach...',
          metadata: { tokens: 15, model: 'gpt-4' }
        });
      }, 10);

      setTimeout(() => {
        streamSession.emit('chunk', {
          index: 1,
          content: 'where a single application is composed of...',
          metadata: { tokens: 12, model: 'gpt-4' }
        });
      }, 20);

      setTimeout(() => {
        streamSession.emit('end', {
          totalChunks: 2,
          totalTokens: 27,
          sessionId: data.sessionId
        });
      }, 30);

      return streamSession;
    }),
    initialize: vi.fn().mockResolvedValue(undefined),
    cleanup: vi.fn()
  };
};

// Mock Error Recovery Manager
export const mockErrorRecoveryManager = {
  attemptSessionRecovery: vi.fn().mockResolvedValue({
    corruptionDetected: true,
    backupRestored: true,
    restoredFromBackup: 'backup-001',
    sessionFunctional: true
  }),
  attemptSystemRecovery: vi.fn().mockResolvedValue({
    attempted: true,
    servicesRecoveryAttempted: ['langchain', 'agents'],
    recoveryStrategies: ['service_restart', 'cache_warmup']
  }),
  formatErrorForUser: vi.fn().mockReturnValue({
    message: 'Service temporarily unavailable',
    recoveryOptions: ['retry', 'try_later'],
    estimatedRecoveryTime: 30000,
    canRetry: true
  })
};

// Mock System Health Monitor
export const mockSystemHealthMonitor = {
  checkSystemHealth: vi.fn().mockResolvedValue({
    memoryPressure: 'high',
    actionsTaken: ['garbage_collection_triggered', 'non_essential_processes_paused']
  }),
  getCPUUsage: vi.fn().mockReturnValue(95),
  checkServiceHealth: vi.fn().mockResolvedValue({
    langchain: false,
    database: true,
    agents: false
  })
};

// Mock Electron IPC
export const mockElectronIPC = {
  invoke: vi.fn().mockImplementation(async (channel: string, data: any) => {
    // Provide mock responses for specific IPC channels
    if (channel === 'catalyst:process-input') {
      return {
        success: true,
        result: {
          type: 'learning_explanation',
          content: data?.message?.includes('useCallback')
            ? 'useCallback is a React Hook that returns a memoized callback function. It only changes when one of its dependencies changes.'
            : 'Mock response from CatalystService',
          metadata: { tokensUsed: 50, modelUsed: 'gpt-3.5-turbo' }
        }
      };
    }

    if (channel === 'catalyst:stream-response') {
      return {
        success: true,
        chunks: [
          { content: 'React performance can be optimized', chunkIndex: 0 },
          { content: 'through memoization, lazy loading,', chunkIndex: 1 },
          { content: 'virtualization, and proper state management.', chunkIndex: 2 }
        ]
      };
    }

    return { success: true };
  }),
  send: vi.fn(),
  on: vi.fn(),
  once: vi.fn(),
  removeAllListeners: vi.fn()
};

// Mock Service Factory
export const createMockServices = () => ({
  agentRegistry: mockAgentRegistry,
  databaseService: mockDatabaseService,
  catalystService: mockCatalystService(),
  langChainService: mockLangChainService,
  errorRecoveryManager: mockErrorRecoveryManager,
  healthMonitor: mockSystemHealthMonitor,
  ipc: mockElectronIPC
});

export default {
  mockAgentRegistry,
  mockDatabaseService,
  mockCatalystService,
  mockLangChainService,
  mockErrorRecoveryManager,
  mockSystemHealthMonitor,
  mockElectronIPC,
  createMockServices
};