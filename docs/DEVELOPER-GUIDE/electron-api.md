# Electron API Documentation

## Overview

Learning Catalyst exposes a single `window.electronAPI` bridge so the renderer can safely access
main-process services without importing Node primitives. The renderer calls typed helpers that
marshal IPC, the preload layer lives in `src/main/preload/index.ts`, and the type declarations live
under `src/shared/types/electron-api`.

## Architecture

### Process Separation

**Main Process (Node.js)** – Hosts IPC handlers for AI provider/model orchestration, SQLite/Kysely
storage, agent lifecycle, filesystem/dialog helpers, and workspace configuration.

**Renderer Process (React + TypeScript)** – Calls `window.electronAPI` via the preload bridge,
renders UI/state, handles navigation & toasts, and reports diagnostics.

```
Main Process ⇄ IPC handlers ⇄ Preload bridge ⇄ window.electronAPI ⇄ Renderer
```

## API Structure

The canonical `ElectronAPI` interface (`src/shared/types/electron-api/index.ts`) bundles eight typed
domains plus helpers:

- `chat`
- `learning`
- `knowledge`
- `analytics`
- `sessions`
- `agents`
- `content`
- `settings` (augmented with `SettingsUtility`)

Each domain returns a `Promise<APIResponse<...>>` and exposes the domain-specific methods defined in
`src/shared/types/electron-api/*`. The `settings` domain merges the documented API surface with the
helper methods listed below.

### Domain overview

| Domain      | Purpose                                                                      |
| ----------- | ---------------------------------------------------------------------------- |
| `chat`      | Send/stream messages and manage conversation history.                        |
| `learning`  | Start/list sessions, track progress, and surface achievements/insights.      |
| `knowledge` | Search/explore concepts, exercises, and knowledge maps.                      |
| `analytics` | Fetch dashboards, token usage, charts, and learning insights.                |
| `sessions`  | Save/load checkpoints and restore session state.                             |
| `agents`    | Create, update, activate/deactivate, and inspect AI agents.                  |
| `content`   | Discover, import, or remove learning materials and recommendations.          |
| `settings`  | Configure AI providers/models/preferences and use the utility helpers below. |

### Chat API (`chat-api.ts`)

| Method                                                                     | Description                                                  |
| -------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `startConversation(params)`                                                | Begin a conversation with an agent (type/topic/preferences). |
| `sendMessage(params)`                                                      | Send a message and receive a full response.                  |
| `sendMessageStream(params)`                                                | Stream response chunks for real-time rendering.              |
| `getTypingIndicator(conversationId)`                                       | Check agent typing/processing state.                         |
| `getConversationHistory(conversationId, options)`                          | Fetch paginated conversation history.                        |
| `pauseConversation(conversationId)` / `resumeConversation(conversationId)` | Manage temporary pauses.                                     |
| `endConversation(conversationId)`                                          | Close a conversation and emit a summary.                     |
| `checkPracticeOpportunity(params)` and `getPracticeSuggestion(params)`     | Detect and suggest practice activities within chat.          |

### Learning API (`learning-api.ts`)

| Method                                                 | Description                                                                    |
| ------------------------------------------------------ | ------------------------------------------------------------------------------ |
| `startLearningSession(params)`                         | Spin up a learning session with goals, difficulty, agent, and preferred style. |
| `getSessionProgress(sessionId)`                        | Retrieve progress metrics for a session.                                       |
| `getLearningPath(sessionId)`                           | Inspect the planned path/details for the session.                              |
| `pauseSession(sessionId)` / `resumeSession(sessionId)` | Temporarily halt or continue tracking.                                         |
| `completeSession(sessionId)`                           | Finalize a session, unlock recommendations, and insights.                      |
| `getRecentSessions(options?)`                          | List recent sessions for the UI.                                               |
| `searchSessions(query, filters)`                       | Search the historical session catalog.                                         |

### Knowledge API (`knowledge-api.ts`)

| Method                          | Description                                          |
| ------------------------------- | ---------------------------------------------------- |
| `ingestConcepts(params)`        | Add parsed concept data to the knowledge graph.      |
| `exploreConcept(params)`        | Drill into a concept with depth controls.            |
| `getRelatedConcepts(conceptId)` | Return related concepts and relationships.           |
| `getKnowledgeMap(sessionId?)`   | Fetch nodes/edges for visualization.                 |
| `searchKnowledge(query)`        | Perform semantic knowledge search.                   |
| `parseConcepts(params)`         | Parse documents/files/text into structured concepts. |

