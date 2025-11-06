# Comprehensive TDD Framework for Multi-Agent Learning Catalyst

## Executive Summary

This document outlines a comprehensive Test-Driven Development (TDD) framework designed specifically for the refactored Learning Catalyst architecture with multi-agent orchestration. The framework addresses the unique challenges of testing Electron applications with main thread LangChain services, IPC communication, and complex multi-agent workflows.

## Current Testing Setup Analysis

### ✅ Existing Strengths
- **Vitest Framework**: Modern testing setup with React Testing Library and jsdom
- **IPC Testing**: Established patterns for inter-process communication testing
- **Component Testing**: Well-structured React component test organization
- **Mock Infrastructure**: Comprehensive Electron API mocking already in place
- **Integration Patterns**: Cross-service workflow testing foundation

### 🔍 Identified Gaps
- **Main Thread Testing**: No testing for LangChain services running in main process
- **Multi-Agent Testing**: Missing tests for agent orchestration and handoff patterns
- **Streaming Testing**: Limited testing for real-time streaming responses
- **Session Management**: Enhanced session testing for multi-agent scenarios
- **Performance Testing**: Load testing for concurrent multi-agent sessions
- **Checkpoint Testing**: LangGraph checkpoint persistence testing

## TDD Framework Architecture

### 1. Multi-Environment Testing Setup

#### **Dual Configuration Strategy**
```typescript
// vitest.renderer.config.ts - For UI components and renderer services
export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/renderer/setup.ts'],
    include: ['src/test/renderer/**/*.{test,spec}.{js,ts,tsx}'],
    pool: 'threads'
  }
});

// vitest.main.config.ts - For main process services and LangChain
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/test/main-process/setup.ts'],
    include: ['src/test/main-process/**/*.{test,spec}.{js,ts}'],
    pool: 'threads',
    poolOptions: {
      threads: {
        isolate: true // Complete isolation for database testing
      }
    }
  }
});
```

#### **Package.json Scripts Enhancement**
```json
{
  "scripts": {
    "test": "vitest",
    "test:renderer": "vitest --config vitest.renderer.config.ts",
    "test:main": "vitest --config vitest.main.config.ts",
    "test:integration": "vitest --config vitest.integration.config.ts",
    "test:performance": "vitest --config vitest.performance.config.ts",
    "test:coverage": "vitest run --coverage --reporter=html",
    "test:tdd": "vitest --watch --reporter=verbose",
    "test:ci": "vitest run --reporter=junit --coverage",
    "test:debug": "vitest --inspect-brk"
  }
}
```

### 2. Test Structure Organization

```
src/test/
├── renderer/                  # Renderer process testing
│   ├── components/           # React component tests
│   ├── hooks/               # Custom hook tests
│   ├── services/            # Renderer service tests
│   └── setup.ts             # Renderer test setup
├── main-process/             # Main process testing
│   ├── services/            # LangChain service tests
│   │   ├── catalyst-service-main.test.ts
│   │   ├── agent-manager-main.test.ts
│   │   └── tool-executor-main.test.ts
│   ├── agents/              # Agent implementation tests
│   │   ├── tool-calling-agent.test.ts
│   │   ├── handoff-agent.test.ts
│   │   ├── hybrid-agent.test.ts
│   │   └── agent-registry.test.ts
│   ├── langgraph/           # LangGraph integration tests
│   │   ├── checkpoint-saver.test.ts
│   │   ├── checkpoint-serialization.test.ts
│   │   └── checkpoint-recovery.test.ts
│   └── setup.ts             # Main process test setup
├── ipc-enhanced/            # Enhanced IPC communication tests
│   ├── message-channel.test.ts
│   ├── streaming-communication.test.ts
│   ├── timeout-handling.test.ts
│   ├── error-propagation.test.ts
│   └── cross-process-workflows.test.ts
├── multi-agent/             # Multi-agent orchestration tests
│   ├── orchestration.test.ts
│   ├── handoff-workflows.test.ts
│   ├── tool-calling-patterns.test.ts
│   ├── hybrid-patterns.test.ts
│   └── agent-lifecycle.test.ts
├── sessions/                # Enhanced session management tests
│   ├── multi-agent-sessions.test.ts
│   ├── session-restoration.test.ts
│   ├── checkpoint-integration.test.ts
│   ├── concurrent-sessions.test.ts
│   └── session-migration.test.ts
├── integration/             # Full integration testing
│   ├── end-to-end-workflows.test.ts
│   ├── multi-process-flows.test.ts
│   ├── performance.test.ts
│   ├── load-testing.test.ts
│   └── error-scenarios.test.ts
├── utils/                   # Testing utilities and mocks
│   ├── mock-langchain.ts
│   ├── mock-electron-main.ts
│   ├── mock-electron-renderer.ts
│   ├── test-database-factory.ts
│   ├── streaming-test-utils.ts
│   ├── agent-test-helpers.ts
│   └── performance-test-utils.ts
└── fixtures/                # Test data and fixtures
    ├── sample-sessions.json
    ├── agent-configs.json
    ├── learning-content.md
    └── checkpoint-data.json
```

