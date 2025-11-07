/**
 * Enhanced Tool Calling Agent Orchestrator
 *
 * Advanced implementation of the Tool Calling orchestration pattern with
 * real LangChain integration, secure tool execution, and comprehensive
 * error handling for educational workflows.
 */

import { AsyncLocalStorage } from 'async_hooks';
import { BaseLanguageModel } from '@langchain/core/language_models/base';
import { HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';
import { ToolExecutorService } from '../../tool-executor';
import { SecureToolExecutor, SecurityLevel, PermissionType } from '../../security/secure-tool-executor';
import { ServiceDependencies, ServiceExecutionContext, AgentExecutionChunk, AgentExecutionError } from '../../types';
import { randomUUID } from 'crypto';

/**
 * Agent execution context
 */
export interface AgentExecutionContext extends ServiceExecutionContext {
  agentId: string;
  agentType: string;
  learningContext: {
    currentTopic?: string;
    difficultyLevel?: 'beginner' | 'intermediate' | 'advanced';
    userGoals?: string[];
    previousInteractions?: any[];
  };
}

/**
 * Enhanced tool calling orchestration context with additional properties
 */
export interface EnhancedToolCallingContextExtended extends AgentExecutionContext {
  orchestrationId: string;
  toolSelectionStrategy?: string;
  iteration: number;
  maxIterations: number;
  maxToolCalls: number;
  currentIteration: number;
  toolCallCount: number;
  messages: any[];
  toolResults: EnhancedToolResult[];
  startTime: number;
  securityLevel: SecurityLevel;
}

/**
 * Enhanced tool call request with metadata
 */
export interface EnhancedToolCall {
  id: string;
  name: string;
  args: Record<string, any>;
  metadata: {
    confidence: number;
    reasoning: string;
    alternatives?: string[];
    securityLevel?: SecurityLevel;
  };
}

/**
 * Tool execution result with enhanced metadata
 */
export interface EnhancedToolResult {
  toolCallId: string;
  toolName: string;
  result: any;
  success: boolean;
  error?: string;
  executionTime: number;
  securityContext: {
    violations: Array<{
      type: string;
      severity: string;
      description: string;
    }>;
    permissions: string[];
  };
  performance: {
    memoryUsed: number;
    cpuTime: number;
    networkRequests: number;
  };
}


/**
 * Tool selection strategy
 */
export enum ToolSelectionStrategy {
  GREEDY = 'greedy',           // Use highest confidence tool first
  CONSERVATIVE = 'conservative', // Validate before execution
  COLLABORATIVE = 'collaborative', // Use multiple tools for validation
  ADAPTIVE = 'adaptive'        // Adapt strategy based on performance
}

/**
 * Enhanced Tool Calling Orchestrator
 *
 * Provides intelligent tool selection, execution, and result integration
 * with real LangChain integration, security controls, and learning context awareness.
 */
export class EnhancedToolCallingOrchestrator {
  private dependencies: ServiceDependencies;
  private toolExecutor: ToolExecutorService;
  private secureToolExecutor: SecureToolExecutor;
  private als: AsyncLocalStorage<ServiceExecutionContext>;

  constructor(
    dependencies: ServiceDependencies,
    toolExecutor: ToolExecutorService,
    secureToolExecutor: SecureToolExecutor
  ) {
    this.dependencies = dependencies;
    this.toolExecutor = toolExecutor;
    this.secureToolExecutor = secureToolExecutor;
    this.als = new AsyncLocalStorage();
  }

  /**
   * Execute enhanced tool calling orchestration
   */
  async *execute(
    model: BaseLanguageModel,
    input: string,
    systemPrompt: string,
    availableTools: string[],
    context: Partial<EnhancedToolCallingContextExtended>,
    options?: {
      maxToolCalls?: number;
      maxIterations?: number;
      timeout?: number;
      stream?: boolean;
      selectionStrategy?: ToolSelectionStrategy;
      securityLevel?: SecurityLevel;
      learningContext?: {
        currentTopic?: string;
        difficulty?: 'beginner' | 'intermediate' | 'advanced';
        userGoals?: string[];
        priorKnowledge?: string[];
      };
    }
  ): AsyncGenerator<AgentExecutionChunk> {
    const orchestrationId = randomUUID();
    const orchestrationContext: EnhancedToolCallingContextExtended = {
      id: randomUUID(),
      sessionId: context.sessionId || `session_${orchestrationId}`,
      userId: context.userId,
      timestamp: Date.now(),
      requestId: randomUUID(),
      operation: 'enhanced-tool-calling-orchestration',
      metadata: { service: 'enhanced-tool-calling-orchestrator' },
      agentId: context.agentId || 'unknown',
      agentType: 'learning',
      learningContext: {
        currentTopic: options?.learningContext?.currentTopic,
        difficultyLevel: options?.learningContext?.difficulty || 'intermediate',
        userGoals: options?.learningContext?.userGoals || [],
        previousInteractions: options?.learningContext?.priorKnowledge || []
      },
      orchestrationId,
      toolSelectionStrategy: options?.selectionStrategy,
      iteration: 0,
      maxIterations: options?.maxIterations || 5,
      maxToolCalls: options?.maxToolCalls || 10,
      currentIteration: 0,
      toolCallCount: 0,
      messages: [],
      toolResults: [],
      startTime: Date.now(),
      securityLevel: options?.securityLevel || SecurityLevel.STANDARD
    };

    yield* this.runWithContext('enhanced-tool-calling-orchestration', async function* (this: EnhancedToolCallingOrchestrator) {
      this.dependencies.logger.info(`Starting enhanced tool calling orchestration`, {
        orchestrationId,
        agentId: orchestrationContext.agentId,
        sessionId: orchestrationContext.sessionId,
        availableTools: availableTools.length,
        strategy: options?.selectionStrategy,
        securityLevel: orchestrationContext.securityLevel
      });

      // Add enhanced system message with learning context
      const enhancedSystemPrompt = this.buildEnhancedSystemPrompt(
        systemPrompt,
        orchestrationContext.learningContext,
        availableTools
      );
      orchestrationContext.messages.push(new SystemMessage(enhancedSystemPrompt));

      // Add user message
      orchestrationContext.messages.push(new HumanMessage(input));

      // Execute enhanced orchestration loop
      while (orchestrationContext.currentIteration < orchestrationContext.maxIterations) {
        orchestrationContext.currentIteration++;

        yield {
          type: 'progress' as const,
          content: {
            phase: 'thinking',
            message: `Iteration ${orchestrationContext.currentIteration}: Analyzing and planning next actions...`,
            iteration: orchestrationContext.currentIteration,
            maxIterations: orchestrationContext.maxIterations,
            strategy: options?.selectionStrategy
          },
          timestamp: Date.now()
        };

        // Get AI response with enhanced tool calls
        const aiResponse = await this.getEnhancedAIResponseWithToolCalls(
          model,
          orchestrationContext.messages,
          availableTools,
          orchestrationContext,
          options?.selectionStrategy || ToolSelectionStrategy.ADAPTIVE
        );

        // Add AI response to conversation
        orchestrationContext.messages.push(aiResponse);

        // Extract enhanced tool calls
        const toolCalls = this.extractEnhancedToolCalls(aiResponse);

        if (toolCalls.length === 0) {
          // No tool calls, orchestration complete
          yield {
            type: 'progress' as const,
            content: {
              phase: 'complete',
              message: 'Task completed without additional tool calls'
            },
            timestamp: Date.now()
          };

          yield {
            type: 'data' as const,
            content: {
              message: aiResponse.content,
              type: 'final_response',
              toolResults: orchestrationContext.toolResults,
              iterations: orchestrationContext.currentIteration,
              totalToolCalls: orchestrationContext.toolCallCount,
              orchestrationId
            },
            timestamp: Date.now()
          };

          return;
        }

        // Execute enhanced tool calls
        yield {
          type: 'progress' as const,
          content: {
            phase: 'executing_tools',
            message: `Executing ${toolCalls.length} tool call(s) with security controls...`,
            toolCalls: toolCalls.map(tc => ({
              name: tc.name,
              id: tc.id,
              confidence: tc.metadata.confidence
            }))
          },
          timestamp: Date.now()
        };

        const toolResults = await this.executeEnhancedToolCalls(
          toolCalls,
          orchestrationContext
        );

        // Add tool results to conversation
        for (const toolResult of toolResults) {
          orchestrationContext.toolResults.push(toolResult);
          orchestrationContext.messages.push(this.createEnhancedToolResultMessage(toolResult));
        }

        // Check limits
        if (orchestrationContext.toolCallCount >= orchestrationContext.maxToolCalls) {
          yield {
            type: 'progress' as const,
            content: {
              phase: 'limit_reached',
              message: 'Maximum tool calls reached, providing final response'
            },
            timestamp: Date.now()
          };

          const finalResponse = await this.getEnhancedFinalResponse(
            model,
            orchestrationContext.messages,
            'Maximum tool calls reached. Please provide a final answer based on the results so far.'
          );

          yield {
            type: 'data' as const,
            content: {
              message: finalResponse.content,
              type: 'final_response',
              toolResults: orchestrationContext.toolResults,
              iterations: orchestrationContext.currentIteration,
              totalToolCalls: orchestrationContext.toolCallCount,
              limitReached: 'tool_calls',
              orchestrationId
            },
            timestamp: Date.now()
          };

          return;
        }

        // Check timeout
        if (options?.timeout && (Date.now() - orchestrationContext.startTime) > options.timeout) {
          throw new AgentExecutionError(
            'Enhanced tool calling orchestration timed out',
            orchestrationContext.agentId,
            'execution',
            orchestrationContext
          );
        }
      }

      // Max iterations reached
      yield {
        type: 'progress' as const,
        content: {
          phase: 'limit_reached',
          message: 'Maximum iterations reached, providing final response'
        },
        timestamp: Date.now()
      };

      const finalResponse = await this.getEnhancedFinalResponse(
        model,
        orchestrationContext.messages,
        'Maximum iterations reached. Please provide a final answer based on the results so far.'
      );

      yield {
        type: 'data' as const,
        content: {
          message: finalResponse.content,
          type: 'final_response',
          toolResults: orchestrationContext.toolResults,
          iterations: orchestrationContext.currentIteration,
          totalToolCalls: orchestrationContext.toolCallCount,
          limitReached: 'iterations',
          orchestrationId
        },
        timestamp: Date.now()
      };

    }.bind(this));
  }

  /**
   * Build enhanced system prompt with learning context
   */
  private buildEnhancedSystemPrompt(
    basePrompt: string,
    learningContext: AgentExecutionContext['learningContext'],
    availableTools: string[]
  ): string {
    return `${basePrompt}

LEARNING CONTEXT:
- Current Topic: ${learningContext.currentTopic || 'Not specified'}
- Learning Goal: ${learningContext.userGoals?.join(', ') || 'General understanding'}
- Prior Knowledge: ${learningContext.previousInteractions?.join(', ') || 'None'}
- Difficulty Level: ${learningContext.difficultyLevel}

AVAILABLE TOOLS:
${availableTools.join(', ')}

ENHANCED TOOL USAGE GUIDELINES:
1. Consider the learning context when selecting tools
2. Adapt explanations based on the difficulty level
3. Connect new information to prior knowledge when possible
4. Use tools that are appropriate for the current learning goal
5. Provide confidence scores and reasoning for tool selection

SECURITY CONSIDERATIONS:
- All tool execution is monitored and logged
- Follow the principle of least privilege
- Validate results before using them in responses
- Report any security concerns immediately`;
  }

  /**
   * Get enhanced AI response with tool calls
   */
  private async getEnhancedAIResponseWithToolCalls(
    model: BaseLanguageModel,
    messages: any[],
    availableTools: string[],
    context: EnhancedToolCallingContextExtended,
    strategy: ToolSelectionStrategy
  ): Promise<AIMessage> {
    try {
      // Create tool definitions for the model with enhanced metadata
      const toolDefinitions = await this.createEnhancedToolDefinitions(
        availableTools,
        context,
        strategy
      );

      // Use LangChain's structured output capabilities for enhanced tool calling
      const prompt = `
Based on the conversation context and available tools, determine if any tools should be called.

Available tools: ${availableTools.join(', ')}
Current learning goal: ${context.learningContext.currentTopic || 'Not specified'}
Difficulty level: ${context.learningContext.difficultyLevel}

${strategy === ToolSelectionStrategy.ADAPTIVE ?
  'Consider the learning progress and adapt your tool selection accordingly.' :
  'Use the specified strategy for tool selection.'}

If tools should be called, respond with:
TOOL_CALLS: [
  {
    "name": "tool_name",
    "args": {"param": "value"},
    "confidence": 0.8,
    "reasoning": "Why this tool is needed",
    "alternatives": ["alternative_tool_name"]
  }
]

If no tools are needed, provide a direct response.
`;

      const enhancedMessages = [...messages, new HumanMessage(prompt)];
      const response = await model.invoke(enhancedMessages);

      // Parse enhanced tool calls
      if (typeof response.content === 'string' && response.content.includes('TOOL_CALLS:')) {
        const toolCalls = this.parseEnhancedToolCalls(response.content);

        return new AIMessage({
          content: response.content.replace(/TOOL_CALLS:.*$/gs, '').trim(),
          tool_calls: toolCalls.map(tc => ({
            id: tc.id,
            name: tc.name,
            args: tc.args,
            metadata: tc.metadata
          }))
        });
      }

      return response as AIMessage;

    } catch (error) {
      this.dependencies.logger.error('Failed to get enhanced AI response with tool calls', error as Error);
      throw new AgentExecutionError(
        `Enhanced AI response generation failed: ${(error as Error).message}`,
        context.agentId,
        'execution',
        context
      );
    }
  }

  /**
   * Create enhanced tool definitions
   */
  private async createEnhancedToolDefinitions(
    toolNames: string[],
    context: EnhancedToolCallingContextExtended,
    strategy: ToolSelectionStrategy
  ): Promise<any[]> {
    const definitions = [];

    for (const toolName of toolNames) {
      const tool = this.toolExecutor.getTool(toolName);
      if (tool) {
        definitions.push({
          name: tool.name,
          description: this.enhanceToolDescription(tool.description, context),
          parameters: tool.parameters,
          securityLevel: this.determineToolSecurityLevel(toolName, context),
          learningContext: this.mapToolToLearningContext(toolName, context)
        });
      }
    }

    return definitions;
  }

  /**
   * Enhance tool description with learning context
   */
  private enhanceToolDescription(
    baseDescription: string,
    context: EnhancedToolCallingContextExtended
  ): string {
    const learningHints = [];

    if (context.learningContext.currentTopic) {
      learningHints.push(`Focus on: ${context.learningContext.currentTopic}`);
    }

    if (context.learningContext.difficultyLevel !== 'intermediate') {
      learningHints.push(`Adapt for ${context.learningContext.difficultyLevel} level`);
    }

    if (context.learningContext.previousInteractions && context.learningContext.previousInteractions.length > 0) {
      learningHints.push(`Build on prior knowledge: ${context.learningContext.previousInteractions.join(', ')}`);
    }

    return learningHints.length > 0
      ? `${baseDescription}\n\nLearning Considerations: ${learningHints.join(', ')}`
      : baseDescription;
  }

  /**
   * Determine tool security level
   */
  private determineToolSecurityLevel(
    toolName: string,
    context: EnhancedToolCallingContextExtended
  ): SecurityLevel {
    // Tools that need higher security
    const highSecurityTools = ['file-write', 'system-command', 'network-request'];
    if (highSecurityTools.includes(toolName)) {
      return SecurityLevel.ELEVATED;
    }

    // Tools that can be more permissive
    const lowSecurityTools = ['concept-parsing', 'session-search', 'quiz-generator'];
    if (lowSecurityTools.includes(toolName)) {
      return SecurityLevel.RESTRICTED;
    }

    return context.securityLevel;
  }

  /**
   * Map tool to learning context
   */
  private mapToolToLearningContext(
    toolName: string,
    context: EnhancedToolCallingContextExtended
  ): Record<string, any> {
    return {
      currentTopic: context.learningContext.currentTopic,
      learningGoal: context.learningContext.currentTopic,
      difficulty: context.learningContext.difficultyLevel,
      priorKnowledge: context.learningContext.previousInteractions || []
    };
  }

  /**
   * Extract enhanced tool calls from AI response
   */
  private extractEnhancedToolCalls(message: AIMessage): EnhancedToolCall[] {
    const toolCalls: EnhancedToolCall[] = [];

    // Check for structured tool calls
    if (message.tool_calls && Array.isArray(message.tool_calls)) {
      for (const toolCall of message.tool_calls) {
        toolCalls.push({
          id: toolCall.id || randomUUID(),
          name: toolCall.name,
          args: toolCall.args || {},
          metadata: (toolCall as any).metadata || {
            confidence: 0.8,
            reasoning: 'Default reasoning'
          }
        });
      }
    }

    return toolCalls;
  }

  /**
   * Execute enhanced tool calls with security
   */
  private async executeEnhancedToolCalls(
    toolCalls: EnhancedToolCall[],
    context: EnhancedToolCallingContextExtended
  ): Promise<EnhancedToolResult[]> {
    const results: EnhancedToolResult[] = [];

    for (const toolCall of toolCalls) {
      const startTime = Date.now();

      try {
        this.dependencies.logger.debug(`Executing enhanced tool call`, {
          toolName: toolCall.name,
          toolCallId: toolCall.id,
          confidence: toolCall.metadata.confidence,
          securityLevel: toolCall.metadata.securityLevel || context.securityLevel
        });

        // Execute tool with security controls
        const result = await this.secureToolExecutor.executeSecureTool({
          toolId: toolCall.name,
          operation: 'execute',
          parameters: toolCall.args,
          agentId: context.agentId,
          sessionId: context.sessionId,
          userId: context.userId,
          securityLevel: toolCall.metadata.securityLevel || context.securityLevel,
          metadata: {
            toolCallId: toolCall.id,
            confidence: toolCall.metadata.confidence,
            reasoning: toolCall.metadata.reasoning,
            orchestrationId: context.orchestrationId
          }
        });

        const executionTime = Date.now() - startTime;

        results.push({
          toolCallId: toolCall.id,
          toolName: toolCall.name,
          result: result.success ? result.data : null,
          success: result.success,
          error: result.error?.message,
          executionTime,
          securityContext: {
            violations: result.violations.map(v => ({
              type: v.type,
              severity: v.severity,
              description: v.description
            })),
            permissions: Array.from(result.securityContext.permissions)
          },
          performance: result.resourceUsage
        });

        context.toolCallCount++;

        this.dependencies.logger.debug(`Enhanced tool call executed successfully`, {
          toolName: toolCall.name,
          toolCallId: toolCall.id,
          executionTime,
          success: result.success,
          violations: result.violations.length
        });

      } catch (error) {
        const executionTime = Date.now() - startTime;

        results.push({
          toolCallId: toolCall.id,
          toolName: toolCall.name,
          result: null,
          success: false,
          error: (error as Error).message,
          executionTime,
          securityContext: {
            violations: [{
              type: 'execution_error',
              severity: 'high',
              description: (error as Error).message
            }],
            permissions: []
          },
          performance: {
            memoryUsed: 0,
            cpuTime: 0,
            networkRequests: 0
          }
        });

        this.dependencies.logger.warn(`Enhanced tool call execution failed`, {
          toolName: toolCall.name,
          toolCallId: toolCall.id,
          error: (error as Error).message,
          executionTime
        });
      }
    }

    return results;
  }

  /**
   * Create enhanced tool result message
   */
  private createEnhancedToolResultMessage(toolResult: EnhancedToolResult): AIMessage {
    const content = toolResult.success
      ? `Tool '${toolResult.toolName}' executed successfully.
       Result: ${JSON.stringify(toolResult.result)}
       Security: ${toolResult.securityContext.violations.length} violations
       Performance: ${toolResult.executionTime}ms`
      : `Tool '${toolResult.toolName}' execution failed: ${toolResult.error}
       Security violations: ${toolResult.securityContext.violations.length}`;

    return new AIMessage({
      content,
      tool_calls: []
    });
  }

  /**
   * Get enhanced final response
   */
  private async getEnhancedFinalResponse(
    model: BaseLanguageModel,
    messages: any[],
    prompt: string
  ): Promise<AIMessage> {
    const finalMessages = [
      ...messages,
      new HumanMessage(`${prompt}

Please provide a comprehensive response that:
1. Summarizes what was accomplished
2. Explains the results clearly
3. Provides educational value
4. Suggests next steps for learning

Consider the learning context and adapt the explanation accordingly.`)
    ];

    return await model.invoke(finalMessages) as AIMessage;
  }

  /**
   * Parse enhanced tool calls from text
   */
  private parseEnhancedToolCalls(text: string): EnhancedToolCall[] {
    const toolCalls: EnhancedToolCall[] = [];

    try {
      const toolCallMatch = text.match(/TOOL_CALLS:\s*(\[[\s\S]*?\])/);
      if (toolCallMatch) {
        const toolCallData = JSON.parse(toolCallMatch[1]);

        for (const toolCall of toolCallData) {
          toolCalls.push({
            id: toolCall.id || randomUUID(),
            name: toolCall.name,
            args: toolCall.args || {},
            metadata: {
              confidence: toolCall.confidence || 0.8,
              reasoning: toolCall.reasoning || 'Standard reasoning',
              alternatives: toolCall.alternatives || []
            }
          });
        }
      }
    } catch (error) {
      this.dependencies.logger.warn('Failed to parse enhanced tool calls', { text, error });
    }

    return toolCalls;
  }

  /**
   * Run function with context
   */
  private async *runWithContext<T>(
    operation: string,
    fn: () => AsyncIterable<T>
  ): AsyncIterable<T> {
    const context: ServiceExecutionContext = {
      id: randomUUID(),
      sessionId: `session_${Date.now()}`,
      timestamp: Date.now(),
      requestId: randomUUID(),
      operation,
      metadata: { service: 'enhanced-tool-calling-orchestrator', operation }
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
    supportedTools: number;
    securityFeatures: string[];
    selectionStrategies: string[];
  } {
    return {
      name: 'Enhanced Tool Calling Orchestrator',
      version: '2.0.0',
      capabilities: [
        'intelligent_tool_selection',
        'secure_tool_execution',
        'result_integration',
        'error_handling',
        'permission_validations',
        'timeout_management',
        'learning_context_awareness',
        'adaptive_strategies'
      ],
      supportedTools: this.toolExecutor.getRegisteredTools().length,
      securityFeatures: [
        'sandbox_execution',
        'permission_validation',
        'violation_detection',
        'audit_logging',
        'resource_monitoring'
      ],
      selectionStrategies: Object.values(ToolSelectionStrategy)
    };
  }

  /**
   * Dispose of orchestrator resources
   */
  dispose(): void {
    this.dependencies.logger.info('Enhanced tool calling orchestrator disposed');
  }
}