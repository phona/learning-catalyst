/**
 * Service Enhancement Utilities - Phase 2 Architecture Refactoring
 *
 * Provides enhanced service container functionality without breaking existing patterns:
 * - Service lifecycle management
 * - Health monitoring
 * - Dependency validation
 * - Service composition
 */

import { ServiceContainer } from './service-container';

export interface ServiceLifecycle {
  initialize?(): Promise<void>;
  dispose?(): Promise<void>;
  healthCheck?(): Promise<boolean>;
}

export interface ServiceHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  lastCheck: Date;
  error?: string;
}

export interface ServiceMetadata {
  name: string;
  singleton: boolean;
  dependsOn?: string[];
  priority?: number;
  lifecycle?: ServiceLifecycle;
}

/**
 * Service Enhancement Wrapper - adds lifecycle and health monitoring to existing container
 */
export class ServiceEnhancer {
  private readonly container: ServiceContainer;
  private readonly metadata = new Map<string, ServiceMetadata>();
  private readonly initialized = new Set<string>();
  private readonly healthStatus = new Map<string, ServiceHealth>();
  private healthCheckInterval?: NodeJS.Timeout;

  constructor(container: ServiceContainer) {
    this.container = container;
    this.startHealthMonitoring();
  }

  /**
   * Register a service with enhanced metadata
   */
  register<K extends string>(
    name: K,
    factory: ((container: ServiceContainer) => any) | (() => any),
    singleton: boolean = true,
    metadata?: Omit<ServiceMetadata, 'name' | 'singleton'>,
  ): void {
    const serviceName = String(name);

    // Validate dependencies before registration
    if (metadata?.dependsOn) {
      this.validateDependencies(serviceName, metadata.dependsOn);
    }

    // Register in underlying container
    this.container.register(name, factory, singleton);

    // Store enhanced metadata
    this.metadata.set(serviceName, {
      name: serviceName,
      singleton,
      ...metadata,
    });
  }