### 3. Mock Strategy Implementation

#### **LangChain Mocking Framework**
```typescript
// src/test/utils/mock-langchain.ts
import { vi } from 'vitest';

export class MockLangChainFactory {
  static createMockAgent(config: any = {}) {
    return {
      invoke: vi.fn().mockResolvedValue({
        content: config.response || 'Mock agent response',
        metadata: {
          agent: config.type || 'learning',
          toolsUsed: config.tools || [],
          processingTime: config.processingTime || 100
        },
        tool_calls: config.toolCalls || []
      }),
      stream: vi.fn().mockImplementation(function* () {
        const chunks = config.streamChunks || ['Mock', ' streaming', ' response'];
        for (const chunk of chunks) {
          yield { content: chunk, type: 'thinking' };
        }
      }),
      bind: vi.fn().mockReturnThis(),
      withConfig: vi.fn().mockReturnThis(),
      withStructuredOutput: vi.fn().mockReturnThis()
    };
  }

  static createMockTool(toolName: string, result: any = {}) {
    return {
      name: toolName,
      description: `Mock ${toolName} tool`,
      invoke: vi.fn().mockResolvedValue({
        success: true,
        result: result
      }),
      schema: {
        type: 'function',
        function: {
          name: toolName,
          description: `Mock ${toolName} function`,
          parameters: { type: 'object', properties: {} }
        }
      }
    };
  }

  static createMockLangGraph() {
    return {
      createGraph: vi.fn().mockReturnValue({
        invoke: vi.fn().mockResolvedValue({ result: 'Graph executed' }),
        stream: vi.fn().mockImplementation(function* () {
          yield { node: 'agent_1', output: 'Step 1 complete' };
          yield { node: 'agent_2', output: 'Step 2 complete' };
        })
      }),
      createCheckpointSaver: vi.fn().mockReturnValue({
        put: vi.fn().mockResolvedValue({ success: true }),
        get: vi.fn().mockResolvedValue({ checkpoint: { state: {} } }),
        list: vi.fn().mockResolvedValue([])
      })
    };
  }
}
```

#### **Database Testing Infrastructure**
```typescript
// src/test/utils/test-database-factory.ts
import { Database } from 'sqlite-electron';
import { readFileSync } from 'fs';

export class TestDatabaseFactory {
  private static databases: Map<string, Database> = new Map();

  static async createInMemoryDatabase(name: string = 'test'): Promise<Database> {
    if (this.databases.has(name)) {
      return this.databases.get(name)!;
    }

    const db = new Database(':memory:');

    // Load and execute schema
    const schema = readFileSync('src/main/services/database/schema.sql', 'utf8');
    db.exec(schema);

    // Load seed data if available
    try {
      const seedData = readFileSync('src/test/fixtures/seed-data.sql', 'utf8');
      db.exec(seedData);
    } catch (error) {
      // No seed data file, continue with empty database
    }

    this.databases.set(name, db);
    return db;
  }

  static async createTestDatabaseWithMockData(): Promise<Database> {
    const db = await this.createInMemoryDatabase('mock-data');

    // Insert mock data
    db.exec(`
      INSERT INTO sessions (id, title, created_at, metadata) VALUES
      ('test-session-1', 'Multi-Agent Learning Session', datetime('now'), '{"agents": ["learning", "assessment"]}'),
      ('test-session-2', 'React Hooks Tutorial', datetime('now'), '{"progress": 0.7}');

      INSERT INTO concepts (id, name, concept_type, difficulty_level, mastery_level) VALUES
      ('concept-ml', 'Machine Learning', 'topic', 3, 0.5),
      ('concept-react', 'React Hooks', 'topic', 2, 0.8);

      INSERT INTO agent_transitions (session_id, agent_type, action, timestamp, metadata) VALUES
      ('test-session-1', 'learning', 'started', datetime('now'), '{"tool": "parseConcepts"}'),
      ('test-session-1', 'learning', 'handoff_to_assessment', datetime('now'), '{"reason": "quiz_request"}'),
      ('test-session-1', 'assessment', 'started', datetime('now'), '{"quiz_type": "multiple_choice"}');
    `);

    return db;
  }

  static async cleanupDatabase(name: string): Promise<void> {
    if (this.databases.has(name)) {
      const db = this.databases.get(name)!;
      db.close();
      this.databases.delete(name);
    }
  }

  static async cleanupAllDatabases(): Promise<void> {
    for (const [name] of this.databases) {
      await this.cleanupDatabase(name);
    }
  }
}
```

### 4. TDD Implementation Patterns

#### **Red-Green-Refactor Cycle Implementation**

