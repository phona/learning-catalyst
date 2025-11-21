/* eslint-disable */
import { ipcMain } from 'electron';
import type { ILogger } from '../services/types';
import type {
  ConceptExplorationDisplay,
  ConceptParsingResult,
  KnowledgeMapDisplay,
  KnowledgeSearchResultDisplay,
  RelatedConceptsDisplay
} from '@/shared/types/electron-api/knowledge-api';
import type { KnowledgeService } from '@/main/services/domain/knowledge/knowledge-service';
import type { APIResponse } from '@/shared/types/electron-api';

type KnowledgeHandlersDeps = {
  knowledgeService: KnowledgeService;
  loggerService: { child: (meta: Record<string, unknown>) => ILogger };
};

type IngestHandlerParams = {
  result: ConceptParsingResult;
  options?: {
    userId?: string;
    materialId?: string;
    sessionId?: string;
    source?: string;
  };
};

export const setupKnowledgeHandlers = (
  ipcMainInstance: typeof ipcMain,
  services: KnowledgeHandlersDeps
) => {
  const handlerLogger = services.loggerService.child({ handler: 'knowledge' });
  const ok = <T>(data: T): APIResponse<T> => ({ success: true, data });
  const fail = (code: string, message: string, details?: unknown): APIResponse<never> => ({
    success: false,
    error: { code, message, details }
  });

  ipcMainInstance.handle('knowledge:ingest-concepts', async (_event, params: IngestHandlerParams) => {
    handlerLogger.info('Handling ingest concepts request', {
      concepts: params.result.concepts.length,
      relationships: params.result.relationships.length
    });

    try {
      const ingestionResult = await services.knowledgeService.ingestConceptParsingResult(
        params.result,
        params.options
      );

      handlerLogger.info('Concept parsing result ingested', ingestionResult);
      return ok(ingestionResult);
    } catch (error) {
      handlerLogger.error('Concept ingestion failed', { error });
      return fail('knowledge.ingest_failed', 'Unable to ingest concepts', error);
    }
  });

  ipcMainInstance.handle('knowledge:search', async (_event, query: string) => {
    handlerLogger.info('Handling knowledge search request', { query });
    try {
      const response: KnowledgeSearchResultDisplay = await services.knowledgeService.searchKnowledge({
        query,
        limit: 24
      });
      handlerLogger.info('Knowledge search completed', { totalResults: response.totalResults });
      return ok(response);
    } catch (error) {
      handlerLogger.error('Knowledge search failed', { error });
      return fail('knowledge.search_failed', 'Unable to search knowledge', error);
    }
  });

  ipcMainInstance.handle('knowledge:explore-concept', async (_event, params: { conceptName: string; depth: 'basic' | 'intermediate' | 'advanced' }) => {
    handlerLogger.info('Handling concept exploration request', { conceptName: params.conceptName, depth: params.depth });
    try {
      const exploration: ConceptExplorationDisplay = await services.knowledgeService.exploreConcept({
        conceptName: params.conceptName,
        depth: params.depth
      });
      handlerLogger.info('Concept exploration returned', { conceptId: exploration.concept.id });
      return ok(exploration);
    } catch (error) {
      handlerLogger.error('Concept exploration failed', { error });
      return fail('knowledge.explore_failed', 'Unable to explore concept', error);
    }
  });

  ipcMainInstance.handle('knowledge:get-related-concepts', async (_event, conceptId: string) => {
    handlerLogger.info('Handling get related concepts request', { conceptId });
    try {
      const relatedConcepts: RelatedConceptsDisplay = await services.knowledgeService.getRelatedConcepts(conceptId);
      handlerLogger.info('Related concepts retrieved', { count: relatedConcepts.relatedConcepts.length });
      return ok(relatedConcepts);
    } catch (error) {
      handlerLogger.error('Related concepts failed', { error, conceptId });
      return fail('knowledge.related_failed', 'Unable to get related concepts', error);
    }
  });

  ipcMainInstance.handle('knowledge:get-map', async (_event, sessionId?: string) => {
    handlerLogger.info('Handling get knowledge map request', { sessionId });
    try {
      const knowledgeMap: KnowledgeMapDisplay = await services.knowledgeService.getKnowledgeMap(sessionId);
      handlerLogger.info('Knowledge map returned', { nodes: knowledgeMap.nodes.length, edges: knowledgeMap.edges.length });
      return ok(knowledgeMap);
    } catch (error) {
      handlerLogger.error('Knowledge map failed', { error, sessionId });
      return fail('knowledge.map_failed', 'Unable to get knowledge map', error);
    }
  });

  handlerLogger.info('? Knowledge handlers registered successfully');
};
