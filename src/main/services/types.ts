/**
 * Main Thread Service Types
 *
 * Type definitions for the main thread service architecture.
 * Provides comprehensive type safety for agent management, tool execution,
 * and service orchestration in the main process.
 */

import { AsyncLocalStorage } from 'async_hooks';
import { MessagePortMain } from 'electron';
import { Database } from '../database';
import { AIProvider } from '@/shared/types/ai';
import { Concept, ProposedRelationship } from '@/shared/types/concept-parsing';
import { ToolExecutorService } from './tool-executor';
import { AgentManagerMain } from './agents/agent-manager';
import { SessionServiceMain } from './session/session-service';
import { ServiceConfigManager } from './config';
import { LoggerFactory } from './logger';
import { MainThreadServiceRegistry } from './registry';

/**
 * Service execution context for tracking requests across async operations
 */
export interface ServiceExecutionContext {
  readonly id: string;
  readonly sessionId: string;
  readonly userId?: string;
  readonly requestId: string;
  readonly timestamp: number;
  readonly operation: string;
  readonly metadata: Record<string, any>;
}

/**
 * Agent configuration and execution parameters
 */
export interface AgentConfig {
  readonly id: string;
  readonly name: string;
  readonly type: 'concept-parser' | 'chat-agent' | 'learning-coach' | 'content-discoverer';
  readonly modelConfig: {
    provider: AIProvider;
    modelId: string;
    temperature?: number;
    maxTokens?: number;
    timeout?: number;
  };
  readonly tools: string[];
  readonly systemPrompt?: string;
  readonly capabilities: string[];
  readonly enabled: boolean;
}

/**
 * Tool execution request and response types
 */
export interface ToolExecutionRequest {
  readonly toolId: string;
  readonly operation: string;
  readonly parameters: Record<string, any>;
  readonly context: ServiceExecutionContext;
}

export interface ToolExecutionResult {
  readonly success: boolean;
  readonly data?: any;
  readonly error?: Error;
  readonly executionTime: number;
  readonly metadata: Record<string, any>;
}

/**
 * Agent execution request with streaming support
 */
export interface AgentExecutionRequest {
  readonly agentId: string;
  readonly input: string | Record<string, any>;
  readonly context: ServiceExecutionContext;
  readonly options: {
    stream?: boolean;
    tools?: string[];
    timeout?: number;
    maxIterations?: number;
  };
}

export interface AgentExecutionChunk {
  readonly type: 'start' | 'progress' | 'tool-call' | 'tool-result' | 'data' | 'error' | 'complete';
  readonly content: any;
  readonly timestamp: number;
  readonly metadata?: Record<string, any>;
}

/**
 * Tool definition and registry
 */
export interface ToolDefinition {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly parameters: Record<string, any>;
  readonly handler: ToolHandler;
  readonly requiredDatabase?: boolean;
  readonly permissions: string[];
}

export type ToolHandler = (
  request: ToolExecutionRequest,
  dependencies: ServiceDependencies
) => Promise<ToolExecutionResult>;

/**
 * Service dependencies for dependency injection
 */
export interface ServiceDependencies {
  readonly database: Database;
  readonly als: AsyncLocalStorage<ServiceExecutionContext>;
  readonly logger: ServiceLogger;
  readonly config: ServiceConfig;
}

/**
 * Complete service dependencies for the Catalyst service
 */
export interface CatalystServiceDependencies {
  readonly database: Database;
  readonly toolExecutor: ToolExecutorService;
  readonly agentManager: AgentManagerMain;
  readonly sessionService: SessionServiceMain;
  readonly config: ServiceConfigManager;
  readonly loggerFactory: LoggerFactory;
  readonly logger: ServiceLogger;
  readonly als: AsyncLocalStorage<ServiceExecutionContext>;
  readonly registry: MainThreadServiceRegistry;
}

/**
 * Service configuration
 */
export interface ServiceConfig {
  readonly database: {
    readonly maxConnections: number;
    readonly connectionTimeout: number;
    readonly queryTimeout: number;
  };
  readonly agents: {
    readonly maxConcurrent: number;
    readonly defaultTimeout: number;
    readonly maxIterations: number;
  };
  readonly tools: {
    readonly defaultTimeout: number;
    readonly enableSandbox: boolean;
  };
  readonly logging: {
    readonly level: 'debug' | 'info' | 'warn' | 'error';
    readonly maxLogSize: number;
    readonly enableConsole: boolean;
  };
}

