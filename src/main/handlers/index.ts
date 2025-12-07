import { BrowserWindow, ipcMain } from 'electron';
import { setupLearningHandlers } from './learning-handlers';
import { setupKnowledgeHandlers } from './knowledge-handlers';
import { setupSystemHandlers } from './system-handlers';
import { setupEnhancedAgentHandlers } from './agent-enhanced-handlers';
import { setupContentHandlers } from './content-handlers';
import { setupCompleteAnalyticsHandlers } from './analytics-complete-handlers';
import { setupConceptParsingHandlers } from './concept-parsing-handlers';
import { setupFilesystemHandlers } from './filesystem-handlers';
import { setupSessionsHandlers } from './sessions-handlers';
import { setupCatalystHandlers } from './catalyst-handlers';
import { applyStructuredErrorHandling } from './ipc-error-handler';
import { LearningService } from '../services/domain/learning/learning-service';
import { KnowledgeService } from '../services/domain/knowledge/knowledge-service';
import { AnalyticsService } from '../services/domain/analytics/analytics-service';
import { ContentService } from '../services/domain/content/content-service';
import { AIService } from '../services/ai/ai-service';
import { ConceptParsingService } from '../services/domain/concept-parsing/concept-parsing-service';
import { LoggerService } from '../services/core/logger/logger-service';
import { ConfigService } from '../services/core/config/config-service';
import { PracticeService } from '../services/domain/practice/practice-service';
import { setupLangGraphHandler } from './langgraph-handler';
import type { AgentManager } from '@/main/services/agent/agent-manager';
import { Kysely } from 'kysely';
import { Database } from '../services/core/database';
import type { ProviderFactory } from '@/main/services/agent/provider-factory';

/**
 * Setup all IPC handlers with provided services
 */
export async function setupAllIpcHandlers(
  mainWindow: BrowserWindow,
  workspacePath: string,
  services: {
    agentManager: AgentManager;
    db: Kysely<Database>;
    learningService: LearningService;
    knowledgeService: KnowledgeService;
    analyticsService: AnalyticsService;
    contentService: ContentService;
    aiService: AIService;
    conceptParsingService: ConceptParsingService;
    practiceService: PracticeService;
    loggerService: LoggerService;
    configService: ConfigService;
    providerFactory: ProviderFactory;
  },
): Promise<void> {
  applyStructuredErrorHandling();
  // Setup domain handlers with services
  setupLangGraphHandler({
    window: mainWindow,
    agentManager: services.agentManager,
    loggerService: services.loggerService,
    db: services.db,
    configService: services.configService,
    providerFactory: services.providerFactory,
    knowledgeService: services.knowledgeService,
    practiceService: services.practiceService,
    learningService: services.learningService,
  });

  setupLearningHandlers(ipcMain, {
    learningService: services.learningService,
    loggerService: services.loggerService,
  });

  setupKnowledgeHandlers(ipcMain, {
    knowledgeService: services.knowledgeService,
    loggerService: services.loggerService,
  });

  // Setup enhanced agent handlers
  setupEnhancedAgentHandlers(ipcMain, {
    aiService: services.aiService,
    learningService: services.learningService,
    knowledgeService: services.knowledgeService,
    loggerService: services.loggerService,
  });

  // Setup enhanced content handlers
  setupContentHandlers(ipcMain, {
    contentService: services.contentService,
    loggerService: services.loggerService,
  });

  // Setup concept parsing handlers
  setupConceptParsingHandlers(ipcMain, {
    conceptParsingService: services.conceptParsingService,
    loggerService: services.loggerService,
    configService: services.configService,
  });

  // Setup complete analytics handlers
  setupCompleteAnalyticsHandlers(ipcMain, {
    analyticsService: services.analyticsService,
    loggerService: services.loggerService,
  });

  // Filesystem + workspace helpers
  setupFilesystemHandlers(ipcMain, {
    workspacePath,
    loggerService: services.loggerService,
  });

  // Sessions domain
  setupSessionsHandlers(ipcMain, {
    learningService: services.learningService,
    loggerService: services.loggerService,
  });

  // Catalyst bridge
  setupCatalystHandlers(ipcMain, {
    loggerService: services.loggerService,
  });

  // Setup system handlers last to ensure all dependencies are registered
  setupSystemHandlers();

  console.log('✅ All domain IPC handlers registered successfully');
}