### Analytics API (`analytics-api.ts`)

| Method                                                                       | Description                                 |
| ---------------------------------------------------------------------------- | ------------------------------------------- |
| `getDashboard()`                                                             | Fetch dashboard overview + recent activity. |
| `getProgressChart(params)`                                                   | Retrieve chart-ready progress data.         |
| `getAchievements()` / `unlockAchievement(id)`                                | List/award achievements.                    |
| `getUsageStats(params)` / `getTokenUsage(params)`                            | Analyze usage/cost metrics.                 |
| `trackSession(session)`                                                      | Record session events for analytics.        |
| `updateConceptProgress(conceptId, update)` / `getConceptProgress(conceptId)` | Track concept mastery.                      |
| `getSessionHistory(params)`                                                  | List historical sessions.                   |
| `checkAchievements(sessionId?)`                                              | Detect newly unlocked achievements.         |
| `getLearningTrends(params)` / `getStudyStreak()` / `getTimeStats(params)`    | Trends/streak/time stats.                   |
| `exportData(params)` / `importData(params)`                                  | Export or import analytics data.            |

### Sessions API (`sessions-api.ts`)

| Method                                                                           | Description                             |
| -------------------------------------------------------------------------------- | --------------------------------------- |
| `list(options?)`                                                                 | Paginate stored sessions.               |
| `create(payload)` / `get(sessionId)` / `update(sessionId, updates)`              | CRUD session records.                   |
| `delete(sessionId)`                                                              | Remove a session.                       |
| `saveMessage(sessionId, message)` / `saveSessionWithMessages(session, messages)` | Persist messages and session snapshots. |
| `updateTitle(sessionId, title)`                                                  | Rename a session.                       |
| `getRecentSessions(options?)`                                                    | Fast list for UI dropdowns.             |
| `search(query)`                                                                  | Search sessions with filters.           |
| `getStatistics()`                                                                | Return global session statistics.       |

### Agents API (`agent-api.ts`)

| Method                                                     | Description                                     |
| ---------------------------------------------------------- | ----------------------------------------------- |
| `getAvailableAgents()`                                     | Retrieve agent catalog metadata.                |
| `selectAgentForSession(params)`                            | Bind an agent to a session.                     |
| `setAgentPersonality(params)` / `setResponseStyle(params)` | Tune agent demeanor and response style.         |
| `getAgentCapabilities(agentId)`                            | Return capability details for a specific agent. |
| `tryAgentFeature(params)`                                  | Run a quick feature demonstration.              |

### Content API (`content-api.ts`)

| Method                           | Description                                    |
| -------------------------------- | ---------------------------------------------- |
| `exploreLocalProjects()`         | Discover local code/content projects.          |
| `importLearningContent(files)`   | Import files and extract learning artifacts.   |
| `getRecommendedContent(params)`  | Recommend materials for a topic and level.     |
| `searchLearningResources(query)` | Search learning materials across sources.      |
| `analyzeDocument(filePath)`      | Analyze a document’s learning characteristics. |
| `extractConcepts(content)`       | Extract concepts from raw text content.        |

### Settings API (`settings-api.ts`)

| Method                                                       | Description                                     |
| ------------------------------------------------------------ | ----------------------------------------------- |
| `getUserPreferences()` / `updatePreferences(preferences)`    | Inspect/update UI/privacy/learning preferences. |
| `getAvailableProviders()`                                    | Get provider list plus summary.                 |
| `configureProvider(params)`                                  | Add or update provider configuration.           |
| `getLearningSettings()` / `updateLearningSettings(settings)` | Manage learning-specific settings.              |

## Settings Utility & Helpers

`SettingsUtility` extends the settings domain with the workspace helpers that wrap the
`settings:getWorkspaceConfig`/`settings:setWorkspaceConfig` IPC channels. All helpers return
`APIResponse<...>` and must include an `error` when `success` is `false`:

| Helper                       | Signature                                           | Purpose                                        |
| ---------------------------- | --------------------------------------------------- | ---------------------------------------------- |
| `settings.getAppVersion()`   | `() => Promise<APIResponse<string>>`                | Mirrors `app.getVersion()` for diagnostics.    |
| `settings.quit()`            | `() => Promise<APIResponse<void>>`                  | Requests the app to quit (`settings:quitApp`). |
| `settings.getConfig()`       | `() => Promise<APIResponse<AppConfig>>`             | Reads persisted workspace configuration.       |
| `settings.setConfig(config)` | `(config: Partial<AppConfig>) => Promise<APIResponse<void>>` | Replaces the workspace configuration.    |

