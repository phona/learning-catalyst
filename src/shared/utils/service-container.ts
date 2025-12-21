/**
 * Unified Service Container
 *
 * A process-agnostic dependency injection container that can be used
 * in both main and renderer processes with proper type safety.
 */

import 'reflect-metadata';

export interface ServiceFactory<T = unknown> {
  (): T;
}

export interface ServiceDefinition<T = unknown> {
  factory: ServiceFactory<T>;
  singleton: boolean;
  instance?: T | null;
}

/**
 * Generic Service Container
 *
 * Provides dependency injection capabilities with support for:
 * - Singleton and transient services
 * - Type-safe service registration and retrieval
 * - Circular dependency detection
 * - Service lifecycle management
 */
export class ServiceContainer<TServices extends Record<string, unknown> = Record<string, unknown>> {
  private readonly services = new Map<string, ServiceDefinition>();
  private readonly resolutions = new Set<string>();
  private isDisposed = false;

  /**
   * Register a service factory
   *
   * @param name - Service name/identifier
   * @param factory - Function that creates the service instance
   * @param singleton - Whether the service should be a singleton (default: true)
   */
  register<K extends keyof TServices>(
    name: K,
    factory:
      | ServiceFactory<TServices[K]>
      | ((container: ServiceContainer<TServices>) => TServices[K]),
    singleton = true,
  ): void {
    if (this.isDisposed) {
      throw new Error('Cannot register services on a disposed container');
    }

    if (this.services.has(String(name))) {
      throw new Error(`Service '${String(name)}' is already registered`);
    }

    this.services.set(String(name), {
      factory:
        typeof factory === 'function' && factory.length === 1
          ? () => (factory as (container: ServiceContainer<TServices>) => TServices[K])(this)
          : (factory as ServiceFactory<TServices[K]>),
      singleton,
    });
  }

  /**
   * Register a service instance directly
   *
   * @param name - Service name/identifier
   * @param instance - Pre-created service instance
   */
  registerInstance<K extends keyof TServices>(name: K, instance: TServices[K]): void {
    if (this.isDisposed) {
      throw new Error('Cannot register services on a disposed container');
    }

    if (this.services.has(String(name))) {
      throw new Error(`Service '${String(name)}' is already registered`);
    }

    this.services.set(String(name), {
      factory: () => instance,
      singleton: true,
      instance,
    });
  }

  /**
   * Get a service instance
   *
   * @param name - Service name/identifier
   * @returns Service instance of type T
   * @throws Error if service is not registered or circular dependency detected
   */
  get<K extends keyof TServices>(name: K): TServices[K] {
    const serviceName = String(name);

    if (this.isDisposed) {
      throw new Error('Cannot get services from a disposed container');
    }

    const definition = this.services.get(serviceName);
    if (!definition) {
      throw new Error(`Service '${serviceName}' is not registered`);
    }

    // Check for circular dependencies
    if (this.resolutions.has(serviceName)) {
      throw new Error(`Circular dependency detected for service '${serviceName}'`);
    }

    // Return existing singleton instance
    if (definition.singleton && definition.instance != null) {
      return definition.instance as TServices[K];
    }

    // Create new instance
    this.resolutions.add(serviceName);
    try {
      const instance = definition.factory();

      // Store singleton instances
      if (definition.singleton) {
        definition.instance = instance;
      }

      if (instance == null) {
        throw new Error(`Service '${serviceName}' factory returned null or undefined`);
      }

      return instance as TServices[K];
    } finally {
      this.resolutions.delete(serviceName);
    }
  }

  /**
   * Check if a service is registered
   *
   * @param name - Service name/identifier
   * @returns True if service is registered
   */
  has<K extends keyof TServices>(name: K): boolean {
    return this.services.has(String(name));
  }

  /**
   * Create a new instance of a service (even for singletons)
   *
   * @param name - Service name/identifier
   * @returns New service instance
   */
  create<K extends keyof TServices>(name: K): TServices[K] {
    const serviceName = String(name);
    const definition = this.services.get(serviceName);

    if (!definition) {
      throw new Error(`Service '${serviceName}' is not registered`);
    }

    const instance = definition.factory();
    if (instance == null) {
      throw new Error(`Service '${serviceName}' factory returned null or undefined`);
    }

    return instance as TServices[K];
  }

  /**
   * Try to get a service without throwing an error
   *
   * @param name - Service name/identifier
   * @returns Service instance or undefined if not found
   */
  tryGet<K extends keyof TServices>(name: K): TServices[K] | undefined {
    try {
      return this.get(name);
    } catch {
      return undefined;
    }
  }

  /**
   * Clear all registered services
   * Useful for testing or application restart
   */
  clear(): void {
    if (this.isDisposed) {
      throw new Error('Cannot clear a disposed container');
    }

    // Dispose of all disposable services
    for (const definition of Array.from(this.services.values())) {
      if (
        definition.instance &&
        typeof definition.instance === 'object' &&
        'dispose' in definition.instance &&
        typeof (definition.instance as { dispose?: () => void }).dispose === 'function'
      ) {
        try {
          (definition.instance as { dispose: () => void }).dispose();
        } catch (error) {
          console.warn('Error disposing service:', error);
        }
      }
    }

    this.services.clear();
    this.resolutions.clear();
  }

