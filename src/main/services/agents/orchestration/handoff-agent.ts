/**
 * Handoff Agent Orchestration Pattern
 *
 * Implements intelligent agent conversation flow and context preservation
 * across multiple specialized agents. This agent can determine when to
 * hand off conversations to other agents and preserve context throughout.
 */

import { BaseLanguageModel } from '@langchain/core/language_models/base';
import { HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';
import { AgentExecutionRequest, AgentExecutionChunk, AgentConfig } from '../../types';

// Local definition since the import is having issues
export interface AgentExecutionContext {
  id: string;
  sessionId?: string;
  userId?: string;
  timestamp: number;
  requestId: string;
  correlationId?: string;
  operation: string;
  metadata?: Record<string, any>;
  agentId: string;
  agentType: string;
  learningContext: {
    currentTopic?: string;
    difficultyLevel?: 'beginner' | 'intermediate' | 'advanced';
    userGoals?: string[];
    previousInteractions?: any[];
  };
}
import { AgentManagerMain } from '../agent-manager';
import { ServiceDependencies } from '../types';

export interface AgentCapability {
  agentId: string;
  agentName: string;
  agentType: string;
  capabilities: string[];
  confidence: number;
  description: string;
}

export interface HandoffDecision {
  shouldHandoff: boolean;
  targetAgent?: string;
  reasoning: string;
  confidence: number;
  contextSummary?: string;
}

export interface ConversationContext {
  sessionId: string;
  userId: string;
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
    agentId?: string;
    timestamp: number;
  }>;
  currentAgent: string;
  handoffHistory: Array<{
    fromAgent: string;
    toAgent: string;
    reason: string;
    timestamp: number;
  }>;
  metadata: Record<string, any>;
}

export interface HandoffConfig {
  maxHandoffs: number;
  confidenceThreshold: number;
  contextRetentionLimit: number;
  allowSelfHandoff: boolean;
  requireConfirmation: boolean;
}

/**
 * Handoff Agent for intelligent agent conversation flow
 */
export class HandoffAgent {
  private model: BaseLanguageModel;
  private agentManager: AgentManagerMain;
  private dependencies: ServiceDependencies;
  private config: HandoffConfig;
  private conversationContexts = new Map<string, ConversationContext>();

  constructor(
    model: BaseLanguageModel,
    agentManager: AgentManagerMain,
    dependencies: ServiceDependencies,
    config: HandoffConfig
  ) {
    this.model = model;
    this.agentManager = agentManager;
    this.dependencies = dependencies;
    this.config = config;
  }

  /**
   * Execute handoff agent orchestration
   */
  async *execute(
    request: AgentExecutionRequest,
    executionContext: AgentExecutionContext
  ): AsyncIterable<AgentExecutionChunk> {
    const sessionId = request.context.sessionId || executionContext.id;

    this.dependencies.logger.info(`Starting Handoff Agent execution`, {
      executionId: executionContext.id,
      sessionId,
      currentAgent: request.agentId
    });

    try {
      // Get or create conversation context
      const conversationContext = this.getOrCreateConversationContext(sessionId, request);

      // Update current agent
      conversationContext.currentAgent = request.agentId;
      conversationContext.messages.push({
        role: 'user',
        content: typeof request.input === 'string' ? request.input : JSON.stringify(request.input),
        timestamp: Date.now()
      });

      yield {
        type: 'progress',
        content: { phase: 'analyzing', message: 'Analyzing conversation to determine if handoff is needed...' },
        timestamp: Date.now()
      };

      // Step 1: Determine if handoff is needed
      const handoffDecision = await this.evaluateHandoffNeed(
        request.input,
        conversationContext,
        executionContext
      );

      yield {
        type: 'progress',
        content: {
          phase: 'handoff_decision',
          message: handoffDecision.shouldHandoff
            ? `Handing off to ${handoffDecision.targetAgent}`
            : 'Continuing with current agent',
          decision: handoffDecision
        },
        timestamp: Date.now()
      };

      if (handoffDecision.shouldHandoff && handoffDecision.targetAgent) {
        // Step 2: Execute handoff
        yield* this.executeHandoff(
          request,
          handoffDecision,
          conversationContext,
          executionContext
        );
      } else {
        // Step 3: Continue with current agent
        yield* this.executeWithCurrentAgent(
          request,
          conversationContext,
          executionContext
        );
      }

      // Update conversation context
      this.conversationContexts.set(sessionId, conversationContext);

    } catch (error) {
      this.dependencies.logger.error(`Handoff Agent execution failed`, error as Error);
      throw error;
    }
  }

