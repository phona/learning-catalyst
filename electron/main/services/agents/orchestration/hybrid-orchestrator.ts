/**
 * Hybrid Agent Orchestrator
 *
 * Implements the Hybrid orchestration pattern that combines both
 * Tool Calling and Handoff patterns. This orchestrator can dynamically
 * switch between tool-based problem solving and agent handoffs based
 * on the complexity and nature of user requests.
 */

import { AsyncLocalStorage } from 'async_hooks';
import { BaseLanguageModel } from '@langchain/core/language_models/base';
import { HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';
import { AgentManagerMain } from '../agent-manager';
import { ToolExecutorService } from '../tool-executor';
import { ToolCallingOrchestrator } from './tool-calling-orchestrator';
import { HandoffOrchestrator } from './handoff-orchestrator';
import { ServiceDependencies, ServiceExecutionContext } from '../types';
import { AgentExecutionChunk, AgentExecutionError } from '../types';

/**
 * Orchestration strategy types
 */
type OrchestrationStrategy = 'tool_calling' | 'handoff' | 'hybrid' | 'sequential';

/**
 * Hybrid orchestration context
 */
interface HybridContext extends ServiceExecutionContext {
  sessionId: string;
  currentAgentId: string;
  strategy: OrchestrationStrategy;
  maxPhases: number;
  currentPhase: number;
  phaseHistory: Array<{
    phase: number;
    strategy: OrchestrationStrategy;
    agentId?: string;
    duration: number;
    success: boolean;
    reason: string;
  }>;
  conversationHistory: any[];
  toolResults: any[];
  transitions: any[];
  startTime: number;
  userGoals?: string[];
  sessionContext?: Record<string, any>;
}

/**
 * Strategy decision result
 */
interface StrategyDecision {
  strategy: OrchestrationStrategy;
  targetAgentId?: string;
  tools?: string[];
  reason: string;
  confidence: number;
  estimatedDuration?: number;
}

/**
 * Hybrid Agent Orchestrator
 *
 * Combines Tool Calling and Handoff orchestration patterns for
 * maximum flexibility and capability. Dynamically selects the best
 * approach based on request complexity and user needs.
 */
export class HybridOrchestrator {
  private dependencies: ServiceDependencies;
  private agentManager: AgentManagerMain;
  private toolExecutor: ToolExecutorService;
  private toolCallingOrchestrator: ToolCallingOrchestrator;
  private handoffOrchestrator: HandoffOrchestrator;
  private als: AsyncLocalStorage<ServiceExecutionContext>;

  constructor(
    dependencies: ServiceDependencies,
    agentManager: AgentManagerMain,
    toolExecutor: ToolExecutorService
  ) {
    this.dependencies = dependencies;
    this.agentManager = agentManager;
    this.toolExecutor = toolExecutor;
    this.toolCallingOrchestrator = new ToolCallingOrchestrator(dependencies, toolExecutor);
    this.handoffOrchestrator = new HandoffOrchestrator(dependencies, agentManager);
    this.als = new AsyncLocalStorage();
  }

  /**
   * Execute hybrid orchestration
   */
  async *execute(
    model: BaseLanguageModel,
    initialAgentId: string,
    input: string,
    sessionId: string,
    options?: {
      maxPhases?: number;
      timeout?: number;
      userGoals?: string[];
      preferredStrategy?: OrchestrationStrategy;
    }
  ): AsyncGenerator<AgentExecutionChunk> {
    const hybridContext: HybridContext = {
      sessionId,
      currentAgentId: initialAgentId,
      strategy: options?.preferredStrategy || 'hybrid',
      maxPhases: options?.maxPhases || 8,
      currentPhase: 0,
      phaseHistory: [],
      conversationHistory: [],
      toolResults: [],
      transitions: [],
      startTime: Date.now(),
      userGoals: options?.userGoals || [],
      sessionContext: {}
    };

    yield* this.runWithContext('hybrid-orchestration', async function* () {
      this.dependencies.logger.info(`Starting hybrid orchestration`, {
        sessionId,
        initialAgentId,
        strategy: hybridContext.strategy,
        maxPhases: hybridContext.maxPhases,
        userGoals: hybridContext.userGoals
      });

      // Add initial user message to history
      hybridContext.conversationHistory.push({
        role: 'user',
        content: input,
        timestamp: Date.now(),
        agentId: 'user'
      });

      // Execute hybrid orchestration loop
      let shouldContinue = true;

      while (shouldContinue && hybridContext.currentPhase < hybridContext.maxPhases) {
        hybridContext.currentPhase++;

        // Determine best strategy for current phase
        const strategyDecision = await this.determineStrategy(
          model,
          hybridContext
        );

        yield {
          type: 'progress',
          content: {
            phase: 'strategy_selection',
            message: `Phase ${hybridContext.currentPhase}: Using ${strategyDecision.strategy} strategy`,
            strategy: strategyDecision.strategy,
            reason: strategyDecision.reason,
            confidence: strategyDecision.confidence,
            phase: hybridContext.currentPhase
          },
          timestamp: Date.now()
        };

        const phaseStartTime = Date.now();
        let phaseSuccess = false;
        let phaseError: string | undefined;

        try {
          // Execute based on chosen strategy
          switch (strategyDecision.strategy) {
            case 'tool_calling':
              yield* this.executeToolCallingPhase(
                model,
                strategyDecision,
                hybridContext
              );
              phaseSuccess = true;
              break;

            case 'handoff':
              yield* this.executeHandoffPhase(
                model,
                strategyDecision,
                hybridContext
              );
              phaseSuccess = true;
              break;

            case 'hybrid':
              yield* this.executeHybridPhase(
                model,
                strategyDecision,
                hybridContext
              );
              phaseSuccess = true;
              break;

            case 'sequential':
              yield* this.executeSequentialPhase(
                model,
                strategyDecision,
                hybridContext
              );
              phaseSuccess = true;
              break;

            default:
              throw new Error(`Unknown strategy: ${strategyDecision.strategy}`);
          }

        } catch (error) {
          phaseError = (error as Error).message;
          this.dependencies.logger.error(`Phase execution failed`, {
            phase: hybridContext.currentPhase,
            strategy: strategyDecision.strategy,
            error: phaseError
          });

          yield {
            type: 'error',
            content: {
              phase: 'phase_error',
              message: `Phase ${hybridContext.currentPhase} failed: ${phaseError}`,
              strategy: strategyDecision.strategy,
              phase: hybridContext.currentPhase
            },
            timestamp: Date.now()
          };
        }

        // Record phase completion
        const phaseDuration = Date.now() - phaseStartTime;
        hybridContext.phaseHistory.push({
          phase: hybridContext.currentPhase,
          strategy: strategyDecision.strategy,
          agentId: strategyDecision.targetAgentId,
          duration: phaseDuration,
          success: phaseSuccess,
          reason: strategyDecision.reason
        });

        // Determine if we should continue
        shouldContinue = await this.shouldContinueOrchestration(
          model,
          hybridContext,
          phaseSuccess
        );

        // Check for timeout
        if (options?.timeout && (Date.now() - hybridContext.startTime) > options.timeout) {
          throw new AgentExecutionError(
            'Hybrid orchestration timed out',
            hybridContext.currentAgentId,
            'execution',
            hybridContext
          );
        }
      }

      // Generate final summary
      yield* this.generateFinalHybridSummary(hybridContext);

    }.bind(this));
  }

  /**
   * Determine best orchestration strategy
   */
  private async determineStrategy(
    model: BaseLanguageModel,
    context: HybridContext
  ): Promise<StrategyDecision> {
    try {
      const availableAgents = this.agentManager.getRegisteredAgents()
        .filter(agent => agent.enabled);
      const availableTools = this.toolExecutor.getAvailableTools();

      // Create strategy evaluation prompt
      const evaluationPrompt = this.createStrategyEvaluationPrompt(
        availableAgents,
        availableTools,
        context
      );

      const messages = [
        new SystemMessage(evaluationPrompt),
        new HumanMessage(this.formatContextForEvaluation(context))
      ];

      const response = await model.invoke(messages);

      // Parse the strategy decision from response
      return this.parseStrategyDecision(response.content, availableAgents, availableTools);

    } catch (error) {
      this.dependencies.logger.error('Strategy determination failed', error as Error);

      // Fallback to tool calling if strategy determination fails
      return {
        strategy: 'tool_calling',
        tools: this.toolExecutor.getAvailableTools().slice(0, 5), // Top 5 tools
        reason: 'Strategy evaluation failed, defaulting to tool calling',
        confidence: 0.5
      };
    }
  }

  /**
   * Create strategy evaluation prompt
   */
  private createStrategyEvaluationPrompt(
    availableAgents: any[],
    availableTools: string[],
    context: HybridContext
  ): string {
    const agentDescriptions = availableAgents.map(agent =>
      `- ${agent.id} (${agent.name}): ${agent.description || agent.type}`
    ).join('\n');

    const toolList = availableTools.slice(0, 10).join(', '); // Top 10 tools

    return `You are an intelligent orchestration strategy coordinator. Your task is to determine the best approach to handle the user's request.

Available Strategies:
1. tool_calling - Use tools to directly address the request
2. handoff - Transfer to a specialized agent
3. hybrid - Combine tool usage with agent handoffs
4. sequential - Execute multiple steps in sequence

Available Agents:
${agentDescriptions}

Available Tools:
${toolList}

Current Context:
- Current Phase: ${context.currentPhase}/${context.maxPhases}
- Previous Phases: ${context.phaseHistory.length}
- User Goals: ${context.userGoals.join(', ') || 'Not specified'}
- Tool Results: ${context.toolResults.length}
- Agent Transitions: ${context.transitions.length}

Analyze the request and context to determine:
1. Is this a tool-based problem that can be solved with available tools?
2. Would specialized agent expertise be more valuable?
3. Do we need both tools and agent expertise?
4. Should this be handled in sequential steps?

Respond with a JSON object:
{
  "strategy": "tool_calling" | "handoff" | "hybrid" | "sequential",
  "targetAgentId": "agent_id" (if handoff or hybrid),
  "tools": ["tool1", "tool2"] (if tool_calling or hybrid),
  "reason": "clear explanation of the choice",
  "confidence": number between 0 and 1,
  "estimatedDuration": number (optional, in seconds)
}

Consider efficiency, effectiveness, and user experience in your decision.`;
  }

  /**
   * Format context for strategy evaluation
   */
  private formatContextForEvaluation(context: HybridContext): string {
    const recentMessages = context.conversationHistory.slice(-3); // Last 3 messages

    return `Current Request: ${recentMessages[recentMessages.length - 1]?.content || 'No content'}

Recent Context:
${recentMessages.map(msg => `[${msg.agentId || msg.role}] ${msg.content}`).join('\n')}

Previous Phase Results:
${context.phaseHistory.slice(-2).map(phase =>
  `Phase ${phase.phase}: ${phase.strategy} - ${phase.success ? 'Success' : 'Failed'} (${phase.reason})`
).join('\n') || 'No previous phases'}`;
  }

  /**
   * Parse strategy decision from AI response
   */
  private parseStrategyDecision(
    responseContent: string,
    availableAgents: any[],
    availableTools: string[]
  ): StrategyDecision {
    try {
      // Try to extract JSON from response
      const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const decision = JSON.parse(jsonMatch[0]);

        // Validate strategy
        const validStrategies: OrchestrationStrategy[] = ['tool_calling', 'handoff', 'hybrid', 'sequential'];
        if (!validStrategies.includes(decision.strategy)) {
          throw new Error(`Invalid strategy: ${decision.strategy}`);
        }

        // Validate target agent if specified
        if (decision.targetAgentId) {
          const targetAgent = availableAgents.find(agent => agent.id === decision.targetAgentId);
          if (!targetAgent) {
            throw new Error(`Target agent '${decision.targetAgentId}' not available`);
          }
        }

        // Validate tools if specified
        if (decision.tools && Array.isArray(decision.tools)) {
          decision.tools = decision.tools.filter((tool: string) =>
            availableTools.includes(tool)
          );
        }

        return {
          strategy: decision.strategy,
          targetAgentId: decision.targetAgentId,
          tools: decision.tools || availableTools.slice(0, 3),
          reason: decision.reason || 'No reason provided',
          confidence: decision.confidence || 0.5,
          estimatedDuration: decision.estimatedDuration
        };
      }
    } catch (error) {
      this.dependencies.logger.warn('Failed to parse strategy decision JSON', {
        responseContent,
        error: (error as Error).message
      });
    }

    // Fallback: simple heuristic-based decision
    const hasTools = availableTools.length > 0;
    const hasAgents = availableAgents.length > 0;

    let strategy: OrchestrationStrategy = 'tool_calling';
    if (hasTools && hasAgents) {
      strategy = 'hybrid';
    } else if (hasAgents) {
      strategy = 'handoff';
    }

    return {
      strategy,
      tools: hasTools ? availableTools.slice(0, 3) : [],
      reason: 'Fallback strategy based on available resources',
      confidence: 0.4
    };
  }

  /**
   * Execute tool calling phase
   */
  private async *executeToolCallingPhase(
    model: BaseLanguageModel,
    decision: StrategyDecision,
    context: HybridContext
  ): AsyncGenerator<AgentExecutionChunk> {
    const latestMessage = context.conversationHistory[context.conversationHistory.length - 1];
    const input = latestMessage?.content || '';

    yield* this.toolCallingOrchestrator.execute(
      model,
      input,
      'You are a helpful assistant with access to specialized tools. Use tools when necessary to provide accurate and comprehensive answers.',
      decision.tools || [],
      {
        agentId: context.currentAgentId,
        sessionId: context.sessionId,
        userId: 'system',
        timestamp: Date.now(),
        correlationId: `${context.sessionId}_tool_${Date.now()}`
      },
      {
        maxToolCalls: 5,
        maxIterations: 3,
        timeout: 60000,
        stream: true
      }
    );
  }

  /**
   * Execute handoff phase
   */
  private async *executeHandoffPhase(
    model: BaseLanguageModel,
    decision: StrategyDecision,
    context: HybridContext
  ): AsyncGenerator<AgentExecutionChunk> {
    const latestMessage = context.conversationHistory[context.conversationHistory.length - 1];
    const input = latestMessage?.content || '';

    const targetAgentId = decision.targetAgentId || context.currentAgentId;

    yield* this.handoffOrchestrator.execute(
      model,
      targetAgentId,
      input,
      context.sessionId,
      {
        maxHandoffs: 2,
        timeout: 60000,
        preserveFullHistory: true,
        userGoals: context.userGoals
      }
    );
  }

  /**
   * Execute hybrid phase
   */
  private async *executeHybridPhase(
    model: BaseLanguageModel,
    decision: StrategyDecision,
    context: HybridContext
  ): AsyncGenerator<AgentExecutionChunk> {
    // First try tool calling
    yield* this.executeToolCallingPhase(model, decision, context);

    // Then handoff to specialized agent if needed
    if (decision.targetAgentId && decision.targetAgentId !== context.currentAgentId) {
      yield {
        type: 'progress',
        content: {
          phase: 'hybrid_handoff',
          message: 'Tool calling complete, handing off to specialized agent',
          targetAgentId: decision.targetAgentId
        },
        timestamp: Date.now()
      };

      yield* this.executeHandoffPhase(model, decision, context);
    }
  }

  /**
   * Execute sequential phase
   */
  private async *executeSequentialPhase(
    model: BaseLanguageModel,
    decision: StrategyDecision,
    context: HybridContext
  ): AsyncGenerator<AgentExecutionChunk> {
    // Execute multiple steps in sequence
    // 1. First tool calling if tools available
    if (decision.tools && decision.tools.length > 0) {
      yield {
        type: 'progress',
        content: {
          phase: 'sequential_step1',
          message: 'Step 1: Executing tool-based analysis'
        },
        timestamp: Date.now()
      };

      yield* this.executeToolCallingPhase(model, decision, context);
    }

    // 2. Then agent handoff if target specified
    if (decision.targetAgentId) {
      yield {
        type: 'progress',
        content: {
          phase: 'sequential_step2',
          message: 'Step 2: Handing off to specialized agent',
          targetAgentId: decision.targetAgentId
        },
        timestamp: Date.now()
      };

      yield* this.executeHandoffPhase(model, decision, context);
    }
  }

  /**
   * Determine if orchestration should continue
   */
  private async shouldContinueOrchestration(
    model: BaseLanguageModel,
    context: HybridContext,
    lastPhaseSuccess: boolean
  ): Promise<boolean> {
    // Don't continue if we've reached max phases
    if (context.currentPhase >= context.maxPhases) {
      return false;
    }

    // Don't continue if last phase failed and we've had recent failures
    const recentFailures = context.phaseHistory.slice(-3).filter(phase => !phase.success);
    if (recentFailures.length >= 2 && !lastPhaseSuccess) {
      return false;
    }

    // Check if user's request appears to be fully addressed
    const latestMessages = context.conversationHistory.slice(-2);
    if (latestMessages.length >= 2) {
      const userMessage = latestMessages.find(msg => msg.role === 'user');
      const assistantMessage = latestMessages.find(msg => msg.role === 'assistant');

      if (userMessage && assistantMessage) {
        // Simple heuristic: if assistant's response is comprehensive, we might be done
        const responseCompleteness = this.assessResponseCompleteness(
          userMessage.content,
          assistantMessage.content
        );

        if (responseCompleteness > 0.8) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Assess response completeness (simple heuristic)
   */
  private assessResponseCompleteness(userRequest: string, assistantResponse: string): number {
    // This is a very simple implementation
    // In a full implementation, you'd use more sophisticated NLP

    const userWords = userRequest.toLowerCase().split(/\s+/);
    const responseWords = assistantResponse.toLowerCase().split(/\s+/);

    // Check if response addresses key terms from user request
    let addressedTerms = 0;
    for (const word of userWords) {
      if (word.length > 4 && responseWords.includes(word)) {
        addressedTerms++;
      }
    }

    const significantTerms = userWords.filter(word => word.length > 4).length;
    if (significantTerms === 0) return 0.5;

    return Math.min(addressedTerms / significantTerms, 1.0);
  }

  /**
   * Generate final hybrid summary
   */
  private async *generateFinalHybridSummary(context: HybridContext): AsyncGenerator<AgentExecutionChunk> {
    yield {
      type: 'progress',
      content: {
        phase: 'summary',
        message: 'Generating hybrid orchestration summary...'
      },
      timestamp: Date.now()
    };

    const summary = {
      sessionId: context.sessionId,
      orchestrationType: 'hybrid',
      totalDuration: Date.now() - context.startTime,
      totalPhases: context.currentPhase,
      phaseHistory: context.phaseHistory,
      strategyDistribution: this.calculateStrategyDistribution(context.phaseHistory),
      agentsInvolved: [...new Set(context.phaseHistory.map(p => p.agentId).filter(Boolean))],
      toolsUsed: [...new Set(context.toolResults.map(r => r.toolName).filter(Boolean))],
      transitions: context.transitions,
      userGoals: context.userGoals,
      success: this.calculateOverallSuccess(context.phaseHistory)
    };

    yield {
      type: 'data',
      content: {
        message: 'Hybrid orchestration completed',
        type: 'orchestration_summary',
        summary,
        orchestrationType: 'hybrid'
      },
      timestamp: Date.now()
    };

    this.dependencies.logger.info(`Hybrid orchestration completed`, summary);
  }

  /**
   * Calculate strategy distribution
   */
  private calculateStrategyDistribution(phaseHistory: any[]): Record<string, number> {
    const distribution: Record<string, number> = {};

    for (const phase of phaseHistory) {
      distribution[phase.strategy] = (distribution[phase.strategy] || 0) + 1;
    }

    return distribution;
  }

  /**
   * Calculate overall success rate
   */
  private calculateOverallSuccess(phaseHistory: any[]): number {
    if (phaseHistory.length === 0) return 0;

    const successfulPhases = phaseHistory.filter(phase => phase.success).length;
    return successfulPhases / phaseHistory.length;
  }

  /**
   * Run function with context
   */
  private async *runWithContext<T>(
    operation: string,
    fn: () => AsyncIterable<T>
  ): AsyncIterable<T> {
    const context = { service: 'hybrid-orchestrator', operation };
    yield* this.als.run(context, fn);
  }

  /**
   * Get orchestrator statistics
   */
  getStats(): {
    name: string;
    version: string;
    capabilities: string[];
    availableStrategies: string[];
    availableAgents: number;
    availableTools: number;
  } {
    return {
      name: 'Hybrid Orchestrator',
      version: '1.0.0',
      capabilities: [
        'dynamic_strategy_selection',
        'tool_calling_integration',
        'agent_handoff_integration',
        'sequential_execution',
        'intelligent_phasing',
        'context_preservation',
        'performance_optimization'
      ],
      availableStrategies: ['tool_calling', 'handoff', 'hybrid', 'sequential'],
      availableAgents: this.agentManager.getRegisteredAgents().length,
      availableTools: this.toolExecutor.getAvailableTools().length
    };
  }

  /**
   * Dispose of orchestrator resources
   */
  dispose(): void {
    this.toolCallingOrchestrator.dispose();
    this.handoffOrchestrator.dispose();
    this.dependencies.logger.info('Hybrid orchestrator disposed');
  }
}