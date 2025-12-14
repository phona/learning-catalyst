/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call, @typescript-eslint/strict-boolean-expressions, @typescript-eslint/explicit-function-return-type, @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-unused-vars */
import { ipcMain } from 'electron';
import { HumanMessage, AIMessage } from '@langchain/core/messages';
import {
  createAgentManager,
  type AgentManagerRequest,
  type AgentManagerResult,
} from '@/main/services/agent/agent-manager';
import type {
  ConceptParsingMaterial,
  ConceptParsingService,
} from '@/main/services/domain/concept-parsing/concept-parsing-service';
import { LearningService } from '../services/domain/learning/learning-service';
import { AnalyticsService } from '../services/domain/analytics/analytics-service';
import { LoggerService } from '../services/core/logger/logger-service';
import { AiService } from '../services/ai/ai-service';
import { ConfigService } from '../services/core/config/config-service';
import { KnowledgeService } from '../services/domain/knowledge/knowledge-service';
import type { AgentType } from '@/main/services/agent/types';

type AgentProcessMessageParams = {
  agentType: AgentType;
  content: string;
  userId?: string;
  conversationId?: string;
  topic?: string;
};

type AgentModelQuery = {
  provider?: string;
};

type ModelConfig = {
  apiKey: string;
  provider?: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
};

type KnowledgeExtractionParams = {
  content: string;
  userId?: string;
  context?: {
    topic?: string;
    [key: string]: unknown;
  };
};

type LearningPathParams = {
  topic: string;
  userId?: string;
  context?: Record<string, unknown>;
};

type AgentCapabilitiesParams = {
  agentType: AgentType;
};

type AgentTestParams = {
  agentType: AgentType;
  testType: string;
  topic?: string;
  testMessage?: string;
  userId?: string;
};

/**
 * Agent IPC Handlers
 *
 * Updated handlers that use the refactored AgentManager with consolidated tool implementations.
 * Follows the patterns from electron-api-doc.md for display-optimized responses.
 */
