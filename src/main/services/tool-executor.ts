/**
 * Tool Executor Service
 *
 * Secure tool execution service for main thread agents.
 * Provides database access, file operations, and other tools
 * with proper security controls and error handling.
 */

import { ToolDefinition, ToolExecutionRequest, ToolExecutionResult, ServiceDependencies, ToolHandler } from './types';
import { Database } from '../database';
import { ServiceLogger } from './types';
import { ToolExecutionError, DatabaseConnectionError } from './types';
import { readFile, writeFile, exists } from 'fs/promises';
import { join, resolve } from 'path';

/**
 * Built-in tool definitions for agent operations
 */
export class BuiltinTools {
  /**
   * Database query tool
   */
  static databaseQuery: ToolDefinition = {
    id: 'database-query',
    name: 'Database Query',
    description: 'Execute SQL queries on the local database with read/write permissions',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'SQL query to execute' },
        params: { type: 'array', description: 'Query parameters', items: { type: 'any' } },
        operation: {
          type: 'string',
          enum: ['select', 'insert', 'update', 'delete'],
          description: 'Type of database operation'
        }
      },
      required: ['query', 'operation']
    },
    handler: async (request, deps): Promise<ToolExecutionResult> => {
      const startTime = Date.now();
      const { query, params = [], operation } = request.parameters;

      try {
        deps.logger.debug(`Executing database query: ${operation}`, {
          query: query.substring(0, 100) + '...',
          paramCount: params.length
        });

        let result: any;

        switch (operation) {
          case 'select':
            result = await deps.database.executeQuery(query, params);
            break;

          case 'insert':
            result = await deps.database.executeQuery(query, params);
            break;

          case 'update':
            result = await deps.database.executeQuery(query, params);
            break;

          case 'delete':
            result = await deps.database.executeQuery(query, params);
            break;

          default:
            throw new ToolExecutionError(
              `Unsupported database operation: ${operation}`,
              'database-query',
              operation,
              request.context
            );
        }

        deps.logger.info(`Database query executed successfully`, {
          operation,
          rowCount: Array.isArray(result) ? result.length : 1
        });

        return {
          success: true,
          data: result,
          executionTime: Date.now() - startTime,
          metadata: {
            operation,
            rowCount: Array.isArray(result) ? result.length : 1
          }
        };

      } catch (error) {
        deps.logger.error('Database query failed', error as Error, {
          operation,
          query: query.substring(0, 100) + '...'
        });

        return {
          success: false,
          error: error as Error,
          executionTime: Date.now() - startTime,
          metadata: { operation }
        };
      }
    },
    requiredDatabase: true,
    permissions: ['database.read', 'database.write']
  };

  /**
   * File read tool
   */
  static fileRead: ToolDefinition = {
    id: 'file-read',
    name: 'Read File',
    description: 'Read the contents of a file from the file system',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Path to the file to read' },
        encoding: { type: 'string', default: 'utf-8', description: 'File encoding' }
      },
      required: ['path']
    },
    handler: async (request, deps): Promise<ToolExecutionResult> => {
      const startTime = Date.now();
      const { path, encoding = 'utf-8' } = request.parameters;

      try {
        deps.logger.debug(`Reading file: ${path}`);

        // Validate path for security
        const resolvedPath = resolve(path);
        if (!resolvedPath.startsWith(process.cwd()) && !resolvedPath.includes('learning_catalyst')) {
          throw new ToolExecutionError(
            'Access to path outside project directory is not allowed',
            'file-read',
            'read',
            request.context
          );
        }

        // Check if file exists
        if (!(await exists(resolvedPath))) {
          throw new ToolExecutionError(
            `File not found: ${path}`,
            'file-read',
            'read',
            request.context
          );
        }

        const content = await readFile(resolvedPath, encoding);

        deps.logger.info(`File read successfully`, { path, size: content.length });

        return {
          success: true,
          data: { content, path, size: content.length },
          executionTime: Date.now() - startTime,
          metadata: { path, size: content.length }
        };

      } catch (error) {
        deps.logger.error('File read failed', error as Error, { path });

        return {
          success: false,
          error: error as Error,
          executionTime: Date.now() - startTime,
          metadata: { path }
        };
      }
    },
    requiredDatabase: false,
    permissions: ['file.read']
  };

  /**
   * File write tool
   */
  static fileWrite: ToolDefinition = {
    id: 'file-write',
    name: 'Write File',
    description: 'Write content to a file in the file system',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Path to the file to write' },
        content: { type: 'string', description: 'Content to write to the file' },
        encoding: { type: 'string', default: 'utf-8', description: 'File encoding' }
      },
      required: ['path', 'content']
    },
    handler: async (request, deps): Promise<ToolExecutionResult> => {
      const startTime = Date.now();
      const { path, content, encoding = 'utf-8' } = request.parameters;

      try {
        deps.logger.debug(`Writing file: ${path}`);

        // Validate path for security
        const resolvedPath = resolve(path);
        if (!resolvedPath.startsWith(process.cwd()) && !resolvedPath.includes('learning_catalyst')) {
          throw new ToolExecutionError(
            'Access to path outside project directory is not allowed',
            'file-write',
            'write',
            request.context
          );
        }

        await writeFile(resolvedPath, content, encoding);

        deps.logger.info(`File written successfully`, { path, size: content.length });

        return {
          success: true,
          data: { path, size: content.length },
          executionTime: Date.now() - startTime,
          metadata: { path, size: content.length }
        };

      } catch (error) {
        deps.logger.error('File write failed', error as Error, { path });

        return {
          success: false,
          error: error as Error,
          executionTime: Date.now() - startTime,
          metadata: { path }
        };
      }
    },
    requiredDatabase: false,
    permissions: ['file.write']
  };

  /**
   * List concepts tool
   */
  static listConcepts: ToolDefinition = {
    id: 'list-concepts',
    name: 'List Concepts',
    description: 'List concepts from the knowledge graph with optional filtering',
    parameters: {
      type: 'object',
      properties: {
        limit: { type: 'number', default: 50, description: 'Maximum number of concepts to return' },
        offset: { type: 'number', default: 0, description: 'Number of concepts to skip' },
        difficulty: {
          type: 'string',
          enum: ['beginner', 'intermediate', 'advanced'],
          description: 'Filter by difficulty level'
        },
        type: { type: 'string', description: 'Filter by concept type' }
      },
      required: []
    },
    handler: async (request, deps): Promise<ToolExecutionResult> => {
      const startTime = Date.now();
      const { limit = 50, offset = 0, difficulty, type } = request.parameters;

      try {
        deps.logger.debug('Listing concepts', { limit, offset, difficulty, type });

        // Build query
        let query = 'SELECT * FROM concepts WHERE 1=1';
        const params: any[] = [];

        if (difficulty) {
          query += ' AND difficulty = ?';
          params.push(difficulty);
        }

        if (type) {
          query += ' AND type = ?';
          params.push(type);
        }

        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const concepts = await deps.database.fetchAll(query, params);

        deps.logger.info(`Listed ${concepts.length} concepts`);

        return {
          success: true,
          data: { concepts, total: concepts.length },
          executionTime: Date.now() - startTime,
          metadata: { limit, offset, count: concepts.length }
        };

      } catch (error) {
        deps.logger.error('Failed to list concepts', error as Error);

        return {
          success: false,
          error: error as Error,
          executionTime: Date.now() - startTime,
          metadata: { limit, offset }
        };
      }
    },
    requiredDatabase: true,
    permissions: ['database.read']
  };

  /**
   * Get all built-in tools
   */
  static getAll(): ToolDefinition[] {
    return [
      this.databaseQuery,
      this.fileRead,
      this.fileWrite,
      this.listConcepts
    ];
  }
}