/**
 * Service logger interface
 */
export interface ServiceLogger {
  debug(message: string, meta?: Record<string, any>): void;
  info(message: string, meta?: Record<string, any>): void;
  warn(message: string, meta?: Record<string, any>): void;
  error(message: string, error?: Error, meta?: Record<string, any>): void;
  child(context: Record<string, any>): ServiceLogger;
}

/**
 * Service health and monitoring
 */
export interface ServiceHealth {
  readonly status: 'healthy' | 'degraded' | 'unhealthy';
  readonly timestamp: number;
  readonly services: Record<string, {
    readonly status: 'healthy' | 'degraded' | 'unhealthy';
    readonly lastCheck: number;
    readonly error?: string;
    readonly metrics: Record<string, number>;
  }>;
}

/**
 * IPC streaming message types
 */
export interface IPCStreamMessage {
  readonly id: string;
  readonly type: 'start' | 'data' | 'error' | 'complete';
  readonly payload: any;
  readonly timestamp: number;
}

export interface IPCStreamRequest {
  readonly id: string;
  readonly channel: string;
  readonly payload: any;
  readonly timeout?: number;
}

/**
 * MessageChannelMain streaming setup
 */
export interface StreamConnection {
  readonly id: string;
  readonly port: MessagePortMain;
  readonly channelId: string;
  readonly createdAt: number;
  readonly lastActivity: number;
}

/**
 * Service registry for managing all main thread services
 */
export interface ServiceRegistry {
  register<T>(name: string, service: T): void;
  get<T>(name: string): T | undefined;
  has(name: string): boolean;
  dispose(): Promise<void>;
}

/**
 * Error types for main thread services
 */
export class ServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly service: string,
    public readonly context?: ServiceExecutionContext,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'ServiceError';
  }
}

export class AgentExecutionError extends ServiceError {
  constructor(
    message: string,
    public readonly agentId: string,
    public readonly phase: 'initialization' | 'execution' | 'tool-call' | 'cleanup',
    context?: ServiceExecutionContext,
    cause?: Error
  ) {
    super(message, 'AGENT_EXECUTION_ERROR', 'AgentManager', context, cause);
    this.name = 'AgentExecutionError';
  }
}

export class ToolExecutionError extends ServiceError {
  constructor(
    message: string,
    public readonly toolId: string,
    public readonly operation: string,
    context?: ServiceExecutionContext,
    cause?: Error
  ) {
    super(message, 'TOOL_EXECUTION_ERROR', 'ToolExecutor', context, cause);
    this.name = 'ToolExecutionError';
  }
}

export class DatabaseConnectionError extends ServiceError {
  constructor(
    message: string,
    public readonly operation: string,
    context?: ServiceExecutionContext,
    cause?: Error
  ) {
    super(message, 'DATABASE_CONNECTION_ERROR', 'DatabaseService', context, cause);
    this.name = 'DatabaseConnectionError';
  }
}

/**
 * Concept parsing specific types for main thread
 */
export interface ConceptParsingRequest {
  readonly content: string;
  readonly metadata: {
    readonly title?: string;
    readonly format: 'markdown' | 'text' | 'html';
    readonly source: string;
  };
  readonly config: {
    readonly enableAIExtraction: boolean;
    readonly enableRuleExtraction: boolean;
    readonly confidenceThreshold: number;
    readonly maxConcepts: number;
  };
}

export interface ConceptParsingResult {
  readonly concepts: Concept[];
  readonly relationships: ProposedRelationship[];
  readonly statistics: {
    readonly totalConcepts: number;
    readonly totalRelationships: number;
    readonly processingTime: number;
    readonly confidence: number;
  };
  readonly success: boolean;
  readonly errors: string[];
}

/**
 * LangGraph checkpoint management
 */
export interface CheckpointManager {
  saveCheckpoint(threadId: string, checkpoint: any): Promise<void>;
  loadCheckpoint(threadId: string): Promise<any>;
  listCheckpoints(threadId: string): Promise<any[]>;
  deleteCheckpoint(threadId: string, checkpointId: string): Promise<void>;
}