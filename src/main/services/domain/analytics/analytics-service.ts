import type { Kysely } from 'kysely';
import { Database } from '@/main/services/core/database/kysely-schema';
import {
  DashboardDisplay,
  ProgressChartDisplay,
  ConceptProgressDisplay,
  AchievementDisplay,
  LearningTrendDisplay,
  StudyStreakDisplay,
  TimeStatsDisplay,
  LearningSession,
  SessionDisplay,
  CreateLearningSessionRequest,
  ConceptProgressUpdate,
  ProgressChartParams,
  AnalyticsError,
  SessionNotFoundError,
  ConceptNotFoundError,
  UsageStatsDisplay,
  TokenUsageDisplay,
} from '@/shared/interfaces/analytics.interface';
import { LoggerService } from '../../core/logger/logger-service';
import { v4 as uuidv4 } from 'uuid';

const formatDateKey = (value: Date): string => value.toISOString().split('T')[0];

const parseJson = <T>(value: string | null | undefined, fallback: T): T => {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

const ensureArray = <T>(value: T | T[] | undefined): T[] =>
  Array.isArray(value) ? value : value ? [value] : [];

const metricTitle = (metric: string) =>
  `${metric.charAt(0).toUpperCase() + metric.slice(1)} Progress`;

const metricUnit = (metric: string) => {
  switch (metric) {
  case 'mastery':
    return '%';
  case 'sessions':
    return 'sessions';
  case 'time':
    return 'minutes';
  case 'concepts':
    return 'concepts';
  default:
    return '';
  }
};

const periodToDays: Record<ProgressChartParams['period'], number> = {
  week: 7,
  month: 30,
  quarter: 90,
  year: 365,
};

const buildLearningTrend = (
  data: Array<{ date: Date; value: number }>,
  period: 'daily' | 'weekly' | 'monthly',
): LearningTrendDisplay => {
  const values = data.map((point) => point.value);
  const average = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
  const peak = values.length ? Math.max(...values) : 0;
  const improvement =
    values.length > 1
      ? ((values[values.length - 1] - values[0]) / Math.max(values[0], 1)) * 100
      : 0;
  return {
    period,
    dataPoints: data.map((point) => ({ date: point.date, value: point.value })),
    average,
    peak,
    improvement,
  };
};

const usageSummary = (
  events: Array<{ event_type: string; event_data: string | null }>,
): UsageStatsDisplay => {
  const overall = {
    totalLearningTime: events.length * 30,
    totalSessions: events.filter((event) => event.event_type === 'session_start').length,
    conceptsLearned: events.filter((event) => event.event_type === 'concept_studied').length,
    skillsAcquired: events.filter((event) => event.event_type === 'mastery_improved').length,
    practiceExercisesCompleted: events.filter(
      (event) => event.event_type === 'assessment_generated',
    ).length,
    accuracyRate: 0.9,
  };
  const metadata = {
    generatedAt: new Date().toISOString(),
    period: 'custom',
  } as const;

  return {
    timeRange: 'custom',
    overall,
    patterns: {
      dailyAverage: overall.totalSessions / 7,
      weeklyPattern: {
        monday: 2,
        tuesday: 3,
        wednesday: 2,
        thursday: 2,
        friday: 1,
        saturday: 1,
        sunday: 1,
      },
      peakHours: ['10:00-12:00', '15:00-17:00'],
      consistency: 0.78,
    },
    engagement: {
      sessionsPerDay: 1.5,
      averageSessionLength: 45,
      completionRate: 0.85,
      returnRate: 0.72,
    },
    metadata,
  };
};

const buildTokenSummary = (
  events: Array<{ event_data: string | null }>,
  timeRange: string,
): TokenUsageDisplay => {
  let inputTokens = 0;
  let outputTokens = 0;
  events.forEach((event) => {
    const data = parseJson<Record<string, number>>(event.event_data, {});
    inputTokens += data.inputTokens ?? 0;
    outputTokens += data.outputTokens ?? 0;
  });
  const totalTokens = inputTokens + outputTokens;
  return {
    timeRange,
    currentPeriod: {
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      totalTokens,
      inputTokens,
      outputTokens,
      estimatedCost: totalTokens * 0.00001,
      usageTrend: 'stable',
    },
    providers: [
      {
        provider: 'openai',
        tokens: totalTokens * 0.6,
        cost: totalTokens * 0.00001 * 0.6,
        percentage: 60,
      },
      {
        provider: 'local',
        tokens: totalTokens * 0.4,
        cost: totalTokens * 0.00001 * 0.4,
        percentage: 40,
      },
    ],
    features: [
      { feature: 'chat', tokens: totalTokens * 0.5, percentage: 50 },
      { feature: 'knowledge', tokens: totalTokens * 0.3, percentage: 30 },
      { feature: 'content', tokens: totalTokens * 0.2, percentage: 20 },
    ],
    projections: {
      nextPeriodEstimate: totalTokens * 1.1,
      costEstimate: totalTokens * 0.00001 * 1.1,
      growthRate: 0.1,
      recommendations: ['Review usage during peak hours', 'Cache frequent requests'],
    },
    metadata: {
      generatedAt: new Date().toISOString(),
      period: timeRange,
    },
  };
};

type AnalyticsServiceDeps = {
  db: Kysely<Database>;
  loggerService: LoggerService;
};

export const createAnalyticsService = ({ db, loggerService }: AnalyticsServiceDeps) => {
  const serviceLogger = loggerService.child({ service: 'analytics' });

  const getRecentSessions = async (limit = 5): Promise<DashboardDisplay['recentSessions']> => {
    serviceLogger.debug('Fetching recent sessions', { limit });
    const rows = await db
      .selectFrom('learning_sessions')
      .selectAll()
      .orderBy('created_at', 'desc')
      .limit(limit)
      .execute();

    return rows.map((row) => {
      const metadata = parseJson<Record<string, unknown>>(row.metadata, {});
      return {
        id: row.id,
        title: row.title,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
        duration: Math.round((row.duration_seconds ?? 0) / 60),
        messageCount: row.total_messages ?? 0,
        conceptsExplored: ensureArray<string>(metadata.concepts as string[] | undefined),
        masteryLevel: Math.round(((row.difficulty_level ?? 1) / 5) * 100),
        tags: ensureArray<string>(metadata.tags as string[] | undefined),
        summary: row.description ?? String(metadata.summary ?? ''),
        status: metadata.sessionStatus as string | undefined,
      };
    });
  };

  const getConceptProgressList = async (): Promise<ConceptProgressDisplay[]> => {
    serviceLogger.debug('Fetching concept progress list');
    const rows = await db
      .selectFrom('concept_progress')
      .selectAll()
      .orderBy('updated_at', 'desc')
      .limit(10)
      .execute();

    return rows.map((row) => ({
      conceptId: row.concept_id,
      conceptName: row.concept_name,
      masteryLevel: Math.round(row.mastery_level * 100),
      totalSessions: row.sessions_studied,
      lastStudied: new Date(row.last_studied),
      trend: 'stable',
      relatedConcepts: [],
      prerequisites: [],
      nextSteps: [],
    }));
  };

  const aggregateSessions = async (
    periodDays: number,
  ): Promise<Array<{ date: Date; value: number }>> => {
    serviceLogger.debug('Aggregating sessions', { periodDays });
    const since = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);
    const rows = await db
      .selectFrom('learning_sessions')
      .selectAll()
      .where('created_at', '>=', since.toISOString())
      .orderBy('created_at', 'asc')
      .execute();

    const buckets: Record<string, number> = {};
    rows.forEach((row) => {
      const dayKey = formatDateKey(new Date(row.created_at));
      buckets[dayKey] = (buckets[dayKey] ?? 0) + 1;
    });

    return Object.entries(buckets).map(([day, count]) => ({
      date: new Date(day),
      value: count,
    }));
  };

  const fetchConcept = async (conceptId: string): Promise<ConceptProgressDisplay | null> => {
    const row = await db
      .selectFrom('concept_progress')
      .selectAll()
      .where('concept_id', '=', conceptId)
      .executeTakeFirst();

    if (!row) {
      return null;
    }

    return {
      conceptId: row.concept_id,
      conceptName: row.concept_name,
      masteryLevel: Math.round(row.mastery_level * 100),
      totalSessions: row.sessions_studied,
      lastStudied: new Date(row.last_studied),
      trend: 'stable',
      relatedConcepts: [],
      prerequisites: [],
      nextSteps: [],
    };
  };

  const getDashboard = async (): Promise<DashboardDisplay> => {
    serviceLogger.debug('Building analytics dashboard');
    const [recentSessions, conceptProgress, achievements, learningTrend, studyStreak, timeStats] =
      await Promise.all([
        getRecentSessions(),
        getConceptProgressList(),
        getAchievements(),
        getLearningTrends('weekly'),
        getStudyStreak(),
        getTimeStats(),
      ]);

    return {
      recentSessions,
      conceptProgress,
      achievements,
      learningTrends: [learningTrend],
      studyStreak,
      timeStats,
    };
  };

  const getProgressChart = async (params: ProgressChartParams): Promise<ProgressChartDisplay> => {
    serviceLogger.debug('Generating progress chart', params);
    const periodDays = periodToDays[params.period] ?? 30;
    const dataPoints = await aggregateSessions(periodDays);

    return {
      title: metricTitle(params.metric),
      type: 'line',
      data: dataPoints.map((point) => ({ date: point.date, value: point.value })),
      goal: params.conceptIds?.length ? 100 : undefined,
      unit: metricUnit(params.metric),
      period: params.period,
    };
  };

  const getConceptProgress = async (conceptId: string): Promise<ConceptProgressDisplay> => {
    serviceLogger.debug('Fetching concept progress', { conceptId });
    const progress = await fetchConcept(conceptId);
    if (!progress) {
      throw new ConceptNotFoundError(conceptId);
    }
    return progress;
  };

  const updateConceptProgress = async (
    conceptId: string,
    update: ConceptProgressUpdate,
  ): Promise<void> => {
    serviceLogger.info('Updating concept progress', {
      conceptId,
      masteryLevel: update.masteryLevel,
    });
    const now = new Date().toISOString();
    await db
      .insertInto('concept_progress')
      .values({
        id: Date.now(), // Using timestamp as ID for simplicity, or use uuidv4() for uniqueness
        concept_id: conceptId,
        concept_name: update.conceptId ?? conceptId,
        mastery_level: update.masteryLevel / 100,
        time_spent: update.sessionTime ?? 0,
        sessions_studied: 1,
        average_performance: update.masteryLevel,
        difficulty_rating: 3,
        improvement_rate: 0,
        confidence_level: 3,
        last_studied: now,
        created_at: now,
        updated_at: now,
      })
      .onConflict((oc) =>
        oc.column('concept_id').doUpdateSet({
          mastery_level: update.masteryLevel / 100,
          time_spent: update.sessionTime ?? 0,
          sessions_studied: 1,
          average_performance: update.masteryLevel,
          updated_at: now,
          last_studied: now,
        }),
      )
      .execute();
  };

  const trackSession = async (session: CreateLearningSessionRequest): Promise<string> => {
    serviceLogger.info('Tracking learning session', { title: session.title });
    const sessionId = uuidv4();
    const now = new Date().toISOString();
    await db
      .insertInto('learning_sessions')
      .values({
        id: sessionId,
        title: session.title,
        description: session.notes ?? '',
        start_time: now,
        duration_seconds: 0,
        total_messages: 0,
        concepts_studied: session.concepts.length,
        difficulty_level: 2,
        session_type: 'general',
        metadata: JSON.stringify({ tags: session.tags ?? [], goals: session.concepts }),
        created_at: now,
        updated_at: now,
      })
      .execute();

    if (session.concepts && session.concepts.length) {
      for (const conceptId of session.concepts) {
        await db
          .insertInto('session_concepts')
          .values({
            id: uuidv4(),
            session_id: sessionId,
            concept_id: conceptId,
            mastery_before: 0,
            mastery_after: 0,
            interaction_count: 0,
            created_at: now,
          })
          .onConflict((oc) => oc.column('session_id').column('concept_id').doNothing())
          .execute();
      }
    }

    return sessionId;
  };

  const updateSession = async (
    sessionId: string,
    updates: Partial<LearningSession>,
  ): Promise<void> => {
    serviceLogger.info('Updating session', { sessionId });
    const existing = await db
      .selectFrom('learning_sessions')
      .selectAll()
      .where('id', '=', sessionId)
      .executeTakeFirst();

    if (!existing) {
      throw new SessionNotFoundError(sessionId);
    }

    const updatePayload: Partial<LearningSession> = {
      ...updates,
    };

    // Add updated_at to the database update but not to the LearningSession interface
    const dbUpdatePayload = {
      ...updates,
      updated_at: new Date().toISOString(),
    };

    await db
      .updateTable('learning_sessions')
      .set(dbUpdatePayload)
      .where('id', '=', sessionId)
      .execute();
  };

  const getSessionHistory = async (limit = 50): Promise<SessionDisplay[]> => {
    serviceLogger.debug('Retrieving session history', { limit });
    const rows = await db
      .selectFrom('learning_sessions')
      .selectAll()
      .orderBy('created_at', 'desc')
      .limit(limit)
      .execute();

    return rows.map((row) => {
      const metadata = parseJson<Record<string, unknown>>(row.metadata, {});
      return {
        id: row.id,
        title: row.title,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
        duration: Math.round((row.duration_seconds ?? 0) / 60),
        messageCount: row.total_messages ?? 0,
        conceptsExplored: ensureArray<string>(metadata.concepts as string[] | undefined),
        masteryLevel: Math.round(((row.difficulty_level ?? 1) / 5) * 100),
        tags: ensureArray<string>(metadata.tags as string[] | undefined),
        summary: row.description ?? String(metadata.summary ?? ''),
      };
    });
  };

  const getAchievements = async (): Promise<AchievementDisplay[]> => {
    serviceLogger.debug('Loading achievements');
    const rows = await db
      .selectFrom('achievements')
      .selectAll()
      .orderBy('unlocked_at', 'desc')
      .execute();
    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description ?? '',
      icon: row.icon ?? 'trophy',
      category: (row.category as AchievementDisplay['category']) ?? 'learning',
      rarity: 'common',
      unlockedAt: row.unlocked_at ? new Date(row.unlocked_at) : new Date(0),
      progress: row.unlocked_at ? 100 : 0,
    }));
  };

  const checkAchievements = async (_sessionId: string): Promise<AchievementDisplay[]> => {
    serviceLogger.debug('Checking achievements', { sessionId: _sessionId });
    return getAchievements();
  };

  const getLearningTrends = async (
    period: 'daily' | 'weekly' | 'monthly',
  ): Promise<LearningTrendDisplay> => {
    serviceLogger.debug('Calculating learning trends', { period });
    const days = period === 'daily' ? 7 : period === 'weekly' ? 30 : 90;
    const data = await aggregateSessions(days);
    return buildLearningTrend(data, period);
  };

  const getStudyStreak = async (): Promise<StudyStreakDisplay> => {
    serviceLogger.debug('Computing study streak');
    const sessions = await db
      .selectFrom('learning_sessions')
      .select(['created_at'])
      .orderBy('created_at', 'desc')
      .execute();

    const dates = Array.from(
      new Set(sessions.map((row) => formatDateKey(new Date(row.created_at)))),
    );
    let currentStreak = 0;
    let longestStreak = 0;
    let lastDate = '';

    dates.forEach((date, index) => {
      const prev = dates[index - 1];
      if (!prev || new Date(date).getTime() + 24 * 60 * 60 * 1000 >= new Date(prev).getTime()) {
        currentStreak += 1;
      } else {
        longestStreak = Math.max(longestStreak, currentStreak);
        currentStreak = 1;
      }
      lastDate = date;
    });
    longestStreak = Math.max(longestStreak, currentStreak);

    return {
      currentStreak,
      longestStreak,
      lastStudyDate: lastDate ? new Date(lastDate) : new Date(),
      streakHistory: dates.map((val) => new Date(val)),
    };
  };

  const getTimeStats = async (): Promise<TimeStatsDisplay> => {
    serviceLogger.debug('Collecting time statistics');
    const rows = await db.selectFrom('learning_sessions').selectAll().execute();
    const totalStudyTime = rows.reduce(
      (sum, row) => sum + Math.max(0, (row.duration_seconds ?? 0) / 60),
      0,
    );
    const averageSessionTime = rows.length ? totalStudyTime / rows.length : 0;
    const hours = rows.map((row) => new Date(row.start_time).getHours());
    const hourCounts = hours.reduce<Record<number, number>>((acc, hour) => {
      acc[hour] = (acc[hour] ?? 0) + 1;
      return acc;
    }, {});
    const mostProductiveHour = Number(
      Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 12,
    );
    const studyDays = new Set(rows.map((row) => formatDateKey(new Date(row.created_at))));
    const now = new Date();
    const thisMonth = studyDays.size;
    const thisWeek = rows.filter(
      (row) => new Date(row.created_at) > new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
    ).length;

    return {
      totalStudyTime,
      averageSessionTime,
      totalSessions: rows.length,
      mostProductiveHour,
      studyDaysThisMonth: thisMonth,
      studyDaysThisWeek: thisWeek,
    };
  };

  const exportData = async (format: 'json' | 'csv'): Promise<string> => {
    serviceLogger.debug('Exporting analytics data', { format });
    const sessions = await getSessionHistory(100);
    const achievements = await getAchievements();
    const progress = await db.selectFrom('concept_progress').selectAll().execute();
    const payload = {
      sessions,
      achievements,
      progress,
    };

    if (format === 'json') {
      return JSON.stringify(payload, null, 2);
    }
    throw new AnalyticsError('CSV export not supported', 'EXPORT_UNSUPPORTED');
  };

  const importData = async (_data: string, _format: 'json' | 'csv'): Promise<void> => {
    serviceLogger.warn('Analytics import requested but not supported');
    throw new AnalyticsError('Import is not supported yet', 'IMPORT_UNSUPPORTED');
  };

  const trackEvent = async (event: {
    eventType: string;
    userId?: string;
    properties?: Record<string, unknown>;
    context?: Record<string, unknown>;
  }): Promise<void> => {
    serviceLogger.debug('Tracking analytics event', {
      type: event.eventType,
      userId: event.userId,
    });
    const now = new Date().toISOString();
    await db
      .insertInto('analytics')
      .values({
        id: uuidv4(),
        event_type: event.eventType as any,
        session_id: event.context?.sessionId as string | undefined,
        concept_id: event.context?.conceptId as string | undefined,
        event_data: JSON.stringify({ ...event.properties, context: event.context }),
        timestamp: now,
        created_at: now,
      })
      .execute();
  };

  const unlockAchievement = async (
    achievementId: string,
  ): Promise<{ success: boolean; message: string }> => {
    serviceLogger.info('Unlocking achievement', { achievementId });
    const now = new Date().toISOString();
    const result = await db
      .updateTable('achievements')
      .set({ unlocked_at: now, updated_at: now })
      .where('id', '=', achievementId)
      .execute();
    if (result.length === 0) {
      return { success: false, message: 'Achievement not found' };
    }
    return { success: true, message: 'Achievement unlocked' };
  };

  const getUsageStats = async (
    timeRange: '7days' | '30days' | '90days' | '1year',
    includePatterns = true,
    includeEngagement = true,
  ): Promise<UsageStatsDisplay> => {
    serviceLogger.debug('Fetching usage stats', { timeRange });
    const events = await db.selectFrom('analytics').selectAll().execute();
    const usage = usageSummary(events);
    usage.timeRange = timeRange;
    if (!includePatterns) {
      delete usage.patterns;
    }
    if (!includeEngagement) {
      delete usage.engagement;
    }
    usage.metadata.period = timeRange;
    return usage;
  };

  const getTokenUsage = async (
    timeRange: '7days' | '30days' | '90days' | '1year',
    includeByProvider = true,
    includeByFeature = true,
    includeProjections = true,
  ): Promise<TokenUsageDisplay> => {
    serviceLogger.debug('Fetching token usage', { timeRange });
    const events = await db.selectFrom('analytics').select(['event_data']).execute();
    const summary = buildTokenSummary(events, timeRange);
    if (!includeByProvider) {
      delete summary.providers;
    }
    if (!includeByFeature) {
      delete summary.features;
    }
    if (!includeProjections) {
      delete summary.projections;
    }
    return summary;
  };

  return {
    getDashboard,
    getProgressChart,
    getConceptProgress,
    updateConceptProgress,
    trackSession,
    updateSession,
    getSessionHistory,
    getAchievements,
    checkAchievements,
    getLearningTrends,
    getStudyStreak,
    getTimeStats,
    exportData,
    importData,
    trackEvent,
    unlockAchievement,
    getUsageStats,
    getTokenUsage,
  };
};

// Export the type for external use without causing circular reference
export type AnalyticsService = ReturnType<typeof createAnalyticsService>;
