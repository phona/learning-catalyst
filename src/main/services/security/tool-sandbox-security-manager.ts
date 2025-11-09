/**
 * Tool Sandbox Security Manager
 *
 * Provides secure tool execution environment with sandboxing,
 * permission management, and comprehensive security controls for
 * agent tool execution in educational workflows.
 */

import { AsyncLocalStorage } from 'async_hooks';
import { randomUUID } from 'crypto';
import { EventEmitter } from 'events';
import path from 'node:path';

/**
 * Security levels for tool execution
 */
export enum SecurityLevel {
  RESTRICTED = 'restricted',     // No external access, read-only local data
  STANDARD = 'standard',         // Controlled external access with validation
  ELEVATED = 'elevated',        // Full access with audit logging
  SANDBOXED = 'sandboxed'        // Isolated execution environment
}

/**
 * Permission types for tool access control
 */
export enum PermissionType {
  FILE_READ = 'file.read',
  FILE_WRITE = 'file.write',
  DATABASE_READ = 'database.read',
  DATABASE_WRITE = 'database.write',
  NETWORK_ACCESS = 'network.access',
  SYSTEM_COMMAND = 'system.command',
  ENVIRONMENT_ACCESS = 'environment.access'
}

/**
 * Tool execution context with security metadata
 */
export interface ToolExecutionContext {
  executionId: string;
  agentId: string;
  sessionId?: string;
  userId?: string;
  securityLevel: SecurityLevel;
  permissions: Set<PermissionType>;
  startTime: number;
  timeout?: number;
  metadata: Record<string, any>;
}

/**
 * Security policy for tool execution
 */
export interface SecurityPolicy {
  allowedPaths: string[];
  deniedPaths: string[];
  maxExecutionTime: number;
  maxMemoryUsage: number;
  allowedNetworkHosts: string[];
  deniedNetworkHosts: string[];
  allowedCommands: string[];
  deniedCommands: string[];
  environmentVariables: Record<string, string>;
  requiresAuthentication: boolean;
  auditLogRetention: number; // days
}

/**
 * Sandbox configuration for tool execution
 */
export interface SandboxConfig {
  isolated: boolean;
  restrictedFileSystem: boolean;
  networkIsolation: boolean;
  memoryLimit: number; // MB
  cpuLimit: number; // percentage
  tempDirectory: string;
  allowEnvironmentAccess: boolean;
  allowSystemCalls: boolean;
  allowedSystemCalls: string[];
}

/**
 * Audit log entry for tool execution
 */
export interface AuditLogEntry {
  executionId: string;
  timestamp: number;
  agentId: string;
  sessionId?: string;
  toolId: string;
  operation: string;
  parameters: Record<string, any>;
  securityLevel: SecurityLevel;
  permissions: PermissionType[];
  executionTime: number;
  success: boolean;
  error?: string;
  resourceUsage: {
    memoryUsed: number;
    cpuTime: number;
    networkRequests: number;
    fileOperations: number;
  };
  violations: SecurityViolation[];
}

/**
 * Security violation detected during execution
 */
export interface SecurityViolation {
  type: 'path_access' | 'network_access' | 'resource_limit' | 'permission_denied' | 'timeout';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  details: Record<string, any>;
  timestamp: number;
}

/**
 * Tool execution result with security metadata
 */
export interface SecureToolExecutionResult {
  success: boolean;
  data?: any;
  error?: Error;
  executionTime: number;
  securityContext: ToolExecutionContext;
  violations: SecurityViolation[];
  auditLog: AuditLogEntry;
  resourceUsage: {
    memoryUsed: number;
    cpuTime: number;
    networkRequests: number;
    fileOperations: number;
  };
}

/**
 * Tool Sandbox Security Manager
 *
 * Provides comprehensive security controls for agent tool execution including:
 * - Permission-based access control
 * - Path validation and sandboxing
 * - Resource usage monitoring
 * - Security violation detection
 * - Comprehensive audit logging
 */
