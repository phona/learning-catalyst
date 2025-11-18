/**
 * Agent Manager Service
 *
 * Main thread agent management with LangChain integration.
 * Handles agent lifecycle, execution, tool coordination, and streaming responses.
 * All LangChain operations run in the main thread where AsyncLocalStorage works.
 */

import { AsyncLocalStorage } from 'async_hooks';
import { MessageChannelMain } from 'electron';
import { AgentConfig, AgentExecutionRequest, AgentExecutionChunk, ServiceDependencies, ServiceExecutionContext, AgentExecutionError } from './types';
import { ToolExecutorService } from './tool-executor';
import { ConceptProcessingPipeline } from '@/main/services/concept-parsing';
import { AIProvider } from '@/shared/types/ai';
import { LangChainProviderAdapter, LangChainModelFactory } from '../catalyst/langchain-adapter';
import { HumanMessage, SystemMessage, AIMessage } from '@langchain/core/messages';
import { BaseLanguageModel } from '@langchain/core/language_models/base';

/**
 * Agent execution context for tracking agent state
 */
interface AgentExecutionContext extends ServiceExecutionContext {
  agentId: string;
  iteration: number;
  maxIterations: number;
  startTime: number;
  messages: any[];
  toolCalls: any[];
  results: any[];
}

/**
 * Agent session association for tracking agent participation in sessions
 */
interface AgentSessionAssociation {
  agentId: string;
  sessionId: string;
  role: 'primary' | 'secondary' | 'orchestrator' | 'tool';
  status: 'active' | 'inactive' | 'paused' | 'completed';
  joinedAt: number;
  lastActiveAt: number;
  metadata?: Record<string, any>;
}

/**
 * Main thread agent manager with LangChain integration
 */
export class AgentManagerMain {
  private readonly agents = new Map<string, AgentConfig>();
  private readonly executions = new Map<string, AgentExecutionContext>();
  private readonly sessionAgents = new Map<string, AgentSessionAssociation[]>(); // sessionId -> associations
  private readonly agentSessions = new Map<string, Set<string>>(); // agentId -> sessionIds
  private readonly dependencies: ServiceDependencies;
  private readonly toolExecutor: ToolExecutorService;

  constructor(dependencies: ServiceDependencies, toolExecutor: ToolExecutorService) {
    this.dependencies = dependencies;
    this.toolExecutor = toolExecutor;
  }

  /**
   * Register an agent configuration
   */
  registerAgent(config: AgentConfig): void {
    if (this.agents.has(config.id)) {
      throw new AgentExecutionError(
        `Agent '${config.id}' is already registered`,
        config.id,
        'initialization'
      );
    }

    this.agents.set(config.id, config);
    this.dependencies.logger.info(`Registered agent: ${config.id} (${config.type})`);
  }

  /**
   * Unregister an agent
   */
  unregisterAgent(agentId: string): void {
    if (this.agents.delete(agentId)) {
      this.dependencies.logger.info(`Unregistered agent: ${agentId}`);
    }
  }

  /**
   * Get an agent configuration
   */
  getAgent(agentId: string): AgentConfig | undefined {
    return this.agents.get(agentId);
  }

  /**
   * Get all registered agents
   */
  getRegisteredAgents(): AgentConfig[] {
    return Array.from(this.agents.values());
  }

  /**
   * Execute an agent with streaming support
   */
  async executeAgent(request: AgentExecutionRequest): Promise<AsyncIterable<AgentExecutionChunk>> {
    const agent = this.agents.get(request.agentId);

    if (!agent) {
      throw new AgentExecutionError(
        `Agent '${request.agentId}' not found`,
        request.agentId,
        'initialization',
        request.context
      );
    }

    if (!agent.enabled) {
      throw new AgentExecutionError(
        `Agent '${request.agentId}' is disabled`,
        request.agentId,
        'initialization',
        request.context
      );
    }

    // Create execution context
    const executionContext: AgentExecutionContext = {
      ...request.context,
      agentId: request.agentId,
      iteration: 0,
      maxIterations: request.options.maxIterations || 50,
      startTime: Date.now(),
      messages: [],
      toolCalls: [],
      results: []
    };

    this.executions.set(request.context.id, executionContext);

    try {
      this.dependencies.logger.info(`Starting agent execution: ${request.agentId}`, {
        executionId: request.context.id,
        inputType: typeof request.input
      });

      // Return async iterable for streaming
      return this.executeAgentStream(agent, request, executionContext);

    } catch (error) {
      this.executions.delete(request.context.id);
      throw error;
    }
  }

