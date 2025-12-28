# IPC Handler Cleanup Specification

**Capability**: Clean Up Unused IPC Handlers
**Change ID**: `consolidate-ipc-apis`

## REMOVED Requirements

### Requirement: Remove Learning API Handlers
**Priority**: P0 (Critical)
**Effort**: M

The Learning API is not used anywhere in the renderer, so all its handlers should be removed.

#### Scenario: Delete Learning Handlers File
**Given** `main/handlers/learning-handlers.ts` exists
**When** handler cleanup is performed
**Then** the file must be deleted

**And** the following imports must be removed from `main/handlers/index.ts`:
```typescript
import { setupLearningHandlers } from './learning-handlers';
```

**And** the following call must be removed from `setupAllIpcHandlers`:
```typescript
setupLearningHandlers(ipc, {
  learningService: services.learningService,
  loggerService: services.loggerService,
});
```

#### Scenario: Learning IPC Channels Not Registered
**Given** Learning API handlers are removed
**When** the application starts
**Then** the following IPC channels must NOT be registered:
- `learning:get-path`
- `learning:start-session`
- `learning:get-progress`
- `learning:pause-session`
- `learning:resume-session`
- `learning:complete-session`
- `learning:get-recent-sessions`
- `learning:search-sessions`

**And** attempts to call these channels must result in appropriate errors (channel not found)

**And** the application must compile and start without errors

---

### Requirement: Remove Analytics API Handlers
**Priority**: P0 (Critical)
**Effort**: M

The Analytics API is not used anywhere in the renderer, so all its handlers should be removed.

#### Scenario: Delete Analytics Handlers File
**Given** `main/handlers/analytics-complete-handlers.ts` exists
**When** handler cleanup is performed
**Then** the file must be deleted

**And** the following imports must be removed from `main/handlers/index.ts`:
```typescript
import { setupCompleteAnalyticsHandlers } from './analytics-complete-handlers';
```

**And** the following call must be removed from `setupAllIpcHandlers`:
```typescript
setupCompleteAnalyticsHandlers(ipc, {
  analyticsService: services.analyticsService,
  loggerService: services.loggerService,
});
```

#### Scenario: Analytics IPC Channels Not Registered
**Given** Analytics API handlers are removed
**When** the application starts
**Then** the following IPC channels must NOT be registered:
- `analytics:get-dashboard`
- `analytics:get-progress-chart`
- `analytics:get-achievements`
- `analytics:unlock-achievement`
- `analytics:get-usage-stats`
- `analytics:get-token-usage`
- `analytics:track-event`
- `analytics:get-concept-progress`
- `analytics:get-session-history`
- `analytics:check-achievements`
- `analytics:get-learning-trends`
- `analytics:get-study-streak`
- `analytics:get-time-stats`
- `analytics:export-data`
- `analytics:import-data`

**And** attempts to call these channels must result in appropriate errors (channel not found)

**And** the application must compile and start without errors

---

### Requirement: Remove Content API Handlers
**Priority**: P0 (Critical)
**Effort**: M

The Content API is not used anywhere in the renderer, so all its handlers should be removed.

#### Scenario: Delete Content Handlers File
**Given** `main/handlers/content-handlers.ts` exists
**When** handler cleanup is performed
**Then** the file must be deleted

**And** the following imports must be removed from `main/handlers/index.ts`:
```typescript
import { setupContentHandlers } from './content-handlers';
```

**And** the following call must be removed from `setupAllIpcHandlers`:
```typescript
setupContentHandlers(ipc, {
  contentService: services.contentService,
  loggerService: services.loggerService,
});
```

#### Scenario: Content IPC Channels Not Registered
**Given** Content API handlers are removed
**When** the application starts
**Then** the following IPC channels must NOT be registered:
- `content:explore-projects`
- `content:import-content`
- `content:get-recommendations`
- `content:search-resources`
- `content:analyze-document`
- `content:extract-concepts`

**And** attempts to call these channels must result in appropriate errors (channel not found)

**And** the application must compile and start without errors

---

### Requirement: Remove Deprecated Chat Streaming Handler
**Priority**: P1 (High)
**Effort**: S

The old `chat:start-stream` IPC channel has been replaced by `aiSDK.stream` and should be removed.

#### Scenario: Remove Old chat:start-stream Handler
**Given** `chat:start-stream` IPC channel exists in `main/handlers/chat-handlers.ts`
**When** handler cleanup is performed
**Then** the following must be removed:
- The `ipcMain.on('chat:start-stream', ...)` handler registration
- Any related streaming logic for the old API

**And** the `aiSDK.stream` channel must remain as the only streaming API

**And** TypeScript compilation must succeed without errors

#### Scenario: Old Chat Streaming Channel Not Registered
**Given** deprecated chat streaming handler is removed
**When** the application starts
**Then** the `chat:start-stream` IPC channel must NOT be registered

**And** the `chat:generate-title` and `chat:get-messages` channels must remain registered

**And** the `aiSDK.stream` channel must be registered

**And** the application must compile and start without errors

---

## Validation Criteria

All scenarios must satisfy:
- ✅ Deleted handler files no longer exist
- ✅ Imports and calls to removed handlers removed from index.ts
- ✅ Unused IPC channels are not registered
- ✅ TypeScript compilation succeeds without errors
- ✅ Application starts without runtime errors
- ✅ Only registered channels can be called from renderer
- ✅ Contract tests verify handler registration matches types

## Cross-Cutting Concerns

### Handler Registration Verification
**Given** all IPC handlers
**When** the application starts
**Then** there must be a 1:1 mapping between:
- Defined methods in `ElectronAPI` interface
- Registered IPC channels in main process
- Implemented handlers in `main/handlers/*.ts`

**And** no orphaned handlers or channels must exist

### Import Cleanup
**Given** removed handlers
**When** cleanup is performed
**Then** all imports to removed modules must be removed from:
- `main/handlers/index.ts`
- Any other files that imported removed handlers

**And** no import errors must occur during compilation

### Service Dependency Cleanup
**Given** removed handlers
**When** cleanup is performed
**Then** services passed to removed handlers must be removed from:
- `setupAllIpcHandlers` function parameters
- Any dependency injection configurations

**And** no unused service dependencies must remain
