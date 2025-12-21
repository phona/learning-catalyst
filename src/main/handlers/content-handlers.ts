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
import { IPC_ERROR_CODES } from '@/shared/types/ipc-error';

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

  ipcMainInstance.handle('content:explore-projects', async () => {
    handlerLogger.info('Handling explore projects request');
    const projects = await services.contentService.exploreLocalProjects();
    handlerLogger.info('Project exploration completed', { count: projects.length });
    return projects;
  });

  ipcMainInstance.handle('content:import-content', async (_event, params: ImportParams) => {
    const fileCount = params.files?.length ?? 0;
    handlerLogger.info('Handling import content request', { fileCount });
    const importResults = await services.contentService.importLearningContent(params.files);
    handlerLogger.info('Content import completed', {
      processed: importResults.processedFiles,
    });
    return importResults;
  });

  ipcMainInstance.handle(
    'content:get-recommendations',
    async (_event, params: Parameters<ContentAPI['getRecommendedContent']>[0]) => {
      handlerLogger.info('Handling get recommended content request', params);
      const recommendedContent = await services.contentService.getRecommendedContent(params);
      return recommendedContent;
    },
  );

  ipcMainInstance.handle('content:search-resources', async (_event, query: string) => {
    handlerLogger.info('Handling search resources request', { query });
    const searchResults = await services.contentService.searchLearningResources(query);
    return searchResults;
  });

  ipcMainInstance.handle('content:analyze-document', async (_event, filePath: string) => {
    handlerLogger.info('Handling analyze document request', { filePath });
    const documentAnalysis = await services.contentService.analyzeDocument(filePath);
    return documentAnalysis;
  });

  ipcMainInstance.handle('content:extract-concepts', async (_event, content: string) => {
    handlerLogger.info('Handling extract concepts request', { contentLength: content.length });
    const conceptExtraction = await services.contentService.extractConcepts(content);
    return conceptExtraction;
  });

  handlerLogger.info('Content handlers registered successfully');
};