  /**
   * Execute agent with streaming response
   */
  private async *executeAgentStream(
    agent: AgentConfig,
    request: AgentExecutionRequest,
    executionContext: AgentExecutionContext
  ): AsyncIterable<AgentExecutionChunk> {
    try {
      // Emit start chunk
      yield {
        type: 'start',
        content: {
          agentId: agent.id,
          agentType: agent.type,
          startTime: Date.now()
        },
        timestamp: Date.now()
      };

      // Execute based on agent type
      switch (agent.type) {
      case 'concept-parser':
        yield* this.executeConceptParser(agent, request, executionContext);
        break;

      case 'chat-agent':
        yield* this.executeChatAgent(agent, request, executionContext);
        break;

      case 'learning-coach':
        yield* this.executeLearningCoach(agent, request, executionContext);
        break;

      case 'content-discoverer':
        yield* this.executeContentDiscoverer(agent, request, executionContext);
        break;

      default:
        throw new AgentExecutionError(
          `Unknown agent type: ${agent.type}`,
          agent.id,
          'execution',
          executionContext
        );
      }

      // Emit completion chunk
      yield {
        type: 'complete',
        content: {
          agentId: agent.id,
          totalIterations: executionContext.iteration,
          executionTime: Date.now() - executionContext.startTime,
          results: executionContext.results
        },
        timestamp: Date.now()
      };

    } catch (error) {
      // Emit error chunk
      yield {
        type: 'error',
        content: {
          agentId: agent.id,
          error: (error as Error).message,
          stack: (error as Error).stack
        },
        timestamp: Date.now()
      };
      // Don't throw - let the generator complete gracefully after emitting error chunk
    } finally {
      this.executions.delete(executionContext.id);
    }
  }

  /**
   * Execute concept parser agent
   */
  private async *executeConceptParser(
    agent: AgentConfig,
    request: AgentExecutionRequest,
    executionContext: AgentExecutionContext
  ): AsyncIterable<AgentExecutionChunk> {
    this.dependencies.logger.debug(`Executing concept parser agent: ${agent.id}`);

    try {
      // Convert AI provider to LangChain model
      const langChainModel = await LangChainModelFactory.createModel(
        agent.modelConfig.provider,
        agent.modelConfig.provider.name,
        agent.modelConfig.modelId,
        {
          name: agent.modelConfig.provider.name,
          provider: agent.modelConfig.provider.name,
          modelId: agent.modelConfig.modelId,
          weight: 1.0,
          capabilities: []
        }
      );

      // Create concept parsing pipeline
      const pipeline = new ConceptProcessingPipeline([langChainModel], {
        enableAIExtraction: true,
        enableRuleExtraction: true,
        enableDeduplication: true,
        enableValidation: true,
        aiConfidenceThreshold: 0.6,
        maxConceptsPerDocument: 50,
        timeout: agent.modelConfig.timeout || 300000
      });

      // Parse input
      let input: any;
      if (typeof request.input === 'string') {
        input = {
          content: request.input,
          materialId: `agent_${executionContext.id}`,
          title: `Agent Content ${Date.now()}`,
          format: 'markdown'
        };
      } else {
        input = request.input;
      }

      // Execute pipeline
      yield {
        type: 'progress',
        content: { phase: 'starting', message: 'Initializing concept parsing pipeline' },
        timestamp: Date.now()
      };

      const result = await pipeline.processContent(input);

      yield {
        type: 'progress',
        content: { phase: 'complete', message: 'Concept parsing completed' },
        timestamp: Date.now()
      };

      // Return results
      yield {
        type: 'data',
        content: {
          concepts: result.concepts,
          relationships: result.relationships,
          statistics: result.statistics,
          success: result.success,
          errors: result.errors.map(e => e.message)
        },
        timestamp: Date.now()
      };

    } catch (error) {
      // Emit error chunk instead of throwing
      yield {
        type: 'error',
        content: {
          agentId: agent.id,
          error: `Concept parser execution failed: ${(error as Error).message}`,
          stack: (error as Error).stack
        },
        timestamp: Date.now()
      };
    }
  }

