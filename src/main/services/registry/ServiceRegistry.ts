import { ServiceToken } from './ServiceToken';

/**
 * Type-safe service registry with dependency injection support
 * Eliminates 'any' types and provides proper type safety
 */
export class ServiceRegistry {
  private readonly services = new Map<ServiceToken, unknown>();
  private readonly factories = new Map<ServiceToken, () => unknown>();
  private readonly singletons = new Set<ServiceToken>();

  /**
   * Register a service factory function
   * @param token - Type-safe service token
   * @param factory - Function that creates the service instance
   * @param singleton - Whether the service should be a singleton (default: true)
   */
  register<T>(
    token: ServiceToken<T>,
    factory: () => T,
    singleton: boolean = true
  ): void {
    this.factories.set(token, factory);
    if (singleton) {
      this.singletons.add(token);
    }
  }

  /**
   * Register a service instance directly
   * @param token - Type-safe service token
   * @param instance - Service instance to register
   */
  registerInstance<T>(token: ServiceToken<T>, instance: T): void {
    this.services.set(token, instance);
    this.singletons.add(token);
  }

  /**
   * Get a service instance
   * @param token - Service token
   * @returns Service instance of type T
   * @throws Error if service is not registered
   */
  get<T>(token: ServiceToken<T>): T {
    // Return existing instance for singletons
    if (this.singletons.has(token) && this.services.has(token)) {
      return this.services.get(token) as T;
    }

    // Create new instance using factory
    const factory = this.factories.get(token);
    if (!factory) {
      throw new Error(`Service not registered: ${token.toString()}`);
    }

    try {
      const instance = factory();

      // Store singleton instances
      if (this.singletons.has(token)) {
        this.services.set(token, instance);
      }

      return instance as T;
    } catch (error) {
      throw new Error(`Failed to create service ${token.toString()}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if a service is registered
   * @param token - Service token to check
   * @returns True if service is registered
   */
  has<T>(token: ServiceToken<T>): boolean {
    return this.factories.has(token) || this.services.has(token);
  }

  /**
   * Create a new instance of a service (even for singletons)
   * @param token - Service token
   * @returns New service instance
   */
  create<T>(token: ServiceToken<T>): T {
    const factory = this.factories.get(token);
    if (!factory) {
      throw new Error(`Service not registered: ${token.toString()}`);
    }

    try {
      return factory() as T;
    } catch (error) {
      throw new Error(`Failed to create service ${token.toString()}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Clear all registered services
   * Useful for testing or application restart
   */
  clear(): void {
    this.services.clear();
    this.factories.clear();
    this.singletons.clear();
  }

  /**
   * Get all registered service names
   * @returns Array of service names
   */
  getServiceNames(): string[] {
    return Array.from(this.factories.keys()).map(token => token.name);
  }

  private initialized = false;

  /**
   * Check if registry is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Mark registry as initialized
   */
  setInitialized(value: boolean): void {
    this.initialized = value;
  }

  /**
   * Get service registry statistics
   * @returns Statistics object
   */
  getStats(): {
    totalServices: number;
    singletonServices: number;
    instantiatedServices: number;
    serviceNames: string[];
    } {
    return {
      totalServices: this.factories.size,
      singletonServices: this.singletons.size,
      instantiatedServices: this.services.size,
      serviceNames: this.getServiceNames(),
    };
  }
}