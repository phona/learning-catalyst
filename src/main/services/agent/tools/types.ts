/**
 * Simple tool interfaces for agent tools
 */

import type { LoggerService } from '@/main/services/core/logger/logger-service';
import type { ConceptParsingService } from '@/main/services/domain/concept-parsing/concept-parsing-service';
import type { LearningService } from '@/main/services/domain/learning/learning-service';
import type { ConfigService } from '@/main/services/core/config/config-service';

export interface ToolParams {
  [key: string]: unknown;
}

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

export interface ToolServices {
  conceptParsingService: ConceptParsingService;
  learningService: LearningService;
  loggerService: LoggerService;
  configService: ConfigService;
}