export class ToolSandboxSecurityManager extends EventEmitter {
  private auditLogs: Map<string, AuditLogEntry[]> = new Map();
  private activeExecutions: Map<string, ToolExecutionContext> = new Map();
  private securityPolicies: Map<string, SecurityPolicy> = new Map();
  private als: AsyncLocalStorage<ToolExecutionContext>;

  // Default security policies
  private readonly defaultSecurityPolicy: SecurityPolicy = {
    allowedPaths: [
      process.cwd(),
      './temp',
      './workspace',
      './data'
    ],
    deniedPaths: [
      '/etc',
      '/usr/bin',
      '/bin',
      '/sbin',
      'C:\\Windows\\System32',
      'C:\\Program Files'
    ],
    maxExecutionTime: 30000, // 30 seconds
    maxMemoryUsage: 512, // 512MB
    allowedNetworkHosts: [
      'api.openai.com',
      'api.anthropic.com',
      'api.deepseek.com',
      'localhost',
      '127.0.0.1'
    ],
    deniedNetworkHosts: [],
    allowedCommands: [
      'node',
      'python',
      'python3',
      'dir',
      'ls',
      'cat',
      'head',
      'tail'
    ],
    deniedCommands: [
      'rm',
      'rmdir',
      'del',
      'format',
      'shutdown',
      'reboot',
      'sudo',
      'su'
    ],
    environmentVariables: {
      'NODE_ENV': 'production',
      'LANG': 'en_US.UTF-8'
    },
    requiresAuthentication: false,
    auditLogRetention: 30 // days
  };

  private readonly defaultSandboxConfig: SandboxConfig = {
    isolated: true,
    restrictedFileSystem: true,
    networkIsolation: false,
    memoryLimit: 256, // 256MB
    cpuLimit: 50, // 50% CPU
    tempDirectory: './temp/sandbox',
    allowEnvironmentAccess: false,
    allowSystemCalls: false,
    allowedSystemCalls: ['read', 'write', 'open', 'close']
  };

  constructor() {
    super();
    this.als = new AsyncLocalStorage();

    // Initialize default security policy
    this.securityPolicies.set('default', this.defaultSecurityPolicy);

    // Start audit log cleanup
    this.startAuditLogCleanup();

    console.log('✅ ToolSandboxSecurityManager initialized');
  }

  /**
   * Create secure execution context for tool execution
   */
  createExecutionContext(
    agentId: string,
    toolId: string,
    securityLevel: SecurityLevel = SecurityLevel.STANDARD,
    options: {
      sessionId?: string;
      userId?: string;
      permissions?: PermissionType[];
      timeout?: number;
      metadata?: Record<string, any>;
    } = {}
  ): ToolExecutionContext {
    const executionId = randomUUID();
    const permissions = new Set(options.permissions || this.getDefaultPermissions(securityLevel));

    const context: ToolExecutionContext = {
      executionId,
      agentId,
      sessionId: options.sessionId,
      userId: options.userId,
      securityLevel,
      permissions,
      startTime: Date.now(),
      timeout: options.timeout || this.defaultSecurityPolicy.maxExecutionTime,
      metadata: {
        toolId,
        ...options.metadata
      }
    };

    // Register active execution
    this.activeExecutions.set(executionId, context);

    // Log execution start
    this.logSecurityEvent('execution_started', {
      executionId,
      agentId,
      toolId,
      securityLevel,
      permissions: Array.from(permissions)
    });

    return context;
  }

