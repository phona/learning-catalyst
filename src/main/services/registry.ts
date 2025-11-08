/**
 * Main Thread Service Registry
 *
 * Dependency injection container for main thread services.
 * Manages service lifecycle, dependencies, and provides a centralized
 * way to access services throughout the main process.
 */

import { ServiceRegistry } from './types';
import { ServiceError } from './types';

/**
 * Service registry implementation with dependency injection
 */
export class MainThreadServiceRegistry implements ServiceRegistry {
  private services = new Map<string, any>();
  private disposed = false;

  /**
   * Register a service with the registry
   */
  register<T>(name: string, service: T): void {
    if (this.disposed) {
      throw new ServiceError(
        'Cannot register service after registry has been disposed',
        'REGISTRY_DISPOSED',
        'ServiceRegistry'
      );
    }

    if (this.services.has(name)) {
      throw new ServiceError(
        `Service '${name}' is already registered`,
        'SERVICE_ALREADY_REGISTERED',
        'ServiceRegistry'
      );
    }

    this.services.set(name, service);
  }

  /**
   * Get a service from the registry
   */
  get<T>(name: string): T | undefined {
    if (this.disposed) {
      throw new ServiceError(
        'Cannot get service after registry has been disposed',
        'REGISTRY_DISPOSED',
        'ServiceRegistry'
      );
    }

    return this.services.get(name) as T | undefined;
  }

  /**
   * Check if a service is registered
   */
  has(name: string): boolean {
    return this.services.has(name);
  }

  /**
   * Get all registered service names
   */
  getServiceNames(): string[] {
    return Array.from(this.services.keys());
  }

  /**
   * Unregister a service
   */
  unregister(name: string): void {
    if (this.services.has(name)) {
      const service = this.services.get(name);

      // Remove from services first to prevent recursion
      this.services.delete(name);

      // Call dispose method if service has one (but don't let it call unregister again)
      if (service && typeof service.dispose === 'function') {
        try {
          service.dispose();
        } catch (error) {
          console.warn(`Error disposing service '${name}':`, error);
        }
      }
    }
  }

  /**
   * Dispose all services and clear the registry
   */
  async dispose(): Promise<void> {
    if (this.disposed) return;

    // Mark as disposed first to prevent new registrations
    this.disposed = true;

    // Dispose all services in reverse order of registration
    const serviceNames = Array.from(this.services.keys()).reverse();

    for (const name of serviceNames) {
      try {
        const service = this.services.get(name);
        if (service) {
          // Remove service from registry before disposing
          this.services.delete(name);

          // Dispose the service
          if (typeof service.dispose === 'function') {
            await Promise.resolve(service.dispose());
          }
        }
      } catch (error) {
        console.warn(`Error disposing service '${name}':`, error);
      }
    }

    // Clear any remaining services
    this.services.clear();
  }

  /**
   * Create a scoped child registry
   */
  createScopedRegistry(): MainThreadServiceRegistry {
    const scoped = new MainThreadServiceRegistry();

    // Copy all services to the scoped registry
    for (const [name, service] of this.services) {
      scoped.services.set(name, service);
    }

    return scoped;
  }

  /**
   * Get registry statistics
   */
  getStats(): {
    totalServices: number;
    registeredServices: string[];
    disposed: boolean;
  } {
    return {
      totalServices: this.services.size,
      registeredServices: this.getServiceNames(),
      disposed: this.disposed,
    };
  }
}

/**
 * Global service registry instance
 */
let globalRegistry: MainThreadServiceRegistry | null = null;

/**
 * Get the global service registry
 */
export function getServiceRegistry(): MainThreadServiceRegistry {
  if (!globalRegistry) {
    globalRegistry = new MainThreadServiceRegistry();
  }
  return globalRegistry;
}

/**
 * Initialize the global service registry
 */
export function initializeServiceRegistry(): MainThreadServiceRegistry {
  if (globalRegistry) {
    throw new ServiceError(
      'Service registry has already been initialized',
      'REGISTRY_ALREADY_INITIALIZED',
      'ServiceRegistry'
    );
  }

  globalRegistry = new MainThreadServiceRegistry();
  return globalRegistry;
}

/**
 * Dispose the global service registry
 */
export async function disposeServiceRegistry(): Promise<void> {
  if (globalRegistry) {
    await globalRegistry.dispose();
    globalRegistry = null;
  }
}

/**
 * Service decorator for automatic registration
 */
export function Service(name?: string) {
  return function <T extends { new (...args: any[]): {} }>(constructor: T) {
    const serviceName = name || constructor.name;

    // Add static method for service name
    (constructor as any).serviceName = serviceName;

    return constructor;
  };
}

/**
 * Injectable decorator for constructor parameters
 */
export function Injectable(token?: string) {
  return function (target: any, propertyKey: string | symbol | undefined, parameterIndex: number) {
    // Store injection metadata
    const injectionTokens = Reflect.getMetadata('injectionTokens', target) || [];
    injectionTokens[parameterIndex] = token || `param_${parameterIndex}`;
    Reflect.defineMetadata('injectionTokens', injectionTokens, target);
  };
}

/**
 * Service factory for creating instances with dependency injection
 */
export class ServiceFactory {
  constructor(private readonly registry: MainThreadServiceRegistry) {}

  /**
   * Create a service instance with automatic dependency injection
   */
  create<T>(constructor: new (...args: any[]) => T): T {
    // Get injection tokens
    const injectionTokens = Reflect.getMetadata('injectionTokens', constructor) || [];

    // Resolve dependencies
    const dependencies = injectionTokens.map((token: string) => {
      const dependency = this.registry.get(token);
      if (!dependency) {
        throw new ServiceError(
          `Dependency '${token}' not found in registry`,
          'DEPENDENCY_NOT_FOUND',
          'ServiceFactory'
        );
      }
      return dependency;
    });

    // Create instance
    return new constructor(...dependencies);
  }

  /**
   * Create a singleton service
   */
  createSingleton<T>(constructor: new (...args: any[]) => T, token?: string): T {
    const serviceName = token || constructor.name;

    if (this.registry.has(serviceName)) {
      return this.registry.get<T>(serviceName)!;
    }

    const instance = this.create(constructor);
    this.registry.register(serviceName, instance);

    return instance;
  }
}