```typescript
// src/test/main-process/services/agent-manager-main.test.ts
describe('AgentManagerMain - TDD Implementation', () => {
  let agentManager: AgentManagerMain;
  let mockDatabase: any;
  let mockLangChain: any;

  beforeEach(async () => {
    mockDatabase = await TestDatabaseFactory.createInMemoryDatabase();
    mockLangChain = MockLangChainFactory.createMockLangGraph();
    agentManager = new AgentManagerMain(mockDatabase, mockLangChain);
  });

  afterEach(async () => {
    await TestDatabaseFactory.cleanupDatabase();
  });

  describe('Agent Creation and Lifecycle', () => {
    it('should create learning agent with concept parsing tools', async () => {
      // RED: Test fails initially - no implementation
      const agentConfig = {
        type: 'learning',
        tools: ['parseConcepts', 'searchSessions'],
        model: 'gpt-4',
        systemPrompt: 'You are a helpful learning assistant'
      };

      const agent = await agentManager.createAgent(agentConfig);

      // GREEN: Assertions drive implementation
      expect(agent).toBeDefined();
      expect(agent.type).toBe('learning');
      expect(agent.tools).toContain('parseConcepts');
      expect(agent.tools).toContain('searchSessions');

      // Verify LangChain integration
      expect(mockLangChain.createGraph).toHaveBeenCalledWith(
        expect.objectContaining({
          agentType: 'learning',
          tools: expect.arrayContaining([
            expect.objectContaining({ name: 'parseConcepts' }),
            expect.objectContaining({ name: 'searchSessions' })
          ])
        })
      );
    });

    it('should handle agent creation with invalid configuration', async () => {
      // RED: Error handling test
      const invalidConfig = {
        type: 'invalid_agent',
        tools: ['nonexistent_tool']
      };

      await expect(agentManager.createAgent(invalidConfig))
        .rejects.toThrow('Invalid agent type: invalid_agent');
    });

    it('should update agent configuration dynamically', async () => {
      // RED: Dynamic configuration test
      const agent = await agentManager.createAgent({
        type: 'learning',
        tools: ['parseConcepts']
      });

      const updatedConfig = {
        tools: ['parseConcepts', 'createExercise'],
        model: 'gpt-3.5-turbo'
      };

      await agentManager.updateAgentConfig(agent.id, updatedConfig);

      const updatedAgent = await agentManager.getAgent(agent.id);
      expect(updatedAgent.tools).toContain('createExercise');
      expect(updatedAgent.model).toBe('gpt-3.5-turbo');
    });
  });

  describe('Tool Execution Integration', () => {
    it('should execute concept parsing tool with database integration', async () => {
      // RED: Tool execution test
      const toolRequest = {
        tool: 'parseConcepts',
        input: 'Machine learning is a subset of artificial intelligence',
        context: { sessionId: 'test-session-1' }
      };

      // Mock tool implementation
      const mockTool = MockLangChainFactory.createMockTool('parseConcepts', {
        concepts: [
          { name: 'Machine Learning', confidence: 0.95 },
          { name: 'Artificial Intelligence', confidence: 0.90 }
        ],
        relationships: [
          { from: 'Machine Learning', to: 'Artificial Intelligence', type: 'subset_of' }
        ]
      });

      const result = await agentManager.executeTool(toolRequest.tool, toolRequest.input, toolRequest.context);

      // GREEN: Verify tool execution
      expect(result.concepts).toHaveLength(2);
      expect(result.concepts[0].name).toBe('Machine Learning');
      expect(result.relationships).toHaveLength(1);

      // Verify database integration
      const savedConcepts = await mockDatabase.fetchAll(
        'SELECT * FROM concepts WHERE session_id = ?',
        ['test-session-1']
      );
      expect(savedConcepts).toHaveLength(2);
    });

    it('should handle tool execution failures gracefully', async () => {
      // RED: Error handling test
      const failingTool = MockLangChainFactory.createMockTool('failingTool');
      failingTool.invoke.mockRejectedValue(new Error('Tool execution failed'));

      const toolRequest = {
        tool: 'failingTool',
        input: 'Test input',
        context: {}
      };

      await expect(agentManager.executeTool(toolRequest.tool, toolRequest.input, toolRequest.context))
        .rejects.toThrow('Tool execution failed');

      // Verify error logging
      expect(mockDatabase.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO tool_errors'),
        expect.arrayContaining(['failingTool', 'Tool execution failed'])
      );
    });
  });
});
```

#### **Multi-Agent Orchestration Testing**

