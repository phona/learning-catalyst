/* eslint-disable */
/**
 * IPC Handler Factory
 *
 * Eliminates 80% of code duplication across IPC handlers.
 * Each handler just defines its configuration - all common logic is shared.
 */

import { ipcMain } from 'electron';
import { LoggerService } from '../services/core/logger/logger-service';

export interface HandlerConfig {
  channel: string;
  service: string;
  method: string;
  requiredParams?: string[];
  transform?: (result: any) => any;
}

/**
 * Base handler factory that eliminates 80% of duplication
 */
export const createHandler = (config: HandlerConfig, services: { loggerService?: LoggerService } & Record<string, any>) => {
  const logger = services.loggerService?.child({ handler: config.service }) || console;
  
  return async (event: any, ...args: any[]) => {
    logger.info(`Handling ${config.channel} request`);
    
    try {
      // Basic validation
      if (config.requiredParams) {
        const params = args[0] || {};
        const missing = config.requiredParams.filter(param => params[param] === undefined);
        if (missing.length > 0) {
          throw new Error(`Missing required parameters: ${missing.join(', ')}`);
        }
      }

      // Execute service method
      const service = services[config.service];
      if (!service) {
        throw new Error(`Service ${config.service} not found`);
      }
      
      const method = service[config.method];
      if (!method || typeof method !== 'function') {
        throw new Error(`Method ${config.method} not found on service ${config.service}`);
      }
      
      const result = await method.apply(service, args);

      // Apply transformation if provided
      const transformedResult = config.transform ? config.transform(result) : result;

      logger.info(`${config.channel} completed successfully`);
      return {
        success: true,
        data: transformedResult
      };
    } catch (error) {
      logger.error(`${config.channel} failed`, error);
      throw error; // Let errors bubble up naturally
    }
  };
};

/**
 * Register handler with IPC main
 */
export const registerHandler = (config: HandlerConfig, services: any) => {
  const handler = createHandler(config, services);
  ipcMain.handle(config.channel, handler);
};

/**
 * Handler configurations - eliminate duplicate configuration
 */