  /**
   * Execute chat agent
   */
  private async *executeChatAgent(
    agent: AgentConfig,
    request: AgentExecutionRequest,
    executionContext: AgentExecutionContext
  ): AsyncIterable<AgentExecutionChunk> {
    this.dependencies.logger.debug(`Executing chat agent: ${agent.id}`);

    try {
      // Convert AI provider to LangChain model
      const langChainModel = await LangChainModelFactory.createModel(
        agent.modelConfig.provider,
        agent.modelConfig.provider.name,
        agent.modelConfig.modelId,
        {
          name: agent.modelConfig.provider.name,
          provider: agent.modelConfig.provider.name,
          modelId: agent.modelConfig.modelId,
          weight: 1.0,
          capabilities: []
        }
      );

      // Prepare messages
      const messages: any[] = [];

      // Add system prompt if provided
      if (agent.systemPrompt) {
        messages.push(new SystemMessage(agent.systemPrompt));
      }

      // Add user input
      if (typeof request.input === 'string') {
        messages.push(new HumanMessage(request.input));
      } else {
        messages.push(new HumanMessage(JSON.stringify(request.input)));
      }

      // Execute with streaming if requested
      if (request.options.stream) {
        yield* this.executeStreamingChat(langChainModel as any, messages, executionContext);
      } else {
        yield* this.executeNonStreamingChat(langChainModel as any, messages, executionContext);
      }

    } catch (error) {
      // Emit error chunk instead of throwing
      yield {
        type: 'error',
        content: {
          agentId: agent.id,
          error: `Chat agent execution failed: ${(error as Error).message}`,
          stack: (error as Error).stack
        },
        timestamp: Date.now()
      };
    }
  }

  /**
   * Execute streaming chat
   */
  private async *executeStreamingChat(
    model: BaseLanguageModel,
    messages: any[],
    executionContext: AgentExecutionContext
  ): AsyncIterable<AgentExecutionChunk> {
    // This is a simplified streaming implementation
    // In a full implementation, you'd use the model's streaming capabilities
    try {
      yield {
        type: 'progress',
        content: { phase: 'thinking', message: 'Processing your request...' },
        timestamp: Date.now()
      };

      const response = await model.invoke(messages);

      yield {
        type: 'data',
        content: {
          message: response.content,
          type: 'ai_response'
        },
        timestamp: Date.now()
      };

    } catch (error) {
      // Emit error chunk instead of throwing
      yield {
        type: 'error',
        content: {
          agentId: executionContext.agentId,
          error: `Streaming chat failed: ${(error as Error).message}`,
          stack: (error as Error).stack
        },
        timestamp: Date.now()
      };
    }
  }

  /**
   * Execute non-streaming chat
   */
  private async *executeNonStreamingChat(
    model: BaseLanguageModel,
    messages: any[],
    executionContext: AgentExecutionContext
  ): AsyncIterable<AgentExecutionChunk> {
    try {
      yield {
        type: 'progress',
        content: { phase: 'thinking', message: 'Processing your request...' },
        timestamp: Date.now()
      };

      const response = await model.invoke(messages);

      yield {
        type: 'data',
        content: {
          message: response.content,
          type: 'ai_response'
        },
        timestamp: Date.now()
      };

    } catch (error) {
      // Emit error chunk instead of throwing
      yield {
        type: 'error',
        content: {
          agentId: executionContext.agentId,
          error: `Chat execution failed: ${(error as Error).message}`,
          stack: (error as Error).stack
        },
        timestamp: Date.now()
      };
    }
  }

