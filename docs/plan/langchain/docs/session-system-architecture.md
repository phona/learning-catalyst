# Session System Architecture - Multi-Agent Integration

## Current Session System Analysis

Based on your existing types, you have a robust session system with:

### ✅ **Strong Foundation Already Present**
- **Complete session management** with metadata, context, statistics
- **Message persistence** with rich metadata (ratings, concepts learned, tool calls)
- **Checkpoint system** for learning progress tracking
- **Search and filtering** capabilities
- **Import/export** functionality

### 🔧 **Integration Challenges with Multi-Agent Architecture**

The main challenge is ensuring **conversation continuity** when:
1. Multiple agents collaborate on a single conversation
2. Agent handoffs occur during complex workflows
3. Context needs to be preserved across agent switches
4. User wants to return to previous conversations

## Enhanced Session System Design

### Session State Management for Multi-Agent

```typescript
// Enhanced session types for multi-agent support
export interface EnhancedSession extends Session {
  // Existing fields remain the same
  id: string;
  title: string;
  created_at: Date;
  updated_at: Date;
  messages: ConversationMessage[];
  metadata: SessionMetadata;
  context: SessionContext;
  checkpoints: Checkpoint[];
  statistics: SessionStatistics;

  // NEW: Multi-agent specific fields
  agent_history: AgentTransition[];
  conversation_state: ConversationState;
  active_agents: AgentInfo[];
  orchestration_metadata: OrchestrationMetadata;
}

export interface AgentTransition {
  id: string;
  from_agent: AgentType;
  to_agent: AgentType;
  timestamp: Date;
  reason: string;
  context_snapshot: ConversationState;
  message_index: number;
}

export interface AgentInfo {
  type: AgentType;
  model_config: ModelConfig;
  tools_used: string[];
  contribution_summary: string;
  first_message_index: number;
  last_message_index: number;
}

export interface ConversationState {
  current_topic: string;
  learning_objectives: string[];
  concepts_discussed: string[];
  user_level_assessment: 'beginner' | 'intermediate' | 'advanced';
  session_phase: 'introduction' | 'exploration' | 'practice' | 'assessment' | 'summary';
  interaction_count: number;
  last_agent_interaction: AgentType;
}

export interface OrchestrationMetadata {
  strategy_used: 'tool_calling' | 'handoff' | 'hybrid' | 'simple';
  total_agent_switches: number;
  tools_executed: ToolExecution[];
  performance_metrics: PerformanceMetrics;
}
```

### Multi-Agent Session Manager

