import { ILogger } from '../../types';
import { randomUUID } from 'node:crypto';
import type { KnowledgeService } from '../knowledge/knowledge-service';
import type { PracticeAgent } from '@/main/services/agent/practice-agent';
import { Kysely } from 'kysely';
import { Database } from '@/main/services/core/database';

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
  practiceAgent: PracticeAgent;
  loggerService: { child: (meta: Record<string, unknown>) => ILogger };
  knowledgeService: KnowledgeService;
  db: Kysely<Database>;
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
  practiceAgent,
  loggerService,
  knowledgeService,
  db,
}: PracticeDeps) => {
  const serviceLogger = loggerService.child({ service: 'practice' });

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

    const fallback = buildFallbackPlan({ ...normalized, practiceType, focusConcepts });

    try {
      const agentResponse = await practiceAgent.invoke({
        messages: [{ role: 'user', content: promptPayload }],
        topic: normalized.topic,
        userId: normalized.userId,
      });

      let response: PracticePlan;
      try {
        const raw = String(agentResponse).trim();
        response = JSON.parse(raw) as PracticePlan;
      } catch {
        response = fallback;
      }

      // Validate the response structure
      if (!response || !response.exercises || !Array.isArray(response.exercises)) {
        response = fallback;
      }

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
    } catch (error) {
      serviceLogger.warn('Practice agent failed, using fallback', { error });
      
      const enriched: PracticePlan = {
        ...fallback,
        metadata: {
          ...fallback.metadata,
          generatedAt: new Date().toISOString(),
          knowledgeNodes: focusConcepts.length,
          knowledgeRelationships: relatedConcepts.length,
        },
      };

      return enriched;
    }
  };

  const recordPracticeAttempt = async (attempt: {
    taskId: string;
    conceptIds: string[];
    result: 'pass' | 'fail' | 'partial';
    answer?: string;
    errorTags?: string[];
    rubricScores?: { retrieval?: number; application?: number; teachBack?: number };
    timestamp?: string;
  }): Promise<void> => {
    if (!attempt?.taskId?.trim()) throw new Error('taskId is required');
    if (!attempt.conceptIds?.length) throw new Error('conceptIds are required');
    const now = new Date().toISOString();
    await db
      .insertInto('practice_attempts')
      .values({
        id: randomUUID(),
        task_id: attempt.taskId,
        concept_ids: JSON.stringify(attempt.conceptIds),
        result: attempt.result,
        answer: attempt.answer ?? null,
        error_tags: attempt.errorTags ? JSON.stringify(attempt.errorTags) : null,
        rubric_scores: attempt.rubricScores ? JSON.stringify(attempt.rubricScores) : null,
        timestamp: attempt.timestamp ?? now,
        created_at: now,
        updated_at: now,
      })
      .execute();
  };

  return {
    generatePracticePlan,
    recordPracticeAttempt,
    rebuild: async () => {
      serviceLogger.info('Practice service rebuild called - practice agent manages its own configuration');
    },
  };
};

export type PracticeService = ReturnType<typeof createPracticeService>;
