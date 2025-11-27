export type ErrorType = 'CONFIG_ERROR' | 'NETWORK_ERROR' | 'SYSTEM_ERROR';

// Error types
export interface IPCError extends Error {
  code: string;
  channel?: string;
  requestId?: string;
}

export type IPCErrorPayload = {
  type: ErrorType;
  code: string;
  message: string;
  details?: Record<string, unknown>;
};

export const isIPCErrorPayload = (value: unknown): value is IPCErrorPayload => {
  const maybePayload = value as IPCErrorPayload;
  return (
    !!maybePayload &&
    typeof maybePayload === 'object' &&
    typeof maybePayload.type === 'string' &&
    typeof maybePayload.code === 'string' &&
    typeof maybePayload.message === 'string' &&
    (maybePayload.details === undefined ||
      (typeof maybePayload.details === 'object' && maybePayload.details !== null))
  );
};

export const createIPCError = (payload: IPCErrorPayload): IPCErrorPayload => ({
  ...payload,
});

export const IPC_ERROR_CHANNEL = 'ipc:error';

export const IPC_ERROR_CODES = {
  provider: {
    missingApiKey: 'provider.config.missing_api_key',
    authRequired: 'provider.auth.required',
    unsupportedConfig: 'provider.config.unsupported',
    chatMissing: 'provider.config.chat_missing',
    missingConfig: 'provider.config.missing',
    missingProviderType: 'provider.config.missing_provider_type',
  },
  chat: {
    unavailable: 'chat.unavailable',
    cancelFailed: 'chat.cancel_failed',
    practiceMissingOpportunity: 'chat.practice_missing_opportunity',
  },
  learning: {
    pathNotFound: 'learning.path_not_found',
    pathError: 'learning.path_error',
    startFailed: 'learning.start_failed',
    progressFailed: 'learning.progress_failed',
    pauseFailed: 'learning.pause_failed',
    resumeFailed: 'learning.resume_failed',
    completeFailed: 'learning.complete_failed',
    recentFailed: 'learning.recent_failed',
    searchFailed: 'learning.search_failed',
  },
  sessions: {
    createFailed: 'sessions.create_failed',
    notFound: 'sessions.not_found',
  },
  settings: {
    configWriteFailed: 'settings.config_write_failed',
  },
  knowledge: {
    ingestFailed: 'knowledge.ingest_failed',
    searchFailed: 'knowledge.search_failed',
    exploreFailed: 'knowledge.explore_failed',
    relatedFailed: 'knowledge.related_failed',
    mapFailed: 'knowledge.map_failed',
    parseFailed: 'knowledge.parse_failed',
  },
  content: {
    exploreFailed: 'content.explore_failed',
    importFailed: 'content.import_failed',
    recommendFailed: 'content.recommend_failed',
    searchFailed: 'content.search_failed',
    analyzeFailed: 'content.analyze_failed',
    extractFailed: 'content.extract_failed',
  },
  system: {
    reportErrorFailed: 'system.report_error_failed',
    healthCheckFailed: 'system.health_check_failed',
    versionFailed: 'system.version_failed',
  },
  analytics: {
    dashboardFailed: 'analytics.dashboard_failed',
    progressChartFailed: 'analytics.progress_chart_failed',
    achievementsFailed: 'analytics.achievements_failed',
    unlockFailed: 'analytics.unlock_failed',
    usageFailed: 'analytics.usage_failed',
    tokenUsageFailed: 'analytics.token_usage_failed',
    trackFailed: 'analytics.track_failed',
    conceptProgressFailed: 'analytics.concept_progress_failed',
    sessionHistoryFailed: 'analytics.session_history_failed',
    checkAchievementsFailed: 'analytics.check_achievements_failed',
    trendsFailed: 'analytics.trends_failed',
    streakFailed: 'analytics.streak_failed',
    timeStatsFailed: 'analytics.time_stats_failed',
    exportFailed: 'analytics.export_failed',
    importFailed: 'analytics.import_failed',
    trackSessionFailed: 'analytics.track_session_failed',
    updateConceptFailed: 'analytics.update_concept_failed',
  },
} as const;

export class IPCErrorException extends Error implements IPCError {
  public readonly payload: IPCErrorPayload;
  public readonly code: string;

  constructor(payload: IPCErrorPayload) {
    super(payload.message);
    this.payload = payload;
    this.code = payload.code;
    this.name = 'IPCErrorException';

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, IPCErrorException);
    } else {
      this.stack = new Error(payload.message).stack;
    }

    Object.setPrototypeOf(this, IPCErrorException.prototype);
  }
}

export const isIPCErrorException = (value: unknown): value is IPCErrorException => {
  return value instanceof IPCErrorException;
};

// Global error buffer types
export type BufferedIPCError = IPCErrorPayload & { timestamp: number };
export const MAX_ERROR_BUFFER_SIZE = 50;

export const requiresSetup = (payload: IPCErrorPayload): boolean => {
  if (!payload) return false;
  if (payload.type === 'CONFIG_ERROR') return true;
  return (
    typeof payload.code === 'string' &&
    payload.code.endsWith(IPC_ERROR_CODES.provider.missingApiKey)
  );
};
