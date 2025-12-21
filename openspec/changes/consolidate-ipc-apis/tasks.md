# Tasks: Consolidate IPC API Surface

**Change ID**: `consolidate-ipc-apis`

## Task Order

### Phase 1: Remove Unused API Domains

#### Task 1.1: Remove Learning API Domain
**Status**: ⏳ Pending
**Effort**: M
**Dependencies**: None
**Validation**:
- [ ] DELETE `shared/types/electron-api/learning-api.ts`
- [ ] DELETE all Learning API types from `shared/types/electron-api/index.ts`
- [ ] UPDATE `ElectronAPI` interface to remove `learning` property
- [ ] DELETE handlers in `main/handlers/learning-handlers.ts`
- [ ] REMOVE learning-handlers from `main/handlers/index.ts`
- [ ] VERIFY TypeScript compilation succeeds
- [ ] VERIFY no renderer code imports Learning API

#### Task 1.2: Remove Analytics API Domain
**Status**: ⏳ Pending
**Effort**: M
**Dependencies**: None
**Validation**:
- [ ] DELETE `shared/types/electron-api/analytics-api.ts`
- [ ] DELETE all Analytics API types from `shared/types/electron-api/index.ts`
- [ ] UPDATE `ElectronAPI` interface to remove `analytics` property
- [ ] DELETE handlers in `main/handlers/analytics-complete-handlers.ts`
- [ ] REMOVE analytics handlers from `main/handlers/index.ts`
- [ ] VERIFY TypeScript compilation succeeds
- [ ] VERIFY no renderer code imports Analytics API

#### Task 1.3: Remove Content API Domain
**Status**: ⏳ Pending
**Effort**: M
**Dependencies**: None
**Validation**:
- [ ] DELETE `shared/types/electron-api/content-api.ts`
- [ ] DELETE all Content API types from `shared/types/electron-api/index.ts`
- [ ] UPDATE `ElectronAPI` interface to remove `content` property
- [ ] DELETE handlers in `main/handlers/content-handlers.ts`
- [ ] REMOVE content handlers from `main/handlers/index.ts`
- [ ] VERIFY TypeScript compilation succeeds
- [ ] VERIFY no renderer code imports Content API

#### Task 1.4: Remove Agents API Domain
**Status**: ⏳ Pending
**Effort**: M
**Dependencies**: None
**Validation**:
- [ ] DELETE `shared/types/electron-api/agent-api.ts`
- [ ] DELETE all Agents API types from `shared/types/electron-api/index.ts`
- [ ] UPDATE `ElectronAPI` interface to remove `agents` property
- [ ] VERIFY TypeScript compilation succeeds
- [ ] VERIFY no renderer code imports Agents API

### Phase 2: Consolidate Partially-Used APIs

#### Task 2.1: Consolidate Sessions API
**Status**: ⏳ Pending
**Effort**: S
**Dependencies**: None
**Validation**:
- [ ] UPDATE `shared/types/electron-api/sessions-api.ts`:
  - REMOVE `getRecentSessions`, `search`, `getStatistics` methods
  - KEEP only: `list`, `get`, `create`, `update`, `updateTitle`, `delete`
- [ ] UPDATE `shared/types/electron-api/index.ts` to reflect changes
- [ ] VERIFY all 6 kept methods match handler implementations
- [ ] VERIFY TypeScript compilation succeeds
- [ ] RUN tests to ensure sessions still work correctly

#### Task 2.2: Consolidate Knowledge API
**Status**: ⏳ Pending
**Effort**: S
**Dependencies**: None
**Validation**:
- [ ] UPDATE `shared/types/electron-api/knowledge-api.ts`:
  - REMOVE `exploreConcept`, `getRelatedConcepts`, `getKnowledgeMap`, `parseConcepts`, `clearParsingJobs`
  - KEEP only: `ingestConcepts`, `search`
- [ ] UPDATE `shared/types/electron-api/index.ts` to reflect changes
- [ ] VERIFY 2 kept methods match handler implementations
- [ ] VERIFY TypeScript compilation succeeds
- [ ] RUN tests to ensure knowledge features still work

#### Task 2.3: Consolidate Settings API
**Status**: ⏳ Pending
**Effort**: S
**Dependencies**: None
**Validation**:
- [ ] UPDATE `shared/types/electron-api/settings-api.ts`:
  - REMOVE all methods except `getAppVersion`, `quit`
- [ ] UPDATE `shared/types/electron-api/index.ts` to reflect changes
- [ ] VERIFY 2 kept methods match handler implementations
- [ ] VERIFY TypeScript compilation succeeds
- [ ] RUN tests to ensure settings features still work

#### Task 2.4: Remove Deprecated Chat Streaming
**Status**: ⏳ Pending
**Effort**: S
**Dependencies**: None
**Validation**:
- [ ] UPDATE `shared/types/electron-api/chat-api.ts`:
  - REMOVE deprecated streaming types
  - KEEP only: `getMessages`, `generateTitle`
