/// <reference types="vitest" />

declare global {
  namespace vi {
    interface Mock<T = any, Y extends any[] = any[]> {
      (...args: Y): T;
      mock: {
        calls: Y[][];
        results: { type: 'return' | 'throw'; value: T }[];
      };
      mockImplementation(fn: (...args: Y) => T): Mock<T, Y>;
      mockReturnValue(value: T): Mock<T, Y>;
      mockResolvedValue(value: T): Mock<T, Y>;
      mockRejectedValue(value: any): Mock<T, Y>;
      withImplementation(fn: (...args: Y) => T, callback: () => void): void;
      withImplementation(fn: (...args: Y) => T, callback: () => Promise<void>): Promise<void>;
    }

    function fn<T = any, Y extends any[] = any[]>(implementation?: (...args: Y) => T): Mock<T, Y>;
  }
}

export {};
