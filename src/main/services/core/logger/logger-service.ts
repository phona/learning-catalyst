import { ILogger } from '../../types';

/**
 * Functional logger service factory
 */
export const createLoggerService = ({ logger }: { logger: ILogger }) => ({
  /**
   * Log debug message
   */
  debug: (message: string, ...args: unknown[]): void => {
    logger.debug(message, ...args);
  },

  /**
   * Log info message
   */
  info: (message: string, ...args: unknown[]): void => {
    logger.info(message, ...args);
  },

  /**
   * Log warning message
   */
  warn: (message: string, ...args: unknown[]): void => {
    logger.warn(message, ...args);
  },

  /**
   * Log error message
   */
  error: (message: string, error?: Error | unknown, ...args: unknown[]): void => {
    logger.error(message, error, ...args);
  },

  /**
   * Create a child logger with additional context
   */
  child: (context: Record<string, unknown>) => {
    return {
      debug: (message: string, ...args: unknown[]): void => {
        logger.debug(message, { ...context, args });
      },
      info: (message: string, ...args: unknown[]): void => {
        logger.info(message, { ...context, args });
      },
      warn: (message: string, ...args: unknown[]): void => {
        logger.warn(message, { ...context, args });
      },
      error: (message: string, error?: Error | unknown, ...args: unknown[]): void => {
        logger.error(message, error, { ...context, args });
      },
      child: (subContext: Record<string, unknown>) => {
        return createLoggerService({ logger: logger.child({ ...context, ...subContext }) });
      },
    };
  },
});

export type LoggerService = ReturnType<typeof createLoggerService>;
