# Electron API Documentation

## Overview

Learning Catalyst exposes a single `window.electronAPI` bridge so the renderer can safely access main-process services without importing Node primitives. The renderer calls typed helpers that marshal IPC, the preload layer lives in `src/main/preload/index.ts`, and the type declarations live under `src/shared/types/electron-api`.

## Architecture

### Process Separation

**Main Process (Node.js)** – Hosts IPC handlers for AI provider/model orchestration, SQLite/Kysely storage, agent lifecycle, filesystem/dialog helpers, and workspace configuration.

**Renderer Process (React + TypeScript)** – Calls `window.electronAPI` via the preload bridge, renders UI/state, handles navigation & toasts, and reports diagnostics.

```
Main Process ⇄ IPC handlers ⇄ Preload bridge ⇄ window.electronAPI ⇄ Renderer
```

## API Structure

The canonical `ElectronAPI` interface (`src/shared/types/electron-api/index.ts`) bundles eight typed domains plus helpers:

- `chat`
- `learning`
- `knowledge`
- `analytics`
- `sessions`
- `agents`
- `content`
- `settings` (augmented with `SettingsUtility`)

Each domain returns a `Promise<APIResponse<...>>` and exposes the domain-specific methods defined in `src/shared/types/electron-api/*`. The `settings` domain merges the documented API surface with the helper methods listed below.

### Domain overview

| Domain | Purpose |
| --- | --- |
| `chat` | Send/stream messages and manage conversation history. |
| `learning` | Start/list sessions, track progress, and surface achievements/insights. |
| `knowledge` | Search/explore concepts, exercises, and knowledge maps. |
| `analytics` | Fetch dashboards, token usage, charts, and learning insights. |
| `sessions` | Save/load checkpoints and restore session state. |
| `agents` | Create, update, activate/deactivate, and inspect AI agents. |
| `content` | Discover, import, or remove learning materials and recommendations. |
| `settings` | Configure AI providers/models/preferences and use the utility helpers below. |

## Settings Utility & Helpers

`SettingsUtility` extends the settings domain with the workspace helpers that wrap the `settings:getWorkspaceConfig`/`settings:setWorkspaceConfig` IPC channels:

| Helper | Signature | Purpose |
| --- | --- | --- |
| `settings.getAppVersion()` | `() => Promise<string>` | Mirrors `app.getVersion()` for diagnostics. |
| `settings.quit()` | `() => Promise<void>` | Requests the app to quit (`settings:quitApp`). |
| `settings.getConfig()` | `() => Promise<AppConfig | null>` | Reads persisted workspace configuration. |
| `settings.setConfig(config)` | `(config: AppConfig) => Promise<void>` | Replaces the workspace configuration. |

Other helpers available directly on `window.electronAPI`:

| Helper | Signature | Purpose |
| --- | --- | --- |
| `getWorkspacePath()` | `() => Promise<string>` | Current workspace root path. |
| `readDirectory(path, recursive?, maxDepth?, filterConfig?)` | `() => Promise<DirectoryScanResult[]>` | Directory listing with optional filters. |
| `readFile(filePath, encoding?)` | `() => Promise<string>` | Reads text files. |
| `writeFile(filePath, content, encoding?)` | `() => Promise<void>` | Writes text files. |
| `existsFile(filePath)` | `() => Promise<boolean>` | Checks file existence. |
| `showOpenDialog(options?)` | `() => Promise<OpenDialogReturnValue>` | Launches a file-open dialog. |
| `showSaveDialog(options?)` | `() => Promise<SaveDialogReturnValue>` | Launches a save dialog. |
| `onMenuAction(handler)` | `(handler) => void` | Subscribe to menu actions. |
| `onIPCError(handler)` | `(handler) => () => void` | Receive structured IPC errors. |
| `handleError(error, context, severity?)` | `(error, context, severity?) => void` | Logs renderer errors via `system:report-error`. |
| `healthCheck()` | `() => Promise<{ status: 'healthy' | 'degraded' | 'offline'; apis: object }>` | Probes core services. |
| `getVersion()` | `() => Promise<{ version: string; build: string; platform: string }>` | Build metadata. |
| `trackEvent(event)` | `(event: { name: string; properties?: object }) => Promise<void>` | Tracks telemetry events. |

The fullscreen `catalyst` domain and `IPC_ERROR_CHANNEL` are also exposed via `window.electronAPI` (respectively as `catalyst` and `onIPCError`/`handleError` above).

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

| Property | Description |
| --- | --- |
| `type` | Category (`CONFIG_ERROR`, `NETWORK_ERROR`, `SYSTEM_ERROR`). |
| `code` | Machine key (`provider.config.chat_missing`, etc.). |
| `message` | Human-friendly message. |
| `needsSetup` | `true` when setup must appear. |
| `details` | Optional metadata (request IDs, diagnostics). |

## Common Response Format

Every domain returns `APIResponse<T>`:

```ts
interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string; details?: any };
  metadata?: { timestamp: string; requestId: string; processingTime: number };
}
```

Handle `success` before using `.data`. Streaming helpers (e.g., `chat.sendMessageStream`) pass chunks as they arrive.

## Type Safety

Declare helpers like `window.electronAPI` by importing `ElectronAPI` (`src/shared/types/electron-api/index.ts`) or referencing `ElectronAPIMock`/`PartialElectronAPI` for tests. Always check `APIResponse.success` before touching `data`.

## Testing Tips

Mock the electron bridge with the same shape as `ElectronAPI`, including helpers and the `settings` domain. Keep real-life responses wrapped in `APIResponse`.

