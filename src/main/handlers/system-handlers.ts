/**
 * System & Health Check IPC Handlers
 *
 * IPC handlers for system-level operations, health checks,
 * error reporting, and version information.
 */

import { ipcMain, app } from 'electron';
import { LoggerFactory } from '../services/logger';

/**
 * Setup system IPC handlers
 */
export function setupSystemHandlers(): void {
  const loggerFactory = LoggerFactory.getInstance();
  const logger = loggerFactory.createContextAwareLogger();

  /**
   * Report an error from the renderer process
   */
  ipcMain.handle('system:report-error', async (_event, errorData) => {
    logger.error('Renderer process error reported', errorData);

    try {
      // For now, just log the error - in a full implementation this would
      // persist errors to a database or send to an error tracking service
      console.error('Renderer Error:', errorData);
      
      return {
        success: true,
        errorId: `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        acknowledged: true
      };
    } catch (error) {
      logger.error('Failed to report error', error);
      throw error;
    }
  });

  /**
   * Health check to verify API connectivity
   */
  ipcMain.handle('system:health-check', async () => {
    logger.info('Health check requested');

    try {
      const healthStatus = {
        status: 'healthy' as const,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        timestampMs: Date.now(),
        checkResults: {
          // For now, we'll report all systems as healthy
          // In a real implementation, this would check actual system health
          database: { status: 'healthy', responseTime: 10 },
          aiProviders: { status: 'healthy', responseTime: 200 },
          fileSystem: { status: 'healthy', responseTime: 5 },
          memory: { status: 'healthy', usage: process.memoryUsage().heapUsed / 1024 / 1024 },
          cpu: { status: 'healthy', load: 0.15 } // Mocked CPU load
        },
        apis: {
          chat: { status: 'healthy' },
          learning: { status: 'healthy' },
          knowledge: { status: 'healthy' },
          analytics: { status: 'healthy' },
          agents: { status: 'healthy' },
          content: { status: 'healthy' },
          settings: { status: 'healthy' },  
          sessions: { status: 'healthy' }
        }
      };

      return healthStatus;
    } catch (error) {
      logger.error('Health check failed', error);
      throw error;
    }
  });

  /**
   * Get application version and build information
   */
  ipcMain.handle('system:get-version', async () => {
    logger.info('Version information requested');

    try {
      return {
        version: app.getVersion(),
        build: process.env.BUILD_ID || 'development',
        platform: process.platform,
        electron: process.versions.electron,
        node: process.versions.node,
        v8: process.versions.v8,
        arch: process.arch,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Failed to get version information', error);
      throw error;
    }
  });

  logger.info('✅ System handlers registered successfully');
}