# Electron API Documentation

## Overview

Learning Catalyst uses a secure Inter-Process Communication (IPC) system to enable communication between the Electron main process (Node.js) and the renderer process (React browser). This document describes the complete API structure, communication patterns, and type-safe contracts.

## Architecture

### Process Separation

**Main Process (Node.js)** - Provides Services
- AI providers and model management
- Database operations (SQLite + Kysely)
- Agent orchestration
- File system access
- Application lifecycle

**Renderer Process (React)** - Consumes Services
- User interface components
- State management
- User interactions
- Display logic

**IPC Flow**: Main Process → IPC Handlers → Preload Script → `window.electronAPI` → Renderer

## API Structure

The Electron API is organized into **8 domains**:

```typescript
interface ElectronAPI {
  chat: ChatAPI;
  learning: LearningAPI;
  knowledge: KnowledgeAPI;
  analytics: AnalyticsAPI;
  sessions: SessionsAPI;
  agents: AgentsAPI;
  content: ContentAPI;
  settings: SettingsAPI;
}

## Error Handling & Utility Helpers

The renderer can lean on a small helpers surface to surface actionable errors, open the setup workflow, and report renderer-side issues back to the main process. Errors from the main process travel through the `IPC_ERROR_CHANNEL` (`ipc:error`) as `IPCErrorPayload` objects before the UI shows a toast or prompts the setup flow.

### IPC error payloads

| Property | Description |
| --- | --- |
| `type` | High level error category (`CONFIG_ERROR`, `NETWORK_ERROR`, `SYSTEM_ERROR`). |
| `code` | Machine-readable key (`provider.config.chat_missing`, `database.migration_failed`, etc.). |
| `message` | Human-friendly text that can be displayed directly to users or augmented with guidance. |
| `needsSetup` | `true` when the renderer should interrupt the experience and open setup (missing API key, provider, etc.). |
| `action` | Recommended next steps (`openProviderSetup`, `retry`, `contactSupport`). |
| `details` | Optional metadata (request IDs, stack traces, diagnostic hints). |

### Utility helpers

| Method | Signature | Purpose |
| --- | --- | --- |
| `settings.getAppVersion()` | `() => Promise<string>` | Returns the current application version from `app.getVersion()`. |
| `settings.quit()` | `() => Promise<void>` | Requests the main process to close the app (proxy for `settings:quitApp`). |
| `settings.getConfig()` | `() => Promise<AppConfig | null>` | Reads the persisted workspace configuration (`settings:getWorkspaceConfig`). |
| `settings.setConfig(config)` | `(config: AppConfig) => Promise<void>` | Replaces the workspace configuration (`settings:setWorkspaceConfig`). |
| `handleError(error, context, severity)` | `(error: Error \| string, context: string, severity?: 'info' | 'warning' | 'error' | 'critical') => void` | Logs or forwards renderer-side issues to `system:report-error` so the main process can persist breadcrumbs. |
| `onMenuAction(handler)` | `(handler: (action: string, data?: unknown) => void) => () => void` | Subscribe to menu events emitted from the main menu controller. |
| `onIPCError(handler)` | `(handler: (payload: IPCErrorPayload) => void) => () => void` | Listen for structured errors emitted by the main process (`ipc:error`) so the renderer can toast guidance, restart flows, or open setup when `needsSetup` is `true`. |

### Renderer error handling guidance

Use `window.electronAPI.onIPCError` to react to main-reported failures and show a friendly toast with actionable guidance; `needsSetup` flags typically mean the chat provider was never configured, so bail out of the main UI and show the setup screen. Conversely, call `window.electronAPI.handleError` when you need to log a renderer-side failure back to the main process for diagnostics.

```typescript
window.electronAPI.onIPCError((payload) => {
  showError(`${payload.message}${payload.needsSetup ? ' - configure your provider in Settings.' : ''}`);
  if (payload.needsSetup) {
    openSetupOverlay(payload.action);
  }
});

