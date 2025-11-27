import { ipcMain } from 'electron';
import type { ILogger } from '../services/types';
import type {
  ConceptParsingMaterial,
  ConceptParsingService,
  ConceptParsingSettings,
} from '@/main/services/domain/concept-parsing/concept-parsing-service';
import type { APIResponse } from '@/shared/types/electron-api';
import { IPC_ERROR_CODES } from '@/shared/types/ipc-error';

type ConceptParsingFilePayload = {
  fileName?: string;
  filePath?: string;
  title?: string;
  content: string;
  format?: string;
  metadata?: Record<string, unknown>;
  materialId?: string;
};

type ConceptParsingHandlerParams = {
  files?: ConceptParsingFilePayload[];
  content?: string;
  options?: {
    confidenceThreshold?: number;
    maxConceptsPerFile?: number;
  };
  userId?: string;
  materialId?: string;
};

type LoggerService = {
  child: (meta: Record<string, unknown>) => ILogger;
};

type ConceptParsingHandlersDeps = {
  conceptParsingService: ConceptParsingService;
  loggerService: LoggerService;
};

const normalizeMaterial = (
  file: ConceptParsingFilePayload,
  index: number,
): ConceptParsingMaterial => ({
  id: file.materialId ?? file.filePath ?? file.fileName ?? `material-${index}-${Date.now()}`,
  title: file.title ?? file.fileName ?? `Material ${index + 1}`,
  content: file.content,
  format: file.format === 'text' ? 'text' : 'markdown',
  filePath: file.filePath,
  metadata: { order: index, ...file.metadata },
});

export const setupConceptParsingHandlers = (
  ipcMainInstance: typeof ipcMain,
  services: ConceptParsingHandlersDeps,
): void => {
  const handlerLogger = services.loggerService.child({ handler: 'concept-parsing' });
  const ok = <T>(data: T): APIResponse<T> => ({ success: true, data });
  const fail = (code: string, message: string, details?: unknown): APIResponse<never> => ({
    success: false,
    error: { code, message, details },
  });

  ipcMainInstance.handle(
    'knowledge:parse-concepts',
    async (_event, params: ConceptParsingHandlerParams) => {
      const files = params.files ?? [];
      handlerLogger.info('Handling concept parsing request', {
        files: files.length,
        userId: params.userId,
      });

      const materials = files.map((file, index) => normalizeMaterial(file, index));
      const hasInlineContent =
        params.content !== undefined && params.content !== null && params.content !== '';
      if (hasInlineContent) {
        materials.push({
          id: params.materialId ?? `inline-${Date.now()}`,
          title: params.materialId ?? 'inline-content',
          content: params.content ?? '',
          format: 'text',
        });
      }

      const settings: ConceptParsingSettings = {
        userId: params.userId,
        options: {
          confidenceThreshold: params.options?.confidenceThreshold,
          maxConceptsPerSegment: params.options?.maxConceptsPerFile,
        },
      };

      try {
        const result = await services.conceptParsingService.parseMaterials(materials, settings);
        handlerLogger.info('Concept parsing completed', {
          success: result.success,
          concepts: result.concepts.length,
          relationships: result.relationships.length,
        });
        return ok(result);
      } catch (error) {
        handlerLogger.error('Concept parsing failed', { error });
        return fail(IPC_ERROR_CODES.knowledge.parseFailed, 'Unable to parse concepts', error);
      }
    },
  );
};
