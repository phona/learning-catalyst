import type { AiService } from '@/main/services/ai/ai-service';
import type { AnalyticsService } from '@/main/services/domain/analytics/analytics-service';
import type { ConceptParsingService } from '@/main/services/domain/concept-parsing/concept-parsing-service';
import type { LearningService } from '@/main/services/domain/learning/learning-service';
import type { ConfigService } from '@/main/services/core/config/config-service';
import { AgentToolDeps } from './tool-registry';
import { LoggerService } from '../core/logger/logger-service';
import type { Kysely } from 'kysely';
import type { Database } from '@/main/services/core/database';
import { createAssessmentAgent } from './assessment-agent';
import { createLearningAgent } from './learning-agent';
import { createLearningPlannerAgent } from './learning-planner-agent';
import { createPracticeAgent } from './practice-agent';
import { createSupervisorAgent } from './supervisor-agent';
import { createTutoringAgent } from './tutoring-agent';
import { formatMessages, pickAssistantMessage } from './specialized-agent';
import type { SpecializedAgent, SpecializedAgentResult } from './specialized-agent';
import { needsAgentRebuild } from './provider-utils';
import type { AppConfig } from '@/shared/types/config';
import { createProviderFactory } from './provider-factory';
import type { AgentType } from './types';

export interface AgentManagerRequest {
  agentType: AgentType;
  conversationId: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  topic?: string;
  userId?: string;
}

export interface AgentManagerResult extends SpecializedAgentResult {
  agentType: AgentType;
}

interface AgentManagerDeps {
  aiService: AiService;
  analyticsService: AnalyticsService;
  conceptParsingService: ConceptParsingService;
  learningService: LearningService;
  loggerService: LoggerService;
  configService: ConfigService;
  db: Kysely<Database>;
}

export const createAgentManager = async (deps: AgentManagerDeps) => {
  const providerFactory = createProviderFactory(deps.configService);

  const toolDeps: AgentToolDeps = {
    aiService: deps.aiService,
    conceptParsingService: deps.conceptParsingService,
    learningService: deps.learningService,
    loggerService: deps.loggerService,
    configService: deps.configService,
    providerFactory,
    db: deps.db,
  };

  // Function to create all agents
  const createAllAgents = async () => {
    const learningAgent = await createLearningAgent(toolDeps);
    const learningPlannerAgent = await createLearningPlannerAgent(toolDeps);
    const tutoringAgent = await createTutoringAgent(toolDeps);
    const assessmentAgent = await createAssessmentAgent(toolDeps);
    const practiceAgent = await createPracticeAgent(toolDeps);

    const nonSupervisorAgents: Record<Exclude<AgentType, 'supervisor'>, SpecializedAgent> = {
      learning: learningAgent,
      learning_planner: learningPlannerAgent,
      tutoring: tutoringAgent,
      assessment: assessmentAgent,
      practice: practiceAgent,
    };

    const supervisorAgentLocal = await createSupervisorAgent(toolDeps, nonSupervisorAgents);

    return {
      ...nonSupervisorAgents,
      supervisor: supervisorAgentLocal,
    } as Record<AgentType, SpecializedAgent>;
  };

  // Agent instance management
  let agentInstances: Record<AgentType, SpecializedAgent>;
  let currentConfig: AppConfig | null = null;
  let supervisorAgent: SpecializedAgent;

  // Initialize current config and agents
  currentConfig = await deps.configService.getConfig();
  agentInstances = await createAllAgents();
  supervisorAgent = agentInstances.supervisor;

  // Handle configuration changes
  const handleConfigChange = async (newConfig: AppConfig) => {
    if (!currentConfig) return;

    if (needsAgentRebuild(currentConfig, newConfig)) {
      deps.loggerService.info('Agent config changed, rebuilding agents');
      try {
        agentInstances = await createAllAgents();
        supervisorAgent = agentInstances.supervisor;
        currentConfig = newConfig;
        if (typeof deps.conceptParsingService?.rebuild === 'function') {
          await deps.conceptParsingService.rebuild();
        }
        if (typeof deps.learningService?.rebuild === 'function') {
          await deps.learningService.rebuild();
        }
        deps.loggerService.info('Agents rebuilt successfully');
      } catch (error) {
        deps.loggerService.error('Failed to rebuild agents', { error });
      }
    }
  };

  // Subscribe to configuration changes
  deps.configService.onConfigChanged(handleConfigChange);

  const runAgent = async (
    request: AgentManagerRequest,
    options?: { callbacks?: any[] },
  ): Promise<AgentManagerResult> => {
    const agent =
      request.agentType === 'supervisor' ? supervisorAgent : agentInstances[request.agentType];
    if (!agent) {
      throw new Error(`Unsupported agent type: ${request.agentType}`);
    }

    const logger = deps.loggerService.child({
      agent: request.agentType,
      conversationId: request.conversationId,
    });

    const formattedMessages = formatMessages(request.messages, request.topic);
    const invokeOptions = options?.callbacks ? { callbacks: options.callbacks } : undefined;
    const result = await agent.invoke({ messages: formattedMessages }, invokeOptions as any);
    logger.debug("Agent invoke result", JSON.stringify(result));
    const assistantMessage = pickAssistantMessage(result.messages ?? []);

    if (!assistantMessage?.content) {
      throw new Error('Agent returned no assistant response');
    }

    const providerSettings = agent.providerSettings;

    await deps.analyticsService.trackEvent({
      eventType: 'agent_response',
      userId: request.userId,
      properties: {
        agentType: request.agentType,
        provider: providerSettings.providerName,
        model: providerSettings.model,
      },
      context: {
        conversationId: request.conversationId,
        topic: request.topic,
      },
    });

    logger.info('Agent response generated', {
      provider: providerSettings.providerName,
      conversationId: request.conversationId,
    });

    const resultPayload: AgentManagerResult = {
      content: assistantMessage.content,
      model: providerSettings.model,
      provider: providerSettings.providerName,
      agentType: request.agentType,
    };

    return resultPayload;
  };

  const getAgent = (agentType: AgentType): SpecializedAgent => {
    return agentInstances[agentType];
  };

  return {
    runAgent,
    getAgent,
  };
};

export type AgentManager = Awaited<ReturnType<typeof createAgentManager>>;