window.electronAPI.handleError(new Error('Session store failed'), 'SessionList', 'critical');
```

### Error Codes

| Code | Description |
|------|-------------|
| `VALIDATION_ERROR` | Invalid input parameters |
| `NOT_FOUND` | Requested resource not found |
| `UNAUTHORIZED` | Authentication/authorization failure |
| `DATABASE_ERROR` | Database operation failed |
| `AI_PROVIDER_ERROR` | AI provider API error |
| `UNKNOWN_ERROR` | Unexpected error |

### Error Handling Example

```typescript
try {
  const response = await window.electronAPI.learning.startSession(options);
  if (!response.success) {
    console.error('Error:', response.error?.message);
    return;
  }
  setSession(response.data);
} catch (error) {
  window.electronAPI.handleError(error instanceof Error ? error : new Error('Unexpected error'), 'LearningApp', 'error');
}
```

## IPC Channel Reference

Complete reference of all available IPC channels:

| Channel | Method | Parameters | Return Type | Purpose |
|---------|--------|------------|-------------|---------|
| **chat:sendMessage** | `sendMessage` | `message: string, sessionId?: string` | `Promise<APIResponse<MessageResponse>>` | Send message and get AI response |
| **chat:sendMessageStream** | `sendMessageStream` | `message: string, onChunk: (chunk: string) => void, sessionId?: string` | `Promise<APIResponse<void>>` | Stream AI response in real-time |
| **chat:getHistory** | `getHistory` | `sessionId: string` | `Promise<APIResponse<ConversationDisplay[]>>` | Get conversation history |
| **chat:deleteMessage** | `deleteMessage` | `messageId: string` | `Promise<APIResponse<void>>` | Delete a message |
| **learning:startSession** | `startSession` | `options: SessionStartOptions` | `Promise<APIResponse<LearningSessionDisplay>>` | Create learning session |
| **learning:getSession** | `getSession` | `sessionId: string` | `Promise<APIResponse<LearningSessionDisplay>>` | Get session details |
| **learning:listSessions** | `listSessions` | `filters?: SessionFilters` | `Promise<APIResponse<LearningSessionDisplay[]>>` | List all sessions |
| **learning:deleteSession** | `deleteSession` | `sessionId: string` | `Promise<APIResponse<void>>` | Delete session |
| **learning:getProgress** | `getProgress` | `sessionId?: string` | `Promise<APIResponse<LearningProgressDisplay>>` | Get learning progress |
| **learning:updateProgress** | `updateProgress` | `conceptId: string, status: ProgressStatus` | `Promise<APIResponse<void>>` | Update concept progress |
| **learning:getAchievements** | `getAchievements` | none | `Promise<APIResponse<AchievementDisplay[]>>` | Get user achievements |
| **knowledge:search** | `search` | `query: string` | `Promise<APIResponse<ConceptExplorationDisplay[]>>` | Search knowledge concepts |
| **knowledge:getRelatedConcepts** | `getRelatedConcepts` | `conceptId: string` | `Promise<APIResponse<RelatedConceptsDisplay>>` | Get related concepts |
| **knowledge:explorePath** | `explorePath` | `fromConceptId: string, toConceptId: string` | `Promise<APIResponse<ConceptPath[]>>` | Find path between concepts |
| **knowledge:getConcept** | `getConcept` | `conceptId: string` | `Promise<APIResponse<ConceptDisplay>>` | Get concept details |
| **knowledge:getKnowledgeMap** | `getKnowledgeMap` | `sessionId?: string` | `Promise<APIResponse<KnowledgeMapDisplay>>` | Get visual knowledge map |
| **knowledge:getExercises** | `getExercises` | `conceptId: string, difficulty?: string` | `Promise<APIResponse<ExerciseDisplay[]>>` | Get practice exercises |
| **analytics:getDashboard** | `getDashboard` | none | `Promise<APIResponse<DashboardDisplay>>` | Get dashboard data |
| **analytics:getProgressChart** | `getProgressChart` | `timeRange: string` | `Promise<APIResponse<ProgressChartDisplay>>` | Get progress chart |
| **analytics:getUsageStats** | `getUsageStats` | none | `Promise<APIResponse<UsageStatsDisplay>>` | Get usage statistics |
| **analytics:getTokenUsage** | `getTokenUsage` | none | `Promise<APIResponse<TokenUsageDisplay>>` | Get AI token usage |
| **analytics:getInsights** | `getInsights` | none | `Promise<APIResponse<LearningInsightDisplay[]>>` | Get learning insights |
| **sessions:saveCheckpoint** | `saveCheckpoint` | `name?: string` | `Promise<APIResponse<Checkpoint>>` | Save session checkpoint |
| **sessions:loadCheckpoint** | `loadCheckpoint` | `checkpointId: string` | `Promise<APIResponse<void>>` | Load checkpoint |
| **sessions:listCheckpoints** | `listCheckpoints` | none | `Promise<APIResponse<Checkpoint[]>>` | List checkpoints |
| **sessions:deleteCheckpoint** | `deleteCheckpoint` | `checkpointId: string` | `Promise<APIResponse<void>>` | Delete checkpoint |
| **sessions:getCurrentState** | `getCurrentState` | none | `Promise<APIResponse<SessionState>>` | Get current session state |
| **ipc:error** | `onIPCError(handler)` | `payload: IPCErrorPayload` | `void` | Broadcasts structured `IPCErrorPayload` from main so the renderer can toast guidance or show setup screens when services fail to start. |
| **sessions:restoreState** | `restoreState` | `state: SessionState` | `Promise<APIResponse<void>>` | Restore session state |
| **agents:listAgents** | `listAgents` | none | `Promise<APIResponse<AgentDisplay[]>>` | List all agents |
| **agents:getAgent** | `getAgent` | `agentId: string` | `Promise<APIResponse<AgentDisplay>>` | Get agent details |
| **agents:createAgent** | `createAgent` | `config: AgentConfig` | `Promise<APIResponse<AgentDisplay>>` | Create new agent |
| **agents:updateAgent** | `updateAgent` | `agentId: string, updates: Partial<AgentConfig>` | `Promise<APIResponse<AgentDisplay>>` | Update agent |
| **agents:deleteAgent** | `deleteAgent` | `agentId: string` | `Promise<APIResponse<void>>` | Delete agent |
| **agents:activateAgent** | `activateAgent` | `agentId: string` | `Promise<APIResponse<void>>` | Activate agent |
| **agents:deactivateAgent** | `deactivateAgent` | `agentId: string` | `Promise<APIResponse<void>>` | Deactivate agent |
| **agents:getAgentState** | `getAgentState` | `agentId: string` | `Promise<APIResponse<AgentState>>` | Get agent state |
| **content:discoverContent** | `discoverContent` | `directory: string` | `Promise<APIResponse<ContentDiscoveryResult>>` | Discover content in directory |
| **content:analyzeDocument** | `analyzeDocument` | `filePath: string` | `Promise<APIResponse<DocumentAnalysisDisplay>>` | Analyze document |
| **content:getRecommendations** | `getRecommendations` | none | `Promise<APIResponse<ContentRecommendationDisplay[]>>` | Get content recommendations |
| **content:importMaterials** | `importMaterials` | `paths: string[]` | `Promise<APIResponse<ImportResultDisplay>>` | Import learning materials |
| **content:removeMaterial** | `removeMaterial` | `materialId: string` | `Promise<APIResponse<void>>` | Remove material |
| **settings:getProviders** | `getProviders` | none | `Promise<APIResponse<ProviderDisplay[]>>` | Get AI providers |
| **settings:addProvider** | `addProvider` | `config: ProviderConfig` | `Promise<APIResponse<void>>` | Add AI provider |
| **settings:updateProvider** | `updateProvider` | `providerId: string, config: Partial<ProviderConfig>` | `Promise<APIResponse<void>>` | Update provider |
| **settings:deleteProvider** | `deleteProvider` | `providerId: string` | `Promise<APIResponse<void>>` | Delete provider |
| **settings:getPreferences** | `getPreferences` | none | `Promise<APIResponse<UserPreferencesDisplay>>` | Get user preferences |
| **settings:updatePreferences** | `updatePreferences` | `preferences: Partial<UserPreferencesDisplay>` | `Promise<APIResponse<void>>` | Update preferences |
| **settings:getModels** | `getModels` | none | `Promise<APIResponse<ModelDisplay[]>>` | Get available models |
| **settings:setDefaultModel** | `setDefaultModel` | `modelId: string` | `Promise<APIResponse<void>>` | Set default model |

### 1. Chat API

**File**: `src/shared/types/electron-api/chat-api.ts`

**Purpose**: AI conversation and messaging

**Key Methods**:
```typescript
// Send a message and get AI response
chat: {
  sendMessage: (message: string, sessionId?: string) => Promise<MessageResponse>;

  // Stream responses for real-time updates
  sendMessageStream: (
    message: string,
    onChunk: (chunk: string) => void,
    sessionId?: string
  ) => Promise<void>;

  // Get conversation history
  getHistory: (sessionId: string) => Promise<ConversationDisplay[]>;

  // Delete a message
  deleteMessage: (messageId: string) => Promise<void>;
}
```

**Display Types**:
```typescript
interface MessageDisplay {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  thinkingContent?: string;
  provider?: string;
  model?: string;
  timestamp: string;
}