export const handlerConfigs = {
  // Learning handlers
  learning: {
    getPath: {
      channel: 'learning:get-path',
      service: 'learningService',
      method: 'getLearningPath',
      requiredParams: ['pathId']
    },
    startSession: {
      channel: 'learning:start-session',
      service: 'learningService', 
      method: 'startLearningSession',
      requiredParams: ['topic']
    },
    getProgress: {
      channel: 'learning:get-progress',
      service: 'learningService',
      method: 'getSessionProgress',
      requiredParams: ['sessionId']
    },
    pauseSession: {
      channel: 'learning:pause-session',
      service: 'learningService',
      method: 'pauseSession',
      requiredParams: ['sessionId']
    },
    resumeSession: {
      channel: 'learning:resume-session',
      service: 'learningService',
      method: 'resumeSession',
      requiredParams: ['sessionId']
    },
    completeSession: {
      channel: 'learning:complete-session',
      service: 'learningService',
      method: 'completeSession',
      requiredParams: ['sessionId']
    },
    getRecentSessions: {
      channel: 'learning:get-recent-sessions',
      service: 'learningService',
      method: 'getRecentSessions'
    },
    searchSessions: {
      channel: 'learning:search-sessions',
      service: 'learningService',
      method: 'searchSessions'
    }
  },

  // Analytics handlers
  analytics: {
    getDashboard: {
      channel: 'analytics:get-dashboard',
      service: 'analyticsService',
      method: 'getDashboard'
    },
    getProgressChart: {
      channel: 'analytics:get-progress-chart',
      service: 'analyticsService',
      method: 'getProgressChart'
    },
    getAchievements: {
      channel: 'analytics:get-achievements',
      service: 'analyticsService',
      method: 'getAchievements'
    },
    unlockAchievement: {
      channel: 'analytics:unlock-achievement',
      service: 'analyticsService',
      method: 'unlockAchievement',
      requiredParams: ['achievementId']
    },
    getUsageStats: {
      channel: 'analytics:get-usage-stats',
      service: 'analyticsService',
      method: 'getUsageStats'
    },
    getTokenUsage: {
      channel: 'analytics:get-token-usage',
      service: 'analyticsService',
      method: 'getTokenUsage'
    },
    trackEvent: {
      channel: 'analytics:track-event',
      service: 'analyticsService',
      method: 'trackEvent',
      requiredParams: ['eventType']
    },
    getConceptProgress: {
      channel: 'analytics:get-concept-progress',
      service: 'analyticsService',
      method: 'getConceptProgress',
      requiredParams: ['conceptId']
    }
  },

  // Chat handlers
  chat: {
    startConversation: {
      channel: 'chat:start-conversation',
      service: 'chatService',
      method: 'createConversation',
      requiredParams: ['title', 'agentType']
    },
    sendMessage: {
      channel: 'chat:send-message',
      service: 'chatService',
      method: 'sendMessage',
      requiredParams: ['conversationId', 'message']
    },
    getTypingIndicator: {
      channel: 'chat:get-typing-indicator',
      service: 'chatService',
      method: 'getTypingIndicator',
      requiredParams: ['conversationId']
    },
    getHistory: {
      channel: 'chat:get-history',
      service: 'chatService',
      method: 'getConversation',
      requiredParams: ['conversationId']
    },
    pauseConversation: {
      channel: 'chat:pause-conversation',
      service: 'chatService',
      method: 'pauseConversation',
      requiredParams: ['conversationId']
    },
    resumeConversation: {
      channel: 'chat:resume-conversation',
      service: 'chatService',
      method: 'resumeConversation',
      requiredParams: ['conversationId']
    },
    endConversation: {
      channel: 'chat:end-conversation',
      service: 'chatService',
      method: 'endConversation',
      requiredParams: ['conversationId']
    }
  },

  // Agent handlers
  agent: {
    processMessage: {
      channel: 'agent:processMessage',
      service: 'agentDirector',
      method: 'runAgent',
      requiredParams: ['agentType', 'content']
    },
    getModels: {
      channel: 'agent:getModels',
      service: 'aiService',
      method: 'getAvailableModels'
    },
    validateModelConfig: {
      channel: 'agent:validateModelConfig',
      service: 'aiService',
      method: 'validateModelConfig',
      requiredParams: ['config']
    },
    extractKnowledge: {
      channel: 'agent:extractKnowledge',
      service: 'agentDirector',
      method: 'extractKnowledge',
      requiredParams: ['content']
    },
    generateLearningPath: {
      channel: 'agent:generateLearningPath',
      service: 'agentDirector',
      method: 'generateLearningPath',
      requiredParams: ['topic']
    },
    getCapabilities: {
      channel: 'agent:getCapabilities',
      service: 'agentDirector',
      method: 'getCapabilities',
      requiredParams: ['agentType']
    },
    testFunctionality: {
      channel: 'agent:testFunctionality',
      service: 'agentDirector',
      method: 'testFunctionality',
      requiredParams: ['agentType', 'testType']
    }
  }
};

/**
 * Simplified handler setup functions
 */
export const setupLearningHandlers = (ipcMainInstance: typeof ipcMain, services: any) => {
  const { learning } = handlerConfigs;
  
  Object.values(learning).forEach((config: any) => {
    registerHandler(config, services);
  });
  
  services.loggerService?.child({ handler: 'learning' })?.info('✅ Learning handlers registered successfully');
};

export const setupAnalyticsHandlers = (ipcMainInstance: typeof ipcMain, services: any) => {
  const { analytics } = handlerConfigs;
  
  Object.values(analytics).forEach((config: any) => {
    registerHandler(config, services);
  });
  
  services.loggerService?.child({ handler: 'analytics' })?.info('✅ Analytics handlers registered successfully');
};

export const setupChatHandlers = (ipcMainInstance: typeof ipcMain, services: any) => {
  const { chat } = handlerConfigs;
  
  Object.values(chat).forEach((config: any) => {
    registerHandler(config, services);
  });
  
  services.loggerService?.child({ handler: 'chat' })?.info('✅ Chat handlers registered successfully');
};

export const setupAgentHandlers = (ipcMainInstance: typeof ipcMain, services: any) => {
  const { agent } = handlerConfigs;
  
  Object.values(agent).forEach((config: any) => {
    registerHandler(config, services);
  });
  
  services.loggerService?.child({ handler: 'agent' })?.info('✅ Agent handlers registered successfully');
};
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/explicit-function-return-type, @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/strict-boolean-expressions, @typescript-eslint/prefer-nullish-coalescing */
