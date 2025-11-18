/**
 * API response/request types for internal communication
 */

// Import required types from other modules
import type { Message } from './ai';
import type { ChatOptions, TokenUsage, StreamChunk } from './ai';
import type { AppConfig } from './config';
import type { Session, SessionMetadata, SessionExportOptions } from './session';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: Date;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ChatRequest {
  messages: Message[];
  provider?: string;
  model?: string;
  options?: ChatOptions;
  sessionId?: string;
}

export interface ChatResponse {
  content: string;
  reasoningContent?: string;
  usage?: import('./ai').TokenUsage;
  model: string;
  provider: string;
  timestamp: Date;
  id: string;
  sessionId?: string;
}

export interface StreamResponse {
  id: string;
  chunk: StreamChunk;
  provider: string;
  model: string;
  sessionId?: string;
}

export interface ConfigRequest {
  key?: string;
  value?: any;
  section?: string;
}

export interface ConfigResponse {
  config: AppConfig;
  updatedAt: Date;
}

export interface SessionRequest {
  id?: string;
  title?: string;
  metadata?: Partial<SessionMetadata>;
}

export interface SessionListResponse {
  sessions: Session[];
  total: number;
  page: number;
  limit: number;
}

export interface ExportRequest {
  sessionIds: string[];
  format: 'json' | 'markdown' | 'txt' | 'html';
  options: SessionExportOptions;
}

export interface ExportResponse {
  downloadUrl?: string;
  content?: string;
  filename: string;
  mimeType: string;
}