interface ConversationDisplay {
  sessionId: string;
  title: string;
  messages: MessageDisplay[];
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}
```

### 2. Learning API

**File**: `src/shared/types/electron-api/learning-api.ts`

**Purpose**: Learning sessions and progress tracking

**Key Methods**:
```typescript
learning: {
  // Create and manage learning sessions
  startSession: (options: SessionStartOptions) => Promise<LearningSessionDisplay>;
  getSession: (sessionId: string) => Promise<LearningSessionDisplay>;
  listSessions: (filters?: SessionFilters) => Promise<LearningSessionDisplay[]>;
  deleteSession: (sessionId: string) => Promise<void>;

  // Progress tracking
  getProgress: (sessionId?: string) => Promise<LearningProgressDisplay>;
  updateProgress: (conceptId: string, status: ProgressStatus) => Promise<void>;

  // Achievements
  getAchievements: () => Promise<AchievementDisplay[]>;
}
```

**Display Types**:
```typescript
interface LearningSessionDisplay {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime?: string;
  status: 'active' | 'paused' | 'completed';
  progress: number;
  conceptsCovered: number;
  messages: number;
}

interface LearningProgressDisplay {
  totalSessions: number;
  totalConcepts: number;
  masteredConcepts: number;
  inProgressConcepts: number;
  currentStreak: number;
  averageSessionLength: number;
}
```

### 3. Knowledge API

**File**: `src/shared/types/electron-api/knowledge-api.ts`

**Purpose**: Knowledge graph and concept exploration

**Key Methods**:
```typescript
knowledge: {
  // Search and exploration
  search: (query: string) => Promise<ConceptExplorationDisplay[]>;
  getRelatedConcepts: (conceptId: string) => Promise<RelatedConceptsDisplay>;
  explorePath: (fromConceptId: string, toConceptId: string) => Promise<ConceptPath[]>;

  // Concept management
  getConcept: (conceptId: string) => Promise<ConceptDisplay>;
  getKnowledgeMap: (sessionId?: string) => Promise<KnowledgeMapDisplay>;

  // Exercises and practice
  getExercises: (conceptId: string, difficulty?: string) => Promise<ExerciseDisplay[]>;
}
```

### 4. Analytics API

**File**: `src/shared/types/electron-api/analytics-api.ts`

**Purpose**: Usage statistics and progress analytics

**Key Methods**:
```typescript
analytics: {
  // Dashboard data
  getDashboard: () => Promise<DashboardDisplay>;
  getProgressChart: (timeRange: string) => Promise<ProgressChartDisplay>;

  // Usage statistics
  getUsageStats: () => Promise<UsageStatsDisplay>;
  getTokenUsage: () => Promise<TokenUsageDisplay>;

  // Learning insights
  getInsights: () => Promise<LearningInsightDisplay[]>;
}
```

### 5. Sessions API

**File**: `src/shared/types/electron-api/sessions-api.ts`

**Purpose**: Session persistence and checkpointing

**Key Methods**:
```typescript
sessions: {
  // Session management
  saveCheckpoint: (name?: string) => Promise<Checkpoint>;
  loadCheckpoint: (checkpointId: string) => Promise<void>;
  listCheckpoints: () => Promise<Checkpoint[]>;
  deleteCheckpoint: (checkpointId: string) => Promise<void>;

  // Session state
  getCurrentState: () => Promise<SessionState>;
  restoreState: (state: SessionState) => Promise<void>;
}
```

### 6. Agents API

**File**: `src/shared/types/electron-api/agent-api.ts`

**Purpose**: AI agent management and lifecycle

**Key Methods**:
```typescript
agents: {
  // Agent management
  listAgents: () => Promise<AgentDisplay[]>;
  getAgent: (agentId: string) => Promise<AgentDisplay>;
  createAgent: (config: AgentConfig) => Promise<AgentDisplay>;
  updateAgent: (agentId: string, updates: Partial<AgentConfig>) => Promise<AgentDisplay>;
  deleteAgent: (agentId: string) => Promise<void>;

  // Agent lifecycle
  activateAgent: (agentId: string) => Promise<void>;
  deactivateAgent: (agentId: string) => Promise<void>;
  getAgentState: (agentId: string) => Promise<AgentState>;
}
```

### 7. Content API

**File**: `src/shared/types/electron-api/content-api.ts`

**Purpose**: Content discovery and material management

**Key Methods**:
```typescript
content: {
  // Content discovery
  discoverContent: (directory: string) => Promise<ContentDiscoveryResult>;
  analyzeDocument: (filePath: string) => Promise<DocumentAnalysisDisplay>;
  getRecommendations: () => Promise<ContentRecommendationDisplay[]>;

  // Material management
  importMaterials: (paths: string[]) => Promise<ImportResultDisplay>;
  removeMaterial: (materialId: string) => Promise<void>;
}
```

### 8. Settings API

**File**: `src/shared/types/electron-api/settings-api.ts`

**Purpose**: Configuration and preferences

**Key Methods**:
```typescript
settings: {
  // Provider configuration
  getProviders: () => Promise<ProviderDisplay[]>;
  addProvider: (config: ProviderConfig) => Promise<void>;
  updateProvider: (providerId: string, config: Partial<ProviderConfig>) => Promise<void>;
  deleteProvider: (providerId: string) => Promise<void>;

  // User preferences
  getPreferences: () => Promise<UserPreferencesDisplay>;
  updatePreferences: (preferences: Partial<UserPreferencesDisplay>) => Promise<void>;

  // AI model settings
  getModels: () => Promise<ModelDisplay[]>;
  setDefaultModel: (modelId: string) => Promise<void>;
}
```

## Common API Response Format

All API methods return a standardized response:

```typescript
interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata?: {
    timestamp: string;
    requestId: string;
    processingTime: number;
  };
}
```

## Streaming Responses

Some APIs support streaming for real-time updates:

```typescript
await window.electronAPI.chat.sendMessageStream(
  'Explain quantum computing',
  (chunk) => {
    // Receive response chunks in real-time
    appendToResponse(chunk);
  }
);
```

## Type Safety

### Window ElectronAPI Declaration

**File**: `src/types/electron-api.d.ts`

```typescript
import type { ElectronAPI } from '@/shared/types/electron-api';

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
```

### Usage in React Components

```typescript
// Type-safe API calls
import { useState, useEffect } from 'react';

