/**
 * Tool Calling Agent Orchestrator
 *
 * Implements the Tool Calling orchestration pattern where agents
 * intelligently select and execute tools to accomplish tasks.
 * This orchestrator handles tool selection, execution, and result
 * integration in a secure and controlled manner.
 */

import { AsyncLocalStorage } from 'async_hooks';
import { BaseLanguageModel } from '@langchain/core/language_models/base';
import { HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';
import { ToolExecutorService } from '../tool-executor';
import { ServiceDependencies, ServiceExecutionContext } from '../types';
import { AgentExecutionChunk, AgentExecutionError } from '../types';

/**
 * Tool call request from the AI model
 */
interface ToolCall {
  id: string;
  name: string;
  args: Record<string, any>;
}

/**
 * Tool execution result
 */
interface ToolResult {
  toolCallId: string;
  toolName: string;
  result: any;
  success: boolean;
  error?: string;
  executionTime: number;
}

/**
 * Tool calling orchestration context
 */
interface ToolCallingContext extends ServiceExecutionContext {
  agentId: string;
  maxToolCalls: number;
  maxIterations: number;
  currentIteration: number;
  toolCallCount: number;
  messages: any[];
  toolResults: ToolResult[];
  startTime: number;
}

/**
 * Tool Calling Agent Orchestrator
 *
 * Handles intelligent tool selection, execution, and result integration.
 * Provides secure tool execution with permission validation and error handling.
 */
export class ToolCallingOrchestrator {
  private dependencies: ServiceDependencies;
  private toolExecutor: ToolExecutorService;
  private als: AsyncLocalStorage<ServiceExecutionContext>;

  constructor(
    dependencies: ServiceDependencies,
    toolExecutor: ToolExecutorService
  ) {
    this.dependencies = dependencies;
    this.toolExecutor = toolExecutor;
    this.als = new AsyncLocalStorage();
  }

  /**
   * Execute tool calling orchestration
   */
  async *execute(
    model: BaseLanguageModel,
    input: string,
    systemPrompt: string,
    availableTools: string[],
    context: Partial<ToolCallingContext>,
    options?: {
      maxToolCalls?: number;
      maxIterations?: number;
      timeout?: number;
      stream?: boolean;
    }
  ): AsyncGenerator<AgentExecutionChunk> {
    const orchestrationContext: ToolCallingContext = {
      ...context,
      agentId: context.agentId || 'unknown',
      sessionId: context.sessionId,
      maxToolCalls: options?.maxToolCalls || 10,
      maxIterations: options?.maxIterations || 5,
      currentIteration: 0,
      toolCallCount: 0,
      messages: [],
      toolResults: [],
      startTime: Date.now()
    };

    yield* this.runWithContext('tool-calling-orchestration', async function* () {
      this.dependencies.logger.info(`Starting tool calling orchestration`, {
        agentId: orchestrationContext.agentId,
        sessionId: orchestrationContext.sessionId,
        availableTools: availableTools.length,
        maxToolCalls: orchestrationContext.maxToolCalls,
        maxIterations: orchestrationContext.maxIterations
      });

      // Add system message
      orchestrationContext.messages.push(new SystemMessage(systemPrompt));

      // Add user message
      orchestrationContext.messages.push(new HumanMessage(input));

      // Execute orchestration loop
      while (orchestrationContext.currentIteration < orchestrationContext.maxIterations) {
        orchestrationContext.currentIteration++;

        yield {
          type: 'progress',
          content: {
            phase: 'thinking',
            message: `Iteration ${orchestrationContext.currentIteration}: Analyzing and determining next actions...`,
            iteration: orchestrationContext.currentIteration,
            maxIterations: orchestrationContext.maxIterations
          },
          timestamp: Date.now()
        };

        // Get AI response with potential tool calls
        const aiResponse = await this.getAIResponseWithToolCalls(
          model,
          orchestrationContext.messages,
          availableTools
        );

        // Add AI response to conversation
        orchestrationContext.messages.push(aiResponse);

        // Check if AI wants to call tools
        const toolCalls = this.extractToolCalls(aiResponse);

        if (toolCalls.length === 0) {
          // No tool calls, orchestration complete
          yield {
            type: 'progress',
            content: {
              phase: 'complete',
              message: 'Task completed without additional tool calls'
            },
            timestamp: Date.now()
          };

          yield {
            type: 'data',
            content: {
              message: aiResponse.content,
              type: 'final_response',
              toolResults: orchestrationContext.toolResults,
              iterations: orchestrationContext.currentIteration,
              totalToolCalls: orchestrationContext.toolCallCount
            },
            timestamp: Date.now()
          };

          return;
        }

        // Execute tool calls
        yield {
          type: 'progress',
          content: {
            phase: 'executing_tools',
            message: `Executing ${toolCalls.length} tool call(s)...`,
            toolCalls: toolCalls.map(tc => ({ name: tc.name, id: tc.id }))
          },
          timestamp: Date.now()
        };

        const toolResults = await this.executeToolCalls(
          toolCalls,
          orchestrationContext
        );

        // Add tool results to conversation
        for (const toolResult of toolResults) {
          orchestrationContext.toolResults.push(toolResult);
          orchestrationContext.messages.push(this.createToolResultMessage(toolResult));
        }

        // Check if we've exceeded tool call limits
        if (orchestrationContext.toolCallCount >= orchestrationContext.maxToolCalls) {
          yield {
            type: 'progress',
            content: {
              phase: 'limit_reached',
              message: 'Maximum tool calls reached, providing final response'
            },
            timestamp: Date.now()
          };

          // Get final response without tool calls
          const finalResponse = await this.getFinalResponse(
            model,
            orchestrationContext.messages,
            'Maximum tool calls reached. Please provide a final answer based on the results so far.'
          );

          yield {
            type: 'data',
            content: {
              message: finalResponse.content,
              type: 'final_response',
              toolResults: orchestrationContext.toolResults,
              iterations: orchestrationContext.currentIteration,
              totalToolCalls: orchestrationContext.toolCallCount,
              limitReached: 'tool_calls'
            },
            timestamp: Date.now()
          };

          return;
        }

        // Check for timeout
        if (options?.timeout && (Date.now() - orchestrationContext.startTime) > options.timeout) {
          throw new AgentExecutionError(
            'Tool calling orchestration timed out',
            orchestrationContext.agentId,
            'execution',
            orchestrationContext
          );
        }
      }

      // Max iterations reached
      yield {
        type: 'progress',
        content: {
          phase: 'limit_reached',
          message: 'Maximum iterations reached, providing final response'
        },
        timestamp: Date.now()
      };

      const finalResponse = await this.getFinalResponse(
        model,
        orchestrationContext.messages,
        'Maximum iterations reached. Please provide a final answer based on the results so far.'
      );

      yield {
        type: 'data',
        content: {
          message: finalResponse.content,
          type: 'final_response',
          toolResults: orchestrationContext.toolResults,
          iterations: orchestrationContext.currentIteration,
          totalToolCalls: orchestrationContext.toolCallCount,
          limitReached: 'iterations'
        },
        timestamp: Date.now()
      };

    }.bind(this));
  }

  /**
   * Get AI response with tool calls
   */
  private async getAIResponseWithToolCalls(
    model: BaseLanguageModel,
    messages: any[],
    availableTools: string[]
  ): Promise<AIMessage> {
    try {
      // Create tool definitions for the model
      const toolDefinitions = await this.toolExecutor.getToolDefinitions(availableTools);

      // For now, use a simplified approach - in a full implementation,
      // you would use the model's tool calling capabilities
      const response = await model.invoke(messages);

      // Check if the response contains tool calls (this is a simplified check)
      // In a full implementation, you would parse structured tool call data
      if (typeof response.content === 'string' && response.content.includes('TOOL_CALL:')) {
        // Parse tool calls from response content
        const toolCalls = this.parseToolCallsFromText(response.content);

        return new AIMessage({
          content: response.content.replace(/TOOL_CALL:.*$/gm, '').trim(),
          tool_calls: toolCalls
        });
      }

      return response as AIMessage;

    } catch (error) {
      this.dependencies.logger.error('Failed to get AI response with tool calls', error as Error);
      throw new AgentExecutionError(
        `AI response generation failed: ${(error as Error).message}`,
        'tool-calling-orchestrator',
        'ai_response'
      );
    }
  }

  /**
   * Extract tool calls from AI response
   */
  private extractToolCalls(message: AIMessage): ToolCall[] {
    // This is a simplified implementation
    // In a full implementation, you would use structured tool call data from the model

    const toolCalls: ToolCall[] = [];

    // Check if message has structured tool calls
    if (message.tool_calls && Array.isArray(message.tool_calls)) {
      for (const toolCall of message.tool_calls) {
        toolCalls.push({
          id: toolCall.id || `tool_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: toolCall.name,
          args: toolCall.args || {}
        });
      }
    }

    return toolCalls;
  }

  /**
   * Execute tool calls with security validation
   */
  private async executeToolCalls(
    toolCalls: ToolCall[],
    context: ToolCallingContext
  ): Promise<ToolResult[]> {
    const results: ToolResult[] = [];

    for (const toolCall of toolCalls) {
      const startTime = Date.now();

      try {
        this.dependencies.logger.debug(`Executing tool call`, {
          toolName: toolCall.name,
          toolCallId: toolCall.id,
          agentId: context.agentId,
          sessionId: context.sessionId
        });

        // Validate tool call
        await this.validateToolCall(toolCall, context);

        // Execute tool
        const result = await this.toolExecutor.executeTool(
          toolCall.name,
          toolCall.args,
          {
            agentId: context.agentId,
            sessionId: context.sessionId,
            toolCallId: toolCall.id,
            permissions: ['read', 'write'], // Default permissions
            timeout: 30000 // 30 second timeout per tool
          }
        );

        const executionTime = Date.now() - startTime;

        results.push({
          toolCallId: toolCall.id,
          toolName: toolCall.name,
          result,
          success: true,
          executionTime
        });

        context.toolCallCount++;

        this.dependencies.logger.debug(`Tool call executed successfully`, {
          toolName: toolCall.name,
          toolCallId: toolCall.id,
          executionTime,
          agentId: context.agentId
        });

      } catch (error) {
        const executionTime = Date.now() - startTime;

        results.push({
          toolCallId: toolCall.id,
          toolName: toolCall.name,
          result: null,
          success: false,
          error: (error as Error).message,
          executionTime
        });

        this.dependencies.logger.warn(`Tool call execution failed`, {
          toolName: toolCall.name,
          toolCallId: toolCall.id,
          error: (error as Error).message,
          executionTime,
          agentId: context.agentId
        });
      }
    }

    return results;
  }

  /**
   * Validate tool call for security and permissions
   */
  private async validateToolCall(
    toolCall: ToolCall,
    context: ToolCallingContext
  ): Promise<void> {
    // Check if tool exists and is available
    const toolInfo = await this.toolExecutor.getToolInfo(toolCall.name);
    if (!toolInfo) {
      throw new Error(`Tool '${toolCall.name}' not found or not available`);
    }

    // Validate tool arguments
    const validationResult = await this.toolExecutor.validateToolArguments(
      toolCall.name,
      toolCall.args
    );

    if (!validationResult.valid) {
      throw new Error(`Invalid tool arguments: ${validationResult.errors.join(', ')}`);
    }

    // Check tool permissions (simplified - in a full implementation, you'd have
    // a more sophisticated permission system)
    if (toolInfo.requiresAuth && !context.sessionId) {
      throw new Error(`Tool '${toolCall.name}' requires authentication but no session provided`);
    }

    // Additional security checks can be added here
    // - Rate limiting
    // - Resource quotas
    // - Input sanitization
    // - Output filtering
  }

  /**
   * Create tool result message for conversation
   */
  private createToolResultMessage(toolResult: ToolResult): AIMessage {
    const content = toolResult.success
      ? `Tool '${toolResult.toolName}' executed successfully. Result: ${JSON.stringify(toolResult.result)}`
      : `Tool '${toolResult.toolName}' execution failed: ${toolResult.error}`;

    return new AIMessage({
      content,
      tool_calls: [] // No tool calls in tool result messages
    });
  }

  /**
   * Get final response when limits are reached
   */
  private async getFinalResponse(
    model: BaseLanguageModel,
    messages: any[],
    prompt: string
  ): Promise<AIMessage> {
    const finalMessages = [
      ...messages,
      new HumanMessage(prompt)
    ];

    return await model.invoke(finalMessages) as AIMessage;
  }

  /**
   * Parse tool calls from text (fallback method)
   */
  private parseToolCallsFromText(text: string): any[] {
    // This is a very basic implementation
    // In a full implementation, you'd use more sophisticated parsing

    const toolCalls: any[] = [];
    const toolCallRegex = /TOOL_CALL:\s*(\w+)\s*\((.*?)\)/g;
    let match;

    while ((match = toolCallRegex.exec(text)) !== null) {
      const [, toolName, argsString] = match;

      try {
        const args = JSON.parse(`{${argsString}}`);
        toolCalls.push({
          id: `tool_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: toolName,
          args
        });
      } catch (error) {
        this.dependencies.logger.warn(`Failed to parse tool call arguments`, {
          toolName,
          argsString,
          error: (error as Error).message
        });
      }
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
    const context = { service: 'tool-calling-orchestrator', operation };
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
  } {
    return {
      name: 'Tool Calling Orchestrator',
      version: '1.0.0',
      capabilities: [
        'intelligent_tool_selection',
        'secure_tool_execution',
        'result_integration',
        'error_handling',
        'permission_validation',
        'timeout_management'
      ],
      supportedTools: this.toolExecutor.getAvailableTools().length
    };
  }

  /**
   * Dispose of orchestrator resources
   */
  dispose(): void {
    this.dependencies.logger.info('Tool calling orchestrator disposed');
  }
}