/**
 * Time Service
 *
 * Provides an injectable abstraction over time-related operations.
 * This enables deterministic testing by allowing fake time to be injected
 * instead of using Date.now() directly.
 *
 * @example Production usage (uses real time)
 * ```ts
 * const timeService = createTimeService();
 * const now = timeService.now(); // Returns actual timestamp
 * ```
 *
 * @example Test usage (uses fake time)
 * ```ts
 * vi.useFakeTimers();
 * vi.setSystemTime(new Date('2020-01-01'));
 * const timeService = createTimeService();
 * const now = timeService.now(); // Returns deterministic timestamp
 * ```
 */

export interface TimeService {
  /** Returns current timestamp in milliseconds */
  now(): number;
  /** Returns current Date object */
  currentDate(): Date;
  /** Formats a date using locale-aware formatting */
  format(date: Date, options?: Intl.DateTimeFormatOptions): string;
}

/**
 * Default time service implementation using real system time.
 * In tests, this will use fake timers if vi.useFakeTimers() is active.
 */
export const createTimeService = (): TimeService => {
  return {
    now: () => Date.now(),
    currentDate: () => new Date(),
    format: (date: Date, options?: Intl.DateTimeFormatOptions) => {
      return date.toLocaleDateString(undefined, options);
    },
  };
};

/**
 * Test-specific time service that always returns a fixed timestamp.
 * Useful for deterministic test scenarios.
 */
export const createFixedTimeService = (fixedTime: number | Date): TimeService => {
  const timestamp = typeof fixedTime === 'number' ? fixedTime : fixedTime.getTime();
  const date = typeof fixedTime === 'number' ? new Date(fixedTime) : fixedTime;

  return {
    now: () => timestamp,
    currentDate: () => date,
    format: (dateObj: Date, options?: Intl.DateTimeFormatOptions) => {
      return dateObj.toLocaleDateString(undefined, options);
    },
  };
};

/**
 * Incremental time service for testing.
 * Each call to now() increments the timestamp by the specified amount.
 */
export const createIncrementalTimeService = (options?: {
  startTime?: number;
  incrementMs?: number;
}): TimeService => {
  let currentTime = options?.startTime ?? 0;
  const increment = options?.incrementMs ?? 1;

  return {
    now: () => {
      const result = currentTime;
      currentTime += increment;
      return result;
    },
    currentDate: () => {
      const result = currentTime;
      currentTime += increment;
      return new Date(result);
    },
    format: (date: Date, formatOptions?: Intl.DateTimeFormatOptions) => {
      return date.toLocaleDateString(undefined, formatOptions);
    },
  };
};
