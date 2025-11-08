// Simple test to verify renderer test infrastructure works
import { describe, it, expect } from 'vitest';

describe('Renderer Test Infrastructure', () => {
  it('should run basic tests', () => {
    expect(1 + 1).toBe(2);
    expect('hello').toBe('hello');
  });

  it('should handle async operations', async () => {
    const result = await Promise.resolve('test');
    expect(result).toBe('test');
  });

  it('should handle mock functions', () => {
    const mockFn = vi.fn();
    mockFn('test');
    expect(mockFn).toHaveBeenCalledWith('test');
  });
});