```typescript
// src/test/multi-agent/handoff-workflows.test.ts
describe('Handoff Pattern - Multi-Agent Workflows', () => {
  let handoffManager: HandoffManager;
  let mockAgents: Map<string, any>;
  let mockDatabase: any;

  beforeEach(async () => {
    mockDatabase = await TestDatabaseFactory.createInMemoryDatabase();
    mockAgents = new Map([
      ['learning', createMockAgent('learning')],
      ['assessment', createMockAgent('assessment')],
      ['practice', createMockAgent('practice')],
      ['tutoring', createMockAgent('tutoring')]
    ]);

    handoffManager = new HandoffManager(Array.from(mockAgents.values()), mockDatabase);
  });

  describe('Agent Handoff Sequences', () => {
    it('should execute learning → practice → assessment handoff sequence', async () => {
      // RED: Complex handoff workflow test
      const learningAgent = mockAgents.get('learning');
      learningAgent.processMessage.mockResolvedValue({
        response: 'Let me explain React hooks and then provide some practice exercises.',
        handoff: {
          targetAgent: 'practice',
          reason: 'User requested practice exercises',
          context: 'React hooks practice exercises for intermediate level'
        },
        metadata: { confidence: 0.9, topic: 'React hooks' }
      });

      const practiceAgent = mockAgents.get('practice');
      practiceAgent.processMessage.mockResolvedValue({
        response: 'Here are some React hooks exercises. Now let\'s test your understanding.',
        handoff: {
          targetAgent: 'assessment',
          reason: 'Ready to assess learning',
          context: 'React hooks assessment quiz'
        },
        metadata: { exercisesCreated: 5, difficulty: 'intermediate' }
      });

      const assessmentAgent = mockAgents.get('assessment');
      assessmentAgent.processMessage.mockResolvedValue({
        response: 'Great job! You scored 85% on React hooks. Here are your recommendations.',
        handoff: null,
        metadata: { score: 0.85, recommendations: ['Advanced hooks patterns'] }
      });

      const result = await handoffManager.processConversation({
        initialMessage: 'I want to learn React hooks and get assessed',
        context: { sessionId: 'handoff-test-session', userLevel: 'intermediate' }
      });

      // GREEN: Verify complete handoff sequence
      expect(result.agentsUsed).toEqual(['learning', 'practice', 'assessment']);
      expect(result.handoffs).toHaveLength(2);

      // Verify first handoff
      expect(result.handoffs[0].from).toBe('learning');
      expect(result.handoffs[0].to).toBe('practice');
      expect(result.handoffs[0].reason).toBe('User requested practice exercises');

      // Verify second handoff
      expect(result.handoffs[1].from).toBe('practice');
      expect(result.handoffs[1].to).toBe('assessment');

      // Verify final response
      expect(result.finalResponse).toContain('85%');
      expect(result.timeline).toHaveLength(3);

      // Verify database tracking
      const transitions = await mockDatabase.fetchAll(
        'SELECT * FROM agent_transitions WHERE session_id = ? ORDER BY timestamp',
        ['handoff-test-session']
      );
      expect(transitions).toHaveLength(3);
    });

    it('should prevent infinite handoff loops with circuit breaker', async () => {
      // RED: Loop prevention test
      const loopingAgent = createMockAgent('learning');
      loopingAgent.processMessage.mockResolvedValue({
        response: 'Handing off to myself',
        handoff: {
          targetAgent: 'learning',
          reason: 'Loop test',
          context: 'Should trigger circuit breaker'
        }
      });

      const handoffManager = new HandoffManager([loopingAgent], mockDatabase);

      const result = await handoffManager.processConversation({
        initialMessage: 'Test loop prevention',
        context: { sessionId: 'loop-test-session' }
      });

      // GREEN: Verify circuit breaker activation
      expect(result.handoffs).toBeLessThanOrEqual(10);
      expect(result.finalResponse).toContain('maximum handoffs reached');

      // Verify loop detection in database
      const loopDetection = await mockDatabase.fetchOne(
        'SELECT * FROM handoff_anomalies WHERE session_id = ?',
        ['loop-test-session']
      );
      expect(loopDetection).toBeDefined();
      expect(loopDetection.anomaly_type).toBe('infinite_loop');
    });
  });

  describe('Context Preservation During Handoffs', () => {
    it('should preserve and propagate context across agent transitions', async () => {
      // RED: Context preservation test
      const initialContext = {
        sessionId: 'context-test-session',
        userLevel: 'beginner',
        topic: 'JavaScript closures',
        learningGoals: ['understand scope', 'practical examples'],
        previousInteractions: ['explained variables', 'showed scope examples']
      };

      const learningAgent = mockAgents.get('learning');
      learningAgent.processMessage.mockResolvedValue({
        response: 'Let me explain closures with context preservation',
        handoff: {
          targetAgent: 'practice',
          reason: 'Need practical exercises',
          context: initialContext
        },
        contextEnhancement: {
          conceptUnderstanding: 0.7,
          questionsAsked: 3
        }
      });

      const practiceAgent = mockAgents.get('practice');
      practiceAgent.processMessage.mockResolvedValue({
        response: 'Here are closure exercises based on your level',
        handoff: null,
        contextPreservation: {
          originalTopic: 'JavaScript closures',
          userLevel: 'beginner',
          exercisesDifficulty: 'beginner'
        }
      });

      const result = await handoffManager.processConversation({
        initialMessage: 'Teach me about closures',
        context: initialContext
      });

      // GREEN: Verify context preservation
      expect(result.contextHistory).toBeDefined();
      expect(result.contextHistory[0]).toEqual(initialContext);
      expect(result.contextHistory[1].userLevel).toBe('beginner');
      expect(result.contextHistory[1].conceptUnderstanding).toBe(0.7);

      // Verify agent received enhanced context
      expect(practiceAgent.processMessage).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          context: expect.objectContaining({
            userLevel: 'beginner',
            topic: 'JavaScript closures',
            conceptUnderstanding: 0.7
          })
        })
      );
    });
  });
});
```

