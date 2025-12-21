/// <reference types="vitest" />

// Import the ElectronAPI type for global declaration
import type { ElectronAPI } from '@/shared/types/electron-api';

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

    function fn<T = unknown, Y extends unknown[] = unknown[]>(
      implementation?: (...args: Y) => T,
    ): Mock<T, Y>;
  }

  // Add electronAPI to the global Window interface for test environment
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
