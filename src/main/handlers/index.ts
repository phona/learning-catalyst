import { BrowserWindow, ipcMain } from 'electron';
import { setupChatHandlers } from './chat-handlers';
import { setupLearningHandlers } from './learning-handlers';
import { setupKnowledgeHandlers } from './knowledge-handlers';
import { setupAgentHandlers } from './agent-handlers';
import { setupSystemHandlers } from './system-handlers';
import { setupEnhancedSettingsHandlers } from './settings-enhanced-handlers';
import { setupEnhancedAgentHandlers } from './agent-enhanced-handlers';
import { setupContentHandlers } from './content-handlers';
import { setupCompleteAnalyticsHandlers } from './analytics-complete-handlers';
import { setupSettingsHandlers } from './settings-handlers';
import { setupConceptParsingHandlers } from './concept-parsing-handlers';
import { applyStructuredErrorHandling } from './ipc-error-handler';
import { ChatService } from '../services/domain/chat/chat-service';
import { LearningService } from '../services/domain/learning/learning-service';
import { KnowledgeService } from '../services/domain/knowledge/knowledge-service';
import { AnalyticsService } from '../services/domain/analytics/analytics-service';
import { ContentService } from '../services/domain/content/content-service';
import { AIService } from '../services/ai/ai-service';
import { ConceptParsingService } from '../services/domain/concept-parsing/concept-parsing-service';
import { LoggerService } from '../services/core/logger/logger-service';
import { ConfigService } from '../services/core/config/config-service';
import { PracticeService } from '../services/domain/practice/practice-service';

/**
 * Setup all IPC handlers with provided services
 */
export async function setupAllIpcHandlers(
  mainWindow: BrowserWindow | null, 
  workspacePath: string,
  services: {
    chatService: ChatService;
    learningService: LearningService;
    knowledgeService: KnowledgeService;
    analyticsService: AnalyticsService;
    contentService: ContentService;
    aiService: AIService;
    conceptParsingService: ConceptParsingService;
    practiceService: PracticeService;
    loggerService: LoggerService;
    configService: ConfigService;
  }
): Promise<void> {
  applyStructuredErrorHandling();
  // Setup domain handlers with services
  setupChatHandlers(ipcMain, {
    chatService: services.chatService,
    practiceService: services.practiceService,
    loggerService: services.loggerService
  });
  
  setupLearningHandlers(ipcMain, {
    learningService: services.learningService,
    loggerService: services.loggerService
  });
  
  setupKnowledgeHandlers(ipcMain, {
    knowledgeService: services.knowledgeService,
    loggerService: services.loggerService
  });
  
  await setupAgentHandlers(ipcMain, {
    chatService: services.chatService,
    aiService: services.aiService,
    learningService: services.learningService,
    knowledgeService: services.knowledgeService,
    conceptParsingService: services.conceptParsingService,
    analyticsService: services.analyticsService,
    loggerService: services.loggerService,
    configService: services.configService
  });

  // Setup enhanced settings handlers
  setupEnhancedSettingsHandlers(ipcMain, {
    loggerService: services.loggerService
  });

  // Setup basic settings handlers (with workspace path)
  setupSettingsHandlers(workspacePath, {
    loggerService: services.loggerService
  });

  // Setup enhanced agent handlers
  setupEnhancedAgentHandlers(ipcMain, {
    aiService: services.aiService,
    learningService: services.learningService,
    knowledgeService: services.knowledgeService,
    analyticsService: services.analyticsService,
    loggerService: services.loggerService
  });

  // Setup enhanced content handlers
  setupContentHandlers(ipcMain, {
    contentService: services.contentService,
    loggerService: services.loggerService
  });

  // Setup concept parsing handlers
  setupConceptParsingHandlers(ipcMain, {
    conceptParsingService: services.conceptParsingService,
    loggerService: services.loggerService
  });

  // Setup complete analytics handlers
  setupCompleteAnalyticsHandlers(ipcMain, {
    analyticsService: services.analyticsService,
    loggerService: services.loggerService
  });

  // Setup system handlers last to ensure all dependencies are registered
  setupSystemHandlers();

  console.log('✅ All domain IPC handlers registered successfully');
}
