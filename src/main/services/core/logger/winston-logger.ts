/**
 * Winston-based File Logger Service
 *
 * Features:
 * - AsyncLocalStorage context preservation
 * - Environment-aware logging (dev/test/prod)
 * - File rotation (size + time based)
 * - Separate error logs
 * - JSON + text formatting
 * - Child loggers with merged context
 * - Query capabilities
 */

import winston from 'winston';
import { AsyncLocalStorage } from 'async_hooks';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { ServiceLogger } from '../../types';
import { ServiceExecutionContext } from '../../logger';
import { readFile, readdir, stat } from 'fs/promises';

// ============================================================================
// ENVIRONMENT DETECTION
// ============================================================================

const isDevelopment = (): boolean => {
  // Detect from multiple sources
  return (
    process.env.NODE_ENV === 'development' ||
    process.env.NODE_ENV === 'dev' ||
    process.env.VITE_DEV_SERVER_URL !== undefined ||
    process.env.ELECTRON_START_URL !== undefined ||
    !process.env.PROD
  );
};

const isTest = (): boolean => {
  return (
    process.env.NODE_ENV === 'test' ||
    process.env.VITEST !== undefined ||
    process.env.JEST_WORKER_ID !== undefined ||
    process.env.CI !== undefined
  );
};

// ============================================================================
// TYPES
// ============================================================================

interface LoggerConfig {
  file: {
    maxFileSize: string;
    maxFiles: string;
    format: 'json' | 'text';
    retentionDays: number;
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const getExecutionContext = (
  als: AsyncLocalStorage<ServiceExecutionContext>
): Record<string, unknown> => {
  const context = als.getStore();
  if (!context) return {};

  return {
    executionId: context.id,
    sessionId: context.sessionId,
    requestId: context.requestId,
    operation: context.operation,
    timestamp: context.timestamp,
    ...context.metadata,
  };
};

const ensureLogDirectory = (logDirectory: string): void => {
  if (!existsSync(logDirectory)) {
    mkdirSync(logDirectory, { recursive: true });
  }
};

const parseSize = (size: string): number => {
  const units: Record<string, number> = {
    b: 1,
    kb: 1024,
    mb: 1024 * 1024,
    gb: 1024 * 1024 * 1024,
  };

  const match = size.toLowerCase().match(/^(\d+)([a-z]+)?$/);
  if (!match) return 10 * 1024 * 1024;

  const value = parseInt(match[1], 10);
  const unit = match[2] || 'b';
  return value * (units[unit] || 1);
};

// ============================================================================
// MAIN LOGGER FACTORY
// ============================================================================

export const createWinstonLoggerService = ({
  logDirectory,
  als,
  config,
}: {
  logDirectory: string;
  als: AsyncLocalStorage<ServiceExecutionContext>;
  config?: Partial<LoggerConfig>;
}): ServiceLogger & {
  // Query and management methods
  queryLogs: (options: {
    startDate?: string;
    endDate?: string;
    level?: string;
    maxLines?: number;
    filename?: string;
  }) => Promise<any[]>;
  getRecentErrors: (hours?: number, limit?: number) => Promise<any[]>;
  listLogFiles: () => Promise<{ filename: string; size: number; modified: Date }[]>;
  getLogStats: () => Promise<{ totalLogs: number; totalSize: number }>;
  cleanup: () => Promise<void>;
  getEnvironment: () => 'development' | 'production' | 'test';
} => {
  const devMode = isDevelopment();
  const testMode = isTest();

  // Ensure log directory exists
  ensureLogDirectory(logDirectory);

  // Merge config with defaults
  const loggerConfig: LoggerConfig = {
    file: {
      maxFileSize: config?.file?.maxFileSize || '10m',
      maxFiles: config?.file?.maxFiles || '10d',
      format: config?.file?.format || (devMode ? 'text' : 'json'),
      retentionDays: config?.file?.retentionDays || 30,
    },
  };

  // ========================================================================
  // CREATE TRANSPORTS
  // ========================================================================

  const transports: winston.transport[] = [];

  // Console transport: Dev + Test
  if (devMode || testMode) {
    const consoleLevel = devMode ? 'debug' : 'warn';

    transports.push(
      new winston.transports.Console({
        format: winston.format.simple(),
        level: consoleLevel,
      })
    );
  }

  // File transport: Dev + Prod (NOT Test)
  if (devMode || !testMode) {
    const fileLevel = devMode ? 'debug' : 'info';
    const fileFormat = loggerConfig.file.format === 'json'
      ? winston.format.json()
      : winston.format.simple();

    // In dev mode, use simple file without rotation to avoid numbered files
    // In prod mode, use rotation for log management
    const fileOptions = devMode
      ? {
        filename: join(logDirectory, 'app.log'),
        format: fileFormat,
        level: fileLevel,
        options: { flags: 'a' }, // Append mode
      }
      : {
        filename: join(logDirectory, 'app.log'),
        maxsize: parseSize(loggerConfig.file.maxFileSize),
        maxFiles: parseInt(loggerConfig.file.maxFiles, 10) || 10,
        format: fileFormat,
        level: fileLevel,
        tailable: true,
      };

    transports.push(new winston.transports.File(fileOptions));

    // Error-only log
    const errorOptions = devMode
      ? {
        filename: join(logDirectory, 'error.log'),
        format: fileFormat,
        level: 'error' as const,
        options: { flags: 'a' },
      }
      : {
        filename: join(logDirectory, 'error.log'),
        maxsize: parseSize(loggerConfig.file.maxFileSize),
        maxFiles: parseInt(loggerConfig.file.maxFiles, 10) || 10,
        format: fileFormat,
        level: 'error' as const,
        tailable: true,
      };

    transports.push(new winston.transports.File(errorOptions));
  }

  // ========================================================================
  // CREATE LOGGER
  // ========================================================================

  const winstonLogger = winston.createLogger({
    level: 'debug', // Base level (transports have their own levels)
    format: winston.format.json(),
    transports,
    exitOnError: false,
  });

  // ========================================================================
  // LOGGING METHODS
  // ========================================================================

  const debug = (message: string, ...args: unknown[]): void => {
    const context = getExecutionContext(als);
    winstonLogger.debug(message, { context, args });
  };

  const info = (message: string, ...args: unknown[]): void => {
    const context = getExecutionContext(als);
    winstonLogger.info(message, { context, args });
  };

  const warn = (message: string, ...args: unknown[]): void => {
    const context = getExecutionContext(als);
    winstonLogger.warn(message, { context, args });
  };

  const error = (message: string, error?: Error | unknown, ...args: unknown[]): void => {
    const context = getExecutionContext(als);

    if (error instanceof Error) {
      winstonLogger.error(message, {
        context,
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
          cause: (error as any).cause,
        },
        args,
      });
    } else {
      winstonLogger.error(message, { context, error, args });
    }
  };

  const child = (additionalContext: Record<string, unknown>) => {
    const parentContext = getExecutionContext(als);
    const combinedContext = { ...parentContext, ...additionalContext };
    const childLogger = winstonLogger.child({ context: combinedContext });

    return {
      debug: (message: string, ...args: unknown[]) => {
        childLogger.debug(message, { args });
      },
      info: (message: string, ...args: unknown[]) => {
        childLogger.info(message, { args });
      },
      warn: (message: string, ...args: unknown[]) => {
        childLogger.warn(message, { args });
      },
      error: (message: string, error?: Error | unknown, ...args: unknown[]) => {
        if (error instanceof Error) {
          childLogger.error(message, {
            error: {
              name: error.name,
              message: error.message,
              stack: error.stack,
              cause: (error as any).cause,
            },
            args,
          });
        } else {
          childLogger.error(message, { error, args });
        }
      },
      child: (subContext: Record<string, unknown>) => {
        return child({ ...combinedContext, ...subContext });
      },
    };
  };

  // ========================================================================
  // QUERY AND MANAGEMENT METHODS
  // ========================================================================

  const queryLogs = async (options: {
    startDate?: string;
    endDate?: string;
    level?: string;
    maxLines?: number;
    filename?: string;
  }): Promise<any[]> => {
    const filename = options.filename || 'app.log';
    const logPath = join(logDirectory, filename);

    try {
      const content = await readFile(logPath, 'utf-8');
      const lines = content.split('\n').filter(line => line.trim());

      let logs = lines.map(line => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      }).filter((log): log is any => log !== null);

      // Apply filters
      if (options.startDate) {
        const startDate = options.startDate;
        logs = logs.filter(log => log.timestamp >= startDate);
      }

      if (options.endDate) {
        const endDate = options.endDate;
        logs = logs.filter(log => log.timestamp <= endDate);
      }

      if (options.level) {
        logs = logs.filter(log => log.level === options.level);
      }

      // Apply limit
      if (options.maxLines) {
        logs = logs.slice(-options.maxLines);
      }

      return logs.reverse();
    } catch (error) {
      winstonLogger.error('Failed to query logs', { error });
      return [];
    }
  };

