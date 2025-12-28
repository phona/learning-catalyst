/**
 * ID Generator
 *
 * Provides an injectable abstraction for generating unique identifiers.
 * This enables deterministic testing by allowing predictable ID generation
 * instead of using random timestamps or UUIDs.
 *
 * @example Production usage (uses random IDs)
 * ```ts
 * const idGenerator = createIdGenerator();
 * const id = idGenerator.generate(); // Returns: "msg_1734987654321"
 * ```
 *
 * @example Test usage (uses sequential IDs)
 * ```ts
 * const idGenerator = createSequentialIdGenerator('msg');
 * const id1 = idGenerator.generate(); // Returns: "msg_1"
 * const id2 = idGenerator.generate(); // Returns: "msg_2"
 * ```
 */

export interface IDGenerator {
  /** Generates a unique identifier */
  generate(): string;
  /** Generates an ID with a specific prefix */
  withPrefix(prefix: string): string;
}

/**
 * Default ID generator using timestamp + random suffix.
 * Provides uniqueness in production while remaining simple.
 */
export const createIdGenerator = (prefix?: string): IDGenerator => {
  const basePrefix = prefix ?? '';

  return {
    generate: () => {
      const timestamp = Date.now();
      const random = Math.random().toString(36).slice(2, 8);
      return basePrefix ? `${basePrefix}_${timestamp}_${random}` : `${timestamp}_${random}`;
    },
    withPrefix: (customPrefix: string) => {
      const timestamp = Date.now();
      const random = Math.random().toString(36).slice(2, 8);
      return `${customPrefix}_${timestamp}_${random}`;
    },
  };
};

/**
 * Sequential ID generator for deterministic testing.
 * Generates IDs in sequence: "prefix_1", "prefix_2", etc.
 */
export const createSequentialIdGenerator = (prefix = 'id', startFrom = 1): IDGenerator => {
  let counter = startFrom;

  return {
    generate: () => `${prefix}_${counter++}`,
    withPrefix: (customPrefix: string) => `${customPrefix}_${counter++}`,
  };
};

/**
 * Fixed ID generator that always returns the same ID.
 * Useful for testing specific scenarios with known IDs.
 */
export const createFixedIdGenerator = (fixedId: string): IDGenerator => {
  return {
    generate: () => fixedId,
    withPrefix: () => fixedId,
  };
};

/**
 * Array-based ID generator for testing.
 * Returns IDs from a predefined array, useful for mocking specific scenarios.
 */
export const createArrayIdGenerator = (ids: string[]): IDGenerator => {
  let index = 0;

  return {
    generate: () => ids[index++ % ids.length],
    withPrefix: (prefix: string) => `${prefix}_${ids[index++ % ids.length]}`,
  };
};