### 5. Session Management Testing Framework

```typescript
// src/test/sessions/multi-agent-sessions.test.ts
describe('Multi-Agent Session Management', () => {
  let sessionManager: SessionManager;
  let mockDatabase: any;
  let mockCheckpointSaver: any;

  beforeEach(async () => {
    mockDatabase = await TestDatabaseFactory.createInMemoryDatabase();
    mockCheckpointSaver = MockLangChainFactory.createMockLangGraph().createCheckpointSaver();
    sessionManager = new SessionManager(mockDatabase, mockCheckpointSaver);
  });

  describe('Multi-Agent Session Tracking', () => {
    it('should track complete agent lifecycle within session', async () => {
      // RED: Complete lifecycle tracking test
      const sessionId = 'lifecycle-test-session';

      await sessionManager.createSession(sessionId, {
        title: 'Multi-Agent Lifecycle Test',
        agentTracking: { enabled: true },
        metadata: { userLevel: 'intermediate', topic: 'React state management' }
      });

      // Simulate complete agent interaction sequence
      const agentLifecycle = [
        {
          agent: 'learning',
          action: 'session_started',
          timestamp: Date.now(),
          metadata: { tools: ['parseConcepts'], input: 'Explain React state' }
        },
        {
          agent: 'learning',
          action: 'tool_executed',
          timestamp: Date.now() + 1000,
          metadata: { tool: 'parseConcepts', conceptsExtracted: 5 }
        },
        {
          agent: 'learning',
          action: 'handoff_initiated',
          timestamp: Date.now() + 2000,
          metadata: { targetAgent: 'practice', reason: 'practice_requested' }
        },
        {
          agent: 'practice',
          action: 'session_joined',
          timestamp: Date.now() + 3000,
          metadata: { contextReceived: true, tools: ['createExercise'] }
        },
        {
          agent: 'practice',
          action: 'exercise_created',
          timestamp: Date.now() + 4000,
          metadata: { exerciseCount: 3, difficulty: 'intermediate' }
        },
        {
          agent: 'practice',
          action: 'handoff_initiated',
          timestamp: Date.now() + 5000,
          metadata: { targetAgent: 'assessment', reason: 'assessment_ready' }
        },
        {
          agent: 'assessment',
          action: 'session_joined',
          timestamp: Date.now() + 6000,
          metadata: { quizGenerated: true, questionCount: 5 }
        },
        {
          agent: 'assessment',
          action: 'assessment_completed',
          timestamp: Date.now() + 7000,
          metadata: { score: 0.85, completedQuestions: 5 }
        }
      ];

      // Record lifecycle events
      for (const event of agentLifecycle) {
        await sessionManager.recordAgentEvent(sessionId, event);
      }

      // Verify complete session state
      const sessionState = await sessionManager.getSessionState(sessionId);

      // GREEN: Verify lifecycle tracking
      expect(sessionState.agentEvents).toHaveLength(8);
      expect(sessionState.currentAgent).toBe('assessment');
      expect(sessionState.agentHistory).toEqual(['learning', 'practice', 'assessment']);
      expect(sessionState.sessionMetrics.totalAgentTransitions).toBe(2);
      expect(sessionState.sessionMetrics.totalToolsExecuted).toBe(3);
      expect(sessionState.sessionMetrics.assessmentScore).toBe(0.85);

      // Verify timeline construction
      const timeline = sessionManager.buildSessionTimeline(sessionId);
      expect(timeline).toHaveLength(8);
      expect(timeline[0].type).toBe('session_started');
      expect(timeline[7].type).toBe('assessment_completed');

      // Verify database persistence
      const savedEvents = await mockDatabase.fetchAll(
        'SELECT * FROM agent_events WHERE session_id = ? ORDER BY timestamp',
        [sessionId]
      );
      expect(savedEvents).toHaveLength(8);
    });

    it('should handle concurrent agent interactions within session', async () => {
      // RED: Concurrent interaction test
      const sessionId = 'concurrent-test-session';

      await sessionManager.createSession(sessionId, {
        title: 'Concurrent Agent Interactions',
        agentTracking: { enabled: true }
      });

      // Simulate concurrent agent activities
      const concurrentActivities = [
        sessionManager.recordAgentEvent(sessionId, {
          agent: 'learning',
          action: 'concept_parsing',
          timestamp: Date.now(),
          metadata: { concepts: ['react', 'state', 'hooks'] }
        }),
        sessionManager.recordAgentEvent(sessionId, {
          agent: 'practice',
          action: 'exercise_generation',
          timestamp: Date.now() + 500,
          metadata: { exercises: 3, difficulty: 'intermediate' }
        }),
        sessionManager.recordAgentEvent(sessionId, {
          agent: 'assessment',
          action: 'quiz_preparation',
          timestamp: Date.now() + 1000,
          metadata: { questions: 5, topic: 'react-hooks' }
        })
      ];

      await Promise.all(concurrentActivities);

      // GREEN: Verify concurrent handling
      const sessionState = await sessionManager.getSessionState(sessionId);
      expect(sessionState.agentEvents).toHaveLength(3);
      expect(sessionState.activeAgents).toContain('learning');
      expect(sessionState.activeAgents).toContain('practice');
      expect(sessionState.activeAgents).toContain('assessment');

      // Verify no race conditions in state
      const stateConsistency = sessionManager.validateSessionState(sessionId);
      expect(stateConsistency.isConsistent).toBe(true);
      expect(stateConsistency.conflicts).toHaveLength(0);
    });
  });

  describe('Session Restoration and Recovery', () => {
    it('should restore complete multi-agent session state after restart', async () => {
      // RED: Complete session restoration test
      const sessionId = 'restoration-test-session';

      // Create complex session state
      await sessionManager.createSession(sessionId, {
        title: 'Complex Multi-Agent Session',
        agentTracking: { enabled: true }
      });

      // Build comprehensive session state
      const complexState = {
        currentAgent: 'assessment',
        agentHistory: ['learning', 'practice', 'assessment'],
        conversationState: {
          topic: 'Advanced React Patterns',
          progress: 0.75,
          currentStep: 'assessment_phase',
          conceptsCovered: ['hooks', 'context', 'performance'],
          exercisesCompleted: 4,
          quizScores: [0.8, 0.9, 0.85]
        },
        checkpoint: {
          thread_id: `thread_${sessionId}`,
          checkpoint_ns: 'assessment_phase',
          checkpoint: {
            step: 12,
            state: {
              messages: [
                { role: 'user', content: 'Explain React patterns' },
                { role: 'learning_agent', content: 'React patterns explanation...' },
                { role: 'practice_agent', content: 'Exercise solutions...' },
                { role: 'assessment_agent', content: 'Assessment questions...' }
              ]
            }
          }
        },
        agentStates: {
          learning: { completed: true, toolsUsed: ['parseConcepts', 'searchSessions'] },
          practice: { completed: true, toolsUsed: ['createExercise', 'validateSolution'] },
          assessment: { active: true, toolsUsed: ['generateQuiz', 'evaluateAnswers'] }
        },
        metadata: {
          sessionDuration: 3600000, // 1 hour
          totalTokensUsed: 2500,
          userSatisfaction: 0.9
        }
      };

      // Save complex state
      await sessionManager.saveSessionState(sessionId, complexState);

      // Simulate application restart by creating new session manager
      const newSessionManager = new SessionManager(mockDatabase, mockCheckpointSaver);
      await newSessionManager.initialize();

      // Restore session
      const restoredState = await newSessionManager.restoreSessionState(sessionId);

      // GREEN: Verify complete restoration
      expect(restoredState.currentAgent).toBe('assessment');
      expect(restoredState.agentHistory).toEqual(['learning', 'practice', 'assessment']);
      expect(restoredState.conversationState.progress).toBe(0.75);
      expect(restoredState.conversationState.conceptsCovered).toEqual(['hooks', 'context', 'performance']);

      // Verify checkpoint restoration
      expect(restoredState.checkpoint.thread_id).toBe(`thread_${sessionId}`);
      expect(restoredState.checkpoint.checkpoint.step).toBe(12);
      expect(restoredState.checkpoint.checkpoint.state.messages).toHaveLength(4);

      // Verify agent states restoration
      expect(restoredState.agentStates.learning.completed).toBe(true);
      expect(restoredState.agentStates.assessment.active).toBe(true);
      expect(restoredState.agentStates.practice.toolsUsed).toContain('createExercise');

      // Verify metadata preservation
      expect(restoredState.metadata.sessionDuration).toBe(3600000);
      expect(restoredState.metadata.totalTokensUsed).toBe(2500);

      // Verify LangGraph checkpoint restoration
      expect(mockCheckpointSaver.get).toHaveBeenCalledWith({
        thread_id: `thread_${sessionId}`,
        checkpoint_ns: 'assessment_phase'
      });
    });

    it('should handle partial session restoration with missing data', async () => {
      // RED: Partial restoration test
      const sessionId = 'partial-restoration-session';

      // Create incomplete session state
      await sessionManager.createSession(sessionId, { title: 'Partial Session' });

      // Save only partial data
      await sessionManager.savePartialState(sessionId, {
        currentAgent: 'learning',
        topic: 'JavaScript basics'
      });

      // Attempt restoration
      const restoredState = await sessionManager.restoreSessionState(sessionId);

      // GREEN: Verify graceful partial restoration
      expect(restoredState.currentAgent).toBe('learning');
      expect(restoredState.conversationState.topic).toBe('JavaScript basics');
      expect(restoredState.agentHistory).toEqual(['learning']); // Default to current agent
      expect(restoredState.isPartialRestoration).toBe(true);
      expect(restoredState.missingDataFields).toContain('agentHistory');
      expect(restoredState.missingDataFields).toContain('checkpoint');
    });
  });
});
```

