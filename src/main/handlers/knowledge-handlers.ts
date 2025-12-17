import { ipcMain } from 'electron';
import type { LoggerService } from '../services/core/logger/logger-service';
import type {
  ConceptExplorationDisplay,
  ConceptParsingResult,
  KnowledgeMapDisplay,
  KnowledgeSearchResultDisplay,
  RelatedConceptsDisplay,
  ConceptIngestionPlan,
} from '@/shared/types/electron-api/knowledge-api';
import type { KnowledgeService } from '@/main/services/domain/knowledge/knowledge-service';
import type { APIResponse } from '@/shared/types/electron-api';
import { IPC_ERROR_CODES } from '@/shared/types/ipc-error';

type KnowledgeHandlersDeps = {
  knowledgeService: KnowledgeService;
  loggerService: LoggerService;
};

type IngestHandlerParams = {
  result: ConceptParsingResult;
  plan?: ConceptIngestionPlan;
  options?: {
    userId?: string;
    materialId?: string;
    sessionId?: string;
    source?: string;
  };
};

export const setupKnowledgeHandlers = (
  ipcMainInstance: typeof ipcMain,
  services: KnowledgeHandlersDeps,
): void => {
  const handlerLogger = services.loggerService.child({ handler: 'knowledge' });

  ipcMainInstance.handle(
    'knowledge:ingest-concepts',
    async (_event, params: IngestHandlerParams) => {
      handlerLogger.info('Handling ingest concepts request', {
        concepts: params.result.concepts.length,
        relationships: params.result.relationships.length,
      });

      const ingestionResult = await services.knowledgeService.ingestConceptParsingResult(
        params.result,
        params.options,
        params.plan,
      );

      handlerLogger.info('Concept parsing result ingested', ingestionResult);
      return ingestionResult;
    },
  );

  ipcMainInstance.handle('knowledge:search', async (_event, query: string) => {
    handlerLogger.info('Handling knowledge search request', { query });
    const response: KnowledgeSearchResultDisplay = await services.knowledgeService.searchKnowledge({
      query,
      limit: 24,
    });
    handlerLogger.info('Knowledge search completed', { totalResults: response.totalResults });
    return response;
  });

  ipcMainInstance.handle(
    'knowledge:explore-concept',
    async (
      _event,
      params: { conceptName: string; depth: 'basic' | 'intermediate' | 'advanced' },
    ) => {
      handlerLogger.info('Handling concept exploration request', {
        conceptName: params.conceptName,
        depth: params.depth,
      });
      const exploration: ConceptExplorationDisplay = await services.knowledgeService.exploreConcept(
        {
          conceptName: params.conceptName,
          depth: params.depth,
        },
      );
      handlerLogger.info('Concept exploration returned', { conceptId: exploration.concept.id });
      return exploration;
    },
  );

  ipcMainInstance.handle('knowledge:get-related-concepts', async (_event, conceptId: string) => {
    handlerLogger.info('Handling get related concepts request', { conceptId });
    const relatedConcepts: RelatedConceptsDisplay =
      await services.knowledgeService.getRelatedConcepts(conceptId);
    handlerLogger.info('Related concepts retrieved', {
      count: relatedConcepts.relatedConcepts.length,
    });
    return relatedConcepts;
  });

  ipcMainInstance.handle('knowledge:get-map', async (_event, sessionId?: string) => {
    const callId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    handlerLogger.info('Handling get knowledge map request', { sessionId, callId });
    const knowledgeMap: KnowledgeMapDisplay =
      await services.knowledgeService.getKnowledgeMap(sessionId);

    // Enhanced logging to trace data structure
    handlerLogger.info('Knowledge map returned from service', {
      callId,
      nodes: knowledgeMap.nodes?.length ?? 0,
      edges: knowledgeMap.edges?.length ?? 0,
      nodesIsArray: Array.isArray(knowledgeMap.nodes),
      edgesIsArray: Array.isArray(knowledgeMap.edges),
      nodesType: typeof knowledgeMap.nodes,
      edgesType: typeof knowledgeMap.edges,
      hasNodes: 'nodes' in knowledgeMap,
      hasEdges: 'edges' in knowledgeMap,
    });

    // Log first few items to verify structure
    if (knowledgeMap.nodes && knowledgeMap.nodes.length > 0) {
      handlerLogger.info('First 3 nodes sample', {
        callId,
        nodesSample: knowledgeMap.nodes.slice(0, 3).map((n) => ({
          id: n.id,
          label: n.label,
          category: n.category,
        })),
      });
    }

    if (knowledgeMap.edges && knowledgeMap.edges.length > 0) {
      handlerLogger.info('First 3 edges sample', {
        callId,
        edgesSample: knowledgeMap.edges.slice(0, 3).map((e) => ({
          from: e.from,
          to: e.to,
          label: e.label,
          type: e.type,
        })),
      });
    }

    // Verify object structure before sending
    const responseData = {
      nodes: knowledgeMap.nodes ?? [],
      edges: knowledgeMap.edges ?? [],
    };

    handlerLogger.info('Prepared response data for IPC', {
      callId,
      responseNodesCount: responseData.nodes.length,
      responseEdgesCount: responseData.edges.length,
      responseNodesIsArray: Array.isArray(responseData.nodes),
      responseEdgesIsArray: Array.isArray(responseData.edges),
      responseNodesKeys: Object.keys(responseData),
      responseEdgesKeys: Object.keys({ edges: responseData.edges }),
    });

    return responseData;
  });

  handlerLogger.info('? Knowledge handlers registered successfully');
};