```typescript
// electron/main/services/MultiAgentSessionManager.ts
export class MultiAgentSessionManager {
  constructor(
    private sessionService: SessionServiceMain,
    private orchestrator: CatalystOrchestrator
  ) {}

  async createSession(options: SessionCreateOptions): Promise<EnhancedSession> {
    const session: EnhancedSession = {
      ...await this.sessionService.createSession(options),
      agent_history: [],
      conversation_state: {
        current_topic: '',
        learning_objectives: [],
        concepts_discussed: [],
        user_level_assessment: 'intermediate',
        session_phase: 'introduction',
        interaction_count: 0,
        last_agent_interaction: 'learning'
      },
      active_agents: [],
      orchestration_metadata: {
        strategy_used: 'simple',
        total_agent_switches: 0,
        tools_executed: [],
        performance_metrics: {}
      }
    };

    return session;
  }

  async processMessage(
    sessionId: string,
    userMessage: string,
    options?: MessageProcessingOptions
  ): Promise<MessageProcessingResult> {
    // Load current session state
    const session = await this.sessionService.getSessionById(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    // Analyze message and determine orchestration strategy
    const strategy = await this.orchestrator.determineStrategy({
      message: userMessage,
      sessionState: session.conversation_state,
      options
    });

    // Process with multi-agent orchestration
    const orchestrationResult = await this.orchestrator.process({
      message: userMessage,
      sessionContext: session.conversation_state,
      strategy,
      sessionId
    });

    // Update session with orchestration results
    const updatedSession = await this.updateSessionWithOrchestration(
      session,
      orchestrationResult,
      userMessage
    );

    return {
      response: orchestrationResult.response,
      updatedSession,
      metadata: orchestrationResult.metadata
    };
  }

  private async updateSessionWithOrchestration(
    session: EnhancedSession,
    orchestrationResult: OrchestrationResult,
    userMessage: string
  ): Promise<EnhancedSession> {
    // Add user message
    const userMsg: ConversationMessage = {
      id: this.generateMessageId(),
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
      provider: 'user',
      metadata: {
        concepts_learned: orchestrationResult.conceptsIdentified || []
      }
    };

    // Add assistant response
    const assistantMsg: ConversationMessage = {
      id: this.generateMessageId(),
      role: 'assistant',
      content: orchestrationResult.response,
      timestamp: new Date(),
      provider: orchestrationResult.metadata.primaryProvider,
      model: orchestrationResult.metadata.modelUsed,
      tokens_used: orchestrationResult.metadata.tokensUsed,
      tool_calls: orchestrationResult.metadata.toolCalls,
      metadata: {
        confidence_score: orchestrationResult.metadata.confidence,
        related_topics: orchestrationResult.metadata.topicsIdentified
      }
    };

    // Update conversation state
    const newConversationState = this.updateConversationState(
      session.conversation_state,
      orchestrationResult,
      userMessage
    );

    // Handle agent transitions
    const newAgentHistory = await this.updateAgentHistory(
      session.agent_history,
      orchestrationResult,
      session.messages.length
    );

    // Update active agents
    const newActiveAgents = this.updateActiveAgents(
      session.active_agents,
      orchestrationResult
    );

    const updatedSession: EnhancedSession = {
      ...session,
      messages: [...session.messages, userMsg, assistantMsg],
      conversation_state: newConversationState,
      agent_history: newAgentHistory,
      active_agents: newActiveAgents,
      orchestration_metadata: {
        ...session.orchestration_metadata,
        strategy_used: orchestrationResult.strategy.type,
        total_agent_switches: session.orchestration_metadata.total_agent_switches + (orchestrationResult.metadata.agentSwitches || 0),
        tools_executed: [
          ...session.orchestration_metadata.tools_executed,
          ...(orchestrationResult.metadata.toolsExecuted || [])
        ],
        performance_metrics: {
          ...session.orchestration_metadata.performance_metrics,
          ...orchestrationResult.metadata.performanceMetrics
        }
      },
      updated_at: new Date(),
      statistics: {
        ...session.statistics,
        total_messages: session.statistics.total_messages + 2,
        user_messages: session.statistics.user_messages + 1,
        assistant_messages: session.statistics.assistant_messages + 1,
        total_tokens_used: session.statistics.total_tokens_used + (orchestrationResult.metadata.tokensUsed || 0)
      }
    };

    // Save updated session
    await this.sessionService.saveSession(updatedSession);

    return updatedSession;
  }

  async restoreSession(sessionId: string): Promise<SessionRestoreResult> {
    const session = await this.sessionService.getSessionById(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    // Reconstruct agent states from session history
    const agentStates = await this.reconstructAgentStates(session);

    // Restore conversation context
    const context = this.reconstructConversationContext(session);

    return {
      session,
      agentStates,
      context,
      canResume: true,
      recommendedNextAgent: this.determineOptimalNextAgent(session)
    };
  }

  async getSessionHistory(sessionId: string): Promise<SessionHistory> {
    const session = await this.sessionService.getSessionById(sessionId);

    return {
      session,
      agentTransitions: session.agent_history,
      conversationFlow: this.buildConversationFlow(session),
      learningProgress: this.analyzeLearningProgress(session),
      agentContributions: this.analyzeAgentContributions(session)
    };
  }

  private updateConversationState(
    currentState: ConversationState,
    orchestrationResult: OrchestrationResult,
    userMessage: string
  ): ConversationState {
    // Analyze conversation progression
    const newPhase = this.determineSessionPhase(currentState, orchestrationResult);
    const newLevel = this.assessUserLevel(currentState, userMessage, orchestrationResult);

    return {
      current_topic: orchestrationResult.metadata.primaryTopic || currentState.current_topic,
      learning_objectives: [
        ...currentState.learning_objectives,
        ...(orchestrationResult.metadata.newObjectives || [])
      ],
      concepts_discussed: [
        ...currentState.concepts_discussed,
        ...(orchestrationResult.metadata.conceptsIdentified || [])
      ],
      user_level_assessment: newLevel,
      session_phase: newPhase,
      interaction_count: currentState.interaction_count + 1,
      last_agent_interaction: orchestrationResult.metadata.primaryAgent || 'learning'
    };
  }

  private async updateAgentHistory(
    currentHistory: AgentTransition[],
    orchestrationResult: OrchestrationResult,
    messageIndex: number
  ): Promise<AgentTransition[]> {
    const newHistory = [...currentHistory];

    // Record agent transitions from orchestration
    if (orchestrationResult.metadata.agentTransitions) {
      for (const transition of orchestrationResult.metadata.agentTransitions) {
        newHistory.push({
          id: this.generateTransitionId(),
          from_agent: transition.from,
          to_agent: transition.to,
          timestamp: new Date(),
          reason: transition.reason,
          context_snapshot: transition.contextSnapshot,
          message_index
        });
      }
    }

    return newHistory;
  }

  private updateActiveAgents(
    currentAgents: AgentInfo[],
    orchestrationResult: OrchestrationResult
  ): AgentInfo[] {
    const newAgents = [...currentAgents];

    // Update or add agents that participated
    if (orchestrationResult.metadata.agentsInvolved) {
      for (const agentInfo of orchestrationResult.metadata.agentsInvolved) {
        const existingIndex = newAgents.findIndex(a => a.type === agentInfo.type);

        if (existingIndex >= 0) {
          // Update existing agent
          newAgents[existingIndex] = {
            ...newAgents[existingIndex],
            last_message_index: agentInfo.lastMessageIndex,
            contribution_summary: agentInfo.contributionSummary
          };
        } else {
          // Add new agent
          newAgents.push({
            type: agentInfo.type,
            model_config: agentInfo.modelConfig,
            tools_used: agentInfo.toolsUsed,
            contribution_summary: agentInfo.contributionSummary,
            first_message_index: agentInfo.firstMessageIndex,
            last_message_index: agentInfo.lastMessageIndex
          });
        }
      }
    }

    return newAgents;
  }

  private determineSessionPhase(
    currentState: ConversationState,
    orchestrationResult: OrchestrationResult
  ): 'introduction' | 'exploration' | 'practice' | 'assessment' | 'summary' {
    // Intelligent phase detection based on conversation patterns
    const agentTypes = orchestrationResult.metadata.agentsInvolved?.map(a => a.type) || [];

    if (currentState.interaction_count < 3) {
      return 'introduction';
    } else if (agentTypes.includes('practice')) {
      return 'practice';
    } else if (agentTypes.includes('assessment')) {
      return 'assessment';
    } else if (currentState.interaction_count > 10) {
      return 'summary';
    } else {
      return 'exploration';
    }
  }

  private assessUserLevel(
    currentState: ConversationState,
    userMessage: string,
    orchestrationResult: OrchestrationResult
  ): 'beginner' | 'intermediate' | 'advanced' {
    // Analyze user's language and complexity to assess level
    const complexity = this.analyzeMessageComplexity(userMessage);
    const concepts = orchestrationResult.metadata.conceptsIdentified || [];

    if (complexity.high && concepts.length > 3) {
      return 'advanced';
    } else if (complexity.medium || concepts.length > 1) {
      return 'intermediate';
    } else {
      return 'beginner';
    }
  }

  private analyzeMessageComplexity(message: string): { high: boolean; medium: boolean; low: boolean } {
    const words = message.split(' ').length;
    const hasTechnicalTerms = /\b(AI|algorithm|function|model|training|neural|data)\b/i.test(message);
    const hasQuestions = message.includes('?') || message.includes('how') || message.includes('what');

    return {
      high: words > 50 && hasTechnicalTerms,
      medium: (words > 20 || hasTechnicalTerms) && words <= 50,
      low: words <= 20 && !hasTechnicalTerms
    };
  }
}
```