  /**
   * Execute learning coach agent (placeholder)
   */
  private async *executeLearningCoach(
    agent: AgentConfig,
    request: AgentExecutionRequest,
    executionContext: AgentExecutionContext
  ): AsyncIterable<AgentExecutionChunk> {
    yield {
      type: 'progress',
      content: { phase: 'starting', message: 'Learning coach agent not yet implemented' },
      timestamp: Date.now()
    };

    yield {
      type: 'data',
      content: {
        message: 'Learning coach functionality will be implemented in Phase 2',
        type: 'not_implemented'
      },
      timestamp: Date.now()
    };
  }

  /**
   * Execute content discoverer agent (placeholder)
   */
  private async *executeContentDiscoverer(
    agent: AgentConfig,
    request: AgentExecutionRequest,
    executionContext: AgentExecutionContext
  ): AsyncIterable<AgentExecutionChunk> {
    yield {
      type: 'progress',
      content: { phase: 'starting', message: 'Content discoverer agent not yet implemented' },
      timestamp: Date.now()
    };

    yield {
      type: 'data',
      content: {
        message: 'Content discoverer functionality will be implemented in Phase 2',
        type: 'not_implemented'
      },
      timestamp: Date.now()
    };
  }

  /**
   * Cancel an active execution
   */
  cancelExecution(executionId: string): boolean {
    const execution = this.executions.get(executionId);
    if (execution) {
      this.executions.delete(executionId);
      this.dependencies.logger.info(`Cancelled agent execution: ${executionId}`);
      return true;
    }
    return false;
  }

  /**
   * Get execution status
   */
  getExecutionStatus(executionId: string): {
    found: boolean;
    execution?: AgentExecutionContext;
  } {
    const execution = this.executions.get(executionId);
    return {
      found: !!execution,
      execution
    };
  }

  /**
   * Get all active executions
   */
  getActiveExecutions(): AgentExecutionContext[] {
    return Array.from(this.executions.values());
  }

