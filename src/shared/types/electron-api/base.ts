/**
 * Base types for Electron API
 *
 * Common types shared across all API modules.
 */

import type { Message as AIMessage } from '../ai';
import type { DirectoryFilterConfig, DirectoryScanResult } from '../filesystem';

export interface APIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: APIResponseError;
  code?: string;
}

export interface APIResponseError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface SystemReadyPayload {
  status: 'ready' | 'loading';
  ready: { ipcHandlersRegistered: boolean; startMs?: number };
}

export interface ConfigChangedPayload {
  changedKeys?: string[];
  config?: unknown;
  timestamp?: number;
}

export interface IPCError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export const READY_TIMEOUT_MS = 5000;

export interface AISDKAPI {
  stream: (
    params: {
      messages: Array<Pick<AIMessage, 'role' | 'content'>>;
      conversationId?: string;
    },
    callback: (data: unknown) => void,
    onComplete?: () => void,
  ) => () => void;
}

// Missing conversation and message types
export interface ConversationDisplay {
  id: string;
  title: string;
  updatedAt: string;
  messageCount: number;
}

export interface MessageDisplay {
  id: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  timestamp: string;
}

export interface TypingIndicator {
  isTyping: boolean;
  userId?: string;
}

export interface ConversationSummary {
  id: string;
  title: string;
  messageCount: number;
  lastMessage: string;
  updatedAt: string;
}

export interface ConversationHistory {
  conversations: ConversationDisplay[];
  total: number;
}

export interface ConversationContext {
  sessionId: string;
  conversation: ConversationDisplay;
  messages: MessageDisplay[];
}

export interface PracticeOpportunityResult {
  id: string;
  concept: string;
  difficulty: string;
  completed: boolean;
}

export interface NaturalPracticeSuggestion {
  concept: string;
  suggestion: string;
  difficulty: string;
}

export interface UserLearningContext {
  currentSession?: string;
  recentConcepts: string[];
  progress: number;
}

export interface AgentDisplay {
  id: string;
  name: string;
  type: string;
  status: 'active' | 'inactive' | 'busy';
  capabilities: string[];
}

export interface AgentContext {
  agent: AgentDisplay;
  sessionId: string;
  context: Record<string, unknown>;
}

export interface AgentCapabilitiesDisplay {
  capabilities: string[];
  examples: string[];
}

export interface FeatureDemoDisplay {
  feature: string;
  description: string;
  status: 'available' | 'coming-soon' | 'experimental';
}

// Content API types
export interface ImportSessionDisplay {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  filesProcessed: number;
  totalFiles: number;
  conceptsExtracted: number;
  error?: string;
}

export interface ContentFormat {
  extension: string;
  parser: string;
  supported: boolean;
}

export interface ConceptExtractionDisplay {
  conceptId: string;
  name: string;
  confidence: number;
  source: string;
  relationships: Array<{
    target: string;
    type: string;
    confidence: number;
  }>;
}

export interface ContentAPI {
  // Import sessions
  createImportSession: (params: { path: string; options?: any }) => Promise<ImportSessionDisplay>;
  getImportSession: (sessionId: string) => Promise<ImportSessionDisplay>;
  listImportSessions: () => Promise<ImportSessionDisplay[]>;

  // Content parsing
  parseContent: (params: { filePath: string; format: ContentFormat }) => Promise<any>;
  extractConcepts: (content: string) => Promise<ConceptExtractionDisplay[]>;

  // Project exploration
  exploreProject: (path: string) => Promise<any>;
  scanDirectory: (params: DirectoryFilterConfig) => Promise<DirectoryScanResult>;
}

export interface AgentsAPI {
  // Agent management
  listAgents: () => Promise<AgentDisplay[]>;
  getAgent: (agentId: string) => Promise<AgentDisplay>;
  createAgent: (params: { name: string; type: string; config: any }) => Promise<AgentDisplay>;
  updateAgent: (agentId: string, updates: any) => Promise<AgentDisplay>;
  deleteAgent: (agentId: string) => Promise<{ deleted: boolean }>;

  // Agent operations
  executeAgent: (agentId: string, params: any) => Promise<any>;
  getAgentCapabilities: (agentId: string) => Promise<AgentCapabilitiesDisplay>;
}

export interface LearningAPI {
  // Learning sessions
  createSession: (params: { topic: string; agentType: string; difficulty?: string }) => Promise<any>;
  getSession: (sessionId: string) => Promise<any>;
  updateSession: (sessionId: string, updates: any) => Promise<any>;
  deleteSession: (sessionId: string) => Promise<any>;

  // Learning progress
  getProgress: (sessionId: string) => Promise<any>;
  updateProgress: (sessionId: string, progress: any) => Promise<any>;

  // Learning assessment
  assessUnderstanding: (sessionId: string, concept: string) => Promise<any>;
  getRecommendations: (sessionId: string) => Promise<any>;
}