export function ChatInterface() {
  const [messages, setMessages] = useState<MessageDisplay[]>([]);

  const sendMessage = async (content: string) => {
    // TypeScript ensures type safety
    const response = await window.electronAPI.chat.sendMessage(content);

    if (response.success) {
      setMessages(response.data.messages);
    }
  };

  return (
    <div>
      {/* Component JSX */}
    </div>
  );
}
```

## IPC Handler Implementation

### Main Process Handler Example

**File**: `src/main/handlers/chat-handlers.ts`

```typescript
import { ipcMain } from 'electron';
import type { ChatAPI } from '@/shared/types/electron-api';
import { createChatService } from '@/main/services/domain/chat/chat-service';

export function setupChatHandlers() {
  ipcMain.handle('chat:sendMessage', async (event, message, sessionId) => {
    try {
      const chatService = createChatService({ /* dependencies */ });
      const result = await chatService.sendMessage(message, sessionId);
      return { success: true, data: result };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'CHAT_ERROR',
          message: error.message
        }
      };
    }
  });
}
```

## Best Practices

### 1. Always Check Response Success

```typescript
// ❌ Bad: Ignoring error handling
const data = await window.electronAPI.learning.getSession(sessionId);
setSession(data); // Could fail silently

// ✅ Good: Proper error handling
const response = await window.electronAPI.learning.getSession(sessionId);
if (response.success) {
  setSession(response.data);
} else {
  console.error('Failed to load session:', response.error);
}
```

### 2. Use Streaming for Long Operations

```typescript
// ✅ Good: Streaming for better UX
await window.electronAPI.chat.sendMessageStream(
  message,
  (chunk) => updateUI(chunk),
  sessionId
);
```

### 3. Type Your Component Props

```typescript
// ✅ Good: Typed component
interface ChatInterfaceProps {
  sessionId?: string;
}