export const setupAgentHandlers = async (
  ipcMainInstance: typeof ipcMain,
  services: {
    learningService: LearningService;
    knowledgeService: KnowledgeService;
    analyticsService: AnalyticsService;
    loggerService: LoggerService;
    aiService: AiService;
    conceptParsingService: ConceptParsingService;
    configService: ConfigService;
  },
): Promise<void> => {
  const handlerLogger = services.loggerService.child({ handler: 'agent' });

  // Create the AgentManager with all required dependencies
  const agentManager = await createAgentManager({
    aiService: services.aiService,
    analyticsService: services.analyticsService,
    conceptParsingService: services.conceptParsingService,
    learningService: services.learningService,
    loggerService: services.loggerService,
    configService: services.configService,
  });

  /**
   * Process a message through the agent system using refactored tools
   * This handler uses the AgentManager instead of direct service calls
   */
  ipcMainInstance.handle(
    'agent:processMessage',
    async (_event, params: AgentProcessMessageParams) => {
      handlerLogger.info('Handling agent process message request', {
        agentType: params.agentType,
        contentLength: params.content?.length,
        userId: params.userId,
        conversationId: params.conversationId,
      });

      try {
        const conversationId =
          params.conversationId ??
          `conversation_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

        // Create AgentManager request
        const request: AgentManagerRequest = {
          agentType: params.agentType,
          conversationId,
          messages: [new HumanMessage(params.content)],
          topic: params.topic,
          userId: params.userId,
        };

        // Use the AgentManager with refactored tools
        const result: AgentManagerResult = await agentManager.runAgent(request);

        // Track the interaction with analytics
        if (params.userId) {
          await services.analyticsService.trackEvent({
            eventType: 'message_sent',
            userId: params.userId,
            properties: {
              agentType: result.agentType,
              provider: result.provider,
              model: result.model,
              toolSystemVersion: '2.0.0',
            },
            context: {
              source: 'agent-handler',
              conversationId,
              topic: params.topic,
            },
          });
        }

        // Create display-optimized response
        const displayResponse = {
          content: result.content,
          model: result.model,
          usage: {
            tokensUsed: 0, // TODO: Extract from result if available
            provider: result.provider,
          },
          timestamp: new Date().toISOString(),
          conversationId,
          agentInfo: {
            type: result.agentType,
            provider: result.provider,
            model: result.model,
          },
        };

        // Store in chat service for conversation history
        const { userMessage, assistantMessage } = await services.chatService.sendMessage({
          conversationId,
          role: 'user',
          content: params.content,
          metadata: {
            agentType: params.agentType,
            userId: params.userId,
            topic: params.topic,
            toolSystemVersion: '2.0.0',
          },
        });

        // Add assistant message
        await services.chatService.sendMessage({
          conversationId,
          role: 'assistant',
          content: result.content,
          metadata: {
            agentType: result.agentType,
            provider: result.provider,
            model: result.model,
            toolSystemVersion: '2.0.0',
          },
        });

        handlerLogger.info('Agent message processed successfully using refactored tools', {
          agentType: result.agentType,
          provider: result.provider,
          contentLength: result.content.length,
        });

        return {
          success: true,
          response: displayResponse,
          userMessage,
          assistantMessage,
          metadata: {
            toolSystemVersion: '2.0.0',
            AgentManagerVersion: '2.0.0',
          },
        };
      } catch (error) {
        handlerLogger.error('Failed to process agent message with AgentManager', {
          error,
          agentType: params.agentType,
          userId: params.userId,
        });
        throw error;
      }
    },
  );

  /**
   * Get available AI models
   */
  ipcMainInstance.handle('agent:getModels', async (_event, params: AgentModelQuery) => {
    const provider = params?.provider;
    handlerLogger.info('Handling get available models request', {
      provider: provider ?? 'all',
    });

    try {
      const allModels = await services.aiService.getAvailableModels();

      let filteredModels = allModels;

      // Filter by provider if specified
      if (provider) {
        const normalizedProvider = provider.toLowerCase();
        filteredModels = allModels.filter(
          (model) => model.provider.toLowerCase() === normalizedProvider,
        );

        handlerLogger.info('Models filtered by provider', {
          provider: normalizedProvider,
          filteredCount: filteredModels.length,
          totalCount: allModels.length,
        });
      }

      // Transform to display-optimized format
      const displayModels = filteredModels.map((model) => ({
        id: model.id,
        name: model.name,
        provider: model.provider,
        maxTokens: model.maxTokens,
        description: model.description,
        pricing: model.pricing ?? { inputCost: 0, outputCost: 0 },
      }));

      const count = displayModels.length;
      if (provider && count === 0) {
        handlerLogger.warn('No models found for provider', { provider });
        return {
          success: true,
          models: displayModels,
          metadata: {
            providerRequested: provider,
            modelsFound: 0,
            message: `No models available for provider: ${provider}`,
          },
        };
      }

      handlerLogger.info('Available models retrieved successfully', {
        count,
        provider: provider ?? 'all',
      });
      return {
        success: true,
        models: displayModels,
        metadata: {
          provider: provider ?? 'all',
          totalModels: count,
        },
      };
    } catch (error) {
      handlerLogger.error('Failed to get available models', { error, provider });
      throw error;
    }
  });

  /**
   * Validate model configuration
   */
  ipcMainInstance.handle('agent:validateModelConfig', async (_event, config: ModelConfig) => {
    handlerLogger.info('Handling validate model configuration request', {
      model: config.model,
    });

    try {
      const providers = services.aiService.getProviders();
      const provider = providers[config.provider ?? 'openai'];
      const isValid = provider ? provider.validateConfig(config) : false;

      handlerLogger.info('Model configuration validated', {
        model: config.model,
        isValid,
        provider: config.provider,
      });
      return { success: true, valid: isValid };
    } catch (error) {
      handlerLogger.error('Failed to validate model configuration', error);
      throw error;
    }
  });

  /**
   * Perform knowledge extraction via refactored tools
   * Now uses the AgentManager's knowledge extraction tool
   */
  ipcMainInstance.handle('agent:extractKnowledge', async (event, params) => {
    handlerLogger.info('Handling agent knowledge extraction request with refactored tools', {
      contentLength: params.content?.length,
      userId: params.userId,
    });

    try {
      const conversationId = `knowledge_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      // Use AgentManager with knowledge_extraction tool
      const request: AgentManagerRequest = {
        agentType: 'learning',
        conversationId,
        messages: [new HumanMessage(params.content)],
        topic: params.context?.topic ?? 'knowledge_extraction',
        userId: params.userId,
      };

      const result = await agentManager.runAgent(request);

      // The AgentManager's knowledge extraction tool returns structured data
      // We can parse this or use the direct concept parsing service for more detailed results
      const material: ConceptParsingMaterial = {
        id: `agent-${Date.now()}`,
        title: params.context?.topic ?? 'agent-knowledge-extraction',
        content: params.content,
        format: 'text',
        metadata: {
          ...params.context,
          userId: params.userId,
          extractedBy: 'agent-director',
          toolVersion: '2.0.0',
        },
      };

      const clampDepth = (d?: number) => {
        if (!d && d !== 0) return undefined;
        return Math.max(1, Math.min(6, d));
      };

      let maxDepth: number | undefined;
      try {
        const ui = await services.configService.get('ui');
        maxDepth = clampDepth((ui as any)?.documentHeadingDepth);
      } catch {}

      const parsingResult = await services.conceptParsingService.parseMaterials([material], {
        userId: params.userId,
        maxHeadingDepth: maxDepth,
        options: { confidenceThreshold: 0.5 },
      });

      handlerLogger.info('Agent knowledge extraction completed using refactored tools', {
        nodeCount: parsingResult.concepts.length,
        relationshipCount: parsingResult.relationships.length,
        agentResponseLength: result.content.length,
      });

      return {
        success: true,
        extractionResult: {
          ...parsingResult,
          agentResponse: result.content,
          metadata: {
            ...parsingResult.metadata,
            AgentManagerVersion: '2.0.0',
            toolSystemVersion: '2.0.0',
          },
        },
      };
    } catch (error) {
      handlerLogger.error('Failed to extract knowledge via AgentManager', {
        error,
        userId: params.userId,
      });
      throw error;
    }
  });

  /**
   * Generate learning path via refactored tools
   * Now uses the AgentManager's learning path tool
   */
  ipcMainInstance.handle('agent:generateLearningPath', async (event, params) => {
    handlerLogger.info('Handling agent learning path generation request with refactored tools', {
      userId: params.userId,
      topic: params.topic,
    });

    try {
      const conversationId = `learning_path_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      // Use AgentManager with learning_path tool
      const request: AgentManagerRequest = {
        agentType: 'learning',
        conversationId,
        messages: [
          new HumanMessage(`Create a learning path for: ${params.topic}`),
        ],
        topic: params.topic,
        userId: params.userId,
      };

      const result = await agentManager.runAgent(request);

      // Also get structured learning paths from the service
      const servicePaths = await services.learningService.getRecommendedPaths(params.userId, {
        topic: params.topic,
        ...params.context,
      });

      handlerLogger.info('Agent learning path generation completed using refactored tools', {
        pathCount: servicePaths.length,
        userId: params.userId,
        agentResponseLength: result.content.length,
      });

      return {
        success: true,
        learningPaths: {
          servicePaths,
          agentResponse: result.content,
          metadata: {
            AgentManagerVersion: '2.0.0',
            toolSystemVersion: '2.0.0',
            generatedAt: new Date().toISOString(),
          },
        },
      };
    } catch (error) {
      handlerLogger.error('Failed to generate learning path via AgentManager', {
        error,
        topic: params.topic,
        userId: params.userId,
      });
      throw error;
    }
  });

  /**
   * Get agent capabilities using the refactored tool system
   */
  ipcMainInstance.handle('agent:getCapabilities', async (event, params) => {
    handlerLogger.info('Handling agent capabilities request', {
      agentType: params.agentType,
    });

    try {
      // Define capabilities based on the refactored tool system
      const capabilities = {
        learning: {
          id: 'learning_agent',
          type: 'learning' as const,
          name: 'Learning Assistant',
          description:
            'Guides through structured learning paths and concepts using refactored tools',
          capabilities: ['knowledge_extraction', 'content_analysis', 'learning_path_creation'],
          systemPrompt:
            'You are a supportive learning assistant. Help learners understand concepts, connect ideas, and recommend next steps.',
          metadata: {
            toolSystemVersion: '2.0.0',
            AgentManagerVersion: '2.0.0',
            toolsCount: 4,
            capabilities: [
              'concept_explanation',
              'learning_path_recommendation',
              'content_analysis',
              'knowledge_extraction',
            ],
          },
        },
        tutoring: {
          id: 'tutoring_agent',
          type: 'tutoring' as const,
          name: 'Tutor Assistant',
          description: 'Provides step-by-step tutoring and practice exercises',
          capabilities: [
            'knowledge_extraction',
            'content_analysis',
            'learning_path_creation',
            'assessment_feedback',
          ],
          systemPrompt:
            'You are a hands-on tutor who walks through problems step-by-step, checks for understanding, and adaptively guides the learner.',
          metadata: {
            toolSystemVersion: '2.0.0',
            AgentManagerVersion: '2.0.0',
            toolsCount: 5,
            capabilities: [
              'step_by_step_guidance',
              'practice_generation',
              'adaptive_tutoring',
              'understanding_assessment',
              'error_correction',
            ],
          },
        },
        assessment: {
          id: 'assessment_agent',
          type: 'assessment' as const,
          name: 'Assessment Assistant',
          description: 'Creates and evaluates assessments with feedback',
          capabilities: ['knowledge_extraction', 'content_analysis', 'assessment_creation'],
          systemPrompt:
            'You are an assessment specialist. Provide structured questions, evaluate answers, and deliver feedback.',
          metadata: {
            toolSystemVersion: '2.0.0',
            AgentManagerVersion: '2.0.0',
            toolsCount: 3,
            capabilities: [
              'quiz_generation',
              'answer_evaluation',
              'feedback_provision',
              'assessment_analytics',
              'progress_tracking',
            ],
          },
        },
        practice: {
          id: 'practice_agent',
          type: 'practice' as const,
          name: 'Practice Assistant',
          description: 'Provides hands-on practice and drills',
          capabilities: [
            'knowledge_extraction',
            'content_analysis',
            'learning_path_creation',
            'assessment_feedback',
          ],
          systemPrompt:
            'You are a practice coach. Provide actionable drills and walk through solutions so the learner can build confidence.',
          metadata: {
            toolSystemVersion: '2.0.0',
            AgentManagerVersion: '2.0.0',
            toolsCount: 5,
            capabilities: [
              'practice_scenario_generation',
              'interactive_drills',
              'solution_walkthroughs',
              'confidence_building',
              'skill_reinforcement',
            ],
          },
        },
      };

      const agentCapabilities = capabilities[params.agentType as keyof typeof capabilities];

      if (!agentCapabilities) {
        throw new Error(`Unknown agent type: ${params.agentType}`);
      }

      handlerLogger.info('Agent capabilities retrieved successfully', {
        agentType: params.agentType,
        toolCount: agentCapabilities.capabilities.length,
      });

      return { success: true, capabilities: agentCapabilities };
    } catch (error) {
      handlerLogger.error('Failed to get agent capabilities', {
        error,
        agentType: params.agentType,
      });
      throw error;
    }
  });

  /**
   * Test agent functionality with refactored tools
   */
  ipcMainInstance.handle('agent:testFunctionality', async (event, params) => {
    handlerLogger.info('Handling agent functionality test', {
      agentType: params.agentType,
      testType: params.testType,
    });

    try {
      const conversationId = `test_${Date.now()}`;

      const request: AgentManagerRequest = {
        agentType: params.agentType,
        conversationId,
        messages: [
          new HumanMessage(params.testMessage ?? 'Hello, can you help me test your capabilities?'),
        ],
        topic: params.topic ?? 'functionality_test',
        userId: params.userId ?? 'test_user',
      };

      const result = await agentManager.runAgent(request);

      handlerLogger.info('Agent functionality test completed successfully', {
        agentType: result.agentType,
        responseLength: result.content.length,
        testType: params.testType,
      });

      return {
        success: true,
        testResult: {
          agentType: result.agentType,
          response: result.content,
          model: result.model,
          provider: result.provider,
          testMessage: request.messages[0].content,
          testType: params.testType,
          toolSystemVersion: '2.0.0',
          executionTime: Date.now() - parseInt(conversationId.split('_')[1]),
        },
      };
    } catch (error) {
      handlerLogger.error('Agent functionality test failed', {
        error,
        agentType: params.agentType,
        testType: params.testType,
      });
      throw error;
    }
  });

  handlerLogger.info('✅ Agent handlers registered successfully with AgentManager integration');
};
