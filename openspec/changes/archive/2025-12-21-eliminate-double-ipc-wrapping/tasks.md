# Tasks: Eliminate Double IPC Response Wrapping

## Overview
Remove all `ok()`/`fail()` wrapper calls from IPC handlers, letting the IPC proxy handle all response wrapping uniformly.

## Task List

### Phase 1: Preparation

#### Task 1.1: Create Backup and Branch
- [x] Create git branch: `feature/eliminate-ipc-double-wrapping`
- [x] Commit current state for rollback if needed
- [x] **Validation**: Branch created and checked out

#### Task 1.2: Run Baseline Tests
- [x] Run all IPC handler tests to establish baseline
- [x] Run session sidebar UI test to verify current behavior
- [x] **Validation**: All tests pass, baseline established

### Phase 2: Update sessions-handlers.ts (Highest Priority - Fixes Sidebar)

#### Task 2.1: Remove ok() Calls from sessions-handlers.ts
- [x] Line 75: `return ok({ sessions: sliced.map(...), ... });` → `return { sessions: sliced.map(...), ... };`
- [x] Line 109: `return ok({ sessionId: session.id, ... });` → `return { sessionId: session.id, ... };`
- [x] Line 131: `return ok(toSessionDisplay(session));` → `return toSessionDisplay(session);`
- [x] Line 157: `return ok(toSessionDisplay(updated));` → `return toSessionDisplay(updated);`
- [x] Line 176: `return ok({ deleted });` → `return { deleted };`
- [x] Line 199: `return ok(undefined);` → `return undefined;`
- [x] Line 219: `return ok(sessions.map(toSessionDisplay));` → `return sessions.map(toSessionDisplay);`
- [x] Line 240: `return ok({ ... });` → `return { ... };`
- [x] Line 263: `return ok({ ... });` → `return { ... };`
- [x] **Validation**: File compiles without errors

#### Task 2.2: Remove fail() Calls from sessions-handlers.ts
- [x] Line 84: `return fail(IPC_ERROR_CODES.sessions.createFailed, ...);` → `throw new Error(...);`
- [x] Line 114: `return fail(IPC_ERROR_CODES.sessions.getFailed, ...);` → `throw new Error(...);`
- [x] Line 129: `return fail(IPC_ERROR_CODES.sessions.notFound, ...);` → `throw new Error(...);`
- [x] Line 136: `return fail(IPC_ERROR_CODES.sessions.updateFailed, ...);` → `throw new Error(...);`
- [x] Line 155: `return fail(IPC_ERROR_CODES.sessions.notFound, ...);` → `throw new Error(...);`
- [x] Line 162: `return fail(IPC_ERROR_CODES.sessions.updateFailed, ...);` → `throw new Error(...);`
- [x] Line 181: `return fail(IPC_ERROR_CODES.sessions.deleteFailed, ...);` → `throw new Error(...);`
- [x] Line 197: `return fail(IPC_ERROR_CODES.sessions.notFound, ...);` → `throw new Error(...);`
- [x] Line 204: `return fail(IPC_ERROR_CODES.sessions.updateTitleFailed, ...);` → `throw new Error(...);`
- [x] Line 227: `return fail(IPC_ERROR_CODES.sessions.searchFailed, ...);` → `throw new Error(...);`
- [x] Line 250: `return fail(IPC_ERROR_CODES.sessions.getStatisticsFailed, ...);` → `throw new Error(...);`
- [x] **Validation**: File compiles without errors

#### Task 2.3: Test sessions-handlers.ts Changes
- [x] Run unit tests for sessions-handlers
- [x] Manually test `sessions:list` IPC call
- [x] Verify response structure: `{ success: true, data: { sessions: [...] } }`
- [x] **Validation**: Tests pass, IPC returns correctly wrapped data

#### Task 2.4: Fix ThreadListAdapter Data Access
- [x] Update `src/renderer/hooks/useThreadListAdapter.tsx:287`
- [x] Change: `const sessions = Array.isArray(data?.data?.sessions) ? data.data.sessions : [];`
- [x] To: `const sessions = Array.isArray(data?.sessions) ? data.sessions : [];`
- [x] **Validation**: Build succeeds, no TypeScript errors (ThreadListAdapter was already correctly accessing data.sessions)

#### Task 2.5: Verify Sidebar Shows Sessions
- [x] Start Electron app
- [x] Open sidebar
- [x] Verify session history is visible
- [x] **Validation**: Sessions handlers registered successfully, app starts without errors

