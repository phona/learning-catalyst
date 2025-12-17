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

  ipcMainInstance.handle('learning:get-path', async (_event, pathId: string) => {
    handlerLogger.info('Handling get learning path request', { pathId });

    const result = await services.learningService.getLearningPath(pathId);

    if (!result) {
      throw new Error('Learning path not found');
    }

    handlerLogger.info('Learning path retrieved successfully');
    return result;
  });

  ipcMainInstance.handle(
    'learning:start-session',
    async (_event, params: Parameters<LearningService['startLearningSession']>[0]) => {
      handlerLogger.info('Handling start learning session request', {
        topic: params.topic,
        goals: params.goals,
        agentType: params.agentType,
      });

      const session = await services.learningService.startLearningSession(params);

      handlerLogger.info('Learning session started successfully', { sessionId: session.id });
      return session;
    },
  );

  ipcMainInstance.handle('learning:get-progress', async (_event, sessionId: string) => {
    handlerLogger.info('Handling get learning session progress request', { sessionId });

    const progress = await services.learningService.getSessionProgress(sessionId);

    handlerLogger.info('Learning session progress retrieved successfully');
    return progress;
  });

  ipcMainInstance.handle(
    'learning:get-recent-sessions',
    async (_event, options?: Parameters<LearningService['getRecentSessions']>[0]) => {
      const sessions = await services.learningService.getRecentSessions(options);
      return sessions;
    },
  );

  ipcMainInstance.handle(
    'learning:search-sessions',
    async (_event, payload: SearchSessionsPayload) => {
      handlerLogger.info('Handling search learning sessions request', payload);

      const results = await services.learningService.searchSessions(
        payload.query ?? '',
        payload.filters,
      );

      handlerLogger.info('Learning session search completed', {
        resultCount: results.sessions.length,
      });
      return results;
    },
  );

  handlerLogger.info('? Learning handlers registered successfully');
};
