/**
 * Agent Service Types
 *
 * Type definitions for agent management and execution.
 */

export enum AgentType {
  LEARNING = 'learning',
  ASSESSMENT = 'assessment',
  TUTORING = 'tutoring',
  PRACTICE = 'practice',
  RESEARCH = 'research',
  COLLABORATION = 'collaboration',
  TITLE_GENERATION = 'title-generation'
}

export interface AgentConfig {
  id: string;
  name: string;
  type: 'concept-parser' | 'chat-agent' | 'learning-coach' | 'content-discoverer';
  version: string;
  description?: string;
  enabled: boolean;
  systemPrompt?: string;
  modelConfig: {
    provider: any;
    modelId: string;
    timeout?: number;
    temperature?: number;
    maxTokens?: number;
  };
  tools: string[];
  permissions: {
    canReadFiles: boolean;
    canWriteFiles: boolean;
    canAccessNetwork: boolean;
    allowedDomains?: string[];
  };
  capabilities: string[];
  metadata?: Record<string, any>;
}

export interface AgentExecutionRequest {
  agentId: string;
  input: any;
  context: ServiceExecutionContext;
  options: {
    stream?: boolean;
    maxIterations?: number;
    timeout?: number;
    sessionId?: string;
    userId?: string;
  };
}

export interface AgentExecutionChunk {
  type: 'error' | 'data' | 'start' | 'progress' | 'complete' | 'tool-call' | 'tool-result' |
       'workflow_start' | 'workflow_complete' | 'workflow_error' | 'step_start' | 'step_complete' | 'step_retry';
  content: any;
  timestamp: number;
}

export interface ServiceExecutionContext {
  id: string;
  sessionId: string;
  userId?: string;
  timestamp: number;
  requestId: string;
  correlationId?: string;
  operation: string;
  metadata?: Record<string, any>;
}

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

export interface EnhancedToolCallingContext extends AgentExecutionContext {
  orchestrationId: string;
  toolSelectionStrategy?: string;
  iteration: number;
  maxIterations: number;
}

export interface ServiceDependencies {
  database: any;
  logger: any;
  config: any;
  eventBus: any;
}

export class AgentExecutionError extends Error {
  constructor(
    message: string,
    public agentId: string,
    public phase: 'initialization' | 'execution' | 'cleanup' | 'tool-call',
    public context?: ServiceExecutionContext,
    public cause?: Error
  ) {
    super(message);
    this.name = 'AgentExecutionError';
  }
}

export interface ToolExecutorConfig {
  timeout: number;
  maxRetries: number;
  sandboxEnabled: boolean;
  allowedPaths: string[];
  allowedDomains: string[];
}

export interface ToolExecutionRequest {
  toolId: string;
  method: string;
  parameters: Record<string, any>;
  context: ServiceExecutionContext;
}

export interface ToolExecutionResult {
  success: boolean;
  result?: any;
  error?: string;
  metadata?: Record<string, any>;
  executionTime: number;
}

export interface AgentExecutionResult {
  success: boolean;
  executionId: string;
  agentId: string;
  result: {
    type: string;
    content: string;
    metadata?: Record<string, any>;
  };
  metadata: {
    startTime: Date;
    endTime: Date;
    duration: number;
    tokensUsed: number;
    model: string;
    provider: string;
  };
}