/**
 * Tool executor service implementation
 */
export class ToolExecutorService {
  private tools = new Map<string, ToolDefinition>();
  private dependencies: ServiceDependencies;

  constructor(dependencies: ServiceDependencies) {
    this.dependencies = dependencies;

    // Register built-in tools
    this.registerBuiltinTools();
  }

  /**
   * Register built-in tools
   */
  private registerBuiltinTools(): void {
    for (const tool of BuiltinTools.getAll()) {
      this.tools.set(tool.id, tool);
    }

    this.dependencies.logger.info(`Registered ${this.tools.size} built-in tools`);
  }

  /**
   * Register a custom tool
   */
  registerTool(tool: ToolDefinition): void {
    if (this.tools.has(tool.id)) {
      throw new ToolExecutionError(
        `Tool with id '${tool.id}' is already registered`,
        tool.id,
        'register',
        this.dependencies.als.getStore()
      );
    }

    this.tools.set(tool.id, tool);
    this.dependencies.logger.info(`Registered custom tool: ${tool.id}`);
  }

  /**
   * Unregister a tool
   */
  unregisterTool(toolId: string): void {
    if (this.tools.delete(toolId)) {
      this.dependencies.logger.info(`Unregistered tool: ${toolId}`);
    }
  }

  /**
   * Get all registered tools
   */
  getRegisteredTools(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get a tool by ID
   */
  getTool(toolId: string): ToolDefinition | undefined {
    return this.tools.get(toolId);
  }

  /**
   * Execute a tool
   */
  async executeTool(request: ToolExecutionRequest): Promise<ToolExecutionResult> {
    const tool = this.tools.get(request.toolId);

    if (!tool) {
      throw new ToolExecutionError(
        `Tool '${request.toolId}' not found`,
        request.toolId,
        request.operation,
        request.context
      );
    }

    // Check permissions (in a real implementation, you'd check against user permissions)
    if (tool.requiredDatabase && !this.dependencies.database) {
      throw new ToolExecutionError(
        `Tool '${request.toolId}' requires database access but database is not available`,
        request.toolId,
        request.operation,
        request.context
      );
    }

    this.dependencies.logger.debug(`Executing tool: ${request.toolId}`, {
      operation: request.operation,
      parameters: Object.keys(request.parameters)
    });

    try {
      const result = await tool.handler(request, this.dependencies);

      if (result.success) {
        this.dependencies.logger.info(`Tool executed successfully: ${request.toolId}`, {
          executionTime: result.executionTime
        });
      } else {
        this.dependencies.logger.warn(`Tool execution failed: ${request.toolId}`, {
          error: result.error?.message,
          executionTime: result.executionTime
        });
      }

      return result;

    } catch (error) {
      const toolError = error instanceof ToolExecutionError
        ? error
        : new ToolExecutionError(
            `Tool execution failed: ${(error as Error).message}`,
            request.toolId,
            request.operation,
            request.context,
            error as Error
          );

      this.dependencies.logger.error(`Tool execution error: ${request.toolId}`, toolError);

      return {
        success: false,
        error: toolError,
        executionTime: 0,
        metadata: { toolId: request.toolId }
      };
    }
  }

  /**
   * Execute multiple tools in parallel
   */
  async executeTools(requests: ToolExecutionRequest[]): Promise<ToolExecutionResult[]> {
    this.dependencies.logger.debug(`Executing ${requests.length} tools in parallel`);

    const promises = requests.map(request => this.executeTool(request));
    const results = await Promise.allSettled(promises);

    return results.map(result => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          success: false,
          error: result.reason as Error,
          executionTime: 0,
          metadata: { reason: 'promise_rejected' }
        };
      }
    });
  }

  /**
   * Get tool execution statistics
   */
  getStats(): {
    totalTools: number;
    builtinTools: number;
    customTools: number;
    tools: Array<{ id: string; name: string; requiredDatabase: boolean }>;
  } {
    const builtinTools = BuiltinTools.getAll();
    const tools = Array.from(this.tools.values());

    return {
      totalTools: tools.length,
      builtinTools: builtinTools.length,
      customTools: tools.length - builtinTools.length,
      tools: tools.map(tool => ({
        id: tool.id,
        name: tool.name,
        requiredDatabase: !!tool.requiredDatabase
      }))
    };
  }

  /**
   * Dispose of the tool executor service
   */
  dispose(): void {
    this.tools.clear();
    this.dependencies.logger.info('Tool executor service disposed');
  }
}