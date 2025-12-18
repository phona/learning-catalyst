import { randomUUID } from 'node:crypto';
import type { Kysely } from 'kysely';
import { HumanMessage, AIMessage } from '@langchain/core/messages';
import { ILogger } from '../../types';
import type { LearningSessionRow } from '@/shared/types/database';
import type { Database as CoreDatabase } from '@/main/services/core/database/kysely-schema';
import type { LearningAgent } from '@/main/services/agent/learning-agent';
import { pickAssistantMessage, formatMessages } from '@/main/services/agent/specialized-agent';

interface LearningPath {
  id: string;
  title: string;
  description: string;
  userId: string;
  status: 'active' | 'completed' | 'paused';
  createdAt: string;
  updatedAt: string;
  progress: number;
  modules: LearningModule[];
  metadata?: Record<string, unknown>;
}

interface LearningModule {
  id: string;
  title: string;
  description: string;
  order: number;
  type: 'lesson' | 'quiz' | 'exercise' | 'assessment';
  content: string;
  completed: boolean;
  completedAt?: string;
  metadata?: Record<string, unknown>;
}

interface UserProgress {
  userId: string;
  currentPathId?: string;
  completedPaths: string[];
  currentModuleId?: string;
  progressPercentage: number;
  lastActiveAt: string;
  metadata?: Record<string, unknown>;
}

interface LearningSession {
  id: string;
  topic: string;
  goals: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  agentType: string;
  learningStyle: 'visual' | 'auditory' | 'kinesthetic' | 'reading';
  createdAt: string;
  startedAt: string;
  updatedAt: string;
  status: 'active' | 'paused' | 'completed';
  progress: number;
  duration: number;
  userId?: string;
  metadata?: Record<string, unknown>;
}

interface SessionFilters {
  status?: string;
  difficulty?: string;
  agentType?: string;
  limit?: number;
}

interface SessionBlueprint {
  summary: string;
  timeline: string[];
  modules: Array<{
    title: string;
    type: LearningModule['type'];
    focus: string;
    durationMinutes: number;
    objectives: string[];
    resources: string[];
  }>;
  recommendations: string[];
}
type LearningSessionMetadata = {
  goals?: string[];
  agentType?: string;
  topic?: string;
  difficulty?: LearningSession['difficulty'];
  learningStyle?: LearningSession['learningStyle'];
  status?: LearningSession['status'];
  progress?: number;
  blueprint?: SessionBlueprint;
  recommendations?: string[];
  timeline?: string[];
  userId?: string;
  pausedAt?: string;
  resumeAt?: string;
  summary?: {
    topicsCovered: string[];
    keyTakeaways: string[];
    strengths: string[];
    areasForImprovement: string[];
    nextSteps: string[];
  };
};

const PATH_PREFIX = 'learning_path:';

const difficultyToLevel = (value: string | undefined): number => {
  switch ((value ?? 'intermediate').toLowerCase()) {
    case 'beginner':
      return 1;
    case 'advanced':
      return 3;
    default:
      return 2;
  }
};

const levelToDifficulty = (value: number): 'beginner' | 'intermediate' | 'advanced' => {
  if (value <= 1) return 'beginner';
  if (value >= 3) return 'advanced';
  return 'intermediate';
};

