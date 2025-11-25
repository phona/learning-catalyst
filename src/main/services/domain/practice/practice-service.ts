import { ILogger } from '../../types';
import type { ModelConfig } from '../../ai/ai-types';
import { createStructuredJsonRunner } from '../shared/structured-json-runner';
import type { KnowledgeService } from '../knowledge/knowledge-service';
import type { AiService } from '@/main/services/ai/ai-service';
import type { DomainAgent } from '@/main/services/agent/domain-agent';

export type PracticeExerciseOutput = {
  id: string;
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  type: 'coding' | 'conceptual' | 'problem_solving' | 'general';
  steps: string[];
  hints: string[];
  expectedOutcome: string;
  metadata: Record<string, unknown>;
};

export type PracticePlan = {
  practiceType: 'coding' | 'conceptual' | 'problem_solving' | 'general';
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  count: number;
  summary: string;
  focusConcepts: string[];
  exercises: PracticeExerciseOutput[];
  suggestions: string[];
  metadata: {
    generatedAt: string;
    knowledgeNodes: number;
    knowledgeRelationships: number;
  };
};

export interface PracticeRequest {
  topic: string;
  content?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  count?: number;
  userId?: string;
  practiceType?: PracticePlan['practiceType'];
  vibe?: string;
  context?: string;
}

type PracticeDeps = {
  aiService: AiService;
  domainAgent: DomainAgent;
  loggerService: { child: (meta: Record<string, unknown>) => ILogger };
  knowledgeService: KnowledgeService;
};

const DEFAULT_PRACTICE_SETTINGS: Required<Pick<PracticeRequest, 'difficulty' | 'count'>> = {
  difficulty: 'medium',
  count: 3,
};

const practiceTypeFromContent = (content: string): PracticePlan['practiceType'] => {
  const lower = content.toLowerCase();
  if (/(code|function|implement|program)/.test(lower)) return 'coding';
  if (/(explain|concept|compare|define)/.test(lower)) return 'conceptual';
  if (/(solve|problem|equation|math)/.test(lower)) return 'problem_solving';
  return 'general';
};

const practiceDifficultyMap: Record<string, 'easy' | 'medium' | 'hard'> = {
  easy: 'easy',
  medium: 'medium',
  hard: 'hard',
};

const buildFallbackExercise = (
  topic: string,
  difficulty: PracticePlan['difficulty'],
  index: number,
): PracticeExerciseOutput => ({
  id: `practice_${Date.now()}_${index}`,
  title: `Practice ${index + 1} — ${topic}`,
  description: `Work through this ${difficulty} activity to reinforce ${topic}.`,
  difficulty,
  type: 'general',
  steps: [
    `Review ${topic} key points`,
    'Apply the concept in a short scenario or code snippet',
    'Reflect on what went well and what could improve',
  ],
  hints: [
    'Break the problem into smaller steps',
    'Write down any assumptions',
    'Check your reasoning',
  ],
  expectedOutcome: 'Demonstrate the core idea through a concise response or example.',
  metadata: {},
});

const buildFallbackPlan = (
  params: PracticeRequest & {
    focusConcepts?: string[];
    practiceType: PracticePlan['practiceType'];
  },
): PracticePlan => {
  const difficulty =
    practiceDifficultyMap[params.difficulty ?? DEFAULT_PRACTICE_SETTINGS.difficulty];
  const count = params.count ?? DEFAULT_PRACTICE_SETTINGS.count;
  const focusConcepts = params.focusConcepts ?? [params.topic];
  const exercises = Array.from({ length: count }, (_, index) =>
    buildFallbackExercise(params.topic, difficulty, index),
  );

  return {
    practiceType: params.practiceType,
    topic: params.topic,
    difficulty,
    count,
    summary: `Practice ${params.topic} through ${count} ${difficulty.toLowerCase()} exercises.`,
    focusConcepts,
    exercises,
    suggestions: [
      'Practice consistently',
      'Explain your reasoning out loud',
      'Pair with concept mapping',
    ],
    metadata: {
      generatedAt: new Date().toISOString(),
      knowledgeNodes: focusConcepts.length,
      knowledgeRelationships: 0,
    },
  };
};

