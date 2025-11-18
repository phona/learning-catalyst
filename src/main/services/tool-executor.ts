/**
 * Tool Executor Service
 *
 * Secure tool execution service for main thread agents.
 * Provides database access, file operations, and other tools
 * with proper security controls and error handling.
 */

import { ToolDefinition, ToolExecutionRequest, ToolExecutionResult, ServiceDependencies, ToolHandler } from './types';
import { Database } from './database/kysely-schema';
import { ServiceLogger } from './types';
import { ToolExecutionError, DatabaseConnectionError } from './types';
import { readFile, writeFile } from 'fs/promises';
import { access } from 'fs/promises';
import { join, resolve } from 'path';

/**
 * Built-in tool definitions for agent operations
 */
export class BuiltinTools {
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

        // Use Kysely query builder instead of raw SQL
        // Build the query using Kysely's dynamic capabilities
        let kyselyQuery = deps.database.selectFrom('concepts');
        
        if (difficulty) {
          kyselyQuery = kyselyQuery.where('difficulty', '=', difficulty);
        }
        
        if (type) {
          kyselyQuery = kyselyQuery.where('type', '=', type);
        }
        
        const concepts = await kyselyQuery
          .orderBy('created_at', 'desc')
          .limit(limit)
          .offset(offset)
          .selectAll()
          .execute();

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
      this.listConcepts
    ];
  }
}

/**
 * Tool executor service implementation
 */
export class ToolExecutorService {
  private readonly tools = new Map<string, ToolDefinition>();
  private readonly dependencies: ServiceDependencies;

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
   * Get base tools (built-in tools)
   */
  getBaseTools(): ToolDefinition[] {
    return BuiltinTools.getAll();
  }

  /**
   * Get tool definitions for available tools
   */
  async getToolDefinitions(toolIds: string[]): Promise<Array<{id: string, name: string, description: string, parameters: any}>> {
    const definitions: Array<{id: string, name: string, description: string, parameters: any}> = [];

    for (const toolId of toolIds) {
      const tool = this.tools.get(toolId);
      if (tool) {
        definitions.push({
          id: tool.id,
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters
        });
      }
    }

    return definitions;
  }

  /**
   * Get information about a specific tool
   */
  async getToolInfo(toolId: string): Promise<{
    id: string;
    name: string;
    description: string;
    parameters: any;
    requiredDatabase: boolean;
    permissions: string[];
    requiresAuth?: boolean;
  } | null> {
    const tool = this.tools.get(toolId);
    if (!tool) {
      return null;
    }

    return {
      id: tool.id,
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
      requiredDatabase: !!tool.requiredDatabase,
      permissions: tool.permissions,
      requiresAuth: tool.permissions.includes('auth') || tool.permissions.includes('authenticated')
    };
  }

  /**
   * Validate tool arguments against tool definition
   */
  async validateToolArguments(toolId: string, args: Record<string, any>): Promise<{
    valid: boolean;
    errors: string[];
  }> {
    const tool = this.tools.get(toolId);
    if (!tool) {
      return {
        valid: false,
        errors: [`Tool '${toolId}' not found`]
      };
    }

    const errors: string[] = [];
    const parameters = tool.parameters;

    // Check required parameters
    if (parameters.required && Array.isArray(parameters.required)) {
      for (const requiredParam of parameters.required) {
        if (!(requiredParam in args)) {
          errors.push(`Missing required parameter: ${requiredParam}`);
        }
      }
    }

    // Check parameter types if schema is available
    if (parameters.properties) {
      for (const [paramName, paramValue] of Object.entries(args)) {
        const paramSchema = parameters.properties[paramName];
        if (paramSchema) {
          // Basic type validation
          const expectedType = paramSchema.type;
          const actualType = typeof paramValue;

          if (expectedType === 'string' && actualType !== 'string') {
            errors.push(`Parameter '${paramName}' should be string, got ${actualType}`);
          } else if (expectedType === 'number' && actualType !== 'number') {
            errors.push(`Parameter '${paramName}' should be number, got ${actualType}`);
          } else if (expectedType === 'boolean' && actualType !== 'boolean') {
            errors.push(`Parameter '${paramName}' should be boolean, got ${actualType}`);
          } else if (expectedType === 'array' && !Array.isArray(paramValue)) {
            errors.push(`Parameter '${paramName}' should be array, got ${actualType}`);
          } else if (expectedType === 'object' && (actualType !== 'object' || Array.isArray(paramValue))) {
            errors.push(`Parameter '${paramName}' should be object, got ${actualType}`);
          }

          // Check enum values if specified
          if (paramSchema.enum && !paramSchema.enum.includes(paramValue)) {
            errors.push(`Parameter '${paramName}' should be one of: ${paramSchema.enum.join(', ')}`);
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get all available tools (alias for getRegisteredTools)
   */
  getAvailableTools(): string[] {
    return Array.from(this.tools.keys());
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