  /**
   * Execute tool function within secure sandbox
   */
  async executeInSandbox<T>(
    context: ToolExecutionContext,
    toolFunction: () => Promise<T> | T,
    sandboxConfig?: Partial<SandboxConfig>
  ): Promise<SecureToolExecutionResult> {
    const startTime = Date.now();
    const violations: SecurityViolation[] = [];
    let auditEntry: AuditLogEntry;

    try {
      // Validate execution context
      await this.validateExecutionContext(context);

      // Get merged sandbox configuration
      const config = { ...this.defaultSandboxConfig, ...sandboxConfig };

      // Execute with timeout and resource monitoring
      const result = await this.executeWithMonitoring(
        context,
        toolFunction,
        config,
        violations
      );

      const executionTime = Date.now() - startTime;

      // Create audit log entry
      auditEntry = this.createAuditLogEntry({
        context,
        operation: 'tool_execution',
        parameters: {},
        success: true,
        executionTime,
        violations,
        resourceUsage: {
          memoryUsed: 0, // Would be populated by monitoring
          cpuTime: 0,
          networkRequests: 0,
          fileOperations: 0
        }
      });

      // Store audit log
      this.storeAuditLogEntry(context.agentId, auditEntry);

      // Emit security event
      this.emit('tool_executed', auditEntry);

      return {
        success: true,
        data: result,
        executionTime,
        securityContext: context,
        violations,
        auditLog: auditEntry,
        resourceUsage: auditEntry.resourceUsage
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;

      // Create failure audit entry
      auditEntry = this.createAuditLogEntry({
        context,
        operation: 'tool_execution',
        parameters: {},
        success: false,
        executionTime,
        violations,
        error: (error as Error).message,
        resourceUsage: {
          memoryUsed: 0,
          cpuTime: 0,
          networkRequests: 0,
          fileOperations: 0
        }
      });

      this.storeAuditLogEntry(context.agentId, auditEntry);
      this.emit('tool_execution_failed', auditEntry);

      return {
        success: false,
        error: error as Error,
        executionTime,
        securityContext: context,
        violations,
        auditLog: auditEntry,
        resourceUsage: auditEntry.resourceUsage
      };
    } finally {
      // Cleanup active execution
      this.activeExecutions.delete(context.executionId);
    }
  }

  /**
   * Validate file path access
   */
  validatePathAccess(path: string, context: ToolExecutionContext): SecurityViolation[] {
    const violations: SecurityViolation[] = [];
    const policy = this.getSecurityPolicy(context.securityLevel);

    // Normalize path
    const normalizedPath = path.resolve(path);

    // Check denied paths
    for (const deniedPath of policy.deniedPaths) {
      if (normalizedPath.startsWith(path.resolve(deniedPath))) {
        violations.push({
          type: 'path_access',
          severity: 'critical',
          description: `Access denied to restricted path: ${path}`,
          details: { path, normalizedPath, deniedPath },
          timestamp: Date.now()
        });
      }
    }

    // Check if path is in allowed paths
    const isAllowed = policy.allowedPaths.some(allowedPath =>
      normalizedPath.startsWith(path.resolve(allowedPath))
    );

    if (!isAllowed) {
      violations.push({
        type: 'path_access',
        severity: 'high',
        description: `Path not in allowed list: ${path}`,
        details: { path, normalizedPath, allowedPaths: policy.allowedPaths },
        timestamp: Date.now()
      });
    }

    return violations;
  }

  /**
   * Validate network access
   */
  validateNetworkAccess(hostname: string, context: ToolExecutionContext): SecurityViolation[] {
    const violations: SecurityViolation[] = [];
    const policy = this.getSecurityPolicy(context.securityLevel);

    // Check denied hosts
    if (policy.deniedNetworkHosts.includes(hostname)) {
      violations.push({
        type: 'network_access',
        severity: 'critical',
        description: `Access denied to restricted host: ${hostname}`,
        details: { hostname },
        timestamp: Date.now()
      });
    }

    // Check if host is in allowed hosts
    if (policy.allowedNetworkHosts.length > 0 && !policy.allowedNetworkHosts.includes(hostname)) {
      violations.push({
        type: 'network_access',
        severity: 'medium',
        description: `Host not in allowed list: ${hostname}`,
        details: { hostname, allowedHosts: policy.allowedNetworkHosts },
        timestamp: Date.now()
      });
    }

    return violations;
  }

  /**
   * Check if context has required permission
   */
  hasPermission(context: ToolExecutionContext, permission: PermissionType): boolean {
    return context.permissions.has(permission);
  }

  /**
   * Grant permission to execution context
   */
  grantPermission(context: ToolExecutionContext, permission: PermissionType): void {
    context.permissions.add(permission);
  }

  /**
   * Revoke permission from execution context
   */
  revokePermission(context: ToolExecutionContext, permission: PermissionType): void {
    context.permissions.delete(permission);
  }

  /**
   * Get audit logs for agent
   */
  getAuditLogs(agentId: string, limit?: number): AuditLogEntry[] {
    const logs = this.auditLogs.get(agentId) || [];
    return limit ? logs.slice(-limit) : logs;
  }

  /**
   * Get security violations for agent
   */
  getSecurityViolations(agentId: string, severity?: SecurityViolation['severity']): SecurityViolation[] {
    const logs = this.getAuditLogs(agentId);
    const violations = logs.flatMap(log => log.violations);

    if (severity) {
      return violations.filter(v => v.severity === severity);
    }

    return violations;
  }

  /**
   * Get active executions
   */
  getActiveExecutions(): ToolExecutionContext[] {
    return Array.from(this.activeExecutions.values());
  }

  /**
   * Terminate execution by ID
   */
  terminateExecution(executionId: string): boolean {
    const context = this.activeExecutions.get(executionId);
    if (context) {
      this.activeExecutions.delete(executionId);
      this.logSecurityEvent('execution_terminated', { executionId, agentId: context.agentId });
      return true;
    }
    return false;
  }

  /**
   * Get default permissions for security level
   */
  private getDefaultPermissions(securityLevel: SecurityLevel): PermissionType[] {
    switch (securityLevel) {
      case SecurityLevel.RESTRICTED:
        return [PermissionType.DATABASE_READ];

      case SecurityLevel.STANDARD:
        return [
          PermissionType.FILE_READ,
          PermissionType.DATABASE_READ,
          PermissionType.DATABASE_WRITE
        ];

      case SecurityLevel.ELEVATED:
        return [
          PermissionType.FILE_READ,
          PermissionType.FILE_WRITE,
          PermissionType.DATABASE_READ,
          PermissionType.DATABASE_WRITE,
          PermissionType.NETWORK_ACCESS
        ];

      case SecurityLevel.SANDBOXED:
        return [
          PermissionType.FILE_READ,
          PermissionType.FILE_WRITE,
          PermissionType.DATABASE_READ,
          PermissionType.DATABASE_WRITE
        ];

      default:
        return [];
    }
  }

  /**
   * Validate execution context
   */
  private async validateExecutionContext(context: ToolExecutionContext): Promise<void> {
    // Check if execution is still active
    if (!this.activeExecutions.has(context.executionId)) {
      throw new Error('Execution context not found or expired');
    }

    // Check timeout
    if (Date.now() - context.startTime > (context.timeout || 30000)) {
      throw new Error('Execution timeout exceeded');
    }

    // Validate security level
    if (!Object.values(SecurityLevel).includes(context.securityLevel)) {
      throw new Error(`Invalid security level: ${context.securityLevel}`);
    }
  }

  /**
   * Execute function with monitoring
   */
  private async executeWithMonitoring<T>(
    context: ToolExecutionContext,
    toolFunction: () => Promise<T> | T,
    sandboxConfig: SandboxConfig,
    violations: SecurityViolation[]
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        violations.push({
          type: 'timeout',
          severity: 'high',
          description: 'Tool execution timeout',
          details: { timeout: context.timeout },
          timestamp: Date.now()
        });
        reject(new Error('Tool execution timeout'));
      }, context.timeout);

