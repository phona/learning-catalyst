# IPC audit (preload vs main)

Goal:

```
preload invokes  ==  main registers
```

## Decision: `catalyst:*`

`catalyst:*` is **necessary** right now.

Non-test renderer call sites (as of this audit):
- `src/renderer/services/chat/chat-service.ts` uses `apiClient.catalyst.sendChat(...)` and `apiClient.catalyst.cancelAgent(...)`
- `src/renderer/services/catalyst/catalyst-service.ts` uses `electronAPI.catalyst.sendChat(...)`, `sendChatStream(...)`, `cancelAgent(...)`

So we keep `catalyst:*` as a **compat layer** and implement minimal handlers in main (no new features).

## Preload IPC channels

Source: `src/main/preload/index.ts`

- `analytics:*`
  - `analytics:check-achievements`
  - `analytics:export-data`
  - `analytics:get-achievements`
  - `analytics:get-concept-progress`
  - `analytics:get-dashboard`
  - `analytics:get-learning-trends`
  - `analytics:get-progress-chart`
  - `analytics:get-session-history`
  - `analytics:get-study-streak`
  - `analytics:get-time-stats`
  - `analytics:get-token-usage`
  - `analytics:get-usage-stats`
  - `analytics:import-data`
  - `analytics:track-event`
  - `analytics:track-session`
  - `analytics:unlock-achievement`
  - `analytics:update-concept-progress`
- `chat:*`
  - `chat:cancel-stream`
  - `chat:generate-title`
  - `chat:get-messages`
  - `chat:start-stream`
- `knowledge:*`
  - `knowledge:clear-parsing-jobs`
  - `knowledge:explore-concept`
  - `knowledge:get-map`
  - `knowledge:get-related-concepts`
  - `knowledge:ingest-concepts`
  - `knowledge:parse-concepts`
  - `knowledge:search`
- `sessions:*` / `learning:*`
  - `sessions:create`
  - `sessions:delete`
  - `sessions:get`
  - `sessions:get-global-statistics` (**missing in main**)
  - `sessions:list`
  - `sessions:search`
  - `sessions:update`
  - `sessions:update-title`
  - `learning:get-recent-sessions` (**missing in main**)
- `settings:*`
  - `settings:configureProvider`
  - `settings:get-learning-settings`
  - `settings:get-user-preferences`
  - `settings:getAppVersion`
  - `settings:getAvailableProviders`
  - `settings:getWorkspaceConfig`
  - `settings:quitApp`
  - `settings:setWorkspaceConfig`
  - `settings:update-learning-settings`
  - `settings:update-preferences`
- `fs:*`
  - `fs:exists-file`
  - `fs:get-workspace-path`
  - `fs:read-directory`
  - `fs:read-file`
  - `fs:write-file`
- `dialog:*` (**missing in main**)
  - `dialog:show-open-dialog`
  - `dialog:show-save-dialog`
- `system:*`
  - `system:clear-error-buffer`
  - `system:get-error-buffer`
  - `system:get-latest-ready`
  - `system:get-version`
  - `system:health-check`
  - `system:relaunch-app`
  - `system:report-error`
- `catalyst:*` (**missing in main**)
  - `catalyst:cancel-agent`
  - `catalyst:cancel-execution`
  - `catalyst:execute-agent`
  - `catalyst:execute-agent-stream`
  - `catalyst:get-agent-status`
  - `catalyst:get-session`
  - `catalyst:register-agent`
  - `catalyst:send-chat`
  - `catalyst:send-chat-stream`
  - `catalyst:unregister-agent`

## Main registered IPC channels

Sources: `src/main/handlers/*` and `src/main/index.ts`

- Everything above **except**:
  - `catalyst:*`
  - `dialog:*`
  - `learning:get-recent-sessions`
  - `sessions:get-global-statistics`

And main currently has a couple extra channels not used by preload:
- `sessions:get-recent`
- `sessions:get-statistics`

## Diff summary (what must change)

Minimal work to make the bridge truthful:

1) Implement `dialog:show-open-dialog` + `dialog:show-save-dialog` in main.
2) Implement a minimal `catalyst:*` compat layer in main (or migrate all production callers away).
3) Add compat aliases for:
   - `learning:get-recent-sessions` -> `sessions:get-recent` behavior
   - `sessions:get-global-statistics` -> `sessions:get-statistics` behavior