### Session Persistence with Checkpoints

```typescript
// electron/main/services/CheckpointManager.ts
export class CheckpointManager {
  constructor(
    private sessionService: SessionServiceMain,
    private checkpointSaver: SQLiteCheckpointSaver
  ) {}

  async createCheckpoint(
    sessionId: string,
    checkpointData: CheckpointData
  ): Promise<Checkpoint> {
    const session = await this.sessionService.getSessionById(sessionId);

    const checkpoint: Checkpoint = {
      id: this.generateCheckpointId(),
      session_id: sessionId,
      title: checkpointData.title || `Checkpoint ${new Date().toLocaleString()}`,
      description: checkpointData.description,
      created_at: new Date(),
      message_index: session.messages.length - 1,
      concepts_mastered: checkpointData.conceptsMastered || [],
      concepts_reviewed: checkpointData.conceptsReviewed || [],
      practice_exercises: checkpointData.exercises || [],
      notes: checkpointData.notes,
      tags: checkpointData.tags || []
    };

    // Save checkpoint to database
    await this.checkpointSaver.put(
      { configurable: { thread_id: sessionId, checkpoint_id: checkpoint.id } },
      {
        id: checkpoint.id,
        created_at: checkpoint.created_at,
        concepts_mastered: checkpoint.concepts_mastered,
        concepts_reviewed: checkpoint.concepts_reviewed,
        exercises: checkpoint.practice_exercises,
        notes: checkpoint.notes,
        tags: checkpoint.tags
      },
      { title: checkpoint.title },
      { checkpoint_ns: checkpoint.concepts_reviewed.join(',') }
    );

    return checkpoint;
  }

  async restoreFromCheckpoint(
    sessionId: string,
    checkpointId: string
  ): Promise<SessionRestoreResult> {
    // Load checkpoint from database
    const checkpoint = await this.checkpointSaver.get({
      configurable: {
        thread_id: sessionId,
        checkpoint_id: checkpointId
      }
    });

    if (!checkpoint) {
      throw new Error(`Checkpoint ${checkpointId} not found for session ${sessionId}`);
    }

    // Restore session state from checkpoint
    const session = await this.sessionService.getSessionById(sessionId);

    // Reconstruct session to checkpoint point
    const restoredSession: EnhancedSession = {
      ...session,
      messages: session.messages.slice(0, checkpoint.message_index + 1),
      conversation_state: {
        ...session.conversation_state,
        concepts_discussed: checkpoint.concepts_reviewed
      },
      checkpoints: [
        ...session.checkpoints.filter(cp => cp.message_index <= checkpoint.message_index),
        checkpoint
      ]
    };

    return {
      session: restoredSession,
      checkpoint,
      canResume: true,
      recommendedActions: this.getRecommendedActions(checkpoint)
    };
  }

  private getRecommendedActions(checkpoint: Checkpoint): string[] {
    const actions: string[] = [];

    if (checkpoint.concepts_mastered.length > 0) {
      actions.push(`Review mastered concepts: ${checkpoint.concepts_mastered.join(', ')}`);
    }

    if (checkpoint.practice_exercises && checkpoint.practice_exercises.length > 0) {
      const incomplete = checkpoint.practice_exercises.filter(ex => !ex.completed);
      if (incomplete.length > 0) {
        actions.push(`Complete ${incomplete.length} practice exercises`);
      }
    }

    if (checkpoint.concepts_reviewed.length > checkpoint.concepts_mastered.length) {
      actions.push('Focus on mastering reviewed concepts');
    }

    return actions;
  }
}
```