      // Execute function within AsyncLocalStorage context
      this.als.run(context, async () => {
        try {
          const result = await toolFunction();
          clearTimeout(timeout);
          resolve(result);
        } catch (error) {
          clearTimeout(timeout);
          reject(error);
        }
      });
    });
  }

  /**
   * Get security policy for level
   */
  private getSecurityPolicy(securityLevel: SecurityLevel): SecurityPolicy {
    return this.securityPolicies.get(securityLevel.toString()) || this.defaultSecurityPolicy;
  }

  /**
   * Create audit log entry
   */
  private createAuditLogEntry(params: {
    context: ToolExecutionContext;
    operation: string;
    parameters: Record<string, any>;
    success: boolean;
    executionTime: number;
    violations: SecurityViolation[];
    error?: string;
    resourceUsage: AuditLogEntry['resourceUsage'];
  }): AuditLogEntry {
    return {
      executionId: params.context.executionId,
      timestamp: Date.now(),
      agentId: params.context.agentId,
      sessionId: params.context.sessionId,
      toolId: params.context.metadata?.toolId || 'unknown',
      operation: params.operation,
      parameters: params.parameters,
      securityLevel: params.context.securityLevel,
      permissions: Array.from(params.context.permissions),
      executionTime: params.executionTime,
      success: params.success,
      error: params.error,
      resourceUsage: params.resourceUsage,
      violations: params.violations
    };
  }

  /**
   * Store audit log entry
   */
  private storeAuditLogEntry(agentId: string, entry: AuditLogEntry): void {
    if (!this.auditLogs.has(agentId)) {
      this.auditLogs.set(agentId, []);
    }

    const logs = this.auditLogs.get(agentId)!;
    logs.push(entry);

    // Keep only recent logs (based on retention policy)
    const retentionTime = this.defaultSecurityPolicy.auditLogRetention * 24 * 60 * 60 * 1000;
    const cutoffTime = Date.now() - retentionTime;

    const filteredLogs = logs.filter(log => log.timestamp > cutoffTime);
    this.auditLogs.set(agentId, filteredLogs);
  }

  /**
   * Log security event
   */
  private logSecurityEvent(event: string, data: any): void {
    console.log(`[Security Event] ${event}:`, data);
    this.emit('security_event', { event, data, timestamp: Date.now() });
  }

  /**
   * Start audit log cleanup
   */
  private startAuditLogCleanup(): void {
    // Run cleanup every hour
    setInterval(() => {
      const retentionTime = this.defaultSecurityPolicy.auditLogRetention * 24 * 60 * 60 * 1000;
      const cutoffTime = Date.now() - retentionTime;

      for (const [agentId, logs] of this.auditLogs.entries()) {
        const filteredLogs = logs.filter(log => log.timestamp > cutoffTime);
        if (filteredLogs.length !== logs.length) {
          this.auditLogs.set(agentId, filteredLogs);
          this.logSecurityEvent('audit_cleanup', {
            agentId,
            removedCount: logs.length - filteredLogs.length
          });
        }
      }
    }, 60 * 60 * 1000); // 1 hour
  }

  /**
   * Get security statistics
   */
  getSecurityStats(): {
    activeExecutions: number;
    totalAuditLogs: number;
    violationsBySeverity: Record<string, number>;
    topViolations: SecurityViolation[];
  } {
    const activeExecutions = this.activeExecutions.size;
    const totalAuditLogs = Array.from(this.auditLogs.values()).reduce((sum, logs) => sum + logs.length, 0);

    const violationsBySeverity: Record<string, number> = {};
    const allViolations: SecurityViolation[] = [];

    for (const logs of this.auditLogs.values()) {
      for (const log of logs) {
        for (const violation of log.violations) {
          allViolations.push(violation);
          violationsBySeverity[violation.severity] = (violationsBySeverity[violation.severity] || 0) + 1;
        }
      }
    }

    // Sort violations by timestamp and get recent ones
    const topViolations = allViolations
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 10);

    return {
      activeExecutions,
      totalAuditLogs,
      violationsBySeverity,
      topViolations
    };
  }

  /**
   * Dispose of security manager
   */
  dispose(): void {
    // Clear active executions
    for (const executionId of this.activeExecutions.keys()) {
      this.terminateExecution(executionId);
    }

    // Clear audit logs
    this.auditLogs.clear();

    // Remove all listeners
    this.removeAllListeners();

    console.log('✅ ToolSandboxSecurityManager disposed');
  }
}

/**
 * Global security manager instance
 */
export const securityManager = new ToolSandboxSecurityManager();