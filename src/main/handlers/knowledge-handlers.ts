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

  ipcMainInstance.handle('knowledge:ingest-concepts', async (_event, params: IngestHandlerParams) => {
    handlerLogger.info('Handling ingest concepts request', {
      concepts: params.result.concepts.length,
      relationships: params.result.relationships.length
    });

    const ingestionResult = await services.knowledgeService.ingestConceptParsingResult(
      params.result,
      params.options
    );

    handlerLogger.info('Concept parsing result ingested', ingestionResult);
    return ingestionResult;
  });

  ipcMainInstance.handle('knowledge:search', async (_event, query: string) => {
    handlerLogger.info('Handling knowledge search request', { query });
    const response: KnowledgeSearchResultDisplay = await services.knowledgeService.searchKnowledge({
      query,
      limit: 24
    });
    handlerLogger.info('Knowledge search completed', { totalResults: response.totalResults });
    return response;
  });

  ipcMainInstance.handle('knowledge:explore-concept', async (_event, params: { conceptName: string; depth: 'basic' | 'intermediate' | 'advanced' }) => {
    handlerLogger.info('Handling concept exploration request', { conceptName: params.conceptName, depth: params.depth });
    const exploration: ConceptExplorationDisplay = await services.knowledgeService.exploreConcept({
      conceptName: params.conceptName,
      depth: params.depth
    });
    handlerLogger.info('Concept exploration returned', { conceptId: exploration.concept.id });
    return exploration;
  });

  ipcMainInstance.handle('knowledge:get-related-concepts', async (_event, conceptId: string) => {
    handlerLogger.info('Handling get related concepts request', { conceptId });
    const relatedConcepts: RelatedConceptsDisplay = await services.knowledgeService.getRelatedConcepts(conceptId);
    handlerLogger.info('Related concepts retrieved', { count: relatedConcepts.relatedConcepts.length });
    return relatedConcepts;
  });

  ipcMainInstance.handle('knowledge:get-map', async (_event, sessionId?: string) => {
    handlerLogger.info('Handling get knowledge map request', { sessionId });
    const knowledgeMap: KnowledgeMapDisplay = await services.knowledgeService.getKnowledgeMap(sessionId);
    handlerLogger.info('Knowledge map returned', { nodes: knowledgeMap.nodes.length, edges: knowledgeMap.edges.length });
    return knowledgeMap;
  });

  handlerLogger.info('✅ Knowledge handlers registered successfully');
};
