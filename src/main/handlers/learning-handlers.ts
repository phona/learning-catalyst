/**
 * Enhanced Learning & Sessions IPC Handlers
 *
 * IPC handlers for structured learning sessions with progress tracking,
 * session management, and learning analytics.
 */

import { ipcMain } from 'electron';

/**
 * Setup learning IPC handlers
 */
export const setupLearningHandlers = (
  ipcMainInstance: typeof ipcMain,
  services: {
    learningService: any;
    loggerService: any;
  }
) => {
  const handlerLogger = services.loggerService.child({ handler: 'learning' });

  /**
   * Get a learning path by ID
   */
  ipcMainInstance.handle('learning:get-path', async (event, pathId) => {
    handlerLogger.info('Handling get learning path request', { pathId });

    try {
      const result = await services.learningService.getLearningPath(pathId);

      if (!result) {
        handlerLogger.warn('Learning path not found', { pathId });
        return { success: false, error: 'Learning path not found' };
      }

      handlerLogger.info('Learning path retrieved successfully');
      return { success: true, learningPath: result };
    } catch (error) {
      handlerLogger.error('Failed to get learning path', error);
      throw error;
    }
  });

  /**
   * Start a new structured learning session
   */
  ipcMainInstance.handle('learning:start-session', async (event, params) => {
    handlerLogger.info('Handling start learning session request', {
      topic: params.topic,
      goals: params.goals,
      agentType: params.agentType
    });

    try {
      const session = await services.learningService.startLearningSession({
        topic: params.topic,
        goals: params.goals,
        difficulty: params.difficulty,
        agentType: params.agentType,
        learningStyle: params.learningStyle,
        userId: params.userId
      });

      handlerLogger.info('Learning session started successfully', { sessionId: session.id });
      return { success: true, session };
    } catch (error) {
      handlerLogger.error('Failed to start learning session', error);
      throw error;
    }
  });

  /**
   * Get detailed progress for a learning session
   */
  ipcMainInstance.handle('learning:get-progress', async (event, sessionId) => {
    handlerLogger.info('Handling get learning session progress request', { sessionId });

    try {
      const progress = await services.learningService.getSessionProgress(sessionId);

      handlerLogger.info('Learning session progress retrieved successfully');
      return { success: true, progress };
    } catch (error) {
      handlerLogger.error('Failed to get learning session progress', error);
      throw error;
    }
  });

  /**
   * Pause an active learning session
   */
  ipcMainInstance.handle('learning:pause-session', async (event, sessionId) => {
    handlerLogger.info('Handling pause learning session request', { sessionId });

    try {
      const pauseData = await services.learningService.pauseSession(sessionId);

      handlerLogger.info('Learning session paused successfully');
      return pauseData;
    } catch (error) {
      handlerLogger.error('Failed to pause learning session', error);
      throw error;
    }
  });

  /**
   * Resume a paused learning session
   */
  ipcMainInstance.handle('learning:resume-session', async (event, sessionId) => {
    handlerLogger.info('Handling resume learning session request', { sessionId });

    try {
      const context = await services.learningService.resumeSession(sessionId);

      handlerLogger.info('Learning session resumed successfully');
      return context;
    } catch (error) {
      handlerLogger.error('Failed to resume learning session', error);
      throw error;
    }
  });

  /**
   * Complete a learning session and generate summary
   */
  ipcMainInstance.handle('learning:complete-session', async (event, sessionId) => {
    handlerLogger.info('Handling complete learning session request', { sessionId });

    try {
      const completion = await services.learningService.completeSession(sessionId);

      handlerLogger.info('Learning session completed successfully');
      return { success: true, completion };
    } catch (error) {
      handlerLogger.error('Failed to complete learning session', error);
      throw error;
    }
  });

  /**
   * Get recent learning sessions for quick access
   */
  ipcMainInstance.handle('learning:get-recent-sessions', async (event, options) => {
    handlerLogger.info('Handling get recent learning sessions request', { options });

    try {
      const sessions = await services.learningService.getRecentSessions(options);

      handlerLogger.info('Recent learning sessions retrieved successfully', { 
        count: sessions.length 
      });
      return { success: true, sessions };
    } catch (error) {
      handlerLogger.error('Failed to get recent learning sessions', error);
      throw error;
    }
  });

  /**
   * Search learning sessions with advanced filters
   */
  ipcMainInstance.handle('learning:search-sessions', async (event, query, filters) => {
    handlerLogger.info('Handling search learning sessions request', { query, filters });

    try {
      const results = await services.learningService.searchSessions(query, filters);

      handlerLogger.info('Learning session search completed', { resultCount: results.sessions.length });
      return { success: true, results };
    } catch (error) {
      handlerLogger.error('Failed to search learning sessions', error);
      throw error;
    }
  });

  handlerLogger.info('✅ Learning handlers registered successfully');
};
