/**
 * Type-safe service token for dependency injection
 * Eliminates the need for 'any' types in service registry
 */
export class ServiceToken<T = unknown> {
  constructor(
    public readonly name: string,
    public readonly description?: string
  ) {}

  /**
   * Create a service token with metadata
   * @param name - Service name
   * @param description - Service description for debugging
   * @returns ServiceToken instance
   */
  static create<T>(name: string, description?: string): ServiceToken<T> {
    return new ServiceToken<T>(name, description);
  }

  /**
   * Get token string representation for debugging
   */
  toString(): string {
    return `ServiceToken<${this.name}>${this.description ? ` (${this.description})` : ''}`;
  }
}