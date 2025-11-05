/**
 * Secure Tool Executor
 *
 * Provides secure tool execution with sandboxing, permission management,
 * and comprehensive security controls integrated with the ToolSandboxSecurityManager.
 */

import {
  ToolSandboxSecurityManager,
  SecurityLevel,
  PermissionType,
  ToolExecutionContext,
  SecureToolExecutionResult,
  securityManager
} from './tool-sandbox-security-manager';
import { ToolExecutorService, BuiltinTools } from '../tool-executor';
import { ServiceDependencies } from '../types';
import { EventEmitter } from 'events';

/**
 * Secure tool execution request
 */
export interface SecureToolExecutionRequest {
  toolId: string;
  operation: string;
  parameters: Record<string, any>;
  agentId: string;
  sessionId?: string;
  userId?: string;
  securityLevel?: SecurityLevel;
  permissions?: PermissionType[];
  timeout?: number;
  metadata?: Record<string, any>;
}

/**
 * Tool security profile
 */
export interface ToolSecurityProfile {
  toolId: string;
  requiredPermissions: PermissionType[];
  securityLevel: SecurityLevel;
  allowedParameters: string[];
  restrictedParameters: string[];
  parameterValidators: Record<string, (value: any) => boolean>;
  requiresAuthentication: boolean;
  auditLevel: 'minimal' | 'standard' | 'detailed';
}

/**
 * Secure Tool Executor
 *
 * Wraps tool execution with comprehensive security controls including:
 * - Permission validation
 * - Parameter sanitization
 * - Execution sandboxing
 * - Resource monitoring
 * - Comprehensive audit logging
 */
export class SecureToolExecutor extends EventEmitter {
  private toolExecutor: ToolExecutorService;
  private securityManager: ToolSandboxSecurityManager;
  private dependencies: ServiceDependencies;
  private securityProfiles: Map<string, ToolSecurityProfile> = new Map();

  constructor(dependencies: ServiceDependencies, toolExecutor?: ToolExecutorService) {
    super();
    this.dependencies = dependencies;
    this.securityManager = securityManager;
    this.toolExecutor = toolExecutor || new ToolExecutorService(dependencies);

    // Initialize tool security profiles
    this.initializeSecurityProfiles();

    this.dependencies.logger.info('SecureToolExecutor initialized');
  }

  /**
   * Execute tool with security controls
   */
  async executeSecureTool(request: SecureToolExecutionRequest): Promise<SecureToolExecutionResult> {
    try {
      // Get tool security profile
      const securityProfile = this.getSecurityProfile(request.toolId);
      if (!securityProfile) {
        throw new Error(`No security profile found for tool: ${request.toolId}`);
      }

      // Determine security level
      const securityLevel = request.securityLevel || securityProfile.securityLevel;

      // Determine required permissions
      const requiredPermissions = new Set([
        ...securityProfile.requiredPermissions,
        ...(request.permissions || [])
      ]);

      // Create secure execution context
      const context = this.securityManager.createExecutionContext(
        request.agentId,
        request.toolId,
        securityLevel,
        {
          sessionId: request.sessionId,
          userId: request.userId,
          permissions: Array.from(requiredPermissions),
          timeout: request.timeout,
          metadata: request.metadata
        }
      );

      // Validate request against security profile
      const validationResult = this.validateToolRequest(request, securityProfile, context);
      if (!validationResult.valid) {
        throw new Error(`Security validation failed: ${validationResult.errors.join(', ')}`);
      }

      // Execute tool within security sandbox
      const result = await this.securityManager.executeInSandbox(
        context,
        () => this.executeToolWithValidation(request, context),
        {
          isolated: securityLevel === SecurityLevel.SANDBOXED,
          restrictedFileSystem: securityLevel !== SecurityLevel.ELEVATED,
          networkIsolation: !requiredPermissions.has(PermissionType.NETWORK_ACCESS),
          memoryLimit: this.getMemoryLimit(securityLevel),
          cpuLimit: this.getCpuLimit(securityLevel),
          tempDirectory: './temp/sandbox',
          allowEnvironmentAccess: securityLevel === SecurityLevel.ELEVATED,
          allowSystemCalls: false,
          allowedSystemCalls: ['read', 'write', 'open', 'close']
        }
      );

      // Log successful execution
      this.dependencies.logger.info(`Secure tool execution completed`, {
        toolId: request.toolId,
        agentId: request.agentId,
        executionTime: result.executionTime,
        violations: result.violations.length
      });

      // Emit security event
      this.emit('tool_executed', {
        toolId: request.toolId,
        agentId: request.agentId,
        success: result.success,
        violations: result.violations.length,
        executionTime: result.executionTime
      });

      return result;

    } catch (error) {
      this.dependencies.logger.error(`Secure tool execution failed`, error as Error, {
        toolId: request.toolId,
        agentId: request.agentId
      });

      // Emit security event for failure
      this.emit('tool_execution_failed', {
        toolId: request.toolId,
        agentId: request.agentId,
        error: (error as Error).message
      });

      throw error;
    }
  }

