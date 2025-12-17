import { BrowserWindow } from 'electron';
import { setupLearningHandlers } from './learning-handlers';
import { setupKnowledgeHandlers } from './knowledge-handlers';
import { setupSystemHandlers } from './system-handlers';
import { setupContentHandlers } from './content-handlers';
import { setupCompleteAnalyticsHandlers } from './analytics-complete-handlers';
import { setupConceptParsingHandlers } from './concept-parsing-handlers';
import { setupFilesystemHandlers } from './filesystem-handlers';
import { setupSessionsHandlers } from './sessions-handlers';
import { applyStructuredErrorHandling } from './ipc-error-handler';
import { createIpcProxy } from './ipc-main-proxy';
import { LearningService } from '../services/domain/learning/learning-service';
import { KnowledgeService } from '../services/domain/knowledge/knowledge-service';
import { AnalyticsService } from '../services/domain/analytics/analytics-service';
import { ContentService } from '../services/domain/content/content-service';
import { AIService } from '../services/ai/ai-service';
import { ConceptParsingService } from '../services/domain/concept-parsing/concept-parsing-service';
import { LoggerService } from '../services/core/logger/logger-service';
import { ConfigService } from '../services/core/config/config-service';
import { PracticeService } from '../services/domain/practice/practice-service';
import type { AgentManager } from '@/main/services/agent/agent-manager';
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
    chatService: ChatService;
    checkpointSaver: BaseCheckpointSaver;
  },
): Promise<void> {
  applyStructuredErrorHandling();

  // Create a shared IPC proxy with global logger
  const ipc = createIpcProxy(services.loggerService);

  setupSettingsHandlers(ipc, { configService: services.configService });

  // Setup domain handlers with shared proxy
  setupLearningHandlers(ipc, {
    learningService: services.learningService,
    loggerService: services.loggerService,
  });

  setupKnowledgeHandlers(ipc, {
    knowledgeService: services.knowledgeService,
    loggerService: services.loggerService,
  });

  // Setup enhanced content handlers
  setupContentHandlers(ipc, {
    contentService: services.contentService,
    loggerService: services.loggerService,
  });

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
    learningService: services.learningService,
    loggerService: services.loggerService,
  });

  // Chat domain
  setupChatHandlers(ipc, {
    chatService: services.chatService,
    loggerService: services.loggerService,
    learningService: services.learningService,
    agentManager: services.agentManager,
    checkpointSaver: services.checkpointSaver,
    configService: services.configService,
    providerFactory: services.providerFactory,
    knowledgeService: services.knowledgeService,
    practiceService: services.practiceService,
  });

  // Setup system handlers last to ensure all dependencies are registered
  setupSystemHandlers(ipc);

  console.log('✅ All domain IPC handlers registered successfully');
}
