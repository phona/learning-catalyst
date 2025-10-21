/**
 * API response/request types for internal communication
 */

import type { Message, ChatOptions, TokenUsage, StreamChunk } from '../../types/ai';
import type { AppConfig } from '../../types/config';
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
    has_next: boolean;
    has_prev: boolean;
  };
}

export interface ChatRequest {
  messages: Message[];
  provider?: string;
  model?: string;
  options?: ChatOptions;
  session_id?: string;
}

export interface ChatResponse {
  id: string;
  content: string;
  reasoning_content?: string;
  provider: string;
  model: string;
  usage?: TokenUsage;
  timestamp: Date;
  session_id?: string;
}

export interface StreamResponse {
  id: string;
  chunk: StreamChunk;
  provider: string;
  model: string;
  session_id?: string;
}

export interface ConfigRequest {
  key?: string;
  value?: any;
  section?: string;
}

export interface ConfigResponse {
  config: AppConfig;
  updated_at: Date;
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
  session_ids: string[];
  format: 'json' | 'markdown' | 'txt' | 'html';
  options: SessionExportOptions;
}

export interface ExportResponse {
  download_url?: string;
  content?: string;
  filename: string;
  mime_type: string;
}