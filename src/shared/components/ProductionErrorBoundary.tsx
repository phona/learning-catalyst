/**
 * Production Error Boundary and Health Monitoring
 *
 * Enhanced error boundaries with recovery mechanisms, health monitoring,
 * and production-grade error reporting for the Learning Catalyst application.
 */

import React, { Component, ReactNode } from 'react';
import { performanceService } from '@/shared/services/performance-service';
import { createTypedEventEmitter } from '@/shared/utils/type-utils';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  enableRecovery?: boolean;
  enableHealthMonitoring?: boolean;
  componentName?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  recoveryAttempts: number;
  healthStatus: HealthStatus;
  errorCount: number;
}

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'critical' | 'error';
  lastCheck: number;
  errorCount: number;
  uptime: number;
  memoryUsage: number;
  performanceScore: number;
}

interface ErrorRecoveryEvent {
  componentName: string;
  error: string;
  recoveryAttempt: number;
  success: boolean;
  timestamp: number;
}

/**
 * Production Error Boundary Component
 *
 * Provides comprehensive error handling with:
 * - Automatic error recovery
 * - Health status monitoring
 * - Performance impact tracking
 * - Graceful degradation
 * - User-friendly error messages
 */
type ComponentEventKey = 'error:occurred' | 'recovery:attempted' | 'health:changed';

