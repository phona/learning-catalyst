/**
 * Enhanced Learning & Sessions IPC Handlers
 *
 * IPC handlers for structured learning sessions with progress tracking,
 * session management, and learning analytics.
 */

import { ipcMain } from 'electron';
import type { APIResponse } from '@/shared/types/electron-api';
import type { LearningService } from '../services/domain/learning/learning-service';
import type { LoggerService } from '../services/core/logger/logger-service';
import { IPC_ERROR_CODES } from '@/shared/types/ipc-error';

type SearchSessionsPayload = {
  query?: string;
  filters?: Parameters<LearningService['searchSessions']>[1];
};

type LearningHandlersDeps = {
  learningService: LearningService;
  loggerService: LoggerService;
};

/**
 * Setup learning IPC handlers
 */
export const setupLearningHandlers = (
  ipcMainInstance: typeof ipcMain,
  services: LearningHandlersDeps,
): void => {
  const handlerLogger = services.loggerService.child({ handler: 'learning' });
  const ok = <T>(data: T): APIResponse<T> => ({ success: true, data });
  const fail = (code: string, message: string, details?: unknown): APIResponse<never> => ({
    success: false,
    error: { code, message, details },
  });

  ipcMainInstance.handle('learning:get-path', async (_event, pathId: string) => {
    handlerLogger.info('Handling get learning path request', { pathId });

    try {
      const result = await services.learningService.getLearningPath(pathId);

      if (!result) {
        handlerLogger.warn('Learning path not found', { pathId });
        return fail(IPC_ERROR_CODES.learning.pathNotFound, 'Learning path not found');
      }

      handlerLogger.info('Learning path retrieved successfully');
      return ok(result);
    } catch (error) {
      handlerLogger.error('Failed to get learning path', error);
      return fail(IPC_ERROR_CODES.learning.pathError, 'Unable to fetch learning path', error);
    }
  });

  ipcMainInstance.handle(
    'learning:start-session',
    async (_event, params: Parameters<LearningService['startLearningSession']>[0]) => {
      handlerLogger.info('Handling start learning session request', {
        topic: params.topic,
        goals: params.goals,
        agentType: params.agentType,
      });

      try {
        const session = await services.learningService.startLearningSession(params);

        handlerLogger.info('Learning session started successfully', { sessionId: session.id });
        return ok(session);
      } catch (error) {
        handlerLogger.error('Failed to start learning session', error);
        return fail(IPC_ERROR_CODES.learning.startFailed, 'Unable to start learning session', error);
      }
    },
  );

  ipcMainInstance.handle('learning:get-progress', async (_event, sessionId: string) => {
    handlerLogger.info('Handling get learning session progress request', { sessionId });

    try {
      const progress = await services.learningService.getSessionProgress(sessionId);

      handlerLogger.info('Learning session progress retrieved successfully');
      return ok(progress);
    } catch (error) {
      handlerLogger.error('Failed to get learning session progress', error);
      return fail(IPC_ERROR_CODES.learning.progressFailed, 'Unable to fetch progress', error);
    }
  });

  ipcMainInstance.handle('learning:pause-session', async (_event, sessionId: string) => {
    handlerLogger.info('Handling pause learning session request', { sessionId });

    try {
      const pauseData = await services.learningService.pauseSession(sessionId);

      handlerLogger.info('Learning session paused successfully');
      return ok(pauseData);
    } catch (error) {
      handlerLogger.error('Failed to pause learning session', error);
      return fail(IPC_ERROR_CODES.learning.pauseFailed, 'Unable to pause learning session', error);
    }
  });

  ipcMainInstance.handle('learning:resume-session', async (_event, sessionId: string) => {
    handlerLogger.info('Handling resume learning session request', { sessionId });

    try {
      const context = await services.learningService.resumeSession(sessionId);

      handlerLogger.info('Learning session resumed successfully');
      return ok(context);
    } catch (error) {
      handlerLogger.error('Failed to resume learning session', error);
      return fail(IPC_ERROR_CODES.learning.resumeFailed, 'Unable to resume learning session', error);
    }
  });

  ipcMainInstance.handle('learning:complete-session', async (_event, sessionId: string) => {
    handlerLogger.info('Handling complete learning session request', { sessionId });

    try {
      const completion = await services.learningService.completeSession(sessionId);

      handlerLogger.info('Learning session completed successfully', {
        keyTakeawayCount: completion?.summary?.keyTakeaways?.length ?? 0,
      });
      return ok(completion);
    } catch (error) {
      handlerLogger.error('Failed to complete learning session', error);
      return fail(IPC_ERROR_CODES.learning.completeFailed, 'Unable to complete learning session', error);
    }
  });

  ipcMainInstance.handle(
    'learning:get-recent-sessions',
    async (_event, options?: Parameters<LearningService['getRecentSessions']>[0]) => {
      try {
        const sessions = await services.learningService.getRecentSessions(options);
        return ok(sessions);
      } catch (error) {
        handlerLogger.error('Failed to get recent learning sessions', error);
        return fail(IPC_ERROR_CODES.learning.recentFailed, 'Unable to fetch recent sessions', error);
      }
    },
  );

  ipcMainInstance.handle(
    'learning:search-sessions',
    async (_event, payload: SearchSessionsPayload) => {
      handlerLogger.info('Handling search learning sessions request', payload);

      try {
        const results = await services.learningService.searchSessions(
          payload.query ?? '',
          payload.filters,
        );

        handlerLogger.info('Learning session search completed', {
          resultCount: results.sessions.length,
        });
        return ok(results);
      } catch (error) {
        handlerLogger.error('Failed to search learning sessions', error);
        return fail(IPC_ERROR_CODES.learning.searchFailed, 'Unable to search sessions', error);
      }
    },
  );

  handlerLogger.info('? Learning handlers registered successfully');
};
