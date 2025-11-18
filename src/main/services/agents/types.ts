/**
 * Agent Service Types
 *
 * Type definitions for agent management and execution.
 */

import {
  AgentConfig as BaseAgentConfig,
  AgentExecutionRequest,
  AgentExecutionChunk,
  ServiceExecutionContext,
  AgentExecutionError as BaseAgentExecutionError
} from '../types';

export enum AgentType {
  LEARNING = 'learning',
  ASSESSMENT = 'assessment',
  TUTORING = 'tutoring',
  PRACTICE = 'practice',
  RESEARCH = 'research',
  COLLABORATION = 'collaboration',
  TITLE_GENERATION = 'title-generation'
}

// Extend base AgentConfig with agent-specific fields
export interface AgentConfig extends BaseAgentConfig {
  version: string;
  description?: string;
  permissions: {
    canReadFiles: boolean;
    canWriteFiles: boolean;
    canAccessNetwork: boolean;
    allowedDomains?: string[];
  };
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

// Re-export from base types
export { AgentExecutionRequest, AgentExecutionChunk, ServiceExecutionContext };
export { BaseAgentExecutionError as AgentExecutionError };

export interface ToolExecutorConfig {
  timeout: number;
  maxRetries: number;
  sandboxEnabled: boolean;
  allowedPaths: string[];
  allowedDomains: string[];
}

// Import base tool execution types
import { ToolExecutionRequest as BaseToolExecutionRequest, ToolExecutionResult as BaseToolExecutionResult } from '../types';

export interface ToolExecutionRequest extends BaseToolExecutionRequest {
  method: string; // Keep for backwards compatibility, maps to operation
}

// Re-export tool execution result
export { BaseToolExecutionResult as ToolExecutionResult };

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