  /**
   * Initialize all services in dependency order
   */
  async initializeServices(): Promise<void> {
    const services = this.getServicesByPriority();

    for (const serviceName of services) {
      if (this.initialized.has(serviceName)) continue;

      const metadata = this.metadata.get(serviceName);
      if (!metadata) continue;

      try {
        // Get service instance
        const service = this.container.get(serviceName as any);

        // Initialize if lifecycle method exists
        if (metadata.lifecycle?.initialize) {
          await metadata.lifecycle.initialize.call(service);
        }

        // Mark as initialized
        this.initialized.add(serviceName);

        // Update health status
        this.updateHealthStatus(serviceName, 'healthy');

        console.debug(`Service '${serviceName}' initialized successfully`);
      } catch (error) {
        this.updateHealthStatus(
          serviceName,
          'unhealthy',
          error instanceof Error ? error.message : String(error),
        );
        throw new Error(
          `Failed to initialize service '${serviceName}': ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }

  /**
   * Check health of all services
   */
  async checkServiceHealth(): Promise<ServiceHealth[]> {
    const healthResults: ServiceHealth[] = [];

    for (const serviceName of this.container.getServiceNames()) {
      const metadata = this.metadata.get(serviceName);
      const health = await this.performHealthCheck(serviceName, metadata);
      healthResults.push(health);
    }

    return healthResults;
  }

  /**
   * Get enhanced statistics
   */
  getStats() {
    const baseStats = this.container.getStats();
    const healthStatuses = Array.from(this.healthStatus.values());

    const healthyCount = healthStatuses.filter((h) => h.status === 'healthy').length;
    const unhealthyCount = healthStatuses.filter((h) => h.status === 'unhealthy').length;

    return {
      ...baseStats,
      healthyServices: healthyCount,
      unhealthyServices: unhealthyCount,
      initializedServices: this.initialized.size,
      servicesByPriority: this.getServicesByPriority(),
    };
  }

  /**
   * Dispose all services with lifecycle management
   */
  async dispose(): Promise<void> {
    try {
      // Stop health monitoring
      this.stopHealthMonitoring();

      // Dispose services in reverse order
      const services = this.getServicesByPriority().reverse();

      for (const serviceName of services) {
        await this.disposeService(serviceName);
      }

      // Clear all state
      this.metadata.clear();
      this.initialized.clear();
      this.healthStatus.clear();
    } catch (error) {
      console.error('Error disposing enhanced services:', error);
    }
  }

  // Delegate other methods to underlying container
  get<K extends string>(name: K): any {
    return this.container.get(name);
  }

  has<K extends string>(name: K): boolean {
    return this.container.has(name);
  }

  tryGet<K extends string>(name: K): any {
    return this.container.tryGet(name);
  }

  getServiceNames(): string[] {
    return this.container.getServiceNames();
  }

  clear(): void {
    return this.container.clear();
  }

  // Private helper methods
  private validateDependencies(serviceName: string, dependencies: string[]): void {
    for (const dep of dependencies) {
      if (!this.container.has(dep as any)) {
        throw new Error(`Service '${serviceName}' depends on '${dep}' which is not registered`);
      }
    }
  }

  private getServicesByPriority(): string[] {
    const services = this.container.getServiceNames();

    // Sort by priority
    return services.sort((a, b) => {
      const aPriority = this.metadata.get(a)?.priority ?? 0;
      const bPriority = this.metadata.get(b)?.priority ?? 0;
      return bPriority - aPriority; // Higher priority first
    });
  }

  private async performHealthCheck(
    serviceName: string,
    metadata?: ServiceMetadata,
  ): Promise<ServiceHealth> {
    try {
      const service = this.container.tryGet(serviceName as any);
      if (!service) {
        return {
          name: serviceName,
          status: 'unhealthy',
          lastCheck: new Date(),
          error: 'Service not available',
        };
      }

      if (metadata?.lifecycle?.healthCheck) {
        const isHealthy = await metadata.lifecycle.healthCheck.call(service);
        return {
          name: serviceName,
          status: isHealthy ? 'healthy' : 'degraded',
          lastCheck: new Date(),
        };
      }

      return {
        name: serviceName,
        status: 'healthy',
        lastCheck: new Date(),
      };
    } catch (error) {
      return {
        name: serviceName,
        status: 'unhealthy',
        lastCheck: new Date(),
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private updateHealthStatus(
    serviceName: string,
    status: 'healthy' | 'degraded' | 'unhealthy',
    error?: string,
  ): void {
    this.healthStatus.set(serviceName, {
      name: serviceName,
      status,
      lastCheck: new Date(),
      error,
    });
  }

  private async disposeService(serviceName: string): Promise<void> {
    const metadata = this.metadata.get(serviceName);

    try {
      const service = this.container.tryGet(serviceName as any);
      if (service && metadata?.lifecycle?.dispose) {
        await metadata.lifecycle.dispose.call(service);
      }

      this.initialized.delete(serviceName);
      this.healthStatus.delete(serviceName);

      console.debug(`Service '${serviceName}' disposed successfully`);
    } catch (error) {
      console.error(`Error disposing service '${serviceName}':`, error);
    }
  }

  private startHealthMonitoring(): void {
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.checkServiceHealth();
      } catch (error) {
        console.warn('Health check monitoring error:', error);
      }
    }, 30000); // Check every 30 seconds
  }

  private stopHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }
  }
}

/**
 * Factory function to create enhanced service container
 */
export function createEnhancedServiceContainer(): ServiceEnhancer {
  const baseContainer = new ServiceContainer();
  return new ServiceEnhancer(baseContainer);
}

/**
 * Helper function to create enhanced renderer services
 */
export function createEnhancedRendererServices(
  enhancedContainer: ServiceEnhancer,
  apiClient: any,
): void {
  // Register services with enhanced metadata
  enhancedContainer.register('electronAPIClient', () => apiClient, true, {
    priority: 1, // High priority
    dependsOn: [],
    lifecycle: {
      healthCheck: async () => !!apiClient,
    },
  });

  enhancedContainer.register(
    'sessionService',
    (container) => {
      const apiClient = container.get('electronAPIClient');
      return {
        /* session service implementation */
      };
    },
    true,
    {
      priority: 2,
      dependsOn: ['electronAPIClient'],
    },
  );

  enhancedContainer.register(
    'analyticsService',
    (container) => {
      const apiClient = container.get('electronAPIClient');
      return {
        /* analytics service implementation */
      };
    },
    true,
    {
      priority: 2,
      dependsOn: ['electronAPIClient'],
    },
  );
}

export default ServiceEnhancer;
