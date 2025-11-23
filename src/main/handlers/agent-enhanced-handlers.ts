/**
 * Enhanced Agent Management IPC Handlers
 *
 * Simplified, typed IPC handlers for agent listing, selection, personalization,
 * capability inspection, and feature demonstration.
 */

import { ipcMain } from 'electron';
import { AIService } from '../services/ai/ai-service';
import { LearningService } from '../services/domain/learning/learning-service';
import { KnowledgeService } from '../services/domain/knowledge/knowledge-service';
import { LoggerService } from '../services/core/logger/logger-service';
import type {
  AgentDisplay,
  AgentCapabilitiesDisplay,
  ResponseStyleSettings,
  FeatureDemoDisplay,
} from '@/shared/types/electron-api/agent-api';
import type { APIResponse } from '@/shared/types/electron-api';

type AgentSelectionParams = {
  sessionId: string;
  agentType: AgentDisplay['type'];
};

type PersonalityParams = {
  agentId: string;
  personality:
    | 'friendly encouraging'
    | 'formal professional'
    | 'casual friendly'
    | 'technical expert';
};

type ResponseStyleParams = {
  sessionId: string;
  style: ResponseStyleSettings;
};

type AgentFeatureParams = {
  agentId: string;
  feature: string;
};

const createMockAgent = (type: AgentDisplay['type'], id: string): AgentDisplay => ({
  id,
  type,
  name: `${type.charAt(0).toUpperCase() + type.slice(1)} Agent`,
  description: 'Mock agent for testing flows',
  avatar: '',
  color: '#10b981',
  capabilities: [],
  isAvailable: true,
  category: 'mock',
  stats: { sessionsCount: 0, avgRating: 0 },
  specialties: [],
  languages: ['en'],
  difficulty: 'intermediate',
  interactive: true,
});

const mockCapabilities: AgentCapabilitiesDisplay = {
  agentId: 'agent_mock',
  capabilities: [],
  overallStrengths: [],
  idealUseCases: [],
  limitations: [],
  performanceMetrics: { accuracy: 0, responseTime: '0ms', userSatisfaction: 0 },
  supportedFeatures: [],
  integrationPartners: [],
};

const mockFeatureDemo = (agentId: string, feature: string): FeatureDemoDisplay => ({
  agentId,
  feature,
  demoType: 'example',
  description: `Demo for ${feature}`,
  samplePrompts: [],
  demoInteraction: { type: 'guided_example', steps: [] },
  expectedOutcome: 'Sample outcome',
  estimatedTime: '0m',
  difficulty: 'easy',
});

export const setupEnhancedAgentHandlers = (
  ipcMainInstance: typeof ipcMain,
  services: {
    aiService: AIService;
    learningService: LearningService;
    knowledgeService: KnowledgeService;
    loggerService: LoggerService;
  },
): void => {
  const handlerLogger = services.loggerService.child({ handler: 'agent-enhanced' });
  const ok = <T>(data: T): APIResponse<T> => ({ success: true, data });

  ipcMainInstance.handle('agents:get-available', async () => {
    const agents: AgentDisplay[] = [
      createMockAgent('learning', 'agent_learning'),
      createMockAgent('tutoring', 'agent_tutor'),
      createMockAgent('assessment', 'agent_assessment'),
      createMockAgent('practice', 'agent_practice'),
    ];
    handlerLogger.info('Returning available agents', { count: agents.length });
    return ok(agents);
  });

  ipcMainInstance.handle(
    'agents:select-for-session',
    async (_event, params: AgentSelectionParams): Promise<APIResponse<AgentDisplay>> => {
      const selectedAgent = createMockAgent(params.agentType, `agent_${params.agentType}`);
      handlerLogger.info('Agent selected for session', params);
      return ok(selectedAgent);
    },
  );

  ipcMainInstance.handle(
    'agents:set-personality',
    async (
      _event,
      params: PersonalityParams,
    ): Promise<APIResponse<{ updatedPersonality: string }>> => {
      handlerLogger.info('Setting agent personality', params);
      return ok({ updatedPersonality: params.personality });
    },
  );

  ipcMainInstance.handle(
    'agents:set-response-style',
    async (_event, params: ResponseStyleParams): Promise<APIResponse<ResponseStyleSettings>> => {
      handlerLogger.info('Setting response style', params);
      return ok(params.style);
    },
  );

  ipcMainInstance.handle(
    'agents:get-capabilities',
    async (_event, agentId: string): Promise<APIResponse<AgentCapabilitiesDisplay>> => {
      handlerLogger.info('Fetching capabilities for agent', { agentId });
      const caps = { ...mockCapabilities, agentId };
      return ok(caps);
    },
  );

  ipcMainInstance.handle(
    'agents:try-feature',
    async (_event, params: AgentFeatureParams): Promise<APIResponse<FeatureDemoDisplay>> => {
      handlerLogger.info('Demonstrating feature', params);
      const demo = mockFeatureDemo(params.agentId, params.feature);
      return ok(demo);
    },
  );

  handlerLogger.info('Enhanced agent handlers registered');
};
