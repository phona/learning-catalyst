/**
 * Test for Winston Logger Service
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createWinstonLoggerService } from '../winston-logger';
import { AsyncLocalStorage } from 'async_hooks';
import { tmpdir } from 'os';
import { join } from 'path';
import { rm } from 'fs/promises';

describe('Winston Logger Service', () => {
  let logDirectory: string;
  let als: AsyncLocalStorage<any>;
  let logger: any;

  beforeEach(() => {
    logDirectory = join(tmpdir(), 'test-logs-' + Date.now());
    als = new AsyncLocalStorage();

    logger = createWinstonLoggerService({
      logDirectory,
      als,
    });
  });

  afterEach(async () => {
    await logger.cleanup();
    try {
      await rm(logDirectory, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  it('should create logger instance', () => {
    expect(logger).toBeDefined();
    expect(logger.debug).toBeDefined();
    expect(logger.info).toBeDefined();
    expect(logger.warn).toBeDefined();
    expect(logger.error).toBeDefined();
    expect(logger.child).toBeDefined();
  });

  it('should get environment', () => {
    const env = logger.getEnvironment();
    expect(env).toBe('test');
  });

  it('should create child logger', () => {
    const childLogger = logger.child({ userId: 'user123' });
    expect(childLogger).toBeDefined();
    expect(childLogger.debug).toBeDefined();
    expect(childLogger.info).toBeDefined();
    expect(childLogger.child).toBeDefined();
  });

  it('should have query methods', () => {
    expect(logger.queryLogs).toBeDefined();
    expect(logger.getRecentErrors).toBeDefined();
    expect(logger.listLogFiles).toBeDefined();
    expect(logger.getLogStats).toBeDefined();
  });
});
