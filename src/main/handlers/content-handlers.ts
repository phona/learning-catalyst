/**
 * Content & Discovery IPC Handlers
 *
 * Provides spec-compliant IPC channels for the documented content API.
 */

import { ipcMain } from 'electron';
import type {
  ContentAPI,
  ContentRecommendationDisplay,
  DocumentAnalysisDisplay,
  ImportResultDisplay,
  ProjectDisplay,
  ResourceSearchResultDisplay,
  ConceptExtractionDisplay,
} from '@/shared/types/electron-api/content-api';
import type { APIResponse } from '@/shared/types/electron-api';
import type { ILogger } from '../services/types';

type ContentService = {
  exploreLocalProjects: () => Promise<ProjectDisplay[]>;
  importLearningContent: (files: FileList) => Promise<ImportResultDisplay>;
  getRecommendedContent: (
    params: Parameters<ContentAPI['getRecommendedContent']>[0],
  ) => Promise<ContentRecommendationDisplay[]>;
  searchLearningResources: (query: string) => Promise<ResourceSearchResultDisplay>;
  analyzeDocument: (filePath: string) => Promise<DocumentAnalysisDisplay>;
  extractConcepts: (content: string) => Promise<ConceptExtractionDisplay[]>;
};

type LoggerService = {
  child: (meta: Record<string, unknown>) => ILogger;
};

type ContentHandlersDeps = {
  contentService: ContentService;
  loggerService: LoggerService;
};

type ImportParams = {
  files: FileList;
};

export const setupContentHandlers = (
  ipcMainInstance: typeof ipcMain,
  services: ContentHandlersDeps,
): void => {
  const handlerLogger = services.loggerService.child({ handler: 'content' });
  const ok = <T>(data: T, metadata?: APIResponse<T>['metadata']): APIResponse<T> => ({
    success: true,
    data,
    metadata,
  });
  const fail = (code: string, message: string, details?: unknown): APIResponse<never> => ({
    success: false,
    error: { code, message, details },
  });

  ipcMainInstance.handle('content:explore-projects', async () => {
    handlerLogger.info('Handling explore projects request');
    try {
      const projects = await services.contentService.exploreLocalProjects();
      handlerLogger.info('Project exploration completed', { count: projects.length });
      return ok(projects);
    } catch (error) {
      handlerLogger.error('Failed to explore projects', error);
      return fail('content.explore_failed', 'Unable to explore projects', error);
    }
  });

  ipcMainInstance.handle('content:import-content', async (_event, params: ImportParams) => {
    const fileCount = params.files?.length ?? 0;
    handlerLogger.info('Handling import content request', { fileCount });
    try {
      const importResults = await services.contentService.importLearningContent(params.files);
      handlerLogger.info('Content import completed', {
        processed: importResults.processedFiles,
      });
      return ok(importResults);
    } catch (error) {
      handlerLogger.error('Failed to import content', { error, fileCount });
      return fail('content.import_failed', 'Unable to import content', error);
    }
  });

  ipcMainInstance.handle(
    'content:get-recommendations',
    async (_event, params: Parameters<ContentAPI['getRecommendedContent']>[0]) => {
      handlerLogger.info('Handling get recommended content request', params);
      try {
        const recommendedContent = await services.contentService.getRecommendedContent(params);
        return ok(recommendedContent);
      } catch (error) {
        handlerLogger.error('Failed to get recommended content', error);
        return fail('content.recommend_failed', 'Unable to get recommended content', error);
      }
    },
  );

  ipcMainInstance.handle('content:search-resources', async (_event, query: string) => {
    handlerLogger.info('Handling search resources request', { query });
    try {
      const searchResults = await services.contentService.searchLearningResources(query);
      return ok(searchResults);
    } catch (error) {
      handlerLogger.error('Failed to search learning resources', error);
      return fail('content.search_failed', 'Unable to search learning resources', error);
    }
  });

  ipcMainInstance.handle('content:analyze-document', async (_event, filePath: string) => {
    handlerLogger.info('Handling analyze document request', { filePath });
    try {
      const documentAnalysis = await services.contentService.analyzeDocument(filePath);
      return ok(documentAnalysis);
    } catch (error) {
      handlerLogger.error('Failed to analyze document', error);
      return fail('content.analyze_failed', 'Unable to analyze document', error);
    }
  });

  ipcMainInstance.handle('content:extract-concepts', async (_event, content: string) => {
    handlerLogger.info('Handling extract concepts request', { contentLength: content.length });
    try {
      const conceptExtraction = await services.contentService.extractConcepts(content);
      return ok(conceptExtraction);
    } catch (error) {
      handlerLogger.error('Failed to extract concepts', error);
      return fail('content.extract_failed', 'Unable to extract concepts', error);
    }
  });

  handlerLogger.info('Content handlers registered successfully');
};
