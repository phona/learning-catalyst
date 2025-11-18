/**
 * Content & Discovery IPC Handlers
 *
 * Provides spec-compliant IPC channels for the documented content API.
 */

import { ipcMain } from 'electron';

export const setupContentHandlers = (
  ipcMainInstance: typeof ipcMain,
  services: {
    contentService: any;
    loggerService: any;
  }
) => {
  const handlerLogger = services.loggerService.child({ handler: 'content' });

  ipcMainInstance.handle('content:explore-projects', async () => {
    handlerLogger.info('Handling explore projects request');
    try {
      const result = await services.contentService.exploreLocalProjects();
      handlerLogger.info('Project exploration completed', { count: result.projects.length });
      return result;
    } catch (error) {
      handlerLogger.error('Failed to explore projects', error);
      throw error;
    }
  });

  ipcMainInstance.handle('content:import-content', async (_event, params) => {
    handlerLogger.info('Handling import content request', { fileCount: params?.files?.length || 0 });
    try {
      const result = await services.contentService.importLearningContent({ files: params?.files });
      handlerLogger.info('Content import completed', {
        processed: result.importResults.processedFiles
      });
      return result;
    } catch (error) {
      handlerLogger.error('Failed to import content', error, params);
      throw error;
    }
  });

  ipcMainInstance.handle('content:get-recommendations', async (_event, params) => {
    handlerLogger.info('Handling get recommended content request', params);
    try {
      const recommendedContent = await services.contentService.getRecommendedContent(
        params.topic,
        params.level
      );
      return { success: true, recommendedContent };
    } catch (error) {
      handlerLogger.error('Failed to get recommended content', error);
      throw error;
    }
  });

  ipcMainInstance.handle('content:search-resources', async (_event, query) => {
    handlerLogger.info('Handling search resources request', { query });
    try {
      const searchResults = await services.contentService.searchLearningResources(query);
      return { success: true, searchResults };
    } catch (error) {
      handlerLogger.error('Failed to search learning resources', error);
      throw error;
    }
  });

  ipcMainInstance.handle('content:analyze-document', async (_event, filePath) => {
    handlerLogger.info('Handling analyze document request', { filePath });
    try {
      const documentAnalysis = await services.contentService.analyzeDocument(filePath);
      return { success: true, documentAnalysis };
    } catch (error) {
      handlerLogger.error('Failed to analyze document', error);
      throw error;
    }
  });

  ipcMainInstance.handle('content:extract-concepts', async (_event, content) => {
    handlerLogger.info('Handling extract concepts request', { contentLength: content.length });
    try {
      const conceptExtraction = await services.contentService.extractConcepts(content);
      return { success: true, conceptExtraction };
    } catch (error) {
      handlerLogger.error('Failed to extract concepts', error);
      throw error;
    }
  });

  handlerLogger.info('✅ Content handlers registered successfully');
};
