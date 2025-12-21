import { ipcMain } from 'electron';
import type { ILogger } from '../services/types';
import type {
  ConceptParsingMaterial,
  ConceptParsingService,
  ConceptParsingSettings,
} from '@/main/services/domain/concept-parsing/concept-parsing-service';
import type { APIResponse } from '@/shared/types/electron-api';
import { IPC_ERROR_CODES } from '@/shared/types/ipc-error';
import type { ConfigService } from '../services/core/config/config-service';

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
  jobId?: string;
  resume?: boolean;
};

type LoggerService = {
  child: (meta: Record<string, unknown>) => ILogger;
};

type ConceptParsingHandlersDeps = {
  conceptParsingService: ConceptParsingService;
  loggerService: LoggerService;
  configService: ConfigService;
};

export const buildParsingSettings = async (
  params: ConceptParsingHandlerParams,
  configService: ConfigService,
): Promise<ConceptParsingSettings> => {
  const clampDepth = (d?: number) => {
    if (!d && d !== 0) return undefined;
    return Math.max(1, Math.min(6, d));
  };

  const settings: ConceptParsingSettings = {
    userId: params.userId,
    jobId: params.jobId,
    resume: params.resume,
    options: {
      confidenceThreshold: params.options?.confidenceThreshold,
      maxConceptsPerSegment: params.options?.maxConceptsPerFile,
    },
    // Always enable vectorization so downstream tools can rely on embeddings
    vectorize: true,
  };

  try {
    const ui = await configService.get('ui');
    const depth = clampDepth((ui as any)?.documentHeadingDepth);
    if (depth !== undefined) {
      settings.maxHeadingDepth = depth;
    }
  } catch {
    // ignore ui config read errors
  }

  try {
    const parsing = await configService.get('parsing');
    if (parsing) {
      settings.maxSegmentChars = parsing.maxSegmentChars ?? settings.maxSegmentChars;
      settings.minSegmentChars = parsing.minSegmentChars ?? settings.minSegmentChars;
      settings.options = {
        ...settings.options,
        maxConcurrentSegments:
          parsing.maxConcurrentSegments ?? settings.options?.maxConcurrentSegments,
      };
    }
  } catch {
    // ignore parsing config read errors
  }

  return settings;
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

  ipcMainInstance.handle(
    'knowledge:parse-concepts',
    async (_event, params: ConceptParsingHandlerParams) => {
      try {
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

        const settings = await buildParsingSettings(params, services.configService);
        const result = await services.conceptParsingService.parseMaterials(materials, settings);
        handlerLogger.info('Concept parsing completed', {
          success: result.success,
          concepts: result.concepts.length,
          relationships: result.relationships.length,
        });
        return result;
      } catch (error) {
        handlerLogger.error('Concept parsing failed', {
          message: error instanceof Error ? error.message : String(error),
          name: error instanceof Error ? error.name : 'Error',
          stack: error instanceof Error ? error.stack : undefined,
        });

        return {
          success: false,
          error: {
            type: 'SYSTEM_ERROR',
            code: 'knowledge.parse_failed',
            message: 'Unable to parse concepts',
            details: error instanceof Error
              ? {
                message: error.message,
                name: error.name,
                stack: error.stack,
              }
              : { message: String(error) },
          },
        };
      }
    },
  );

  ipcMainInstance.handle('knowledge:clear-parsing-jobs', async () => {
    try {
      const result = await services.conceptParsingService.clearJobCache();
      handlerLogger.info('Cleared parsing job cache', result);
      return result;
    } catch (error) {
      handlerLogger.error('Failed to clear parsing job cache', {
        message: error instanceof Error ? error.message : String(error),
        name: error instanceof Error ? error.name : 'Error',
        stack: error instanceof Error ? error.stack : undefined,
      });

      return {
        success: false,
        error: {
          type: 'SYSTEM_ERROR',
          code: 'knowledge.parse_failed',
          message: 'Unable to clear parsing cache',
          details: error instanceof Error
            ? {
              message: error.message,
              name: error.name,
              stack: error.stack,
            }
            : { message: String(error) },
        },
      };
    }
  });
};