### 6. Performance Testing Framework

```typescript
// src/test/integration/performance.test.ts
describe('Performance and Load Testing', () => {
  let performanceMonitor: PerformanceMonitor;
  let testCluster: TestCluster;

  beforeAll(async () => {
    performanceMonitor = new PerformanceMonitor();
    testCluster = new TestCluster();
    await testCluster.initialize();
  });

  afterAll(async () => {
    await testCluster.cleanup();
  });

  describe('Concurrent Multi-Agent Sessions', () => {
    it('should handle 100 concurrent sessions with multiple agents', async () => {
      // RED: Load testing for concurrent sessions
      const concurrentSessions = Array.from({ length: 100 }, (_, i) => ({
        id: `perf-session-${i}`,
        topic: `Topic ${i}`,
        agentSequence: ['learning', 'practice', 'assessment'],
        complexity: 'medium'
      }));

      const startTime = performance.now();
      const memoryBefore = process.memoryUsage();

      // Execute concurrent sessions
      const sessionPromises = concurrentSessions.map(async (session) => {
        const testApp = await testCluster.createTestApp();

        const results = [];
        for (const agent of session.agentSequence) {
          const result = await testApp.catalystService.processWithAgent(
            agent,
            `Teach me about ${session.topic}`,
            { sessionId: session.id }
          );
          results.push(result);
        }

        return { sessionId: session.id, results };
      });

      const sessionResults = await Promise.all(sessionPromises);
      const endTime = performance.now();
      const memoryAfter = process.memoryUsage();

      // GREEN: Performance assertions
      const totalTime = endTime - startTime;
      const memoryIncrease = memoryAfter.heapUsed - memoryBefore.heapUsed;

      expect(totalTime).toBeLessThan(10000); // Should complete within 10 seconds
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // Less than 100MB increase
      expect(sessionResults).toHaveLength(100);

      // Verify all sessions completed successfully
      sessionResults.forEach((result, index) => {
        expect(result.results).toHaveLength(3);
        expect(result.results[0].metadata.agent).toBe('learning');
        expect(result.results[2].metadata.agent).toBe('assessment');
      });

      // Performance metrics
      const metrics = performanceMonitor.getMetrics();
      expect(metrics.averageSessionTime).toBeLessThan(100); // Less than 100ms per session
      expect.metrics.concurrencyThroughput).toBeGreaterThan(10); // At least 10 sessions/second
    });

    it('should maintain streaming performance under load', async () => {
      // RED: Streaming performance test
      const concurrentStreams = Array.from({ length: 50 }, (_, i) => ({
        id: `stream-${i}`,
        content: `Detailed explanation of concept ${i}`,
        expectedChunks: 10,
        agent: 'learning'
      }));

      const streamMetrics = {
        totalStreams: 0,
        totalChunks: 0,
        averageLatency: 0,
        failedStreams: 0
      };

      const streamPromises = concurrentStreams.map(async (stream) => {
        const testApp = await testCluster.createTestApp();
        const startTime = performance.now();

        try {
          const chunks = [];
          const streamGenerator = testApp.catalystService.streamResponse(
            stream.content,
            { agent: stream.agent, sessionId: stream.id }
          );

          for await (const chunk of streamGenerator) {
            chunks.push(chunk);
          }

          const endTime = performance.now();
          const latency = endTime - startTime;

          streamMetrics.totalStreams++;
          streamMetrics.totalChunks += chunks.length;
          streamMetrics.averageLatency += latency;

          return { streamId: stream.id, chunks, latency };
        } catch (error) {
          streamMetrics.failedStreams++;
          return { streamId: stream.id, error };
        }
      });

      const streamResults = await Promise.all(streamPromises);
      streamMetrics.averageLatency /= streamMetrics.totalStreams;

      // GREEN: Streaming performance assertions
      expect(streamMetrics.failedStreams).toBe(0);
      expect(streamMetrics.totalStreams).toBe(50);
      expect(streamMetrics.totalChunks).toBe(500); // 10 chunks per stream
      expect(streamMetrics.averageLatency).toBeLessThan(1000); // Less than 1 second average

      // Verify no stream failures
      const failedStreams = streamResults.filter(result => result.error);
      expect(failedStreams).toHaveLength(0);

      // Verify chunk consistency
      streamResults.forEach((result) => {
        if (!result.error) {
          expect(result.chunks).toHaveLength(10);
          result.chunks.forEach(chunk => {
            expect(chunk).toHaveProperty('content');
            expect(chunk).toHaveProperty('timestamp');
          });
        }
      });
    });
  });

  describe('Memory and Resource Management', () => {
    it('should properly cleanup resources after session completion', async () => {
      // RED: Resource cleanup test
      const initialMemory = process.memoryUsage();
      const activeHandles = process.getActiveHandlesInfo();

      // Create and complete multiple sessions
      for (let i = 0; i < 20; i++) {
        const testApp = await testCluster.createTestApp();
        await testApp.catalystService.processMultiAgentWorkflow(
          'Test topic',
          ['learning', 'practice', 'assessment'],
          { sessionId: `cleanup-test-${i}` }
        );

        // Explicit cleanup
        await testApp.cleanup();
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage();
      const finalHandles = process.getActiveHandlesInfo();

      // GREEN: Resource cleanup assertions
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const handleIncrease = finalHandles.length - activeHandles.length;

      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // Less than 50MB increase
      expect(handleIncrease).toBeLessThan(10); // Minimal handle increase

      // Verify no memory leaks in session manager
      const sessionManagerMetrics = performanceMonitor.getSessionManagerMetrics();
      expect(sessionManagerMetrics.activeSessions).toBe(0);
      expect(sessionManagerMetrics.memoryLeaks).toHaveLength(0);
    });

    it('should handle memory pressure gracefully', async () => {
      // RED: Memory pressure test
      const memoryPressureTest = async () => {
        const testApp = await testCluster.createTestApp();

        // Create memory pressure with large sessions
        const largeSessions = Array.from({ length: 1000 }, (_, i) => ({
          id: `memory-pressure-${i}`,
          content: 'x'.repeat(10000), // 10KB per session
          agentHistory: ['learning', 'practice', 'assessment'],
          checkpoint: { step: i, data: 'x'.repeat(1000) }
        }));

        const results = await Promise.all(
          largeSessions.map(session =>
            testApp.sessionManager.saveSessionState(session.id, session)
          )
        );

        return results;
      };

      // Monitor memory during pressure test
      const memoryMonitor = performanceMonitor.startMemoryMonitoring();
      await memoryPressureTest();
      const memoryStats = memoryMonitor.stop();

      // GREEN: Memory pressure handling
      expect(memoryStats.peakMemoryUsage).toBeLessThan(500 * 1024 * 1024); // Less than 500MB
      expect(memoryStats.memoryGrowthRate).toBeLessThan(0.1); // Less than 10% growth rate

      // Verify graceful degradation
      const degradationMetrics = performanceMonitor.getDegradationMetrics();
      expect(degradationMetrics.responseTimeIncrease).toBeLessThan(2.0); // Less than 2x slower
      expect(degradationMetrics.errorRateIncrease).toBeLessThan(0.05); // Less than 5% more errors
    });
  });
});
```

