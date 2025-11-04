/**
 * Tool Calling Agent Orchestration Pattern
 *
 * Implements intelligent tool selection and execution for multi-agent systems.
 * This agent can analyze user requests, select appropriate tools, execute them
 * in the correct order, and synthesize results into coherent responses.
 */

import { BaseLanguageModel } from '@langchain/core/language_models/base';
import { HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';
import { AgentExecutionRequest, AgentExecutionContext, AgentExecutionChunk } from '../types';
import { ToolExecutorService } from '../tool-executor';
import { ServiceDependencies } from '../types';

export interface ToolCall {
  id: string;
  toolName: string;
  parameters: Record<string, any>;
  reasoning: string;
  confidence: number;
  dependencies?: string[]; // Other tool calls this depends on
}

export interface ToolExecutionResult {
  toolCall: ToolCall;
  result: any;
  success: boolean;
  error?: string;
  executionTime: number;
  tokensUsed?: number;
}

export interface ToolCallingConfig {
  maxConcurrentTools: number;
  maxToolExecutionTime: number;
  requireConfirmation: boolean;
  allowParallelExecution: boolean;
  toolSelectionThreshold: number;
}

/**
 * Tool Calling Agent with intelligent orchestration
 */
export class ToolCallingAgent {
  private model: BaseLanguageModel;
  private toolExecutor: ToolExecutorService;
  private dependencies: ServiceDependencies;
  private config: ToolCallingConfig;

  constructor(
    model: BaseLanguageModel,
    toolExecutor: ToolExecutorService,
    dependencies: ServiceDependencies,
    config: ToolCallingConfig
  ) {
    this.model = model;
    this.toolExecutor = toolExecutor;
    this.dependencies = dependencies;
    this.config = config;
  }

  /**
   * Execute tool calling agent with orchestration
   */
  async *execute(
    request: AgentExecutionRequest,
    executionContext: AgentExecutionContext
  ): AsyncIterable<AgentExecutionChunk> {
    this.dependencies.logger.info(`Starting Tool Calling Agent execution`, {
      executionId: executionContext.id,
      inputType: typeof request.input
    });

    try {
      // Step 1: Analyze user request and select tools
      yield {
        type: 'progress',
        content: { phase: 'analyzing', message: 'Analyzing request to select appropriate tools...' },
        timestamp: Date.now()
      };

      const toolSelection = await this.selectTools(request.input, executionContext);

      yield {
        type: 'progress',
        content: {
          phase: 'tools_selected',
          message: `Selected ${toolSelection.toolCalls.length} tools for execution`,
          tools: toolSelection.toolCalls.map(tc => ({
            name: tc.toolName,
            confidence: tc.confidence,
            reasoning: tc.reasoning
          }))
        },
        timestamp: Date.now()
      };

      if (toolSelection.toolCalls.length === 0) {
        // No tools needed, respond directly
        yield* this.generateDirectResponse(request.input, executionContext);
        return;
      }

      // Step 2: Execute tools in optimal order
      yield {
        type: 'progress',
        content: { phase: 'executing_tools', message: 'Executing selected tools...' },
        timestamp: Date.now()
      };

      const executionResults = await this.executeTools(
        toolSelection.toolCalls,
        executionContext,
        (progress) => {
          return {
            type: 'progress',
            content: { phase: 'tool_execution', ...progress },
            timestamp: Date.now()
          } as AgentExecutionChunk;
        }
      );

      yield {
        type: 'progress',
        content: { phase: 'synthesizing', message: 'Synthesizing tool results into response...' },
        timestamp: Date.now()
      };

      // Step 3: Synthesize results into coherent response
      yield* this.synthesizeResults(
        request.input,
        toolSelection.reasoning,
        executionResults,
        executionContext
      );

      this.dependencies.logger.info(`Tool Calling Agent execution completed`, {
        executionId: executionContext.id,
        toolsExecuted: executionResults.length,
        successfulExecutions: executionResults.filter(r => r.success).length
      });

    } catch (error) {
      this.dependencies.logger.error(`Tool Calling Agent execution failed`, error as Error);
      throw error;
    }
  }

  /**
   * Analyze user request and select appropriate tools
   */
  private async selectTools(
    input: any,
    executionContext: AgentExecutionContext
  ): Promise<{
    toolCalls: ToolCall[];
    reasoning: string;
    confidence: number;
  }> {
    const availableTools = this.toolExecutor.getAvailableTools();

    if (availableTools.length === 0) {
      return { toolCalls: [], reasoning: 'No tools available', confidence: 1.0 };
    }

    // Create tool selection prompt
    const toolDescriptions = availableTools.map(tool =>
      `- ${tool.name}: ${tool.description} (parameters: ${JSON.stringify(tool.parameters)})`
    ).join('\n');

    const systemPrompt = `You are an intelligent tool selection agent. Analyze the user's request and determine which tools would be helpful.

Available tools:
${toolDescriptions}

Instructions:
1. Analyze the user's request carefully
2. Select only tools that are directly relevant and helpful
3. Consider tool dependencies and execution order
4. Provide clear reasoning for each tool selection
5. Assign confidence scores (0.0-1.0) to each tool selection
6. Only select tools with confidence >= ${this.config.toolSelectionThreshold}

Response format:
{
  "analysis": "Brief analysis of the user's request",
  "tool_calls": [
    {
      "tool_name": "tool_name",
      "parameters": {...},
      "reasoning": "Why this tool is needed",
      "confidence": 0.8,
      "dependencies": ["tool1", "tool2"] // optional
    }
  ],
  "overall_confidence": 0.85
}`;

    const messages = [
      new SystemMessage(systemPrompt),
      new HumanMessage(`User request: ${JSON.stringify(input)}`)
    ];

    try {
      const response = await this.model.invoke(messages);
      const content = response.content as string;

      // Parse the response
      let parsed;
      try {
        parsed = JSON.parse(content);
      } catch (parseError) {
        // Fallback: try to extract JSON from the response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error(`Failed to parse tool selection response: ${content}`);
        }
      }

      const toolCalls: ToolCall[] = (parsed.tool_calls || []).map((tc: any, index: number) => ({
        id: `tool_${executionContext.id}_${index}`,
        toolName: tc.tool_name,
        parameters: tc.parameters || {},
        reasoning: tc.reasoning || 'No reasoning provided',
        confidence: tc.confidence || 0.5,
        dependencies: tc.dependencies || []
      }));

      // Filter by confidence threshold
      const filteredToolCalls = toolCalls.filter(tc =>
        tc.confidence >= this.config.toolSelectionThreshold
      );

      return {
        toolCalls: filteredToolCalls,
        reasoning: parsed.analysis || 'No analysis provided',
        confidence: parsed.overall_confidence || 0.5
      };

    } catch (error) {
      this.dependencies.logger.warn(`Tool selection failed, proceeding without tools`, error as Error);
      return { toolCalls: [], reasoning: 'Tool selection failed', confidence: 0.0 };
    }
  }

  /**
   * Execute tools with dependency resolution and parallel execution
   */
  private async executeTools(
    toolCalls: ToolCall[],
    executionContext: AgentExecutionContext,
    progressCallback: (progress: any) => AgentExecutionChunk
  ): Promise<ToolExecutionResult[]> {
    const results: ToolExecutionResult[] = [];
    const executedTools = new Set<string>();
    const pendingTools = new Map<string, ToolCall>();

    // Initialize pending tools
    toolCalls.forEach(tc => pendingTools.set(tc.id, tc));

    // Execute tools in dependency order
    while (pendingTools.size > 0) {
      const readyTools = Array.from(pendingTools.values()).filter(tc =>
        tc.dependencies === undefined || tc.dependencies.every(dep => executedTools.has(dep))
      );

      if (readyTools.length === 0) {
        // Circular dependency or missing dependency
        this.dependencies.logger.warn(`Circular dependency detected in tool calls`);
        break;
      }

      // Execute ready tools (in parallel if allowed)
      const executionPromises = readyTools.slice(0, this.config.maxConcurrentTools).map(async (toolCall) => {
        try {
          yield progressCallback({
            toolName: toolCall.toolName,
            status: 'starting',
            message: `Executing ${toolCall.toolName}...`
          });

          const startTime = Date.now();
          const result = await this.toolExecutor.executeTool(
            toolCall.toolName,
            toolCall.parameters,
            {
              timeout: this.config.maxToolExecutionTime,
              executionId: executionContext.id,
              agentId: executionContext.agentId
            }
          );
          const executionTime = Date.now() - startTime;

          yield progressCallback({
            toolName: toolCall.toolName,
            status: 'completed',
            message: `Completed ${toolCall.toolName} in ${executionTime}ms`,
            executionTime
          });

          return {
            toolCall,
            result,
            success: true,
            executionTime
          };

        } catch (error) {
          yield progressCallback({
            toolName: toolCall.toolName,
            status: 'error',
            message: `Error in ${toolCall.toolName}: ${(error as Error).message}`
          });

          return {
            toolCall,
            result: null,
            success: false,
            error: (error as Error).message,
            executionTime: 0
          };
        }
      });

      // Wait for current batch to complete
      const batchResults = await Promise.all(executionPromises);

      // Process results
      batchResults.forEach(result => {
        results.push(result);
        executedTools.add(result.toolCall.id);
        pendingTools.delete(result.toolCall.id);
      });
    }

    return results;
  }

  /**
   * Generate direct response when no tools are needed
   */
  private async *generateDirectResponse(
    input: any,
    executionContext: AgentExecutionContext
  ): AsyncIterable<AgentExecutionChunk> {
    try {
      const systemPrompt = `You are a helpful AI assistant. Provide a direct and helpful response to the user's request.`;

      const messages = [
        new SystemMessage(systemPrompt),
        new HumanMessage(typeof input === 'string' ? input : JSON.stringify(input))
      ];

      const response = await this.model.invoke(messages);

      yield {
        type: 'data',
        content: {
          message: response.content,
          type: 'direct_response',
          toolsUsed: []
        },
        timestamp: Date.now()
      };

    } catch (error) {
      yield {
        type: 'error',
        content: {
          error: `Failed to generate direct response: ${(error as Error).message}`
        },
        timestamp: Date.now()
      };
    }
  }

  /**
   * Synthesize tool results into coherent response
   */
  private async *synthesizeResults(
    originalInput: any,
    toolSelectionReasoning: string,
    executionResults: ToolExecutionResult[],
    executionContext: AgentExecutionContext
  ): AsyncIterable<AgentExecutionChunk> {
    try {
      // Prepare tool results for synthesis
      const toolResults = executionResults.map(result => ({
        toolName: result.toolCall.toolName,
        success: result.success,
        result: result.result,
        error: result.error,
        reasoning: result.toolCall.reasoning,
        executionTime: result.executionTime
      }));

      const synthesisPrompt = `You are an AI assistant that has used various tools to help answer a user's question.

User's original request: ${JSON.stringify(originalInput)}

Tool selection reasoning: ${toolSelectionReasoning}

Tool execution results:
${JSON.stringify(toolResults, null, 2)}

Instructions:
1. Analyze the tool results carefully
2. Provide a comprehensive and helpful response based on the tool results
3. If some tools failed, acknowledge the limitations
4. Explain what you were able to accomplish with the tools
5. Provide specific details from the tool results when relevant
6. If the tools didn't fully answer the user's question, explain what additional information might be needed

Please provide a clear, helpful response that synthesizes the tool results effectively.`;

      const messages = [
        new SystemMessage("You are a helpful AI assistant synthesizing tool results."),
        new HumanMessage(synthesisPrompt)
      ];

      const response = await this.model.invoke(messages);

      yield {
        type: 'data',
        content: {
          message: response.content,
          type: 'synthesized_response',
          toolsUsed: executionResults.map(r => r.toolCall.toolName),
          toolResults: toolResults,
          synthesisTime: Date.now()
        },
        timestamp: Date.now()
      };

    } catch (error) {
      yield {
        type: 'error',
        content: {
          error: `Failed to synthesize tool results: ${(error as Error).message}`,
          toolResults: executionResults.map(r => ({
            toolName: r.toolCall.toolName,
            success: r.success,
            error: r.error
          }))
        },
        timestamp: Date.now()
      };
    }
  }

  /**
   * Get available tools information
   */
  getAvailableTools(): Array<{
    name: string;
    description: string;
    parameters: Record<string, any>;
  }> {
    return this.toolExecutor.getAvailableTools();
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ToolCallingConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

/**
 * Default tool calling configuration
 */
export const DEFAULT_TOOL_CALLING_CONFIG: ToolCallingConfig = {
  maxConcurrentTools: 3,
  maxToolExecutionTime: 30000, // 30 seconds
  requireConfirmation: false,
  allowParallelExecution: true,
  toolSelectionThreshold: 0.7
};