  /**
   * Unregister a specific service
   *
   * @param name - Service name/identifier
   */
  unregister<K extends keyof TServices>(name: K): boolean {
    const serviceName = String(name);
    const definition = this.services.get(serviceName);

    if (definition) {
      // Dispose of service if it has a dispose method
      if (
        definition.instance &&
        typeof definition.instance === 'object' &&
        'dispose' in definition.instance &&
        typeof (definition.instance as { dispose?: () => void }).dispose === 'function'
      ) {
        try {
          (definition.instance as { dispose: () => void }).dispose();
        } catch (error) {
          console.warn('Error disposing service:', error);
        }
      }

      return this.services.delete(serviceName);
    }

    return false;
  }

  /**
   * Get all registered service names
   *
   * @returns Array of service names
   */
  getServiceNames(): string[] {
    return Array.from(this.services.keys());
  }

  /**
   * Get service container statistics
   *
   * @returns Statistics object
   */
  getStats(): {
    totalServices: number;
    singletonServices: number;
    instantiatedServices: number;
    serviceNames: string[];
    isDisposed: boolean;
    } {
    const singletonServices = Array.from(this.services.values()).filter(
      (def) => def.singleton,
    ).length;

    const instantiatedServices = Array.from(this.services.values()).filter(
      (def) => def.instance !== undefined,
    ).length;

    return {
      totalServices: this.services.size,
      singletonServices,
      instantiatedServices,
      serviceNames: this.getServiceNames(),
      isDisposed: this.isDisposed,
    };
  }

  /**
   * Check if the container has been disposed
   */
  get disposed(): boolean {
    return this.isDisposed;
  }

  /**
   * Dispose the container and all disposable services
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }

    this.clear();
    this.isDisposed = true;
  }

  /**
   * Create a child container with inherited services
   *
   * Child containers can override parent services but don't affect the parent
   *
   * @returns New child container
   */
  createChild(): ServiceContainer<TServices> {
    const child = new ServiceContainer<TServices>();

    // Copy all service definitions to child
    for (const [name, definition] of Array.from(this.services.entries())) {
      child.services.set(name, { ...definition });
    }

    return child;
  }

  /**
   * Apply a configuration to multiple services
   *
   * @param config - Object mapping service names to configuration
   */
  configure(config: Partial<{ [K in keyof TServices]: Partial<TServices[K]> }>): void {
    for (const [serviceName, configValue] of Object.entries(config)) {
      if (this.has(serviceName)) {
        const service = this.get(serviceName as keyof TServices);
        if (typeof service === 'object' && service !== null) {
          Object.assign(service, configValue);
        }
      }
    }
  }
}

/**
 * Type-safe service container builder
 */
export class ServiceContainerBuilder<
  TServices extends Record<string, unknown> = Record<string, unknown>,
> {
  private readonly container = new ServiceContainer<TServices>();

  /**
   * Register a service
   */
  withService<K extends keyof TServices>(
    name: K,
    factory:
      | ServiceFactory<TServices[K]>
      | ((container: ServiceContainer<TServices>) => TServices[K]),
    singleton?: boolean,
  ): ServiceContainerBuilder<TServices & { [P in K]: TServices[K] }> {
    this.container.register(name, factory as ServiceFactory<TServices[K]>, singleton);
    return this as ServiceContainerBuilder<TServices & { [P in K]: TServices[K] }>;
  }

  /**
   * Register a service instance
   */
  withInstance<K extends keyof TServices>(
    name: K,
    instance: TServices[K],
  ): ServiceContainerBuilder<TServices & { [P in K]: TServices[K] }> {
    this.container.registerInstance(name, instance);
    return this as ServiceContainerBuilder<TServices & { [P in K]: TServices[K] }>;
  }

  /**
   * Build the container
   */
  build(): ServiceContainer<TServices> {
    return this.container;
  }
}

/**
 * Helper function to create a service container builder
 */
export function createServiceContainer<
  TServices extends Record<string, unknown> = Record<string, unknown>,
>(): ServiceContainerBuilder<TServices> {
  return new ServiceContainerBuilder<TServices>();
}

/**
 * Decorator for automatic service registration
 */
export function Injectable<TServices extends Record<string, unknown> = Record<string, unknown>>(
  container: ServiceContainer<TServices>,
  name?: string,
) {
  return function <T extends new (...args: unknown[]) => unknown>(target: T): T {
    const serviceName = name || target.name;

    container.register(
      serviceName as keyof TServices,
      (() => {
        const dependencies: unknown[] = [];

        // Simple dependency injection based on constructor parameters
        // In a real implementation, you might use reflect-metadata or similar
        const paramTypes = Reflect.getMetadata('design:paramtypes', target) || [];

        for (const paramType of paramTypes) {
          const paramServiceName = (paramType as { name: string }).name.toLowerCase();
          if (container.has(paramServiceName as keyof TServices)) {
            dependencies.push(container.get(paramServiceName as keyof TServices));
          } else {
            dependencies.push(undefined);
          }
        }

        return new target(...dependencies);
      }) as ServiceFactory<TServices[keyof TServices]>,
      true,
    );

    return target;
  };
}

// Export default for convenience
export default ServiceContainer;