### 7. Implementation Roadmap

#### **Phase 1: Foundation Setup (Week 1)**
1. **Testing Infrastructure**
   - Configure dual Vitest environments (renderer/main)
   - Implement comprehensive mock frameworks
   - Set up test database factory
   - Create performance monitoring utilities

2. **Basic TDD Patterns**
   - Establish Red-Green-Refactor workflow
   - Create test templates for common patterns
   - Set up CI/CD integration with coverage reporting
   - Implement test data factories

#### **Phase 2: Service Migration Testing (Week 2-3)**
1. **Main Process Services**
   - Write comprehensive tests for AgentManagerMain
   - Test ToolExecutorService with database integration
   - Create CatalystServiceMain test suite
   - Implement LangChain integration testing

2. **IPC Communication**
   - Enhanced MessageChannelMain testing
   - Streaming communication test patterns
   - Error handling and recovery testing
   - Cross-process integration tests

#### **Phase 3: Multi-Agent Testing (Week 4-5)**
1. **Agent Orchestration**
   - Tool Calling pattern test suite
   - Handoff workflow testing
   - Hybrid pattern integration tests
   - Agent lifecycle management testing

2. **Session Management**
   - Multi-agent session tracking
   - Checkpoint integration testing
   - Session restoration and recovery
   - Concurrent session handling

