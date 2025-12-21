import { BrowserWindow } from 'electron';
import { setupKnowledgeHandlers } from './knowledge-handlers';
import { setupSystemHandlers } from './system-handlers';

import { setupCompleteAnalyticsHandlers } from './analytics-complete-handlers';
import { setupConceptParsingHandlers } from './concept-parsing-handlers';
import { setupFilesystemHandlers } from './filesystem-handlers';
import { setupSessionsHandlers } from './sessions-handlers';
import { applyStructuredErrorHandling } from './ipc-error-handler';
import { createIpcProxy } from './ipc-main-proxy';
import { KnowledgeService } from '../services/domain/knowledge/knowledge-service';
import { AnalyticsService } from '../services/domain/analytics/analytics-service';

import { AIService } from '../services/ai/ai-service';
import { ConceptParsingService } from '../services/domain/concept-parsing/concept-parsing-service';
import { LoggerService } from '../services/core/logger/logger-service';
import { ConfigService } from '../services/core/config/config-service';
import { PracticeService } from '../services/domain/practice/practice-service';
import { Kysely } from 'kysely';
import { Database } from '../services/core/database';
import type { ProviderFactory } from '@/main/services/agent/provider-factory';
import { setupChatHandlers } from './chat-handlers';
import { ChatService } from '../services/domain/chat';
import { BaseCheckpointSaver } from '@langchain/langgraph-checkpoint';
import { setupSettingsHandlers } from './settings-handlers';

/**
 * Setup all IPC handlers with provided services
 */
export async function setupAllIpcHandlers(
  mainWindow: BrowserWindow,
  workspacePath: string,
  services: {
    db: Kysely<Database>;
    knowledgeService: KnowledgeService;
    analyticsService: AnalyticsService;
    contentService: any;
    aiService: AIService;
    conceptParsingService: ConceptParsingService;
    practiceService: PracticeService;
    loggerService: LoggerService;
    configService: ConfigService;
    providerFactory: ProviderFactory;
    chatService: ChatService;
    checkpointSaver: BaseCheckpointSaver;
    learningService: any;
  },
): Promise<void> {
  applyStructuredErrorHandling();

  // Create a shared IPC proxy with global logger
  const ipc = createIpcProxy(services.loggerService);

  setupSettingsHandlers(ipc, { configService: services.configService });

  // Setup domain handlers with shared proxy
  setupKnowledgeHandlers(ipc, {
    knowledgeService: services.knowledgeService,
    loggerService: services.loggerService,
  });

  // Setup enhanced content handlers

  // Setup concept parsing handlers
  setupConceptParsingHandlers(ipc, {
    conceptParsingService: services.conceptParsingService,
    loggerService: services.loggerService,
    configService: services.configService,
  });

  // Setup complete analytics handlers
  setupCompleteAnalyticsHandlers(ipc, {
    analyticsService: services.analyticsService,
    loggerService: services.loggerService,
  });

  // Filesystem + workspace helpers
  setupFilesystemHandlers(ipc, {
    workspacePath,
    loggerService: services.loggerService,
  });

  // Sessions domain
  setupSessionsHandlers(ipc, {
    loggerService: services.loggerService,
    learningService: services.learningService,
  });

  // Chat domain
  setupChatHandlers(ipc, {
    chatService: services.chatService,
    loggerService: services.loggerService,
    checkpointSaver: services.checkpointSaver,
    configService: services.configService,
    providerFactory: services.providerFactory,
    knowledgeService: services.knowledgeService,
    practiceService: services.practiceService,
    learningService: services.learningService,
  });

  // Setup system handlers last to ensure all dependencies are registered
  setupSystemHandlers(ipc);

  console.log('✅ All domain IPC handlers registered successfully');
}