- [ ] DELETE deprecated `chat:start-stream` handler
- [ ] VERIFY `aiSDK.stream` is used instead
- [ ] VERIFY TypeScript compilation succeeds
- [ ] RUN chat tests to ensure streaming still works

### Phase 3: Fix Type/Handler Alignment

#### Task 3.1: Align Sessions API Types with Handlers
**Status**: ⏳ Pending
**Effort**: M
**Dependencies**: Task 2.1
**Validation**:
- [ ] COMPARE `shared/types/electron-api/sessions-api.ts` with `main/handlers/sessions-handlers.ts`
- [ ] UPDATE type definitions to match handler return types
- [ ] VERIFY all IPC channels match type signatures
- [ ] RUN API contract tests
- [ ] VERIFY TypeScript compilation succeeds

#### Task 3.2: Align Knowledge API Types with Handlers
**Status**: ⏳ Pending
**Effort**: S
**Dependencies**: Task 2.2
**Validation**:
- [ ] COMPARE `shared/types/electron-api/knowledge-api.ts` with `main/handlers/knowledge-handlers.ts`
- [ ] UPDATE type definitions to match handler return types
- [ ] VERIFY all IPC channels match type signatures
- [ ] RUN API contract tests
- [ ] VERIFY TypeScript compilation succeeds

#### Task 3.3: Align Settings API Types with Handlers
**Status**: ⏳ Pending
**Effort**: S
**Dependencies**: Task 2.3
**Validation**:
- [ ] COMPARE `shared/types/electron-api/settings-api.ts` with `main/handlers/settings-handlers.ts`
- [ ] UPDATE type definitions to match handler return types
- [ ] VERIFY all IPC channels match type signatures
- [ ] RUN API contract tests
- [ ] VERIFY TypeScript compilation succeeds

### Phase 4: Update Main ElectronAPI Interface

#### Task 4.1: Update ElectronAPI Interface
**Status**: ⏳ Pending
**Effort**: S
**Dependencies**: Tasks 1.1-1.4, 2.1-2.4
**Validation**:
- [ ] UPDATE `shared/types/electron-api/index.ts` main interface:
  - REMOVE `learning`, `analytics`, `content`, `agents` domains
  - UPDATE `sessions`, `knowledge`, `settings` to reflect consolidated methods
  - KEEP: `chat`, `catalyst`, `aiSDK`, system methods
- [ ] VERIFY TypeScript compilation succeeds
- [ ] RUN full test suite
- [ ] VERIFY no breaking changes to renderer code

#### Task 4.2: Clean Up Index Exports
**Status**: ⏳ Pending
**Effort**: S
**Dependencies**: Task 4.1
**Validation**:
- [ ] REMOVE all exported types from deleted APIs
- [ ] REMOVE all exported types from removed methods
- [ ] VERIFY `index.ts` only exports used types
- [ ] RUN import analysis to ensure no dead exports
- [ ] VERIFY TypeScript compilation succeeds

### Phase 5: Validation & Testing

#### Task 5.1: Full TypeScript Compilation
**Status**: ⏳ Pending
**Effort**: S
**Dependencies**: All previous tasks
**Validation**:
- [ ] RUN `npm run type-check`
- [ ] VERIFY no TypeScript errors
- [ ] VERIFY all type exports are used

#### Task 5.2: Run Test Suite
**Status**: ⏳ Pending
**Effort**: M
**Dependencies**: All previous tasks
**Validation**:
- [ ] RUN `npm test`
- [ ] RUN `npm run test:renderer`
- [ ] RUN `npm run test:main`
- [ ] RUN `npm run test:integration`
- [ ] VERIFY all tests pass

#### Task 5.3: API Contract Verification
**Status**: ⏳ Pending
**Effort**: S
**Dependencies**: Task 5.1
**Validation**:
- [ ] RUN contract tests in `src/renderer/__tests__/electron-api.contract.test.ts`
- [ ] VERIFY all IPC channels have matching handlers
- [ ] VERIFY no missing handler implementations
- [ ] VERIFY no orphaned IPC channels

#### Task 5.4: Runtime Verification
**Status**: ⏳ Pending
**Effort**: M
**Dependencies**: Task 5.2
**Validation**:
- [ ] START application in dev mode
- [ ] VERIFY chat functionality works
- [ ] VERIFY session list loads correctly
- [ ] VERIFY knowledge search works
- [ ] VERIFY settings dialog works
- [ ] VERIFY no runtime errors in console

## Summary

**Total Tasks**: 20
**Effort**: L (Large refactoring)
**Critical Path**: Tasks must be completed in order
**Risk**: Low - only removing unused code

## Success Criteria

✅ All TypeScript compilation succeeds
✅ All tests pass
✅ No runtime errors
✅ API surface reduced by 69% (80+ → 25 methods)
✅ Types match handler implementations
✅ No dead code or unused exports remain
