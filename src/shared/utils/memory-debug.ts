/**
 * Memory Debug Utility
 *
 * Simple memory monitoring utility for debugging memory leaks in the main Electron process.
 * This is only active in development mode and provides basic memory usage logging.
 */

interface MemoryUsage {
  rss: number;        // Resident Set Size
  heapUsed: number;   // Heap memory used
  heapTotal: number;  // Total heap memory allocated
  external: number;   // Memory used by C++ objects
  arrayBuffers: number; // Memory used by ArrayBuffer objects
}

class MemoryDebugLogger {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;
  private readonly logInterval: number;

  constructor(logIntervalMs = 10000) {
    this.logInterval = logIntervalMs;
  }

  /**
   * Start memory monitoring
   */
  start(): void {
    if (this.isRunning) {
      console.log('🧠 Memory debug: Already running');
      return;
    }

    // Only run in development mode
    if (process.env.NODE_ENV === 'production') {
      console.log('🧠 Memory debug: Disabled in production mode');
      return;
    }

    console.log('🧠 Memory debug: Starting memory monitoring...');

    // Log immediately on start
    this.logMemoryUsage();

    // Set up periodic logging
    this.intervalId = setInterval(() => {
      this.logMemoryUsage();
    }, this.logInterval);

    this.isRunning = true;
  }

  /**
   * Stop memory monitoring
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.isRunning = false;
    console.log('🧠 Memory debug: Stopped memory monitoring');
  }

  /**
   * Log current memory usage
   */
  private logMemoryUsage(): void {
    try {
      const usage = process.memoryUsage();
      const timestamp = new Date().toLocaleTimeString();

      // Format memory sizes in MB
      const rss = Math.round(usage.rss / 1024 / 1024);
      const heapUsed = Math.round(usage.heapUsed / 1024 / 1024);
      const heapTotal = Math.round(usage.heapTotal / 1024 / 1024);
      const external = Math.round(usage.external / 1024 / 1024);
      const arrayBuffers = Math.round((usage as any).arrayBuffers / 1024 / 1024);

      console.log(`🧠 Memory Debug [${timestamp}]:`);
      console.log(`   RSS: ${rss}MB | Heap: ${heapUsed}MB/${heapTotal}MB | External: ${external}MB | Arrays: ${arrayBuffers}MB`);

      // Check for potential memory issues
      const heapUsagePercent = (heapUsed / heapTotal) * 100;
      if (heapUsagePercent > 90) {
        console.log(`⚠️  Warning: Heap usage is ${heapUsagePercent.toFixed(1)}%`);
      }

      if (rss > 1000) {
        console.log(`⚠️  Warning: RSS memory is high at ${rss}MB`);
      }
    } catch (error) {
      console.error('🧠 Memory debug: Failed to get memory usage:', error);
    }
  }

  /**
   * Check if memory monitoring is active
   */
  isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Get current memory usage once (without starting monitoring)
   */
  getCurrentUsage(): MemoryUsage {
    const usage = process.memoryUsage();
    return {
      rss: usage.rss,
      heapUsed: usage.heapUsed,
      heapTotal: usage.heapTotal,
      external: usage.external,
      arrayBuffers: (usage as any).arrayBuffers || 0
    };
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.stop();
  }
}

// Global instance
let memoryLogger: MemoryDebugLogger | null = null;

/**
 * Get or create the memory logger instance
 */
export function getMemoryLogger(): MemoryDebugLogger {
  if (!memoryLogger) {
    // Check if memory debugging is enabled
    const enabled = process.env.DEBUG_MEMORY === 'true' ||
                   process.argv.includes('--debug-memory') ||
                   process.env.NODE_ENV !== 'production';

    if (enabled) {
      const interval = process.env.DEBUG_MEMORY_INTERVAL ?
        parseInt(process.env.DEBUG_MEMORY_INTERVAL, 10) : 10000;
      memoryLogger = new MemoryDebugLogger(interval);
    }
  }

  return memoryLogger as MemoryDebugLogger;
}

/**
 * Start memory debugging (convenience function)
 */
export function startMemoryDebug(): void {
  const logger = getMemoryLogger();
  if (logger) {
    logger.start();
  }
}

/**
 * Stop memory debugging (convenience function)
 */
export function stopMemoryDebug(): void {
  if (memoryLogger) {
    memoryLogger.stop();
  }
}

/**
 * Cleanup memory debugging resources
 */
export function cleanupMemoryDebug(): void {
  if (memoryLogger) {
    memoryLogger.cleanup();
    memoryLogger = null;
  }
}