#### **Phase 4: Integration and Performance (Week 6)**
1. **End-to-End Testing**
   - Complete user workflow testing
   - Cross-platform compatibility
   - Error scenario and recovery testing
   - Performance and load testing

2. **Quality Assurance**
   - Code coverage analysis (target: 90%+)
   - Performance benchmarking
   - Memory leak detection
   - Production readiness validation

### 8. Success Metrics and Quality Gates

#### **Coverage Requirements**
- **Unit Tests**: 95% code coverage for business logic
- **Integration Tests**: 80% coverage for cross-service interactions
- **End-to-End Tests**: 100% coverage for critical user workflows
- **Performance Tests**: 100% coverage for load-bearing components

#### **Performance Benchmarks**
- **Session Creation**: < 100ms for single-agent sessions
- **Agent Handoffs**: < 200ms for handoff completion
- **Streaming Latency**: < 50ms per chunk delivery
- **Concurrent Sessions**: Support 100+ concurrent sessions
- **Memory Usage**: < 500MB for normal operation

#### **Quality Gates**
- All tests must pass in CI/CD pipeline
- Performance benchmarks must be met
- Code coverage thresholds must be achieved
- No critical security vulnerabilities
- Memory leak tests must pass

This comprehensive TDD framework provides the foundation for reliable, maintainable, and performant multi-agent architecture migration while ensuring the highest quality standards throughout the development process.