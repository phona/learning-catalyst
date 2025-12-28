/**
 * Time Service Tests
 *
 * Tests the TimeService utility which provides an injectable abstraction
 * over time-related operations for deterministic testing.
 *
 * Follows DI patterns from docs/DEVELOPER-GUIDE/testing.md
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createTimeService,
  createFixedTimeService,
  createIncrementalTimeService,
  type TimeService,
} from '../time-service';

describe('[TC-501] TimeService utility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2020-01-01T00:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('createTimeService', () => {
    it('should return current timestamp using Date.now()', () => {
      const timeService = createTimeService();
      const now = timeService.now();

      expect(now).toBe(new Date('2020-01-01T00:00:00Z').getTime());
    });

    it('should return current Date object', () => {
      const timeService = createTimeService();
      const currentDate = timeService.currentDate();

      expect(currentDate.getTime()).toBe(new Date('2020-01-01T00:00:00Z').getTime());
    });

    it('should format dates using locale-aware formatting', () => {
      const timeService = createTimeService();
      const date = new Date('2020-01-15T10:30:00Z');

      const formatted = timeService.format(date, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      expect(formatted).toContain('2020');
      expect(formatted).toContain('January');
      expect(formatted).toContain('15');
    });

    it('should use fake timers when active in tests', () => {
      vi.setSystemTime(new Date('2024-06-15T12:00:00Z'));
      const timeService = createTimeService();

      expect(timeService.now()).toBe(new Date('2024-06-15T12:00:00Z').getTime());
    });
  });

  describe('createFixedTimeService', () => {
    it('should always return the same timestamp from number', () => {
      const fixedTime = 1577836800000; // 2020-01-01T00:00:00Z
      const timeService = createFixedTimeService(fixedTime);

      expect(timeService.now()).toBe(fixedTime);
      expect(timeService.now()).toBe(fixedTime); // Always same
      expect(timeService.now()).toBe(fixedTime); // Always same
    });

    it('should always return the same timestamp from Date', () => {
      const fixedDate = new Date('2020-01-01T00:00:00Z');
      const timeService = createFixedTimeService(fixedDate);
      const expectedTime = fixedDate.getTime();

      expect(timeService.now()).toBe(expectedTime);
      expect(timeService.now()).toBe(expectedTime);
    });

    it('should return fixed date from currentDate()', () => {
      const fixedDate = new Date('2024-06-15T12:00:00Z');
      const timeService = createFixedTimeService(fixedDate);

      const result = timeService.currentDate();
      expect(result.getTime()).toBe(fixedDate.getTime());
    });

    it('should format dates independently of fixed time', () => {
      const timeService = createFixedTimeService(0);
      const date = new Date('2020-01-15T10:30:00Z');

      const formatted = timeService.format(date, {
        year: 'numeric',
      });

      expect(formatted).toContain('2020');
    });
  });

  describe('createIncrementalTimeService', () => {
    it('should increment timestamp on each now() call', () => {
      const timeService = createIncrementalTimeService({
        startTime: 1000,
        incrementMs: 100,
      });

      expect(timeService.now()).toBe(1000);
      expect(timeService.now()).toBe(1100);
      expect(timeService.now()).toBe(1200);
      expect(timeService.now()).toBe(1300);
    });

    it('should start from 0 with default options', () => {
      const timeService = createIncrementalTimeService();

      expect(timeService.now()).toBe(0);
      expect(timeService.now()).toBe(1);
      expect(timeService.now()).toBe(2);
    });

    it('should use default increment of 1ms when not specified', () => {
      const timeService = createIncrementalTimeService({
        startTime: 500,
      });

      expect(timeService.now()).toBe(500);
      expect(timeService.now()).toBe(501);
      expect(timeService.now()).toBe(502);
    });

    it('should return incrementing date from currentDate()', () => {
      const timeService = createIncrementalTimeService({
        startTime: 1000,
        incrementMs: 100,
      });

      const date1 = timeService.currentDate();
      expect(date1.getTime()).toBe(1000);

      const date2 = timeService.currentDate();
      expect(date2.getTime()).toBe(1100);
    });

    it('should format dates independently of incremental time', () => {
      const timeService = createIncrementalTimeService({
        startTime: 0,
        incrementMs: 100,
      });
      const date = new Date('2020-01-15T10:30:00Z');

      const formatted = timeService.format(date, {
        year: 'numeric',
      });

      expect(formatted).toContain('2020');
    });
  });

  describe('DI Pattern Examples', () => {
    it('[TC-502] should work with DI pattern for deterministic testing', () => {
      // Production code can use real time service
      const prodService = createTimeService();

      // Test code injects fixed time service
      const testService = createFixedTimeService(12345);

      expect(prodService.now()).toBe(new Date('2020-01-01T00:00:00Z').getTime());
      expect(testService.now()).toBe(12345);
      expect(testService.now()).toBe(12345); // Deterministic!
    });

    it('[TC-503] should allow testing time-dependent logic', () => {
      const timeService = createFixedTimeService(new Date('2020-01-01T12:00:00Z'));

      // Simulate service using time service
      const getSessionDuration = (startTime: number, ts: TimeService) => {
        const now = ts.now();
        return now - startTime;
      };

      const sessionStart = new Date('2020-01-01T10:00:00Z').getTime();
      const duration = getSessionDuration(sessionStart, timeService);

      expect(duration).toBe(2 * 60 * 60 * 1000); // 2 hours
    });
  });
});