### Session Restoration Flow

```typescript
// User returns to previous session
async restoreSession(sessionId: string): Promise<RestoredSession> {
  // 1. Load session from database
  const session = await sessionService.getSessionById(sessionId);

  // 2. Restore agent states from session history
  const agentStates = await multiAgentManager.restoreAgentStates(session);

  // 3. Reconstruct conversation context
  const context = await multiAgentManager.reconstructContext(session);

  // 4. Restore any checkpoints
  const lastCheckpoint = await checkpointManager.getLatestCheckpoint(sessionId);

  return {
    session,
    agentStates,
    context,
    checkpoint: lastCheckpoint,
    canResume: true,
    restorationMetadata: {
      lastActivity: session.updated_at,
      totalInteractions: session.statistics.total_messages,
      agentsInvolved: session.active_agents,
      learningProgress: session.statistics
    }
  };
}
```

### Enhanced Session API for UI

```typescript
// src/services/SessionService.ts (Renderer - Enhanced)
export class SessionService {
  async createSession(options: SessionCreateOptions): Promise<Session> {
    const result = await window.electronAPI.sessions.create(options);
    return result.session;
  }

  async sendMessage(
    sessionId: string,
    message: string,
    options?: MessageOptions
  ): Promise<MessageResponse> {
    const result = await window.electronAPI.sessions.sendMessage({
      sessionId,
      message,
      options
    });

    return {
      response: result.response,
      metadata: result.metadata,
      agentsInvolved: result.agentsInvolved,
      toolsUsed: result.toolsUsed
    };
  }

  async restoreSession(sessionId: string): Promise<RestoredSession> {
    const result = await window.electronAPI.sessions.restore(sessionId);

    return {
      session: result.session,
      context: result.context,
      canResume: result.canResume,
      recommendedActions: result.recommendedActions,
      lastActivity: result.lastActivity
    };
  }

  async createCheckpoint(
    sessionId: string,
    title?: string,
    description?: string
  ): Promise<Checkpoint> {
    return await window.electronAPI.sessions.createCheckpoint({
      sessionId,
      title,
      description
    });
  }

  async getSessionHistory(sessionId: string): Promise<SessionHistory> {
    return await window.electronAPI.sessions.getHistory(sessionId);
  }
}
```

## Benefits of Enhanced Session System

### ✅ **Multi-Agent Continuity**
- **Agent Context Preservation**: Conversation context flows between agents
- **Agent History Tracking**: Complete record of agent transitions and contributions
- **Intelligent Restoration**: Restore not just messages, but agent states and context

### ✅ **Advanced Checkpointing**
- **Multi-Agent Checkpoints**: Capture agent states and conversation flow
- **Learning Progress Tracking**: Concepts mastered, exercises completed, agent contributions
- **Smart Restoration**: Resume sessions with full multi-agent context

### ✅ **Enhanced Analytics**
- **Agent Performance**: Track which agents are most effective
- **Tool Usage Analytics**: Understand which tools provide most value
- **Conversation Flow Analysis**: Optimize agent selection and handoff strategies

### ✅ **User Experience**
- **Seamless Returns**: Users can return to complex multi-agent conversations
- **Context Awareness**: System remembers previous interactions and agent contributions
- **Progress Tracking**: Clear visibility into learning progress across agent interactions

This enhanced session system ensures that the **sophistication of multi-agent orchestration** doesn't come at the cost of **user experience**. Users can seamlessly return to complex conversations and continue learning right where they left off!