Other helpers available directly on `window.electronAPI`:

| Helper                                                      | Signature                                                             | Purpose                                         |
| ----------------------------------------------------------- | --------------------------------------------------------------------- | ----------------------------------------------- | --------------------------- | --------------------- |
| `getWorkspacePath()`                                        | `() => Promise<string>`                                               | Current workspace root path.                    |
| `readDirectory(path, recursive?, maxDepth?, filterConfig?)` | `() => Promise<DirectoryScanResult[]>`                                | Directory listing with optional filters.        |
| `readFile(filePath, encoding?)`                             | `() => Promise<string>`                                               | Reads text files.                               |
| `writeFile(filePath, content, encoding?)`                   | `() => Promise<void>`                                                 | Writes text files.                              |
| `existsFile(filePath)`                                      | `() => Promise<boolean>`                                              | Checks file existence.                          |
| `showOpenDialog(options?)`                                  | `() => Promise<OpenDialogReturnValue>`                                | Launches a file-open dialog.                    |
| `showSaveDialog(options?)`                                  | `() => Promise<SaveDialogReturnValue>`                                | Launches a save dialog.                         |
| `onMenuAction(handler)`                                     | `(handler) => void`                                                   | Subscribe to menu actions.                      |
| `onIPCError(handler)`                                       | `(handler) => () => void`                                             | Receive structured IPC errors.                  |
| `handleError(error, context, severity?)`                    | `(error, context, severity?) => void`                                 | Logs renderer errors via `system:report-error`. |
| `healthCheck()`                                             | `() => Promise<{ status: 'healthy'                                    | 'degraded'                                      | 'offline'; apis: object }>` | Probes core services. |
| `getVersion()`                                              | `() => Promise<{ version: string; build: string; platform: string }>` | Build metadata.                                 |
| `trackEvent(event)`                                         | `(event: { name: string; properties?: object }) => Promise<void>`     | Tracks telemetry events.                        |

The fullscreen `catalyst` domain and `IPC_ERROR_CHANNEL` are also exposed via `window.electronAPI`
(respectively as `catalyst` and `onIPCError`/`handleError` above).

## Error Handling

Use `window.electronAPI.onIPCError` to handle structured error payloads from the main process:

```ts
window.electronAPI.onIPCError((payload) => {
  showError(payload.message);
  if (payload.needsSetup) {
    openSetupOverlay(payload.action);
  }
});
```

Every payload follows:

| Property     | Description                                                 |
| ------------ | ----------------------------------------------------------- |
| `type`       | Category (`CONFIG_ERROR`, `NETWORK_ERROR`, `SYSTEM_ERROR`). |
| `code`       | Machine key (`provider.config.chat_missing`, etc.).         |
| `message`    | Human-friendly message.                                     |
| `needsSetup` | `true` when setup must appear.                              |
| `details`    | Optional metadata (request IDs, diagnostics).               |

## Common Response Format

Every domain returns `APIResponse<T>` (discriminated union):

```ts
type APIResponseError = { code: string; message: string; details?: any };

type APIResponse<T = any> =
  | { success: true; data?: T; error?: never; metadata?: { timestamp: string; requestId: string; processingTime: number } }
  | { success: false; error: APIResponseError; data?: never; metadata?: { timestamp: string; requestId: string; processingTime: number } };
```

Always check `success` before using `.data`. If `success` is `false`, the `error` object is required
and should be surfaced or thrown. The `error.code` must be provided and non-empty for failures.
Streaming helpers (e.g., `chat.sendMessageStream`) pass chunks as
they arrive.

## Type Safety

Declare helpers like `window.electronAPI` by importing `ElectronAPI`
(`src/shared/types/electron-api/index.ts`) or referencing `ElectronAPIMock`/`PartialElectronAPI` for
tests. Always check `APIResponse.success` before touching `data`.

## Testing Tips

Mock the electron bridge with the same shape as `ElectronAPI`, including helpers and the `settings`
domain. Keep real-life responses wrapped in `APIResponse`. When mocking failure cases, always
provide a non-empty `error` object with a valid `code`.