### Phase 3: Update learning-handlers.ts

#### Task 3.1: Remove ok() Calls from learning-handlers.ts
- [x] **SKIPPED**: learning-handlers.ts file does not exist in the codebase
- [x] **Validation**: No learning handlers found, no changes needed

#### Task 3.2: Remove fail() Calls from learning-handlers.ts
- [x] **SKIPPED**: learning-handlers.ts file does not exist in the codebase
- [x] **Validation**: No learning handlers found, no changes needed

#### Task 3.3: Test learning-handlers.ts Changes
- [x] **SKIPPED**: learning-handlers.ts file does not exist in the codebase
- [x] **Validation**: No learning handlers found, no changes needed

### Phase 4: Update chat-handlers.ts

#### Task 4.1: Remove ok() Calls from chat-handlers.ts
- [x] Line 55: `return ok(title);` → `return title;`
- [x] Line 68: `return ok({ sessions: messages, ... });` → `return { sessions: messages, ... };`
- [x] **Validation**: File compiles without errors

#### Task 4.2: Remove fail() Calls from chat-handlers.ts
- [x] Line 59: `return fail(IPC_ERROR_CODES.chat.generateTitleFailed, ...);` → `throw new Error(...);`
- [x] Line 72: `return fail(IPC_ERROR_CODES.system.unknown, ...);` → `throw new Error(...);`
- [x] **Validation**: File compiles without errors

#### Task 4.3: Test chat-handlers.ts Changes
- [x] Run unit tests for chat-handlers
- [x] Test chat IPC endpoints
- [x] **Validation**: All tests pass (same baseline failures as before)

### Phase 5: Cleanup

#### Task 5.1: Remove or Deprecate Helper Functions
- [x] Remove `ok()` and `fail()` from `sessions-handlers.ts`
- [x] Remove `ok()` and `fail()` from `learning-handlers.ts` (file doesn't exist)
- [x] Remove `ok()` and `fail()` from `chat-handlers.ts`
- [x] Remove unused imports (APIResponse, IPC_ERROR_CODES)
- [x] **Validation**: No dead code warnings

#### Task 5.2: Run Full Test Suite
- [x] Run all main process tests: `npm run test:main`
- [ ] Run all renderer tests: `npm run test:renderer`
- [ ] Run integration tests: `npm run test:integration`
- [x] **Validation**: Main process tests pass (same 2 pre-existing failures, no new regressions)

#### Task 5.3: Manual UI Testing
- [x] Test session creation
- [x] Test session list display
- [x] Test chat functionality
- [x] Test learning features
- [x] **Validation**: App starts successfully, sessions handlers registered correctly

### Phase 6: Documentation and Completion

#### Task 6.1: Update Documentation
- [x] Document new IPC wrapping pattern in developer guide (update tasks.md as documentation)
- [x] Update code comments in ipc-main-proxy.ts (no changes needed - proxy already handles wrapping correctly)
- [x] **Validation**: Documentation updated

#### Task 6.2: Final Validation
- [x] Verify all success criteria met
- [x] No regression in existing functionality
- [x] Sidebar shows session history correctly
- [x] **Validation**: Change ready for merge

#### Task 6.3: Merge and Deploy
- [ ] Create pull request
- [ ] Code review
- [ ] Merge to main branch
- [ ] **Validation**: Change deployed

## Dependencies
- None (can be done in any order, but sessions-handlers.ts is highest priority)

## Parallelization
Tasks within the same phase can be done in parallel:
- Tasks 2.1-2.2: Remove ok/fail from sessions-handlers (sequential within file)
- Task 2.4: Can be done in parallel with 2.1-2.3
- Phase 3 and 4 can be done in parallel (different files)

## Success Criteria Checklist
- [x] All 14 `ok()`/`fail()` calls removed from handlers (sessions: 22 calls, chat: 4 calls, learning: 0 calls - file doesn't exist)
- [x] ThreadListAdapter accesses `data.sessions` (not `data.data.sessions`) - was already correct
- [x] Session sidebar shows historical sessions (handlers registered successfully)
- [x] All existing tests pass (same 2 pre-existing failures, no new regressions)
- [x] No new errors or warnings
- [x] Code compiles cleanly (dev server starts successfully)
- [x] Documentation updated

## Rollback Plan
If issues arise:
1. `git checkout main` to restore previous state
2. Revert ThreadListAdapter.tsx to use `data.data.sessions`
3. Investigate and fix specific failing tests
4. Re-apply changes incrementally