export class ProductionErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private readonly startTime = Date.now();
  private readonly events = createTypedEventEmitter<{
    'error:occurred': { error: Error; componentName: string; timestamp: number };
    'recovery:attempted': ErrorRecoveryEvent;
    'health:changed': HealthStatus;
  }>();

  private recoveryTimeoutId: NodeJS.Timeout | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  private readonly MAX_RECOVERY_ATTEMPTS = 3;
  private readonly RECOVERY_DELAY = 5000; // 5 seconds
  private readonly HEALTH_CHECK_INTERVAL = 30000; // 30 seconds

  constructor(props: ErrorBoundaryProps) {
    super(props);

    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      recoveryAttempts: 0,
      healthStatus: {
        status: 'healthy',
        lastCheck: Date.now(),
        errorCount: 0,
        uptime: 0,
        memoryUsage: 0,
        performanceScore: 100,
      },
      errorCount: 0,
    };

    this.startHealthMonitoring();
  }

  // ============================================================================
  // Error Handling
  // ============================================================================

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('[ErrorBoundary] Component error caught:', error, errorInfo);

    // Record performance impact
    performanceService.recordMetric('error_boundary_error', 0, {
      component: this.props.componentName || 'Unknown',
      error: error.message,
      stack: error.stack,
      errorInfo: errorInfo.componentStack,
    });

    // Update state
    this.setState((prevState) => ({
      errorInfo,
      recoveryAttempts: prevState.recoveryAttempts + 1,
      errorCount: prevState.errorCount + 1,
      healthStatus: {
        ...prevState.healthStatus,
        errorCount: prevState.healthStatus.errorCount + 1,
        status: prevState.healthStatus.errorCount >= 5 ? 'critical' : 'degraded',
      },
    }));

    // Emit error event
    this.events.emit('error:occurred', {
      error,
      componentName: this.props.componentName || 'Unknown',
      timestamp: Date.now(),
    });

    // Call custom error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Attempt automatic recovery if enabled
    if (this.props.enableRecovery && this.state.recoveryAttempts < this.MAX_RECOVERY_ATTEMPTS) {
      this.scheduleRecovery();
    }
  }

  // ============================================================================
  // Recovery Mechanisms
  // ============================================================================

  private scheduleRecovery(): void {
    if (this.recoveryTimeoutId) {
      clearTimeout(this.recoveryTimeoutId);
    }

    console.info(`[ErrorBoundary] Scheduling recovery attempt ${this.state.recoveryAttempts + 1}`);

    this.recoveryTimeoutId = setTimeout(
      () => {
        this.attemptRecovery();
      },
      this.RECOVERY_DELAY * (this.state.recoveryAttempts + 1),
    ); // Exponential backoff
  }

  private async attemptRecovery(): Promise<void> {
    const attempt = this.state.recoveryAttempts + 1;
    console.info(`[ErrorBoundary] Attempting recovery ${attempt}/${this.MAX_RECOVERY_ATTEMPTS}`);

    try {
      // Measure recovery performance
      await performanceService.measureOperation('error_recovery', async () => {
        // Clear error state to retry rendering
        this.setState({
          hasError: false,
          error: null,
          errorInfo: null,
          errorCount: 0,
          healthStatus: {
            ...this.state.healthStatus,
            errorCount: 0,
            status: 'healthy',
            lastCheck: Date.now(),
          },
        });
      });

      // Record successful recovery
      this.events.emit('recovery:attempted', {
        componentName: this.props.componentName || 'Unknown',
        error: this.state.error?.message || 'Unknown',
        recoveryAttempt: attempt,
        success: true,
        timestamp: Date.now(),
      });

      console.info(`[ErrorBoundary] Recovery attempt ${attempt} successful`);
    } catch (recoveryError) {
      console.error(`[ErrorBoundary] Recovery attempt ${attempt} failed:`, recoveryError);

      // Record failed recovery
      this.events.emit('recovery:attempted', {
        componentName: this.props.componentName || 'Unknown',
        error: this.state.error?.message || 'Unknown',
        recoveryAttempt: attempt,
        success: false,
        timestamp: Date.now(),
      });

      // If we've exhausted recovery attempts, show error state
      if (attempt >= this.MAX_RECOVERY_ATTEMPTS) {
        this.setState({
          hasError: true,
        });
      }
    }
  }

  // ============================================================================
  // Health Monitoring
  // ============================================================================

  private startHealthMonitoring(): void {
    if (!this.props.enableHealthMonitoring) return;

    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, this.HEALTH_CHECK_INTERVAL);

    // Initial health check
    this.performHealthCheck();
  }

  private performHealthCheck(): void {
    const memoryStats = performanceService.getMemoryStats();
    const healthStatus = this.calculateHealthStatus(memoryStats);

    this.setState({ healthStatus });
    this.events.emit('health:changed', healthStatus);
  }

  private calculateHealthStatus(memoryStats: any): HealthStatus {
    const uptime = Date.now() - this.startTime;
    const memoryUsage = memoryStats.percentage || 0;

    let status: HealthStatus['status'] = 'healthy';
    let performanceScore = 100;

    // Determine health status based on metrics
    if (this.state.errorCount >= 10 || memoryUsage > 90) {
      status = 'critical';
      performanceScore = 20;
    } else if (this.state.errorCount >= 5 || memoryUsage > 75) {
      status = 'degraded';
      performanceScore = 50;
    } else if (this.state.errorCount > 0 || memoryUsage > 60) {
      status = 'degraded';
      performanceScore = 75;
    }

    return {
      status,
      lastCheck: Date.now(),
      errorCount: this.state.errorCount,
      uptime,
      memoryUsage,
      performanceScore,
    };
  }

  // ============================================================================
  // Manual Recovery
  // ============================================================================

  public async manualRecovery(): Promise<void> {
    console.info('[ErrorBoundary] Manual recovery triggered');
    this.setState({ recoveryAttempts: 0 });
    await this.attemptRecovery();
  }

  public resetError(): void {
    console.info('[ErrorBoundary] Manual error reset');
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      recoveryAttempts: 0,
      errorCount: 0,
      healthStatus: {
        ...this.state.healthStatus,
        errorCount: 0,
        status: 'healthy',
        lastCheck: Date.now(),
      },
    });
  }

  // ============================================================================
  // Rendering
  // ============================================================================

  private renderErrorFallback(): ReactNode {
    const { healthStatus, recoveryAttempts } = this.state;
    const { fallback, componentName } = this.props;

    // Use custom fallback if provided
    if (fallback) {
      return fallback;
    }

    // Default error UI
    return (
      <div className="error-boundary-fallback p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <svg
              className="w-6 h-6 text-red-600 dark:text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">
              Component Error
            </h3>
            <p className="text-sm text-red-700 dark:text-red-300 mb-4">
              The component "{componentName || 'Unknown'}" encountered an error and couldn't be
              rendered.
            </p>

            {/* Health Status Display */}
            <div className="mb-4 p-3 bg-white dark:bg-gray-800 rounded border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  System Health
                </span>
                <span
                  className={`px-2 py-1 text-xs rounded-full ${
                    healthStatus.status === 'healthy'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                      : healthStatus.status === 'degraded'
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                  }`}
                >
                  {healthStatus.status.toUpperCase()}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 dark:text-gray-400">
                <div>Memory: {Math.round(healthStatus.memoryUsage)}%</div>
                <div>Errors: {healthStatus.errorCount}</div>
                <div>Uptime: {Math.round(healthStatus.uptime / 1000)}s</div>
                <div>Score: {healthStatus.performanceScore}/100</div>
              </div>
            </div>

            {/* Recovery Actions */}
            <div className="flex space-x-3">
              <button
                onClick={() => this.manualRecovery()}
                disabled={recoveryAttempts >= this.MAX_RECOVERY_ATTEMPTS}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white text-sm font-medium rounded transition-colors"
              >
                {recoveryAttempts >= this.MAX_RECOVERY_ATTEMPTS
                  ? 'Recovery Exhausted'
                  : `Retry (${recoveryAttempts}/${this.MAX_RECOVERY_ATTEMPTS})`}
              </button>
              <button
                onClick={() => this.resetError()}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium rounded transition-colors"
              >
                Reset Error
              </button>
            </div>

            {healthStatus.status === 'critical' && (
              <div className="mt-3 p-2 bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded text-sm text-yellow-800 dark:text-yellow-200">
                <strong>Warning:</strong> System is experiencing critical issues. Consider
                refreshing the page.
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return this.renderErrorFallback();
    }

    return this.props.children;
  }

  // ============================================================================
  // Cleanup
  // ============================================================================

  componentWillUnmount(): void {
    if (this.recoveryTimeoutId) {
      clearTimeout(this.recoveryTimeoutId);
    }

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
  }

  // ============================================================================
  // Event API
  // ============================================================================

  on<TKey extends ComponentEventKey>(
    event: TKey,
    listener: Parameters<typeof this.events.on<TKey>>[1],
  ): void {
    this.events.on(event as any, listener);
  }

  off<TKey extends ComponentEventKey>(
    event: TKey,
    listener: Parameters<typeof this.events.off<TKey>>[1],
  ): void {
    this.events.off(event as any, listener);
  }
}

// ============================================================================
// Global Health Monitor
// ============================================================================

/**
 * Global health monitoring service for the entire application
 */
export class GlobalHealthMonitor {
  private readonly healthData = new Map<string, HealthStatus>();
  private static readonly globalEventKeys = ['global:health:changed', 'global:health:critical'] as const;
  private readonly events = createTypedEventEmitter<{
    'global:health:changed': { component: string; status: HealthStatus };
    'global:health:critical': { component: string; status: HealthStatus };
  }>();

  registerComponent(componentName: string): void {
    this.healthData.set(componentName, {
      status: 'healthy',
      lastCheck: Date.now(),
      errorCount: 0,
      uptime: 0,
      memoryUsage: 0,
      performanceScore: 100,
    });
  }

  updateComponentHealth(componentName: string, status: Partial<HealthStatus>): void {
    const current = this.healthData.get(componentName);
    if (!current) return;

    const updated = { ...current, ...status };
    this.healthData.set(componentName, updated);

    // Emit events
    this.events.emit('global:health:changed', { component: componentName, status: updated });

    if (updated.status === 'critical') {
      this.events.emit('global:health:critical', { component: componentName, status: updated });
    }
  }

  getGlobalHealth(): {
    overall: HealthStatus['status'];
    components: Map<string, HealthStatus>;
    summary: {
      total: number;
      healthy: number;
      degraded: number;
      critical: number;
      error: number;
    };
  } {
    const components = this.healthData;
    const summary = {
      total: components.size,
      healthy: 0,
      degraded: 0,
      critical: 0,
      error: 0,
    };

    components.forEach((status) => {
      switch (status.status) {
        case 'healthy':
          summary.healthy++;
          break;
        case 'degraded':
          summary.degraded++;
          break;
        case 'critical':
          summary.critical++;
          break;
        case 'error':
          summary.error++;
          break;
      }
    });

    let overall: HealthStatus['status'] = 'healthy';
    if (summary.critical > 0) overall = 'critical';
    else if (summary.error > 0) overall = 'error';
    else if (summary.degraded > 0) overall = 'degraded';

    return { overall, components, summary };
  }

  on<TKey extends (typeof GlobalHealthMonitor.globalEventKeys)[number]>(
    event: TKey,
    listener: Parameters<typeof this.events.on<TKey>>[1],
  ): void {
    this.events.on(event as any, listener);
  }

  off<TKey extends (typeof GlobalHealthMonitor.globalEventKeys)[number]>(
    event: TKey,
    listener: Parameters<typeof this.events.off<TKey>>[1],
  ): void {
    this.events.off(event as any, listener);
  }
}

export const createGlobalHealthMonitor = (): GlobalHealthMonitor => new GlobalHealthMonitor();