export function ChatInterface({ sessionId }: ChatInterfaceProps) {
  // Component implementation
}
```

### 4. Handle Loading States

```typescript
const [loading, setLoading] = useState(false);

const handleSubmit = async (message: string) => {
  setLoading(true);
  try {
    await window.electronAPI.chat.sendMessage(message, sessionId);
  } finally {
    setLoading(false);
  }
};
```

## Testing

### Mocking ElectronAPI

```typescript
// Test setup
const mockElectronAPI = {
  chat: {
    sendMessage: jest.fn().mockResolvedValue({
      success: true,
      data: { id: '1', content: 'Hello', role: 'assistant' }
    })
  }
};

// Make it available globally
global.window = { electronAPI: mockElectronAPI } as any;
```

## Security Considerations

### 1. Main Process Validation

Always validate inputs in the main process:

```typescript
ipcMain.handle('chat:sendMessage', async (event, message) => {
  // Validate input
  if (typeof message !== 'string' || !message.trim()) {
    throw new Error('Invalid message');
  }

  // Process safely
  return await chatService.sendMessage(message.trim());
});
```

### 2. Secure API Key Storage

```typescript
// ✅ Good: Secure storage
const encryptedKey = await secureStore.setItem('apiKey', apiKey);

// ❌ Bad: Insecure storage
localStorage.setItem('apiKey', apiKey);
```

## Debugging

### Enable Debug Logging

```typescript
// In main process
process.env.DEBUG_ELECTRON_API = 'true';

// Logs will show:
[IPC] chat:sendMessage -> { message: 'Hello', sessionId: 'abc123' }
[IPC] <- success { data: { id: '1', content: 'Hi there!' } }
```

### Inspector Tools

- **Electron**: Use DevTools to inspect renderer process
- **Main Process**: Use `--inspect` flag for debugging
- **IPC**: Use `ipc-logger` for IPC traffic inspection

## Related Documentation

- [Architecture Overview](./architecture.md)
- [Services Guide](./services.md)
- [Database Design](./database.md)
- [Agent System](./agents.md)

---

**Last Updated**: November 2025
**Version**: 1.0
