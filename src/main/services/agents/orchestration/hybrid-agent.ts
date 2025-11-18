/**
 * Hybrid Agent Orchestration Pattern
 *
 * Implements sophisticated workflow orchestration that combines multiple
 * agent patterns (tool calling, handoff, and collaboration) for complex
 * multi-step tasks requiring different capabilities.
 */

import { BaseLanguageModel } from '@langchain/core/language_models/base';
import { HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';
import { AgentExecutionRequest, AgentExecutionContext, AgentExecutionChunk, AgentConfig } from '../types';
import { AgentManagerMain } from '../agent-manager';
import { ToolExecutorService } from '../tool-executor';
import { ToolCallingAgent, ToolCallingConfig } from './tool-calling-agent';
import { HandoffAgent, HandoffConfig } from './handoff-agent';
import { ServiceDependencies } from '../types';

export interface WorkflowStep {
  id: string;
  name: string;
  type: 'tool_calling' | 'handoff' | 'collaboration' | 'direct';
  agentId?: string;
  tools?: string[];
  description: string;
  estimatedDuration: number;
  dependencies: string[];
  parallelizable: boolean;
  retryPolicy: {
    maxRetries: number;
    retryDelay: number;
    retryConditions: string[];
  };
}

export interface WorkflowPlan {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  estimatedTotalDuration: number;
  requiresConfirmation: boolean;
  rollbackStrategy: 'full' | 'partial' | 'none';
}

export interface WorkflowExecution {
  id: string;
  plan: WorkflowPlan;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  currentStep?: string;
  completedSteps: string[];
  failedSteps: string[];
  stepResults: Map<string, any>;
  startTime: number;
  endTime?: number;
  error?: string;
}

export interface HybridConfig {
  maxConcurrentSteps: number;
  stepTimeout: number;
  workflowTimeout: number;
  allowStepSkipping: boolean;
  requireConfirmation: boolean;
  enableCheckpointing: boolean;
}

/**
 * Hybrid Agent for complex workflow orchestration
 */
export class HybridAgent {
  private readonly model: BaseLanguageModel;
  private readonly agentManager: AgentManagerMain;
  private readonly toolExecutor: ToolExecutorService;
  private readonly dependencies: ServiceDependencies;
  private config: HybridConfig;
  private readonly toolCallingAgent: ToolCallingAgent;
  private readonly handoffAgent: HandoffAgent;
  private readonly activeExecutions = new Map<string, WorkflowExecution>();

  constructor(
    model: BaseLanguageModel,
    agentManager: AgentManagerMain,
    toolExecutor: ToolExecutorService,
    dependencies: ServiceDependencies,
    config: HybridConfig
  ) {
    this.model = model;
    this.agentManager = agentManager;
    this.toolExecutor = toolExecutor;
    this.dependencies = dependencies;
    this.config = config;

    // Initialize sub-agents
    this.toolCallingAgent = new ToolCallingAgent(
      model,
      toolExecutor,
      dependencies,
      DEFAULT_TOOL_CALLING_CONFIG
    );

    this.handoffAgent = new HandoffAgent(
      model,
      agentManager,
      dependencies,
      DEFAULT_HANDOFF_CONFIG
    );
  }

  /**
   * Execute hybrid agent orchestration
   */
  async *execute(
    request: AgentExecutionRequest,
    executionContext: AgentExecutionContext
  ): AsyncIterable<AgentExecutionChunk> {
    const workflowExecutionId = `workflow_${executionContext.id}_${Date.now()}`;

    this.dependencies.logger.info(`Starting Hybrid Agent execution`, {
      executionId: executionContext.id,
      workflowId: workflowExecutionId,
      inputType: typeof request.input
    });

    try {
      yield {
        type: 'progress',
        content: { phase: 'planning', message: 'Analyzing request and creating workflow plan...' },
        timestamp: Date.now()
      };

      // Step 1: Create workflow plan
      const workflowPlan = await this.createWorkflowPlan(request.input, executionContext);

      yield {
        type: 'progress',
        content: {
          phase: 'plan_created',
          message: `Created workflow plan with ${workflowPlan.steps.length} steps`,
          plan: {
            name: workflowPlan.name,
            description: workflowPlan.description,
            steps: workflowPlan.steps.map(step => ({
              id: step.id,
              name: step.name,
              type: step.type,
              description: step.description
            }))
          }
        },
        timestamp: Date.now()
      };

      // Step 2: Initialize workflow execution
      const workflowExecution: WorkflowExecution = {
        id: workflowExecutionId,
        plan: workflowPlan,
        status: 'pending',
        completedSteps: [],
        failedSteps: [],
        stepResults: new Map(),
        startTime: Date.now()
      };

      this.activeExecutions.set(workflowExecutionId, workflowExecution);

      // Step 3: Execute workflow
      yield* this.executeWorkflow(workflowExecution, request, executionContext);

      // Clean up
      this.activeExecutions.delete(workflowExecutionId);

    } catch (error) {
      this.dependencies.logger.error(`Hybrid Agent execution failed`, error as Error);
      throw error;
    }
  }

  /**
   * Create workflow plan based on user input
   */
  private async createWorkflowPlan(
    input: any,
    executionContext: AgentExecutionContext
  ): Promise<WorkflowPlan> {
    const availableAgents = this.agentManager.getRegisteredAgents();
    const availableTools = this.toolExecutor.getAvailableTools();

    // Create agent and tool descriptions
    const agentDescriptions = availableAgents.map(agent =>
      `- ${agent.name} (${agent.id}, type: ${agent.type}): ${agent.description || `Agent of type ${agent.type}`}\n  Capabilities: ${(agent.capabilities || []).join(', ')}`
    ).join('\n');

    const toolDescriptions = availableTools.map(toolId =>
      `- ${toolId}: Available tool for processing and data manipulation`
    ).join('\n');

    const currentInput = typeof input === 'string' ? input : JSON.stringify(input);

    const planningPrompt = `You are a workflow planning AI. Analyze the user's request and create a detailed workflow plan that combines different agent capabilities and tools.

Available agents:
${agentDescriptions}

Available tools:
${toolDescriptions}

User request: ${currentInput}

Instructions:
1. Break down the request into logical steps
2. For each step, determine if it requires tool calling, handoff, collaboration, or direct execution
3. Consider dependencies between steps
4. Estimate reasonable durations for each step
5. Define appropriate retry policies
6. Consider parallel execution opportunities

Workflow step types:
- tool_calling: Use tools to gather/process information
- handoff: Transfer to a specialized agent
- collaboration: Coordinate multiple agents
- direct: Direct AI response without tools

Response format:
{
  "name": "Workflow name",
  "description": "Brief description of the workflow",
  "steps": [
    {
      "id": "step_1",
      "name": "Step name",
      "type": "tool_calling",
      "agent_id": "agent_id_or_null",
      "tools": ["tool1", "tool2"],
      "description": "What this step accomplishes",
      "estimated_duration": 30000,
      "dependencies": [],
      "parallelizable": false,
      "retry_policy": {
        "max_retries": 3,
        "retry_delay": 1000,
        "retry_conditions": ["timeout", "error"]
      }
    }
  ],
  "estimated_total_duration": 60000,
  "requires_confirmation": false,
  "rollback_strategy": "partial"
}`;

    const messages = [
      new SystemMessage("You are an expert workflow planning AI."),
      new HumanMessage(planningPrompt)
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
          throw new Error(`Failed to parse workflow plan: ${content}`);
        }
      }

      const workflowPlan: WorkflowPlan = {
        id: `plan_${executionContext.id}_${Date.now()}`,
        name: parsed.name || 'Generated Workflow',
        description: parsed.description || 'Automatically generated workflow',
        steps: (parsed.steps || []).map((step: any, index: number) => ({
          id: step.id || `step_${index + 1}`,
          name: step.name || `Step ${index + 1}`,
          type: step.type || 'direct',
          agentId: step.agent_id,
          tools: step.tools || [],
          description: step.description || 'No description provided',
          estimatedDuration: step.estimated_duration || 30000,
          dependencies: step.dependencies || [],
          parallelizable: step.parallelizable || false,
          retryPolicy: {
            maxRetries: step.retry_policy?.max_retries || 3,
            retryDelay: step.retry_policy?.retry_delay || 1000,
            retryConditions: step.retry_policy?.retry_conditions || ['error']
          }
        })),
        estimatedTotalDuration: parsed.estimated_total_duration || 60000,
        requiresConfirmation: parsed.requires_confirmation || false,
        rollbackStrategy: parsed.rollback_strategy || 'partial'
      };

      // Validate workflow plan
      this.validateWorkflowPlan(workflowPlan);

      return workflowPlan;

    } catch (error) {
      this.dependencies.logger.warn(`Workflow planning failed, creating simple plan`, error as Error);

      // Create simple fallback plan
      return {
        id: `fallback_plan_${executionContext.id}`,
        name: 'Simple Response Workflow',
        description: 'Fallback workflow for direct response',
        steps: [{
          id: 'direct_response',
          name: 'Direct Response',
          type: 'direct',
          description: 'Generate direct response without tools',
          estimatedDuration: 10000,
          dependencies: [],
          parallelizable: false,
          retryPolicy: {
            maxRetries: 1,
            retryDelay: 0,
            retryConditions: ['error']
          }
        }],
        estimatedTotalDuration: 10000,
        requiresConfirmation: false,
        rollbackStrategy: 'none'
      };
    }
  }

  /**
   * Validate workflow plan
   */
  private validateWorkflowPlan(plan: WorkflowPlan): void {
    if (!plan.steps || plan.steps.length === 0) {
      throw new Error('Workflow plan must have at least one step');
    }

    // Check for circular dependencies
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = (stepId: string): boolean => {
      if (recursionStack.has(stepId)) return true;
      if (visited.has(stepId)) return false;

      visited.add(stepId);
      recursionStack.add(stepId);

      const step = plan.steps.find(s => s.id === stepId);
      if (step) {
        for (const dep of step.dependencies) {
          if (hasCycle(dep)) return true;
        }
      }

      recursionStack.delete(stepId);
      return false;
    };

    for (const step of plan.steps) {
      if (hasCycle(step.id)) {
        throw new Error(`Circular dependency detected involving step: ${step.id}`);
      }
    }
  }

  /**
   * Execute workflow
   */
  private async *executeWorkflow(
    workflowExecution: WorkflowExecution,
    request: AgentExecutionRequest,
    executionContext: AgentExecutionContext
  ): AsyncIterable<AgentExecutionChunk> {
    workflowExecution.status = 'running';

    try {
      yield {
        type: 'workflow_start',
        content: {
          workflowId: workflowExecution.id,
          workflowName: workflowExecution.plan.name,
          totalSteps: workflowExecution.plan.steps.length
        },
        timestamp: Date.now()
      };

      // Execute steps in dependency order
      const executedSteps = new Set<string>();
      let remainingSteps = [...workflowExecution.plan.steps];

      while (remainingSteps.length > 0) {
        // Find steps ready for execution (dependencies satisfied)
        const readySteps = remainingSteps.filter(step =>
          step.dependencies.every(dep => executedSteps.has(dep))
        );

        if (readySteps.length === 0) {
          throw new Error('Workflow execution stalled: unresolved dependencies');
        }

        // Execute ready steps (parallelize if possible)
        const parallelizableSteps = readySteps.filter(step => step.parallelizable);
        const sequentialSteps = readySteps.filter(step => !step.parallelizable);

        // Execute parallelizable steps
        if (parallelizableSteps.length > 0) {
          const batch = parallelizableSteps.slice(0, this.config.maxConcurrentSteps);
          yield* this.executeStepBatch(batch, workflowExecution, request, executionContext);
          batch.forEach(step => {
            executedSteps.add(step.id);
            remainingSteps = remainingSteps.filter(s => s.id !== step.id);
          });
        }

        // Execute sequential steps one by one
        for (const step of sequentialSteps) {
          yield* this.executeSingleStep(step, workflowExecution, request, executionContext);
          executedSteps.add(step.id);
          remainingSteps = remainingSteps.filter(s => s.id !== step.id);
        }

        // Check for timeout
        if (Date.now() - workflowExecution.startTime > this.config.workflowTimeout) {
          throw new Error('Workflow execution timeout');
        }
      }

      // Workflow completed successfully
      workflowExecution.status = 'completed';
      workflowExecution.endTime = Date.now();

      yield {
        type: 'workflow_complete',
        content: {
          workflowId: workflowExecution.id,
          totalSteps: workflowExecution.plan.steps.length,
          completedSteps: workflowExecution.completedSteps.length,
          executionTime: workflowExecution.endTime - workflowExecution.startTime,
          results: Object.fromEntries(workflowExecution.stepResults)
        },
        timestamp: Date.now()
      };

    } catch (error) {
      workflowExecution.status = 'failed';
      workflowExecution.endTime = Date.now();
      workflowExecution.error = (error as Error).message;

      yield {
        type: 'workflow_error',
        content: {
          workflowId: workflowExecution.id,
          error: (error as Error).message,
          completedSteps: workflowExecution.completedSteps.length,
          failedSteps: workflowExecution.failedSteps.length
        },
        timestamp: Date.now()
      };

      throw error;
    }
  }

  /**
   * Execute a batch of parallelizable steps
   */
  private async *executeStepBatch(
    steps: WorkflowStep[],
    workflowExecution: WorkflowExecution,
    request: AgentExecutionRequest,
    executionContext: AgentExecutionContext
  ): AsyncIterable<AgentExecutionChunk> {
    const stepPromises = steps.map(step =>
      this.executeSingleStep(step, workflowExecution, request, executionContext)
    );

    // Collect all results and yield them
    const stepResults = await Promise.all(stepPromises);
    for (const result of stepResults) {
      for await (const chunk of result) {
        yield chunk;
      }
    }
  }

  /**
   * Execute a single workflow step
   */
  private async *executeSingleStep(
    step: WorkflowStep,
    workflowExecution: WorkflowExecution,
    request: AgentExecutionRequest,
    executionContext: AgentExecutionContext
  ): AsyncIterable<AgentExecutionChunk> {
    const stepExecutionId = `${workflowExecution.id}_${step.id}`;
    const startTime = Date.now();

    yield {
      type: 'step_start',
      content: {
        stepId: step.id,
        stepName: step.name,
        stepType: step.type,
        workflowId: workflowExecution.id
      },
      timestamp: Date.now()
    };

    workflowExecution.currentStep = step.id;

    let attempt = 0;
    let lastError: Error | undefined;

    while (attempt <= step.retryPolicy.maxRetries) {
      try {
        const stepResult = yield* this.executeStepByType(
          step,
          request,
          executionContext,
          workflowExecution
        );

        workflowExecution.stepResults.set(step.id, stepResult);
        workflowExecution.completedSteps.push(step.id);

        yield {
          type: 'step_complete',
          content: {
            stepId: step.id,
            stepName: step.name,
            executionTime: Date.now() - startTime,
            attempt: attempt + 1,
            result: stepResult
          },
          timestamp: Date.now()
        };

        return; // Success, exit retry loop

      } catch (error) {
        lastError = error as Error;
        attempt++;

        if (attempt <= step.retryPolicy.maxRetries) {
          this.dependencies.logger.warn(`Step ${step.id} failed, retrying`, {
            attempt,
            maxRetries: step.retryPolicy.maxRetries,
            error: lastError.message
          });

          yield {
            type: 'step_retry',
            content: {
              stepId: step.id,
              attempt,
              maxRetries: step.retryPolicy.maxRetries,
              error: lastError.message
            },
            timestamp: Date.now()
          };

          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, step.retryPolicy.retryDelay));
        }
      }
    }

    // All retries exhausted
    workflowExecution.failedSteps.push(step.id);
    throw new Error(`Step ${step.id} failed after ${step.retryPolicy.maxRetries} retries: ${lastError?.message}`);
  }

  /**
   * Execute step based on its type
   */
  private async *executeStepByType(
    step: WorkflowStep,
    request: AgentExecutionRequest,
    executionContext: AgentExecutionContext,
    workflowExecution: WorkflowExecution
  ): AsyncIterable<any> {
    const stepExecutionContext: AgentExecutionContext = {
      ...executionContext,
      id: `${executionContext.id}_${step.id}`,
      agentId: step.agentId || executionContext.agentId
    };

    switch (step.type) {
    case 'tool_calling':
      if (!step.tools || step.tools.length === 0) {
        throw new Error(`Tool calling step ${step.id} requires tools to be specified`);
      }
      return yield* this.toolCallingAgent.execute(request, stepExecutionContext);

    case 'handoff':
      if (!step.agentId) {
        throw new Error(`Handoff step ${step.id} requires target agent to be specified`);
      }
      const handoffRequest: AgentExecutionRequest = {
        ...request,
        agentId: step.agentId,
        context: {
          ...request.context,
          sessionId: request.context.sessionId || executionContext.sessionId
        }
      };
      return yield* this.handoffAgent.execute(handoffRequest, stepExecutionContext);

    case 'collaboration':
      return yield* this.executeCollaborationStep(step, request, stepExecutionContext, workflowExecution);

    case 'direct':
      return yield* this.executeDirectStep(step, request, stepExecutionContext);

    default:
      throw new Error(`Unknown step type: ${step.type}`);
    }
  }

  /**
   * Execute collaboration step
   */
  private async *executeCollaborationStep(
    step: WorkflowStep,
    request: AgentExecutionRequest,
    executionContext: AgentExecutionContext,
    workflowExecution: WorkflowExecution
  ): AsyncIterable<any> {
    // For collaboration, we'll use the model to coordinate multiple agents
    yield {
      type: 'progress',
      content: { phase: 'collaboration', message: 'Coordinating multiple agents...' },
      timestamp: Date.now()
    };

    const collaborationPrompt = `You are coordinating a collaborative workflow step.

Step: ${step.name}
Description: ${step.description}
Available previous results: ${JSON.stringify(Object.fromEntries(workflowExecution.stepResults))}

Current user request: ${typeof request.input === 'string' ? request.input : JSON.stringify(request.input)}

Coordinate the response using information from previous steps and your capabilities.`;

    const messages = [
      new SystemMessage("You are a collaborative AI coordinator."),
      new HumanMessage(collaborationPrompt)
    ];

    const response = await this.model.invoke(messages);

    return {
      type: 'collaboration_result',
      content: {
        message: response.content,
        coordinationResult: response.content
      },
      timestamp: Date.now()
    };
  }

  /**
   * Execute direct step
   */
  private async *executeDirectStep(
    step: WorkflowStep,
    request: AgentExecutionRequest,
    executionContext: AgentExecutionContext
  ): AsyncIterable<any> {
    yield {
      type: 'progress',
      content: { phase: 'direct', message: 'Generating direct response...' },
      timestamp: Date.now()
    };

    const directPrompt = `You are executing a workflow step directly.

Step: ${step.name}
Description: ${step.description}

User request: ${typeof request.input === 'string' ? request.input : JSON.stringify(request.input)}

Provide a direct response for this step of the workflow.`;

    const messages = [
      new SystemMessage("You are a helpful AI assistant executing a workflow step."),
      new HumanMessage(directPrompt)
    ];

    const response = await this.model.invoke(messages);

    return {
      type: 'direct_result',
      content: {
        message: response.content,
        directResult: response.content
      },
      timestamp: Date.now()
    };
  }

  /**
   * Get active workflow executions
   */
  getActiveExecutions(): WorkflowExecution[] {
    return Array.from(this.activeExecutions.values());
  }

  /**
   * Get workflow execution by ID
   */
  getExecution(executionId: string): WorkflowExecution | undefined {
    return this.activeExecutions.get(executionId);
  }

  /**
   * Cancel workflow execution
   */
  cancelExecution(executionId: string): boolean {
    const execution = this.activeExecutions.get(executionId);
    if (execution?.status === 'running') {
      execution.status = 'cancelled';
      execution.endTime = Date.now();
      this.activeExecutions.delete(executionId);
      return true;
    }
    return false;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<HybridConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Dispose of hybrid agent
   */
  dispose(): void {
    // Cancel all active executions
    for (const executionId of this.activeExecutions.keys()) {
      this.cancelExecution(executionId);
    }

    // Dispose sub-agents
    this.handoffAgent.dispose();

    this.dependencies.logger.info('Hybrid agent disposed');
  }
}

/**
 * Default configurations
 */
export const DEFAULT_TOOL_CALLING_CONFIG: ToolCallingConfig = {
  maxConcurrentTools: 3,
  maxToolExecutionTime: 30000,
  requireConfirmation: false,
  allowParallelExecution: true,
  toolSelectionThreshold: 0.7
};

export const DEFAULT_HANDOFF_CONFIG: HandoffConfig = {
  maxHandoffs: 5,
  confidenceThreshold: 0.7,
  contextRetentionLimit: 50,
  allowSelfHandoff: false,
  requireConfirmation: false
};

export const DEFAULT_HYBRID_CONFIG: HybridConfig = {
  maxConcurrentSteps: 3,
  stepTimeout: 60000,
  workflowTimeout: 300000,
  allowStepSkipping: false,
  requireConfirmation: false,
  enableCheckpointing: true
};