  const getRecentErrors = async (hours = 24, limit = 50): Promise<any[]> => {
    const startDate = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    return queryLogs({
      startDate,
      level: 'error',
      maxLines: limit,
      filename: 'error.log',
    });
  };

  const listLogFiles = async (): Promise<{ filename: string; size: number; modified: Date }[]> => {
    ensureLogDirectory(logDirectory);
    const files = await readdir(logDirectory);
    const logFiles = files.filter(f => f.endsWith('.log'));

    const stats = await Promise.all(
      logFiles.map(async filename => {
        const filePath = join(logDirectory, filename);
        const fileStat = await stat(filePath);
        return {
          filename,
          size: fileStat.size,
          modified: fileStat.mtime,
        };
      })
    );

    return stats.sort((a, b) => b.modified.getTime() - a.modified.getTime());
  };

  const getLogStats = async (): Promise<{ totalLogs: number; totalSize: number }> => {
    const files = await listLogFiles();
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);

    let totalLogs = 0;
    for (const file of files) {
      try {
        const content = await readFile(join(logDirectory, file.filename), 'utf-8');
        totalLogs += content.split('\n').filter(line => line.trim()).length;
      } catch {
        // Skip unreadable files
      }
    }

    return { totalLogs, totalSize };
  };

  const cleanup = (): Promise<void> => {
    return new Promise((resolve) => {
      winstonLogger.end();
      setTimeout(resolve, 100);
    });
  };

  const getEnvironment = (): 'development' | 'production' | 'test' => {
    if (testMode) return 'test';
    if (devMode) return 'development';
    return 'production';
  };

  // Log environment info
  if (!testMode) {
    const env = getEnvironment();
    winstonLogger.info('🚀 Logger initialized', {
      environment: env,
      consoleEnabled: devMode || testMode,
      fileEnabled: devMode || !testMode,
      logDirectory,
    });
  }

  // ========================================================================
  // RETURN SERVICE INTERFACE
  // ========================================================================

  return {
    debug,
    info,
    warn,
    error,
    child,
    queryLogs,
    getRecentErrors,
    listLogFiles,
    getLogStats,
    cleanup,
    getEnvironment,
  };
};

export type WinstonLoggerService = ReturnType<typeof createWinstonLoggerService>;