  /**
   * Get or create conversation context
   */
  private getOrCreateConversationContext(
    sessionId: string,
    request: AgentExecutionRequest
  ): ConversationContext {
    let context = this.conversationContexts.get(sessionId);

    if (!context) {
      context = {
        sessionId,
        userId: request.context.userId || 'anonymous',
        messages: [],
        currentAgent: request.agentId,
        handoffHistory: [],
        metadata: {
          createdAt: Date.now(),
          lastActivity: Date.now()
        }
      };
    }

    context.metadata.lastActivity = Date.now();
    return context;
  }

  /**
   * Evaluate if handoff is needed
   */
  private async evaluateHandoffNeed(
    input: any,
    conversationContext: ConversationContext,
    executionContext: AgentExecutionContext
  ): Promise<HandoffDecision> {
    // Get available agents
    const availableAgents = this.agentManager.getRegisteredAgents();
    const currentAgent = this.agentManager.getAgent(executionContext.agentId);

    if (!currentAgent) {
      throw new Error(`Current agent ${executionContext.agentId} not found`);
    }

    // Check handoff limit
    if (conversationContext.handoffHistory.length >= this.config.maxHandoffs) {
      return {
        shouldHandoff: false,
        reasoning: `Maximum handoff limit (${this.config.maxHandoffs}) reached`,
        confidence: 1.0
      };
    }

    // Create agent capabilities list
    const agentCapabilities: AgentCapability[] = availableAgents
      .filter(agent => agent.id !== executionContext.agentId || this.config.allowSelfHandoff)
      .map(agent => ({
        agentId: agent.id,
        agentName: agent.name,
        agentType: agent.type,
        capabilities: agent.capabilities || [],
        confidence: 0.8,
        description: agent.description || `Agent of type ${agent.type}`
      }));

    if (agentCapabilities.length === 0) {
      return {
        shouldHandoff: false,
        reasoning: 'No other agents available for handoff',
        confidence: 1.0
      };
    }

    // Create handoff evaluation prompt
    const currentInput = typeof input === 'string' ? input : JSON.stringify(input);
    const conversationHistory = conversationContext.messages
      .slice(-10) // Last 10 messages for context
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');

    const agentDescriptions = agentCapabilities.map(ac =>
      `- ${ac.agentName} (${ac.agentId}, type: ${ac.agentType}): ${ac.description}\n  Capabilities: ${ac.capabilities.join(', ')}`
    ).join('\n');

    const systemPrompt = `You are an intelligent handoff coordinator. Analyze the current conversation and determine if the user would be better served by a different agent.

Current agent: ${currentAgent.name} (${currentAgent.type})
Capabilities: ${(currentAgent.capabilities || []).join(', ')}

Available agents for handoff:
${agentDescriptions}

Recent conversation history:
${conversationHistory}

Current user request: ${currentInput}

Instructions:
1. Analyze if the current agent is well-suited for this request
2. Consider the conversation history and context
3. Evaluate if another agent would be more appropriate
4. Avoid excessive handoffs - only handoff when there's a clear benefit
5. Consider user intent and the capabilities of each agent
6. If handoff is needed, explain why and which agent is best

Response format:
{
  "should_handoff": true/false,
  "target_agent": "agent_id_or_null",
  "reasoning": "Detailed explanation of the decision",
  "confidence": 0.85,
  "context_summary": "Brief summary of conversation context for the new agent"
}`;

    const messages = [
      new SystemMessage(systemPrompt),
      new HumanMessage(`Evaluate handoff need for: ${currentInput}`)
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
          throw new Error(`Failed to parse handoff decision: ${content}`);
        }
      }

