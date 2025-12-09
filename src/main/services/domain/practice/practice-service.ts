import { ILogger } from '../../types';
import { randomUUID } from 'node:crypto';
import type { KnowledgeService } from '../knowledge/knowledge-service';
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
  // practiceAgent - REMOVED
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
  loggerService,
  knowledgeService,
  db,
}: PracticeDeps) => {
  const serviceLogger = loggerService.child({ service: 'practice' });

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
        answer: attempt.answer ?? undefined,
        error_tags: attempt.errorTags ? JSON.stringify(attempt.errorTags) : undefined,
        rubric_scores: attempt.rubricScores ? JSON.stringify(attempt.rubricScores) : undefined,
        timestamp: attempt.timestamp ?? now,
        created_at: now,
        updated_at: now,
      })
      .execute();
  };

  return {
    recordPracticeAttempt,
    rebuild: async () => {
      serviceLogger.info('Practice service rebuild called - no agent dependency');
    },
  };
};

export type PracticeService = ReturnType<typeof createPracticeService>;