  /**
   * Execute multiple tools securely in parallel
   */
  async executeSecureToolsParallel(
    requests: SecureToolExecutionRequest[]
  ): Promise<SecureToolExecutionResult[]> {
    this.dependencies.logger.info(`Executing ${requests.length} tools securely in parallel`);

    const promises = requests.map(request => this.executeSecureTool(request));
    const results = await Promise.allSettled(promises);

    return results.map(result => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        // Create error result for failed execution
        return {
          success: false,
          error: result.reason as Error,
          executionTime: 0,
          securityContext: {
            executionId: 'unknown',
            agentId: 'unknown',
            securityLevel: SecurityLevel.RESTRICTED,
            permissions: new Set(),
            startTime: Date.now()
          },
          violations: [],
          auditLog: {} as any,
          resourceUsage: {
            memoryUsed: 0,
            cpuTime: 0,
            networkRequests: 0,
            fileOperations: 0
          }
        } as SecureToolExecutionResult;
      }
    });
  }

  /**
   * Get tool security profile
   */
  getSecurityProfile(toolId: string): ToolSecurityProfile | undefined {
    return this.securityProfiles.get(toolId);
  }

  /**
   * Register custom tool security profile
   */
  registerSecurityProfile(profile: ToolSecurityProfile): void {
    this.securityProfiles.set(profile.toolId, profile);
    this.dependencies.logger.info(`Registered security profile for tool: ${profile.toolId}`);
  }

  /**
   * Get all available tools with their security profiles
   */
  getAvailableToolsWithSecurity(): Array<{ toolId: string; name: string; securityProfile: ToolSecurityProfile }> {
    const tools = this.toolExecutor.getRegisteredTools();
    return tools.map(tool => ({
      toolId: tool.id,
      name: tool.name,
      securityProfile: this.securityProfiles.get(tool.id) || this.createDefaultSecurityProfile(tool.id)
    }));
  }

  /**
   * Get security statistics
   */
  getSecurityStatistics(): {
    totalTools: number;
    securedTools: number;
    activeExecutions: number;
    totalViolations: number;
    violationsByType: Record<string, number>;
    recentSecurityEvents: any[];
  } {
    const totalTools = this.toolExecutor.getRegisteredTools().length;
    const securedTools = this.securityProfiles.size;
    const securityStats = this.securityManager.getSecurityStats();

    return {
      totalTools,
      securedTools,
      activeExecutions: securityStats.activeExecutions,
      totalViolations: Object.values(securityStats.violationsBySeverity).reduce((sum, count) => sum + count, 0),
      violationsByType: securityStats.violationsBySeverity,
      recentSecurityEvents: securityStats.topViolations
    };
  }

  /**
   * Validate tool request against security profile
   */
  private validateToolRequest(
    request: SecureToolExecutionRequest,
    profile: ToolSecurityProfile,
    context: ToolExecutionContext
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check required permissions
    for (const permission of profile.requiredPermissions) {
      if (!context.permissions.has(permission)) {
        errors.push(`Missing required permission: ${permission}`);
      }
    }

    // Check authentication requirement
    if (profile.requiresAuthentication && !context.userId) {
      errors.push('Tool requires authentication but no user ID provided');
    }

    // Validate parameters
    for (const [paramName, paramValue] of Object.entries(request.parameters)) {
      // Check restricted parameters
      if (profile.restrictedParameters.includes(paramName)) {
        errors.push(`Parameter '${paramName}' is restricted for this tool`);
        continue;
      }

      // Validate parameter if validator exists
      const validator = profile.parameterValidators[paramName];
      if (validator && !validator(paramValue)) {
        errors.push(`Parameter '${paramName}' failed validation`);
      }
    }

    // Additional security checks based on security level
    if (context.securityLevel === SecurityLevel.RESTRICTED) {
      // Additional checks for restricted level
      if (Object.keys(request.parameters).length > 5) {
        errors.push('Too many parameters for restricted security level');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Execute tool with additional validation
   */
  private async executeToolWithValidation(
    request: SecureToolExecutionRequest,
    context: ToolExecutionContext
  ): Promise<any> {
    // Additional runtime validation can be performed here
    const securityProfile = this.getSecurityProfile(request.toolId)!;

    // Log execution attempt
    this.dependencies.logger.debug(`Executing tool with security validation`, {
      toolId: request.toolId,
      agentId: request.agentId,
      securityLevel: context.securityLevel,
      operation: request.operation
    });

    // Validate file paths if file operation
    if (request.operation.includes('file') || request.toolId.includes('file')) {
      const filePath = request.parameters.path;
      if (filePath) {
        const violations = this.securityManager.validatePathAccess(filePath, context);
        if (violations.length > 0) {
          throw new Error(`File access validation failed: ${violations.map(v => v.description).join(', ')}`);
        }
      }
    }

    // Execute the actual tool
    const result = await this.toolExecutor.executeTool({
      toolId: request.toolId,
      operation: request.operation,
      parameters: request.parameters,
      context: {
        agentId: request.agentId,
        sessionId: request.sessionId,
        securityLevel: context.securityLevel,
        permissions: Array.from(context.permissions)
      }
    });

    return result;
  }

  /**
   * Initialize default security profiles for built-in tools
   */
  private initializeSecurityProfiles(): void {
    // Database Query Tool
    this.securityProfiles.set('database-query', {
      toolId: 'database-query',
      requiredPermissions: [PermissionType.DATABASE_READ, PermissionType.DATABASE_WRITE],
      securityLevel: SecurityLevel.STANDARD,
      allowedParameters: ['query', 'params', 'operation'],
      restrictedParameters: [],
      parameterValidators: {
        query: (value: string) => typeof value === 'string' && value.length > 0,
        operation: (value: string) => ['select', 'insert', 'update', 'delete'].includes(value.toLowerCase()),
        params: (value: any) => Array.isArray(value)
      },
      requiresAuthentication: false,
      auditLevel: 'detailed'
    });

    // File Read Tool
    this.securityProfiles.set('file-read', {
      toolId: 'file-read',
      requiredPermissions: [PermissionType.FILE_READ],
      securityLevel: SecurityLevel.STANDARD,
      allowedParameters: ['path', 'encoding'],
      restrictedParameters: [],
      parameterValidators: {
        path: (value: string) => typeof value === 'string' && value.length > 0,
        encoding: (value: string) => typeof value === 'string' && ['utf-8', 'ascii', 'base64'].includes(value)
      },
      requiresAuthentication: false,
      auditLevel: 'standard'
    });

    // File Write Tool
    this.securityProfiles.set('file-write', {
      toolId: 'file-write',
      requiredPermissions: [PermissionType.FILE_WRITE],
      securityLevel: SecurityLevel.ELEVATED,
      allowedParameters: ['path', 'content', 'encoding'],
      restrictedParameters: [],
      parameterValidators: {
        path: (value: string) => typeof value === 'string' && value.length > 0,
        content: (value: string) => typeof value === 'string',
        encoding: (value: string) => typeof value === 'string' && ['utf-8', 'ascii', 'base64'].includes(value)
      },
      requiresAuthentication: true,
      auditLevel: 'detailed'
    });

    // List Concepts Tool
    this.securityProfiles.set('list-concepts', {
      toolId: 'list-concepts',
      requiredPermissions: [PermissionType.DATABASE_READ],
      securityLevel: SecurityLevel.RESTRICTED,
      allowedParameters: ['limit', 'offset', 'difficulty', 'type'],
      restrictedParameters: [],
      parameterValidators: {
        limit: (value: number) => typeof value === 'number' && value > 0 && value <= 1000,
        offset: (value: number) => typeof value === 'number' && value >= 0,
        difficulty: (value: string) => ['beginner', 'intermediate', 'advanced'].includes(value),
        type: (value: string) => typeof value === 'string'
      },
      requiresAuthentication: false,
      auditLevel: 'minimal'
    });

    this.dependencies.logger.info(`Initialized ${this.securityProfiles.size} tool security profiles`);
  }

  /**
   * Create default security profile for tool
   */
  private createDefaultSecurityProfile(toolId: string): ToolSecurityProfile {
    return {
      toolId,
      requiredPermissions: [PermissionType.DATABASE_READ],
      securityLevel: SecurityLevel.STANDARD,
      allowedParameters: [],
      restrictedParameters: ['password', 'token', 'secret', 'key'],
      parameterValidators: {},
      requiresAuthentication: false,
      auditLevel: 'standard'
    };
  }

  /**
   * Get memory limit based on security level
   */
  private getMemoryLimit(securityLevel: SecurityLevel): number {
    switch (securityLevel) {
      case SecurityLevel.RESTRICTED: return 64; // 64MB
      case SecurityLevel.STANDARD: return 128; // 128MB
      case SecurityLevel.ELEVATED: return 256; // 256MB
      case SecurityLevel.SANDBOXED: return 512; // 512MB
      default: return 128;
    }
  }

  /**
   * Get CPU limit based on security level
   */
  private getCpuLimit(securityLevel: SecurityLevel): number {
    switch (securityLevel) {
      case SecurityLevel.RESTRICTED: return 10; // 10% CPU
      case SecurityLevel.STANDARD: return 25; // 25% CPU
      case SecurityLevel.ELEVATED: return 50; // 50% CPU
      case SecurityLevel.SANDBOXED: return 75; // 75% CPU
      default: return 25;
    }
  }

  /**
   * Dispose of secure tool executor
   */
  dispose(): void {
    this.removeAllListeners();
    this.securityProfiles.clear();
    this.dependencies.logger.info('SecureToolExecutor disposed');
  }
}