      const handoffDecision: HandoffDecision = {
        shouldHandoff: parsed.should_handoff && parsed.confidence >= this.config.confidenceThreshold,
        targetAgent: parsed.target_agent,
        reasoning: parsed.reasoning || 'No reasoning provided',
        confidence: parsed.confidence || 0.5,
        contextSummary: parsed.context_summary
      };

      // Validate target agent
      if (handoffDecision.shouldHandoff && handoffDecision.targetAgent) {
        const targetAgent = this.agentManager.getAgent(handoffDecision.targetAgent);
        if (!targetAgent) {
          return {
            shouldHandoff: false,
            reasoning: `Target agent ${handoffDecision.targetAgent} not found`,
            confidence: 1.0
          };
        }
      }

      return handoffDecision;

    } catch (error) {
      this.dependencies.logger.warn(`Handoff evaluation failed, continuing with current agent`, error as Error);
      return {
        shouldHandoff: false,
        reasoning: 'Handoff evaluation failed',
        confidence: 0.0
      };
    }
  }

  /**
   * Execute handoff to target agent
   */
  private async *executeHandoff(
    request: AgentExecutionRequest,
    handoffDecision: HandoffDecision,
    conversationContext: ConversationContext,
    executionContext: AgentExecutionContext
  ): AsyncIterable<AgentExecutionChunk> {
    const targetAgentId = handoffDecision.targetAgent!;
    const targetAgent = this.agentManager.getAgent(targetAgentId);

    if (!targetAgent) {
      throw new Error(`Target agent ${targetAgentId} not found`);
    }

    yield {
      type: 'progress',
      content: {
        phase: 'handoff_start',
        fromAgent: executionContext.agentId,
        toAgent: targetAgentId,
        reason: handoffDecision.reasoning,
        confidence: handoffDecision.confidence
      },
      timestamp: Date.now()
    };

    // Record handoff in history
    conversationContext.handoffHistory.push({
      fromAgent: executionContext.agentId,
      toAgent: targetAgentId,
      reason: handoffDecision.reasoning,
      timestamp: Date.now()
    });

    // Create handoff context for the target agent
    const handoffContext = {
      ...request.context,
      handoffFrom: executionContext.agentId,
      handoffReason: handoffDecision.reasoning,
      conversationHistory: conversationContext.messages.slice(-20), // Last 20 messages
      contextSummary: handoffDecision.contextSummary,
      handoffNumber: conversationContext.handoffHistory.length
    };

    // Prepare handoff message for the target agent
    const handoffMessage = this.createHandoffMessage(
      handoffDecision,
      conversationContext,
      executionContext
    );

    // Execute with target agent
    try {
      const targetRequest: AgentExecutionRequest = {
        agentId: targetAgentId,
        input: handoffMessage,
        context: handoffContext,
        options: request.options
      };

      // Execute target agent
      const targetExecution = await this.agentManager.executeAgent(targetRequest);

      // Stream results from target agent
      let assistantResponse = '';
      for await (const chunk of targetExecution) {
        yield chunk;

        // Capture assistant response for context
        if (chunk.type === 'data' && chunk.content.message) {
          assistantResponse += chunk.content.message;
        }
      }

      // Record assistant response in conversation context
      conversationContext.messages.push({
        role: 'assistant',
        content: assistantResponse,
        agentId: targetAgentId,
        timestamp: Date.now()
      });

      yield {
        type: 'complete',
        content: {
          phase: 'handoff_complete',
          fromAgent: executionContext.agentId,
          toAgent: targetAgentId,
          responseLength: assistantResponse.length,
          totalHandoffs: conversationContext.handoffHistory.length
        },
        timestamp: Date.now()
      };

    } catch (error) {
      yield {
        type: 'error',
        content: {
          phase: 'handoff_error',
          fromAgent: executionContext.agentId,
          toAgent: targetAgentId,
          error: (error as Error).message
        },
        timestamp: Date.now()
      };

      // Fall back to current agent
      yield* this.executeWithCurrentAgent(request, conversationContext, executionContext);
    }
  }

  /**
   * Execute with current agent (no handoff)
   */
  private async *executeWithCurrentAgent(
    request: AgentExecutionRequest,
    conversationContext: ConversationContext,
    executionContext: AgentExecutionContext
  ): AsyncIterable<AgentExecutionChunk> {
    yield {
      type: 'progress',
      content: { phase: 'continuing', message: 'Continuing with current agent...' },
      timestamp: Date.now()
    };

    try {
      // Execute with current agent
      const currentExecution = await this.agentManager.executeAgent(request);

      let assistantResponse = '';
      for await (const chunk of currentExecution) {
        yield chunk;

        // Capture assistant response for context
        if (chunk.type === 'data' && chunk.content.message) {
          assistantResponse += chunk.content.message;
        }
      }

      // Record assistant response in conversation context
      conversationContext.messages.push({
        role: 'assistant',
        content: assistantResponse,
        agentId: executionContext.agentId,
        timestamp: Date.now()
      });

    } catch (error) {
      yield {
        type: 'error',
        content: {
          error: `Current agent execution failed: ${(error as Error).message}`,
          agentId: executionContext.agentId
        },
        timestamp: Date.now()
      };
    }
  }

  /**
   * Create handoff message for target agent
   */
  private createHandoffMessage(
    handoffDecision: HandoffDecision,
    conversationContext: ConversationContext,
    executionContext: AgentExecutionContext
  ): string {
    const recentMessages = conversationContext.messages.slice(-5);
    const conversationSummary = recentMessages
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');

    return `[HANDOFF CONTEXT]
You are receiving this conversation from another agent.

Original user request: ${conversationContext.messages[conversationContext.messages.length - 1]?.content}

Handoff reason: ${handoffDecision.reasoning}
Context summary: ${handoffDecision.contextSummary || 'No summary provided'}

Recent conversation:
${conversationSummary}

Please continue the conversation based on this context and your specialized capabilities.`;
  }

  /**
   * Get conversation context
   */
  getConversationContext(sessionId: string): ConversationContext | undefined {
    return this.conversationContexts.get(sessionId);
  }

  /**
   * Clear conversation context
   */
  clearConversationContext(sessionId: string): void {
    this.conversationContexts.delete(sessionId);
  }

  /**
   * Get handoff statistics
   */
  getHandoffStatistics(): {
    totalConversations: number;
    totalHandoffs: number;
    averageHandoffsPerConversation: number;
    mostHandedOffToAgents: Array<{ agentId: string; count: number }>;
  } {
    const contexts = Array.from(this.conversationContexts.values());
    const totalHandoffs = contexts.reduce((sum, ctx) => sum + ctx.handoffHistory.length, 0);

    const agentHandoffCounts = new Map<string, number>();
    contexts.forEach(ctx => {
      ctx.handoffHistory.forEach(handoff => {
        const count = agentHandoffCounts.get(handoff.toAgent) || 0;
        agentHandoffCounts.set(handoff.toAgent, count + 1);
      });
    });

    const mostHandedOffToAgents = Array.from(agentHandoffCounts.entries())
      .map(([agentId, count]) => ({ agentId, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalConversations: contexts.length,
      totalHandoffs,
      averageHandoffsPerConversation: contexts.length > 0 ? totalHandoffs / contexts.length : 0,
      mostHandedOffToAgents
    };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<HandoffConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Dispose of handoff agent
   */
  dispose(): void {
    // Clear all conversation contexts
    this.conversationContexts.clear();
    this.dependencies.logger.info('Handoff agent disposed');
  }
}

/**
 * Default handoff configuration
 */
export const DEFAULT_HANDOFF_CONFIG: HandoffConfig = {
  maxHandoffs: 5,
  confidenceThreshold: 0.7,
  contextRetentionLimit: 50,
  allowSelfHandoff: false,
  requireConfirmation: false
};