const safeParseJson = <T>(value?: string | null, fallback: T = {} as T): T => {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

const mapSessionRow = (row: LearningSessionRow): LearningSession => {
  const metadata = safeParseJson<LearningSessionMetadata>(row.metadata, {});
  return {
    id: row.id,
    topic: metadata.topic ?? row.title,
    goals: metadata.goals ?? [],
    difficulty: metadata.difficulty ?? levelToDifficulty(row.difficulty_level),
    agentType: metadata.agentType ?? 'learning',
    learningStyle: metadata.learningStyle ?? 'visual',
    createdAt: row.created_at,
    startedAt: row.start_time,
    updatedAt: row.updated_at,
    status: metadata.status ?? 'active',
    progress: metadata.progress ?? 0,
    duration: row.duration_seconds,
    userId: metadata.userId,
    metadata,
  };
};

const computeProgressSnapshot = (session: LearningSession, blueprint?: SessionBlueprint) => {
  const moduleCount = blueprint?.modules?.length ?? 4;
  const completedModules = Math.round((session.progress / 100) * moduleCount);
  return {
    sessionId: session.id,
    overallProgress: session.progress,
    timeSpent: Math.max(600, session.duration),
    modulesCompleted: completedModules,
    totalModules: moduleCount,
    currentModule: Math.min(moduleCount, completedModules + 1),
    conceptsLearned: Math.max(3, completedModules + 2),
    skillsAcquired: ['Concept Reinforcement', 'Applied Practice', 'Reflection'].slice(
      0,
      Math.max(1, completedModules),
    ),
    masteryLevels: {
      basic: Math.min(100, 40 + session.progress),
      intermediate: Math.min(100, 20 + session.progress),
      advanced: Math.min(100, session.progress),
    },
    achievements: [
      {
        id: 'ach_consistency',
        name: 'Consistency Builder',
        description: 'Maintained steady learning momentum',
        earnedAt: session.updatedAt,
      },
    ],
    nextActions: blueprint?.recommendations ?? [
      'Schedule a focused review',
      'Apply the concept to a personal project',
      'Capture open questions for the next session',
    ],
  };
};

const buildLearningPathFromModules = ({
  pathId,
  params,
  modules,
}: {
  pathId: string;
  params: {
    title: string;
    description: string;
    userId: string;
    metadata?: Record<string, unknown>;
  };
  modules: Array<{
    title: string;
    description: string;
    type: LearningModule['type'];
    order: number;
  }>;
}): LearningPath => {
  const now = new Date().toISOString();
  return {
    id: pathId,
    title: params.title,
    description: params.description,
    userId: params.userId,
    status: 'active',
    createdAt: now,
    updatedAt: now,
    progress: 0,
    modules: modules.map((module) => ({
      id: `module_${pathId}_${module.order}`,
      title: module.title,
      description: module.description,
      order: module.order,
      type: module.type,
      content: module.description,
      completed: false,
    })),
    metadata: params.metadata,
  };
};

export const createLearningService = ({
  db,
  loggerService,
  checkpointSaver,
}: {
  db: Kysely<CoreDatabase>;
  loggerService: { child: (meta: Record<string, unknown>) => ILogger };
  checkpointSaver: import('@/main/services/core/checkpoints/SQLiteCheckpointSaver').SQLiteCheckpointSaver;
}) => {
  const serviceLogger = loggerService.child({ service: 'learning' });
  const normalizeJsonText = (raw: string) => {
    const trimmed = raw?.trim() ?? '';
    const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
    if (fenceMatch) {
      return fenceMatch[1].trim();
    }
    return trimmed;
  };
  const tryParseJson = <T>(text: string): T | undefined => {
    try {
      return JSON.parse(text) as T;
    } catch {
      return undefined;
    }
  };
  const parseJsonPayload = <T>(raw: string): T => {
    const normalized = normalizeJsonText(raw);
    const direct = tryParseJson<T>(normalized);
    if (direct !== undefined) {
      return direct;
    }
    const sliceBetween = (text: string, startChar: '{' | '[', endChar: '}' | ']') => {
      const start = text.indexOf(startChar);
      const end = text.lastIndexOf(endChar);
      if (start !== -1 && end !== -1 && end >= start) {
        return text.slice(start, end + 1);
      }
      return null;
    };
    const objectSlice = sliceBetween(normalized, '{', '}');
    if (objectSlice) {
      const parsed = tryParseJson<T>(objectSlice);
      if (parsed !== undefined) {
        return parsed;
      }
    }
    const arraySlice = sliceBetween(normalized, '[', ']');
    if (arraySlice) {
      const parsed = tryParseJson<T>(arraySlice);
      if (parsed !== undefined) {
        return parsed;
      }
    }
    throw new Error('Unable to parse JSON payload');
  };

  const ensureSessionRow = async (sessionId: string): Promise<LearningSessionRow> => {
    const row = await db
      .selectFrom('learning_sessions')
      .selectAll()
      .where('id', '=', sessionId)
      .executeTakeFirst();
    if (!row) {
      throw new Error(`Learning session ${sessionId} not found`);
    }
    return row;
  };

  const updateSessionMetadata = async (
    sessionId: string,
    updater: (metadata: LearningSessionMetadata) => LearningSessionMetadata,
    extraUpdates: Partial<LearningSessionRow> = {},
  ) => {
    const row = await ensureSessionRow(sessionId);
    const currentMetadata = safeParseJson<LearningSessionMetadata>(row.metadata, {});
    const nextMetadata = updater(currentMetadata);
    await db
      .updateTable('learning_sessions')
      .set({
        ...extraUpdates,
        metadata: JSON.stringify(nextMetadata),
        updated_at: new Date().toISOString(),
      })
      .where('id', '=', sessionId)
      .execute();
    return nextMetadata;
  };

  const persistLearningPath = async (path: LearningPath): Promise<LearningPath> => {
    const key = `${PATH_PREFIX}${path.id}`;
    await db.deleteFrom('settings').where('key', '=', key).execute();
    await db
      .insertInto('settings')
      .values({
        id: randomUUID(),
        key,
        value: JSON.stringify(path),
        data_type: 'json',
        description: `Learning path for ${path.userId}`,
        created_at: path.createdAt,
        updated_at: path.updatedAt,
      })
      .execute();
    return path;
  };

  const getStoredLearningPath = async (pathId: string): Promise<LearningPath | null> => {
    const row = await db
      .selectFrom('settings')
      .selectAll()
      .where('key', '=', `${PATH_PREFIX}${pathId}`)
      .executeTakeFirst();
    if (!row) return null;
    return safeParseJson<LearningPath>(row.value, undefined);
  };

  const listLearningPathsForUser = async (userId: string): Promise<LearningPath[]> => {
    const rows = await db
      .selectFrom('settings')
      .selectAll()
      .where('key', 'like', `${PATH_PREFIX}%`)
      .execute();
    return rows
      .map((row) => safeParseJson<LearningPath>(row.value, undefined))
      .filter((path): path is LearningPath => Boolean(path?.userId === userId));
  };

  return {
    createLearningPath: async (params: {
      title: string;
      description: string;
      userId: string;
      modules: Array<{
        title: string;
        description: string;
        type: LearningModule['type'];
        order: number;
      }>;
      metadata?: Record<string, unknown>;
    }): Promise<LearningPath> => {
      serviceLogger.info('Creating learning path', { title: params.title, userId: params.userId });
      const pathId = `path_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const path = buildLearningPathFromModules({
        pathId,
        params,
        modules: params.modules,
      });
      await persistLearningPath(path);
      return path;
    },

    getLearningPath: async (pathId: string): Promise<LearningPath | null> => {
      serviceLogger.info('Retrieving learning path', { pathId });
      return getStoredLearningPath(pathId);
    },

    getUserProgress: async (userId: string): Promise<UserProgress> => {
      serviceLogger.info('Aggregating user progress', { userId });
      const sessions = await db
        .selectFrom('learning_sessions')
        .selectAll()
        .where('metadata', 'like', `%\"userId\":\"${userId}\"%`)
        .orderBy('updated_at', 'desc')
        .execute();

      const completed = sessions.filter((row) => row.metadata?.includes('"status":"completed"'));
      const current = sessions[0];

      return {
        userId,
        completedPaths: completed.map((row) => row.id),
        currentPathId: current?.id,
        currentModuleId: undefined,
        progressPercentage: sessions.length
          ? Math.round((completed.length / sessions.length) * 100)
          : 0,
        lastActiveAt: current?.updated_at ?? new Date().toISOString(),
        metadata: { totalSessions: sessions.length },
      };
    },

    startLearningSession: async (params: {
      topic: string;
      goals: string[];
      difficulty: 'beginner' | 'intermediate' | 'advanced';
      agentType: string;
      learningStyle: LearningSession['learningStyle'];
      sessionId?: string;
    }): Promise<LearningSession> => {
      const metadata: LearningSessionMetadata = {
        goals: params.goals ?? [],
        agentType: params.agentType,
        topic: params.topic,
        difficulty: params.difficulty ?? 'intermediate',
        learningStyle: params.learningStyle ?? 'visual',
        status: 'active',
        progress: 10,
        blueprint: {
          summary: 'Session initialized with starter blueprint',
          timeline: ['Session created'],
          modules: [
            {
              title: params.topic,
              type: 'lesson',
              focus: params.goals?.[0] ?? params.topic,
              durationMinutes: 45,
              objectives: params.goals ?? [],
              resources: [],
            },
          ],
          recommendations: [],
        },
      };

      const now = new Date().toISOString();
      const row: LearningSessionRow = {
        id: params.sessionId ?? `session_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        title: params.topic,
        description: '',
        start_time: now,
        end_time: undefined,
        duration_seconds: 0,
        total_messages: 0,
        concepts_studied: 0,
        difficulty_level: difficultyToLevel(params.difficulty),
        session_type: 'general',
        metadata: JSON.stringify(metadata),
        created_at: now,
        updated_at: now,
      };

      await db.insertInto('learning_sessions').values(row).execute();
      serviceLogger.info('Learning session started', { sessionId: row.id });
      return mapSessionRow(row);
    },

    getSessionProgress: async (sessionId: string) => {
      const row = await ensureSessionRow(sessionId);
      const session = mapSessionRow(row);
      const blueprint = session.metadata?.blueprint;
      const snapshot = computeProgressSnapshot(
        session,
        blueprint &&
          typeof blueprint === 'object' &&
          blueprint !== null &&
          'summary' in blueprint &&
          'timeline' in blueprint &&
          'modules' in blueprint &&
          'recommendations' in blueprint
          ? (blueprint as SessionBlueprint)
          : undefined,
      );
      serviceLogger.info('Session progress calculated', { sessionId });
      return snapshot;
    },

    getRecentSessions: async (options?: SessionFilters) => {
      try {
        const limit = options?.limit ?? 5;
        const raw = await db
          .selectFrom('learning_sessions')
          .selectAll()
          .orderBy('updated_at', 'desc')
          .limit(limit)
          .execute();
        const rows = Array.isArray(raw)
          ? raw
          : Array.isArray((raw as unknown)?.rows)
            ? (raw as unknown).rows
            : [];
        if (!Array.isArray(raw)) {
          serviceLogger.warn('getRecentSessions unexpected result shape', {
            type: typeof raw,
            keys: raw && typeof raw === 'object' ? Object.keys(raw as unknown) : [],
          });
        }
        return rows.map(mapSessionRow);
      } catch (error) {
        serviceLogger.error('getRecentSessions failed', error as unknown);
        throw error;
      }
    },

    searchSessions: async (query: string, filters?: SessionFilters) => {
      let builder = db.selectFrom('learning_sessions').selectAll();

      if (filters?.status) {
        builder = builder.where('metadata', 'like', `%\"status\":\"${filters.status}\"%`);
      }

      if (filters?.difficulty) {
        builder = builder.where('difficulty_level', '=', difficultyToLevel(filters.difficulty));
      }

      if (filters?.agentType) {
        builder = builder.where('metadata', 'like', `%\"agentType\":\"${filters.agentType}\"%`);
      }

      if (query?.trim()) {
        const like = `%${query.trim()}%`;
        builder = builder.where((eb) =>
          eb.or([
            eb('title', 'like', like),
            eb('description', 'like', like),
            eb('metadata', 'like', like),
          ]),
        );
      }

      const rows = await builder
        .orderBy('updated_at', 'desc')
        .limit(filters?.limit ?? 20)
        .execute();
      const sessions = rows.map(mapSessionRow);

      return {
        query,
        totalResults: sessions.length,
        sessions,
        appliedFilters: filters || {},
        limit: filters?.limit ?? sessions.length,
      };
    },

    getPracticeHistory: async (params?: {
      conceptIds?: string[];
      since?: string;
      limit?: number;
    }): Promise<
      Array<{
        taskId: string;
        conceptIds: string[];
        result: 'pass' | 'fail' | 'partial';
        answer?: string;
        errorTags?: string[];
        rubricScores?: { retrieval?: number; application?: number; teachBack?: number };
        timestamp?: string;
      }>
    > => {
      const limit = Math.min(params?.limit ?? 50, 200);
      let builder = db
        .selectFrom('practice_attempts')
        .select([
          'task_id',
          'concept_ids',
          'result',
          'answer',
          'error_tags',
          'rubric_scores',
          'timestamp',
        ])
        .orderBy('timestamp', 'desc')
        .limit(limit);
      if (params?.since) {
        builder = builder.where('timestamp', '>', params.since);
      }
      const raw = await builder.execute();
      const toArray = (json?: string): string[] => {
        if (!json) return [];
        try {
          const v = JSON.parse(json);
          return Array.isArray(v) ? (v.filter(Boolean) as string[]) : [];
        } catch {
          return [];
        }
      };
      const toObject = <T extends Record<string, number>>(json?: string): T | undefined => {
        if (!json) return undefined as unknown;
        try {
          const v = JSON.parse(json) as T;
          return typeof v === 'object' && v ? v : undefined;
        } catch {
          return undefined;
        }
      };
      return raw
        .map((row: unknown) => {
          const conceptIds = toArray(row.concept_ids);
          const errorTags = toArray(row.error_tags);
          const rubric = toObject<Record<string, number>>(row.rubric_scores);
          const normalized =
            row.result === 'pass' || row.result === 'fail' || row.result === 'partial'
              ? row.result
              : 'partial';
          return {
            taskId: row.task_id,
            conceptIds: conceptIds.length ? conceptIds : (params?.conceptIds ?? []),
            result: normalized,
            answer: row.answer ?? undefined,
            errorTags: errorTags.length ? errorTags : undefined,
            rubricScores: rubric
              ? {
                  retrieval: rubric.retrieval,
                  application: rubric.application,
                  teachBack: rubric.teachBack,
                }
              : undefined,
            timestamp: row.timestamp ?? undefined,
          };
        })
        .filter((a: unknown) => (Array.isArray(a.conceptIds) ? a.conceptIds.length > 0 : true));
    },

    getSession: async (sessionId: string): Promise<LearningSession | null> => {
      const row = await db
        .selectFrom('learning_sessions')
        .selectAll()
        .where('id', '=', sessionId)
        .executeTakeFirst();
      if (!row) return null;
      return mapSessionRow(row);
    },

    updateSession: async (
      sessionId: string,
      updates: { title?: string; description?: string; status?: LearningSession['status'] },
    ): Promise<LearningSession | null> => {
      const row = await db
        .selectFrom('learning_sessions')
        .selectAll()
        .where('id', '=', sessionId)
        .executeTakeFirst();
      if (!row) return null;

      const currentMetadata = safeParseJson<LearningSessionMetadata>(row.metadata, {});
      const nextMetadata = { ...currentMetadata };
      if (updates.status) nextMetadata.status = updates.status;

      await db
        .updateTable('learning_sessions')
        .set({
          title: updates.title ?? row.title,
          description: updates.description ?? row.description,
          metadata: JSON.stringify(nextMetadata),
          updated_at: new Date().toISOString(),
        })
        .where('id', '=', sessionId)
        .execute();

      serviceLogger.info('Session updated', { sessionId });
      const updated = await db
        .selectFrom('learning_sessions')
        .selectAll()
        .where('id', '=', sessionId)
        .executeTakeFirst();
      return updated ? mapSessionRow(updated) : null;
    },

    deleteSession: async (sessionId: string): Promise<boolean> => {
      // Delete messages first (foreign key constraint)
      await db.deleteFrom('messages').where('session_id', '=', sessionId).execute();
      const result = await db
        .deleteFrom('learning_sessions')
        .where('id', '=', sessionId)
        .executeTakeFirst();
      const deleted = (result?.numDeletedRows ?? 0) > 0;
      serviceLogger.info('Session deleted', { sessionId, deleted });
      return deleted;
    },

    updateSessionTitle: async (sessionId: string, title: string): Promise<boolean> => {
      const result = await db
        .updateTable('learning_sessions')
        .set({ title, updated_at: new Date().toISOString() })
        .where('id', '=', sessionId)
        .executeTakeFirst();
      const updated = (result?.numUpdatedRows ?? 0) > 0;
      serviceLogger.info('Session title updated', { sessionId, title, updated });
      return updated;
    },

    getSessionStatistics: async (): Promise<{
      totalSessions: number;
      totalMessages: number;
      totalUserMessages: number;
      totalAssistantMessages: number;
      averageMessagesPerSession: number;
    }> => {
      const sessionCount = await db
        .selectFrom('learning_sessions')
        .select((eb) => eb.fn.count('id').as('count'))
        .executeTakeFirst();
      const totalSessions = Number(sessionCount?.count ?? 0);

      const msgCount = await db
        .selectFrom('messages')
        .select((eb) => eb.fn.count('id').as('count'))
        .executeTakeFirst();
      const totalMessages = Number(msgCount?.count ?? 0);

      const userMsgCount = await db
        .selectFrom('messages')
        .select((eb) => eb.fn.count('id').as('count'))
        .where('role', '=', 'user')
        .executeTakeFirst();
      const totalUserMessages = Number(userMsgCount?.count ?? 0);

      const assistantMsgCount = await db
        .selectFrom('messages')
        .select((eb) => eb.fn.count('id').as('count'))
        .where('role', '=', 'assistant')
        .executeTakeFirst();
      const totalAssistantMessages = Number(assistantMsgCount?.count ?? 0);

      return {
        totalSessions,
        totalMessages,
        totalUserMessages,
        totalAssistantMessages,
        averageMessagesPerSession:
          totalSessions > 0 ? Math.round(totalMessages / totalSessions) : 0,
      };
    },
  };
};

export type LearningService = ReturnType<typeof createLearningService>;
