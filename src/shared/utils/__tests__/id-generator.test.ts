/**
 * ID Generator Tests
 *
 * Tests the IDGenerator utility which provides an injectable abstraction
 * for generating unique identifiers with deterministic testing support.
 *
 * Follows DI patterns from docs/DEVELOPER-GUIDE/testing.md
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createIdGenerator,
  createSequentialIdGenerator,
  createFixedIdGenerator,
  createArrayIdGenerator,
  type IDGenerator,
} from '../id-generator';

describe('[TC-601] IDGenerator utility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createIdGenerator', () => {
    it('should generate unique IDs with timestamp and random suffix', () => {
      vi.useFakeTimers().setSystemTime(new Date('2024-01-01T00:00:00Z'));
      const idGenerator = createIdGenerator();

      const id1 = idGenerator.generate();
      const id2 = idGenerator.generate();

      // Pattern: timestamp_random (e.g., "1704067200000_abc123")
      expect(id1).toMatch(/^\d+_[a-z0-9]{6}$/);
      expect(id2).toMatch(/^\d+_[a-z0-9]{6}$/);
      expect(id1).not.toBe(id2); // Different random suffix

      vi.useRealTimers();
    });

    it('should generate IDs with prefix when specified', () => {
      vi.useFakeTimers().setSystemTime(new Date('2024-01-01T00:00:00Z'));
      const idGenerator = createIdGenerator('msg');

      const id = idGenerator.generate();

      expect(id).toMatch(/^msg_\d+_[a-z0-9]{6}$/);
      vi.useRealTimers();
    });

    it('should generate IDs with custom prefix via withPrefix', () => {
      vi.useFakeTimers().setSystemTime(new Date('2024-01-01T00:00:00Z'));
      const idGenerator = createIdGenerator();

      const id = idGenerator.withPrefix('session');

      expect(id).toMatch(/^session_\d+_[a-z0-9]{6}$/);
      vi.useRealTimers();
    });

    it('should have withPrefix that respects base prefix', () => {
      vi.useFakeTimers().setSystemTime(new Date('2024-01-01T00:00:00Z'));
      const idGenerator = createIdGenerator('base');

      const id1 = idGenerator.generate(); // base_timestamp_random
      const id2 = idGenerator.withPrefix('custom'); // custom_timestamp_random

      expect(id1).toMatch(/^base_/);
      expect(id2).toMatch(/^custom_/);
      vi.useRealTimers();
    });
  });

  describe('createSequentialIdGenerator', () => {
    it('should generate sequential IDs: prefix_1, prefix_2, etc.', () => {
      const idGenerator = createSequentialIdGenerator('msg');

      expect(idGenerator.generate()).toBe('msg_1');
      expect(idGenerator.generate()).toBe('msg_2');
      expect(idGenerator.generate()).toBe('msg_3');
      expect(idGenerator.generate()).toBe('msg_4');
    });

    it('should start from custom startFrom value', () => {
      const idGenerator = createSequentialIdGenerator('id', 10);

      expect(idGenerator.generate()).toBe('id_10');
      expect(idGenerator.generate()).toBe('id_11');
      expect(idGenerator.generate()).toBe('id_12');
    });

    it('should use "id" as default prefix', () => {
      const idGenerator = createSequentialIdGenerator();

      expect(idGenerator.generate()).toBe('id_1');
      expect(idGenerator.generate()).toBe('id_2');
    });

    it('should use withPrefix with same counter', () => {
      const idGenerator = createSequentialIdGenerator('msg');

      expect(idGenerator.generate()).toBe('msg_1');
      expect(idGenerator.withPrefix('custom')).toBe('custom_2');
      expect(idGenerator.generate()).toBe('msg_3');
    });

    it('should maintain independent counters across instances', () => {
      const gen1 = createSequentialIdGenerator('a');
      const gen2 = createSequentialIdGenerator('b');

      expect(gen1.generate()).toBe('a_1');
      expect(gen2.generate()).toBe('b_1');
      expect(gen1.generate()).toBe('a_2');
      expect(gen2.generate()).toBe('b_2');
    });
  });

  describe('createFixedIdGenerator', () => {
    it('should always return the same ID', () => {
      const idGenerator = createFixedIdGenerator('test-id-123');

      expect(idGenerator.generate()).toBe('test-id-123');
      expect(idGenerator.generate()).toBe('test-id-123');
      expect(idGenerator.generate()).toBe('test-id-123');
    });

    it('should ignore prefix in withPrefix and return same ID', () => {
      const idGenerator = createFixedIdGenerator('fixed-id');

      expect(idGenerator.withPrefix('prefix')).toBe('fixed-id');
      expect(idGenerator.generate()).toBe('fixed-id');
    });
  });

  describe('createArrayIdGenerator', () => {
    it('should return IDs from array in sequence', () => {
      const ids = ['id1', 'id2', 'id3'];
      const idGenerator = createArrayIdGenerator(ids);

      expect(idGenerator.generate()).toBe('id1');
      expect(idGenerator.generate()).toBe('id2');
      expect(idGenerator.generate()).toBe('id3');
    });

    it('should cycle back to start when array exhausted', () => {
      const ids = ['a', 'b'];
      const idGenerator = createArrayIdGenerator(ids);

      expect(idGenerator.generate()).toBe('a');
      expect(idGenerator.generate()).toBe('b');
      expect(idGenerator.generate()).toBe('a'); // Cycles back
      expect(idGenerator.generate()).toBe('b');
    });

    it('should use withPrefix with array IDs', () => {
      const ids = ['1', '2', '3'];
      const idGenerator = createArrayIdGenerator(ids);

      expect(idGenerator.withPrefix('msg')).toBe('msg_1');
      expect(idGenerator.withPrefix('session')).toBe('session_2');
      expect(idGenerator.generate()).toBe('3');
    });

    it('should handle single element array', () => {
      const idGenerator = createArrayIdGenerator(['only']);

      expect(idGenerator.generate()).toBe('only');
      expect(idGenerator.generate()).toBe('only');
      expect(idGenerator.generate()).toBe('only');
    });
  });

  describe('DI Pattern Examples', () => {
    it('[TC-602] should work with DI pattern for deterministic testing', () => {
      // Production code uses random ID generator
      const prodGenerator = createIdGenerator('msg');

      // Test code injects sequential generator
      const testGenerator = createSequentialIdGenerator('msg');

      expect(testGenerator.generate()).toBe('msg_1'); // Deterministic!
      expect(testGenerator.generate()).toBe('msg_2'); // Predictable!
    });

    it('[TC-603] should allow testing ID-dependent logic', () => {
      const idGenerator = createSequentialIdGenerator('session');

      // Simulate service using ID generator
      const createSession = (gen: IDGenerator) => {
        return {
          id: gen.generate(),
          createdAt: Date.now(),
        };
      };

      const session1 = createSession(idGenerator);
      const session2 = createSession(idGenerator);

      expect(session1.id).toBe('session_1');
      expect(session2.id).toBe('session_2');
    });

    it('[TC-604] should support different generators for different scenarios', () => {
      const sequential = createSequentialIdGenerator('test', 1);
      const fixed = createFixedIdGenerator('always-same');
      const array = createArrayIdGenerator(['a', 'b', 'c']);

      // Use sequential for counting
      expect(sequential.generate()).toBe('test_1');
      expect(sequential.generate()).toBe('test_2');

      // Use fixed for testing error handling
      expect(fixed.generate()).toBe('always-same');
      expect(fixed.generate()).toBe('always-same');

      // Use array for specific test scenarios
      expect(array.generate()).toBe('a');
      expect(array.generate()).toBe('b');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty prefix with createIdGenerator', () => {
      vi.useFakeTimers().setSystemTime(new Date('2024-01-01T00:00:00Z'));
      const idGenerator = createIdGenerator('');

      const id = idGenerator.generate();

      // Empty prefix results in timestamp_random (no leading underscore)
      expect(id).toMatch(/^\d+_[a-z0-9]{6}$/);
      vi.useRealTimers();
    });

    it('should handle special characters in prefix', () => {
      const idGenerator = createSequentialIdGenerator('test.prefix');

      expect(idGenerator.generate()).toBe('test.prefix_1');
    });

    it('should handle negative startFrom values', () => {
      const idGenerator = createSequentialIdGenerator('id', -5);

      expect(idGenerator.generate()).toBe('id_-5');
      expect(idGenerator.generate()).toBe('id_-4');
      expect(idGenerator.generate()).toBe('id_-3');
    });
  });
});