export const createPracticeService = ({
  aiService,
  domainAgent,
  loggerService,
  knowledgeService,
}: PracticeDeps) => {
  const serviceLogger = loggerService.child({ service: 'practice' });
  const presetId = 'practice.exercise';
  let modelConfig: ModelConfig;
  let currentDomainAgent = domainAgent;

  try {
    modelConfig = aiService.getModelPreset(presetId);
  } catch {
    serviceLogger.warn('Practice preset not found, falling back to chat.reply');
    modelConfig = aiService.getModelPreset('chat.reply');
  }

  let runStructuredJson = createStructuredJsonRunner({
    aiService,
    domainAgent: currentDomainAgent,
    logger: serviceLogger,
    modelConfig,
  }).runStructuredJson;

  const generatePracticePlan = async (request: PracticeRequest): Promise<PracticePlan> => {
    const normalized: PracticeRequest = {
      ...request,
      difficulty: request.difficulty ?? DEFAULT_PRACTICE_SETTINGS.difficulty,
      count: request.count ?? DEFAULT_PRACTICE_SETTINGS.count,
    };

    const practiceType =
      normalized.practiceType ?? practiceTypeFromContent(normalized.content ?? normalized.topic);
    const focusQuery = normalized.content?.trim() ? normalized.content : normalized.topic;

    const searchResult = await knowledgeService.searchKnowledge({
      query: focusQuery,
      limit: 6,
    });

    const focusConcepts = Array.from(
      new Set(searchResult.results.map((result) => result.title).filter(Boolean)),
    ).slice(0, 5);

    const relatedSet = new Set<string>();
    if (searchResult.results[0]?.id) {
      const related = await knowledgeService.getRelatedConcepts(searchResult.results[0].id);
      related.relatedConcepts.forEach((rel) => relatedSet.add(rel.name));
    }

    const relatedConcepts = Array.from(relatedSet).slice(0, 6);
    const contextSummary =
      normalized.context ??
      [
        `Focus concepts: ${focusConcepts.join(', ') || 'none'}`,
        `Related concepts: ${relatedConcepts.join(', ') || 'none'}`,
      ].join(' | ');

    const promptPayload = JSON.stringify(
      {
        practiceType,
        topic: normalized.topic,
        difficulty: normalized.difficulty,
        count: normalized.count,
        focusConcepts,
        relatedConcepts,
        vibe: normalized.vibe ?? 'focused',
        context: contextSummary,
      },
      null,
      2,
    );

    const systemPrompt =
      'You are a practice designer. Return JSON with practiceType, difficulty, count, summary, focusConcepts (string[]), exercises (array), suggestions (string[]), and metadata.';

    const fallback = buildFallbackPlan({ ...normalized, practiceType, focusConcepts });

    const response = await runStructuredJson<PracticePlan>({
      systemPrompt,
      input: promptPayload,
      fallbackPrompt: `${systemPrompt}\n${promptPayload}`,
      fallback,
      context: 'practice-plan-generation',
    });

    const enriched: PracticePlan = {
      ...response,
      metadata: {
        ...response.metadata,
        generatedAt: new Date().toISOString(),
        knowledgeNodes: focusConcepts.length,
        knowledgeRelationships: relatedConcepts.length,
      },
    };

    serviceLogger.info('Practice plan generated', {
      topic: enriched.topic,
      exercises: enriched.exercises.length,
      practiceType: enriched.practiceType,
    });

    return enriched;
  };

  return {
    generatePracticePlan,
    rebuild: async (agent?: DomainAgent) => {
      if (agent) {
        currentDomainAgent = agent;
      }
      try {
        modelConfig = aiService.getModelPreset(presetId);
      } catch {
        modelConfig = aiService.getModelPreset('chat.reply');
      }
      runStructuredJson = createStructuredJsonRunner({
        aiService,
        domainAgent: currentDomainAgent,
        logger: serviceLogger,
        modelConfig,
      }).runStructuredJson;
    },
  };
};

export type PracticeService = ReturnType<typeof createPracticeService>;
