/// <reference types="vitest" />

declare global {
  namespace vi {
    interface Mock<T = unknown, Y extends unknown[] = unknown[]> {
      (...args: Y): T;
      mock: {
        calls: Y[][];
        results: { type: 'return' | 'throw'; value: T }[];
      };
      mockImplementation(fn: (...args: Y) => T): Mock<T, Y>;
      mockReturnValue(value: T): Mock<T, Y>;
      mockResolvedValue(value: T): Mock<T, Y>;
      mockRejectedValue(value: unknown): Mock<T, Y>;
      withImplementation(fn: (...args: Y) => T, callback: () => void): void;
      withImplementation(fn: (...args: Y) => T, callback: () => Promise<void>): Promise<void>;
    }

    function fn<T = unknown, Y extends unknown[] = unknown[]>(implementation?: (...args: Y) => T): Mock<T, Y>;
  }
}

export {};