  /**
   * Get agent manager statistics
   */
  getStats(): {
    totalAgents: number;
    enabledAgents: number;
    activeExecutions: number;
    agentTypes: Record<string, number>;
    totalSessions: number;
    activeSessions: number;
    totalAgentSessions: number;
    } {
    const agents = Array.from(this.agents.values());
    const agentTypes = agents.reduce((acc, agent) => {
      acc[agent.type] = (acc[agent.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Count session statistics
    const activeSessions = Array.from(this.sessionAgents.entries())
      .filter(([_, associations]) =>
        associations.some(assoc => assoc.status === 'active')
      ).length;

    const totalAgentSessions = Array.from(this.agentSessions.values())
      .reduce((total, sessionSet) => total + sessionSet.size, 0);

    return {
      totalAgents: agents.length,
      enabledAgents: agents.filter(a => a.enabled).length,
      activeExecutions: this.executions.size,
      agentTypes,
      totalSessions: this.sessionAgents.size,
      activeSessions,
      totalAgentSessions
    };
  }

  // ==========================================
  // Session Integration Methods
  // ==========================================

  /**
   * Activate an agent for a session
   */
  async activateAgentForSession(
    agentId: string,
    sessionId: string,
    role: 'primary' | 'secondary' | 'orchestrator' | 'tool' = 'secondary'
  ): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new AgentExecutionError(
        `Agent '${agentId}' not found`,
        agentId,
        'execution'
      );
    }

    const now = Date.now();

    // Check if agent is already associated with this session
    const existingAssociations = this.sessionAgents.get(sessionId) || [];
    const existingAssociation = existingAssociations.find(assoc => assoc.agentId === agentId);

    if (existingAssociation) {
      // Update existing association
      existingAssociation.status = 'active';
      existingAssociation.lastActiveAt = now;
      existingAssociation.role = role;
    } else {
      // Create new association
      const association: AgentSessionAssociation = {
        agentId,
        sessionId,
        role,
        status: 'active',
        joinedAt: now,
        lastActiveAt: now,
        metadata: {
          agentName: agent.name,
          agentType: agent.type,
          capabilities: agent.capabilities || []
        }
      };

      // Add to session agents
      if (!this.sessionAgents.has(sessionId)) {
        this.sessionAgents.set(sessionId, []);
      }
      this.sessionAgents.get(sessionId)!.push(association);

      // Add to agent sessions
      if (!this.agentSessions.has(agentId)) {
        this.agentSessions.set(agentId, new Set());
      }
      this.agentSessions.get(agentId)!.add(sessionId);
    }

    this.dependencies.logger.info(`Agent activated for session`, {
      agentId,
      sessionId,
      role,
      agentName: agent.name
    });
  }

  /**
   * Deactivate an agent for a session
   */
  async deactivateAgentForSession(agentId: string, sessionId: string): Promise<void> {
    const associations = this.sessionAgents.get(sessionId);
    if (!associations) {
      return; // No associations for this session
    }

    const associationIndex = associations.findIndex(assoc => assoc.agentId === agentId);
    if (associationIndex === -1) {
      return; // Agent not associated with this session
    }

    // Update association status
    associations[associationIndex].status = 'inactive';
    associations[associationIndex].lastActiveAt = Date.now();

    // Remove from agent sessions
    const agentSessionSet = this.agentSessions.get(agentId);
    if (agentSessionSet) {
      agentSessionSet.delete(sessionId);
      if (agentSessionSet.size === 0) {
        this.agentSessions.delete(agentId);
      }
    }

    this.dependencies.logger.info(`Agent deactivated for session`, {
      agentId,
      sessionId
    });
  }

  /**
   * Get agents associated with a session
   */
  async getSessionAgents(sessionId: string): Promise<AgentSessionAssociation[]> {
    const associations = this.sessionAgents.get(sessionId) || [];
    return associations.filter(assoc => assoc.status === 'active');
  }

  /**
   * Get sessions associated with an agent
   */
  async getAgentSessions(agentId: string): Promise<AgentSessionAssociation[]> {
    const sessionIds = this.agentSessions.get(agentId);
    if (!sessionIds) {
      return [];
    }

    const associations: AgentSessionAssociation[] = [];
    for (const sessionId of sessionIds) {
      const sessionAssociations = this.sessionAgents.get(sessionId) || [];
      const agentAssociation = sessionAssociations.find(assoc =>
        assoc.agentId === agentId && assoc.status === 'active'
      );
      if (agentAssociation) {
        associations.push(agentAssociation);
      }
    }

    return associations;
  }

  /**
   * Get primary agent for a session
   */
  async getPrimaryAgentForSession(sessionId: string): Promise<AgentSessionAssociation | null> {
    const associations = this.sessionAgents.get(sessionId) || [];
    return associations.find(assoc =>
      assoc.role === 'primary' && assoc.status === 'active'
    ) || null;
  }

  /**
   * Set primary agent for a session
   */
  async setPrimaryAgentForSession(agentId: string, sessionId: string): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new AgentExecutionError(
        `Agent '${agentId}' not found`,
        agentId,
        'execution'
      );
    }

    const associations = this.sessionAgents.get(sessionId) || [];

    // Remove existing primary designation
    associations.forEach(assoc => {
      if (assoc.role === 'primary') {
        assoc.role = 'secondary';
      }
    });

    // Set new primary
    const agentAssociation = associations.find(assoc => assoc.agentId === agentId);
    if (agentAssociation) {
      agentAssociation.role = 'primary';
      agentAssociation.lastActiveAt = Date.now();
    } else {
      // Agent not associated yet, add as primary
      await this.activateAgentForSession(agentId, sessionId, 'primary');
    }

    this.dependencies.logger.info(`Primary agent set for session`, {
      agentId,
      sessionId,
      agentName: agent.name
    });
  }

