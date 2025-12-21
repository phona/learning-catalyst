# Consolidate IPC API Surface

**Change ID**: `consolidate-ipc-apis`
**Status**: Draft
**Author**: Claude Code Assistant
**Date**: 2025-12-21

## Why

The current IPC API surface has significant bloat and maintenance overhead:

1. **69% Dead Weight**: ~80+ defined API methods but only ~25 actually used (31% utilization)
2. **Type/Handler Mismatches**: Type definitions don't match actual handler implementations
3. **Maintenance Burden**: Unused APIs require documentation, testing, and maintenance
4. **Developer Confusion**: Unclear which APIs are real vs. aspirational
5. **Technical Debt**: Multiple unused domains (Learning, Analytics, Content, Agents)

### Current State

**Defined but Unused APIs:**
- **Learning API**: 8 methods - Not used anywhere in renderer
- **Analytics API**: 16 methods - No analytics UI implemented
- **Content API**: 6 methods - File import/discovery features not implemented
- **Agents API**: 6 methods - Agent management UI doesn't exist

**Partially Used APIs:**
- **Sessions API**: 10 methods defined, 6 actually used
- **Knowledge API**: 7 methods defined, 2 actually used
- **Settings API**: 15+ methods defined, 2 actually used

**Implementation Mismatches:**
- Type definitions in `shared/types/electron-api/` don't match handler implementations
- Old deprecated APIs still present (e.g., `chat:start-stream`)

## What Changes

### Phase 1: Remove Unused API Domains

Delete entire API domains that are not used in the renderer:

1. **Remove Learning API** (`shared/types/electron-api/learning-api.ts`)
   - DELETE: All 8 methods (startLearningSession, getSessionProgress, etc.)
   - DELETE: All related handlers in `main/handlers/learning-handlers.ts`
   - DELETE: Display types (LearningSessionDisplay, LearningProgressDisplay, etc.)

2. **Remove Analytics API** (`shared/types/electron-api/analytics-api.ts`)
   - DELETE: All 16 methods (getDashboard, getProgressChart, etc.)
   - DELETE: All related handlers in `main/handlers/analytics-complete-handlers.ts`
   - DELETE: Display types (DashboardDisplay, AchievementDisplay, etc.)

3. **Remove Content API** (`shared/types/electron-api/content-api.ts`)
   - DELETE: All 6 methods (exploreLocalProjects, importLearningContent, etc.)
   - DELETE: All related handlers in `main/handlers/content-handlers.ts`
   - DELETE: Display types (ProjectDisplay, ImportResultDisplay, etc.)

4. **Remove Agents API** (`shared/types/electron-api/agent-api.ts`)
   - DELETE: All 6 methods (getAvailableAgents, selectAgentForSession, etc.)
   - DELETE: Display types (AgentDisplay, AgentContext, etc.)

### Phase 2: Consolidate Partially-Used APIs

Remove unused methods from APIs that have partial usage:

1. **Sessions API** - Keep only 6 used methods
   - ✅ KEEP: `list`, `get`, `create`, `update`, `updateTitle`, `delete`
   - ❌ REMOVE: `getRecentSessions`, `search`, `getStatistics`

2. **Knowledge API** - Keep only 2 used methods
   - ✅ KEEP: `ingestConcepts`, `search`
   - ❌ REMOVE: `exploreConcept`, `getRelatedConcepts`, `getKnowledgeMap`, `parseConcepts`, `clearParsingJobs`

3. **Settings API** - Keep only 2 used methods
   - ✅ KEEP: `getAppVersion`, `quit`
   - ❌ REMOVE: All other settings methods

4. **Chat API** - Remove deprecated streaming
   - ✅ KEEP: `getMessages`, `generateTitle`
   - ❌ REMOVE: `chat:start-stream` (replaced by `aiSDK.stream`)

### Phase 3: Fix Type/Handler Alignment

Update type definitions to match actual handler implementations:

1. **Update Sessions API types** to match `main/handlers/sessions-handlers.ts`
2. **Update Knowledge API types** to match `main/handlers/knowledge-handlers.ts`
3. **Update Settings API types** to match `main/handlers/settings-handlers.ts`
4. **Update Chat API types** to match `main/handlers/chat-handlers.ts`

### Phase 4: Update ElectronAPI Interface

Update main interface to reflect consolidated API surface:

```typescript
interface ElectronAPI {
  // Core System (15 methods) - ALL KEPT
  awaitReady, awaitConfigChange
  onIPCError, onMenuAction
  getErrorBuffer, clearErrorBuffer
  getWorkspacePath, readDirectory
  readFile, writeFile, existsFile
  showOpenDialog, showSaveDialog
  healthCheck, getVersion, trackEvent, relaunchApp

  // Chat (2 methods) - CONSOLIDATED
  chat: { getMessages, generateTitle }

  // Sessions (6 methods) - CONSOLIDATED
  sessions: { list, get, create, update, updateTitle, delete }

  // Knowledge (2 methods) - CONSOLIDATED
  knowledge: { ingestConcepts, search }

  // Settings (2 methods) - CONSOLIDATED
  settings: { getAppVersion, quit }

  // Catalyst (6 methods) - ALL KEPT
  catalyst: { sendChat, sendChatStream, listAgents, getActiveExecutions, cancelAgent, getSession }

  // AI SDK (1 method) - KEPT
  aiSDK: { stream }
}
```

## Impact

### Reduced Surface Area
- **Before**: 80+ methods across 8 domains
- **After**: 25 methods across 6 domains
- **Reduction**: 69% decrease in API surface

### Files Modified
- `shared/types/electron-api/*.ts` - Remove unused types
- `src/main/handlers/*.ts` - Remove unused handlers
- `src/renderer/services/*` - Update service calls if needed

### Breaking Changes
- **None for end users** - All removed APIs were unused
- **Developer-facing only** - Type definitions and internal APIs

### Benefits
1. **Easier Maintenance**: 69% fewer APIs to document, test, and debug
2. **Clearer Architecture**: Only implemented features are exposed
3. **Better Type Safety**: Types match actual implementations
4. **Faster Development**: Less confusion about what exists
5. **Reduced Technical Debt**: Remove aspirational/placeholder code

## Validation

1. **Type Checking**: Ensure TypeScript compilation succeeds
2. **Runtime Testing**: Verify all used APIs still work correctly
3. **API Contract Tests**: Ensure types match handlers
4. **Import Analysis**: Verify no dead imports remain

## Related Changes

- Builds on: `standardize-renderer-ipc-calls` (if approved)
- Enables: Future API additions will have clearer patterns
- Precedes: Any feature work that needs new APIs (will be cleaner)

## Risks

1. **Low Risk**: Removing only unused code
2. **Mitigation**: Comprehensive test coverage
3. **Rollback**: Git history preserves all removed code
