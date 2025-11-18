/**
 * Handoff Agent Orchestrator
 *
 * Implements the Handoff orchestration pattern where agents can
 * intelligently transfer control to other specialized agents based on
 * the user's needs and conversation context. This orchestrator manages
 * agent transitions, context preservation, and seamless handoffs.
 */

import { AsyncLocalStorage } from 'async_hooks';
import { BaseLanguageModel } from '@langchain/core/language_models/base';
import { HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';
import { AgentManagerMain } from '../agent-manager';
import { ServiceDependencies, ServiceExecutionContext } from '../types';
import { AgentExecutionChunk, AgentExecutionError } from '../types';

/**
 * Agent handoff decision
 */
interface HandoffDecision {
  shouldHandoff: boolean;
  targetAgentId?: string;
  targetAgentType?: string;
  reason: string;
  confidence: number;
  contextSummary?: string;
}

/**
 * Agent transition context
 */
interface AgentTransition {
  fromAgentId: string;
  toAgentId: string;
  reason: string;
  timestamp: number;
  contextPreserved: string[];
  handoffMetadata?: Record<string, any>;
}

/**
 * Handoff orchestration context
 */
interface HandoffContext extends ServiceExecutionContext {
  sessionId: string;
  currentAgentId: string;
  maxHandoffs: number;
  currentHandoffs: number;
  conversationHistory: any[];
  transitions: AgentTransition[];
  startTime: number;
  userGoals?: string[];
  sessionContext?: Record<string, any>;
}

/**
 * Handoff Agent Orchestrator
 *
 * Manages intelligent agent transitions with context preservation.
 * Handles handoff decisions, context transfer, and seamless user experience.
 */
export class HandoffOrchestrator {
  private readonly dependencies: ServiceDependencies;
  private readonly agentManager: AgentManagerMain;
  private readonly als: AsyncLocalStorage<ServiceExecutionContext>;

  constructor(
    dependencies: ServiceDependencies,
    agentManager: AgentManagerMain
  ) {
    this.dependencies = dependencies;
    this.agentManager = agentManager;
    this.als = new AsyncLocalStorage();
  }

  /**
   * Execute handoff orchestration
   */
  async *execute(
    model: BaseLanguageModel,
    initialAgentId: string,
    input: string,
    sessionId: string,
    options?: {
      maxHandoffs?: number;
      timeout?: number;
      preserveFullHistory?: boolean;
      userGoals?: string[];
    }
  ): AsyncGenerator<AgentExecutionChunk> {
    const handoffContext: HandoffContext = {
      id: `handoff_${sessionId}_${Date.now()}`,
      sessionId,
      userId: 'system',
      timestamp: Date.now(),
      requestId: `req_${Date.now()}`,
      operation: 'handoff-orchestration',
      currentAgentId: initialAgentId,
      maxHandoffs: options?.maxHandoffs || 5,
      currentHandoffs: 0,
      conversationHistory: [],
      transitions: [],
      startTime: Date.now(),
      userGoals: options?.userGoals || [],
      sessionContext: {},
      metadata: {}
    };

    yield* this.runWithContext('handoff-orchestration', async function* (this: HandoffOrchestrator) {
      this.dependencies.logger.info(`Starting handoff orchestration`, {
        sessionId,
        initialAgentId,
        maxHandoffs: handoffContext.maxHandoffs,
        userGoals: handoffContext.userGoals
      });

      // Add initial user message to history
      handoffContext.conversationHistory.push({
        role: 'user',
        content: input,
        timestamp: Date.now(),
        agentId: 'user'
      });

      // Execute handoff loop
      let currentAgentId = initialAgentId;
      let shouldContinue = true;

      while (shouldContinue && handoffContext.currentHandoffs < handoffContext.maxHandoffs) {
        // Execute current agent
        yield* this.executeCurrentAgent(currentAgentId, handoffContext);

        // Check if we should handoff to another agent
        const handoffDecision = await this.evaluateHandoffDecision(
          model,
          handoffContext,
          currentAgentId
        );

        if (handoffDecision.shouldHandoff && handoffDecision.targetAgentId) {
          // Perform handoff
          yield* this.performHandoff(
            currentAgentId,
            handoffDecision.targetAgentId,
            handoffDecision,
            handoffContext
          );

          currentAgentId = handoffDecision.targetAgentId;
          handoffContext.currentHandoffs++;

          // Check for timeout
          if (options?.timeout && (Date.now() - handoffContext.startTime) > options.timeout) {
            throw new AgentExecutionError(
              'Handoff orchestration timed out',
              currentAgentId,
              'execution',
              handoffContext
            );
          }
        } else {
          shouldContinue = false;
        }
      }

      // Final response and summary
      yield* this.generateFinalSummary(handoffContext);

    }.bind(this));
  }

  /**
   * Execute current agent
   */
  private async *executeCurrentAgent(
    agentId: string,
    context: HandoffContext
  ): AsyncGenerator<AgentExecutionChunk> {
    try {
      const agent = this.agentManager.getAgent(agentId);
      if (!agent) {
        throw new Error(`Agent '${agentId}' not found`);
      }

      yield {
        type: 'progress',
        content: {
          phase: 'agent_start',
          message: `Executing ${agent.name} (${agent.type})`,
          agentId,
          agentName: agent.name,
          agentType: agent.type
        },
        timestamp: Date.now()
      };

      // Get recent conversation for this agent
      const recentMessages = context.conversationHistory.slice(-10); // Last 10 messages

      // Prepare agent input
      const agentInput = {
        messages: recentMessages,
        context: {
          sessionId: context.sessionId,
          userGoals: context.userGoals,
          previousTransitions: context.transitions,
          sessionContext: context.sessionContext
        }
      };

      // Execute agent
      const agentResults: AgentExecutionChunk[] = [];
      const agentExecution = await this.agentManager.executeAgent({
        agentId,
        input: agentInput,
        context: {
          id: `handoff_${context.sessionId}_${Date.now()}`,
          sessionId: context.sessionId,
          userId: 'system',
          timestamp: Date.now(),
          requestId: `${context.sessionId}_${agentId}_${Date.now()}`,
          operation: 'agent-execution',
          correlationId: `${context.sessionId}_${agentId}_${Date.now()}`,
          metadata: {}
        },
        options: {
          maxIterations: 3, // Lower for handoff scenarios
          timeout: 60000,   // 1 minute per agent
          stream: true
        }
      });

      for await (const chunk of agentExecution) {
        agentResults.push(chunk);

        // Filter and yield relevant chunks
        if (chunk.type === 'data' || chunk.type === 'progress') {
          yield {
            ...chunk,
            content: {
              ...chunk.content,
              agentId,
              agentName: agent.name,
              orchestrationType: 'handoff'
            }
          };
        }
      }

      // Add agent response to conversation history
      const lastDataChunk = agentResults
        .filter(chunk => chunk.type === 'data')
        .pop();

      if (lastDataChunk?.content.message) {
        context.conversationHistory.push({
          role: 'assistant',
          content: lastDataChunk.content.message,
          timestamp: Date.now(),
          agentId,
          agentName: agent.name,
          agentType: agent.type
        });
      }

      yield {
        type: 'progress',
        content: {
          phase: 'agent_complete',
          message: `Completed execution of ${agent.name}`,
          agentId,
          totalChunks: agentResults.length
        },
        timestamp: Date.now()
      };

    } catch (error) {
      this.dependencies.logger.error(`Agent execution failed`, {
        agentId,
        error: (error as Error).message,
        sessionId: context.sessionId
      });

      yield {
        type: 'error',
        content: {
          agentId,
          error: `Agent execution failed: ${(error as Error).message}`,
          phase: 'agent_error'
        },
        timestamp: Date.now()
      };
    }
  }

  /**
   * Evaluate if handoff should occur
   */
  private async evaluateHandoffDecision(
    model: BaseLanguageModel,
    context: HandoffContext,
    currentAgentId: string
  ): Promise<HandoffDecision> {
    try {
      const currentAgent = this.agentManager.getAgent(currentAgentId);
      const availableAgents = this.agentManager.getRegisteredAgents()
        .filter(agent => agent.id !== currentAgentId && agent.enabled);

      if (availableAgents.length === 0) {
        return {
          shouldHandoff: false,
          reason: 'No other agents available for handoff',
          confidence: 1.0
        };
      }

      // Create evaluation prompt
      const evaluationPrompt = this.createHandoffEvaluationPrompt(
        currentAgent,
        availableAgents,
        context
      );

      const messages = [
        new SystemMessage(evaluationPrompt),
        new HumanMessage(this.formatConversationForEvaluation(context))
      ];

      const response = await model.invoke(messages);

      // Parse the decision from the response
      return this.parseHandoffDecision(response.content, availableAgents);

    } catch (error) {
      this.dependencies.logger.error('Handoff decision evaluation failed', error as Error);
      return {
        shouldHandoff: false,
        reason: 'Handoff evaluation failed',
        confidence: 0.0
      };
    }
  }

  /**
   * Create handoff evaluation prompt
   */
  private createHandoffEvaluationPrompt(
    currentAgent: any,
    availableAgents: any[],
    context: HandoffContext
  ): string {
    const agentDescriptions = availableAgents.map(agent =>
      `- ${agent.id} (${agent.name}): ${agent.description || agent.type} - Capabilities: ${(agent.capabilities || []).join(', ')}`
    ).join('\n');

    return `You are an intelligent handoff coordinator. Your task is to determine if the user would be better served by a different specialized agent.

Current Agent: ${currentAgent.id} (${currentAgent.name})
Type: ${currentAgent.type}
Description: ${currentAgent.description || 'No description'}

Available Agents for Handoff:
${agentDescriptions}

User Goals: ${context.userGoals?.join(', ') || 'Not specified'}

Conversation History: ${context.conversationHistory.length} messages
Previous Handoffs: ${context.currentHandoffs}/${context.maxHandoffs}

Analyze the conversation and determine:
1. Is the current agent effectively addressing the user's needs?
2. Would another agent be better suited for the current request?
3. Is this request outside the current agent's capabilities?
4. Has the user's focus shifted to a different domain?

Respond with a JSON object:
{
  "shouldHandoff": boolean,
  "targetAgentId": "agent_id" (if shouldHandoff is true),
  "reason": "clear explanation of the decision",
  "confidence": number between 0 and 1,
  "contextSummary": "brief summary of what needs to be preserved in the handoff"
}

Consider the user's journey and only recommend handoffs that genuinely improve their experience.`;
  }

  /**
   * Format conversation for evaluation
   */
  private formatConversationForEvaluation(context: HandoffContext): string {
    const recentMessages = context.conversationHistory.slice(-5); // Last 5 messages

    return recentMessages.map(msg =>
      `[${msg.agentId || msg.role}] ${msg.content}`
    ).join('\n\n');
  }

  /**
   * Parse handoff decision from AI response
   */
  private parseHandoffDecision(
    responseContent: string,
    availableAgents: any[]
  ): HandoffDecision {
    try {
      // Try to extract JSON from response
      const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const decision = JSON.parse(jsonMatch[0]);

        // Validate target agent
        if (decision.shouldHandoff && decision.targetAgentId) {
          const targetAgent = availableAgents.find(agent => agent.id === decision.targetAgentId);
          if (!targetAgent) {
            return {
              shouldHandoff: false,
              reason: `Target agent '${decision.targetAgentId}' not available`,
              confidence: 0.0
            };
          }
        }

        return {
          shouldHandoff: decision.shouldHandoff || false,
          targetAgentId: decision.targetAgentId,
          reason: decision.reason || 'No reason provided',
          confidence: decision.confidence || 0.0,
          contextSummary: decision.contextSummary
        };
      }
    } catch (error) {
      this.dependencies.logger.warn('Failed to parse handoff decision JSON', {
        responseContent,
        error: (error as Error).message
      });
    }

    // Fallback: simple text analysis
    const shouldHandoff = responseContent.toLowerCase().includes('handoff') ||
                         responseContent.toLowerCase().includes('transfer') ||
                         responseContent.toLowerCase().includes('better suited');

    return {
      shouldHandoff: shouldHandoff && availableAgents.length > 0,
      reason: shouldHandoff ? 'Text analysis suggests handoff' : 'No clear handoff indication',
      confidence: shouldHandoff ? 0.6 : 0.8
    };
  }

  /**
   * Perform agent handoff
   */
  private async *performHandoff(
    fromAgentId: string,
    toAgentId: string,
    decision: HandoffDecision,
    context: HandoffContext
  ): AsyncGenerator<AgentExecutionChunk> {
    const fromAgent = this.agentManager.getAgent(fromAgentId);
    const toAgent = this.agentManager.getAgent(toAgentId);

    if (!fromAgent || !toAgent) {
      throw new Error('Invalid agent handoff: one or both agents not found');
    }

    // Create transition record
    const transition: AgentTransition = {
      fromAgentId,
      toAgentId,
      reason: decision.reason,
      timestamp: Date.now(),
      contextPreserved: this.identifyContextToPreserve(context),
      handoffMetadata: {
        confidence: decision.confidence,
        contextSummary: decision.contextSummary,
        userGoals: context.userGoals || []
      }
    };

    context.transitions.push(transition);

    yield {
      type: 'progress',
      content: {
        phase: 'handoff',
        message: `Handing off from ${fromAgent.name} to ${toAgent.name}`,
        fromAgentId,
        toAgentId,
        fromAgentName: fromAgent.name,
        toAgentName: toAgent.name,
        reason: decision.reason,
        confidence: decision.confidence
      },
      timestamp: Date.now()
    };

    // Activate new agent for the session
    await this.agentManager.activateAgentForSession(toAgentId, context.sessionId, 'primary');

    // Update session context
    context.sessionContext = {
      ...context.sessionContext,
      lastHandoff: transition,
      currentAgentId: toAgentId,
      handoffCount: context.currentHandoffs + 1
    };

    this.dependencies.logger.info(`Agent handoff completed`, {
      sessionId: context.sessionId,
      fromAgentId,
      toAgentId,
      reason: decision.reason,
      confidence: decision.confidence,
      totalHandoffs: context.currentHandoffs + 1
    });
  }

  /**
   * Identify context to preserve during handoff
   */
  private identifyContextToPreserve(context: HandoffContext): string[] {
    const preservedContext: string[] = [];

    // Always preserve conversation history
    preservedContext.push('conversation_history');

    // Preserve user goals if specified
    if (context.userGoals && context.userGoals.length > 0) {
      preservedContext.push('user_goals');
    }

    // Preserve session context
    if (context.sessionContext && Object.keys(context.sessionContext).length > 0) {
      preservedContext.push('session_context');
    }

    // Preserve key information from previous agents
    if (context.transitions.length > 0) {
      preservedContext.push('agent_transitions');
    }

    return preservedContext;
  }

  /**
   * Generate final summary
   */
  private async *generateFinalSummary(context: HandoffContext): AsyncGenerator<AgentExecutionChunk> {
    yield {
      type: 'progress',
      content: {
        phase: 'summary',
        message: 'Generating session summary...'
      },
      timestamp: Date.now()
    };

    const summary = {
      sessionId: context.sessionId,
      totalDuration: Date.now() - context.startTime,
      totalHandoffs: context.currentHandoffs,
      totalMessages: context.conversationHistory.length,
      agentsInvolved: [...new Set(context.conversationHistory.map(msg => msg.agentId).filter(Boolean))],
      transitions: context.transitions,
      userGoals: context.userGoals,
      finalAgentId: context.currentAgentId
    };

    yield {
      type: 'data',
      content: {
        message: 'Handoff orchestration completed',
        type: 'orchestration_summary',
        summary,
        orchestrationType: 'handoff'
      },
      timestamp: Date.now()
    };

    this.dependencies.logger.info(`Handoff orchestration completed`, summary);
  }

  /**
   * Run function with context
   */
  private async *runWithContext<T>(
    operation: string,
    fn: () => AsyncIterable<T>
  ): AsyncIterable<T> {
    const context: ServiceExecutionContext = {
      id: `ctx_${Date.now()}`,
      sessionId: `session_${Date.now()}`,
      timestamp: Date.now(),
      requestId: `req_${Date.now()}`,
      operation,
      metadata: { service: 'handoff-orchestrator', operation }
    };
    yield* this.als.run(context, fn);
  }

  /**
   * Get orchestrator statistics
   */
  getStats(): {
    name: string;
    version: string;
    capabilities: string[];
    availableAgents: number;
    } {
    return {
      name: 'Handoff Orchestrator',
      version: '1.0.0',
      capabilities: [
        'intelligent_handoff_decisions',
        'context_preservation',
        'seamless_transitions',
        'conversation_history',
        'agent_coordination',
        'user_goal_tracking'
      ],
      availableAgents: this.agentManager.getRegisteredAgents().length
    };
  }

  /**
   * Dispose of orchestrator resources
   */
  dispose(): void {
    this.dependencies.logger.info('Handoff orchestrator disposed');
  }
}