  /**
   * Execute agent within session context
   */
  async executeAgentInSession(
    agentId: string,
    sessionId: string,
    input: any,
    options?: any
  ): Promise<AsyncIterable<AgentExecutionChunk>> {
    // Verify agent is active for this session
    const sessionAgents = await this.getSessionAgents(sessionId);
    const agentAssociation = sessionAgents.find(assoc => assoc.agentId === agentId);

    if (!agentAssociation) {
      throw new AgentExecutionError(
        `Agent '${agentId}' is not active for session '${sessionId}'`,
        agentId,
        'execution'
      );
    }

    // Update last active time
    agentAssociation.lastActiveAt = Date.now();

    // Create execution request with session context
    const executionRequest: AgentExecutionRequest = {
      agentId,
      input,
      context: {
        id: `session_${sessionId}_${Date.now()}`,
        sessionId,
        userId: 'system',
        timestamp: Date.now(),
        requestId: `session_${sessionId}_${agentId}_${Date.now()}`,
        operation: 'session-execution',
        correlationId: `${sessionId}_${agentId}_${Date.now()}`
      },
      options: {
        maxIterations: 50,
        timeout: 300000,
        stream: true,
        sessionContext: {
          sessionId,
          agentRole: agentAssociation.role,
          sessionAgents: sessionAgents.map(assoc => ({
            agentId: assoc.agentId,
            agentName: assoc.metadata?.agentName,
            role: assoc.role,
            status: assoc.status
          }))
        },
        ...options
      }
    };

    return this.executeAgent(executionRequest);
  }

  /**
   * Get session statistics for agent operations
   */
  getSessionStatistics(sessionId: string): {
    totalAgents: number;
    activeAgents: number;
    primaryAgent?: string;
    agentTypes: Record<string, number>;
    totalExecutions: number;
  } {
    const associations = this.sessionAgents.get(sessionId) || [];
    const activeAssociations = associations.filter(assoc => assoc.status === 'active');

    const agentTypes = activeAssociations.reduce((acc, assoc) => {
      const agent = this.agents.get(assoc.agentId);
      if (agent) {
        acc[agent.type] = (acc[agent.type] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    const primaryAgent = activeAssociations.find(assoc => assoc.role === 'primary');

    // Count executions for this session
    const sessionExecutions = Array.from(this.executions.values())
      .filter(execution => execution.sessionId === sessionId);

    return {
      totalAgents: associations.length,
      activeAgents: activeAssociations.length,
      primaryAgent: primaryAgent?.agentId,
      agentTypes,
      totalExecutions: sessionExecutions.length
    };
  }

  /**
   * Clean up session associations when session is deleted
   */
  async cleanupSession(sessionId: string): Promise<void> {
    const associations = this.sessionAgents.get(sessionId);
    if (!associations) {
      return;
    }

    // Remove from agent sessions
    for (const association of associations) {
      const agentSessionSet = this.agentSessions.get(association.agentId);
      if (agentSessionSet) {
        agentSessionSet.delete(sessionId);
        if (agentSessionSet.size === 0) {
          this.agentSessions.delete(association.agentId);
        }
      }
    }

    // Remove session associations
    this.sessionAgents.delete(sessionId);

    // Cancel any active executions for this session
    const sessionExecutions = Array.from(this.executions.entries())
      .filter(([_, execution]) => execution.sessionId === sessionId);

    for (const [executionId, _] of sessionExecutions) {
      this.cancelExecution(executionId);
    }

    this.dependencies.logger.info(`Session cleaned up`, { sessionId });
  }

  /**
   * Generate session title using specialized title generation agent
   */
  async generateSessionTitle(userMessage: string): Promise<string> {
    try {
      // Use a simple title generation approach for now
      // In a full implementation, this would use a specialized title generation agent
      const words = userMessage
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(word => word.length > 2)
        .slice(0, 4);

      if (words.length === 0) {
        return `Learning Session ${new Date().toLocaleDateString()}`;
      }

      const title = words.map(word =>
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      ).join(' ');

      return title.length > 50 ? title.substring(0, 47) + '...' : title;

    } catch (error) {
      this.dependencies.logger.error('Failed to generate session title', error as Error);
      return `Learning Session ${new Date().toLocaleDateString()}`;
    }
  }

  
  /**
   * Dispose of the agent manager
   */
  dispose(): void {
    // Cancel all active executions
    for (const executionId of this.executions.keys()) {
      this.cancelExecution(executionId);
    }

    // Clear all data
    this.agents.clear();
    this.executions.clear();
    this.sessionAgents.clear();
    this.agentSessions.clear();

    this.dependencies.logger.info('Agent manager service disposed');
  }
}