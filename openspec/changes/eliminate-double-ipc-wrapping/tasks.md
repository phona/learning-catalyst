# Tasks: Eliminate Double IPC Response Wrapping

## Overview
Remove all `ok()`/`fail()` wrapper calls from IPC handlers, letting the IPC proxy handle all response wrapping uniformly.

## Task List

### Phase 1: Preparation

#### Task 1.1: Create Backup and Branch
- [ ] Create git branch: `feature/eliminate-ipc-double-wrapping`
- [ ] Commit current state for rollback if needed
- [ ] **Validation**: Branch created and checked out

#### Task 1.2: Run Baseline Tests
- [ ] Run all IPC handler tests to establish baseline
- [ ] Run session sidebar UI test to verify current behavior
- [ ] **Validation**: All tests pass, baseline established

### Phase 2: Update sessions-handlers.ts (Highest Priority - Fixes Sidebar)

#### Task 2.1: Remove ok() Calls from sessions-handlers.ts
- [ ] Line 75: `return ok({ sessions: sliced.map(...), ... });` → `return { sessions: sliced.map(...), ... };`
- [ ] Line 109: `return ok({ sessionId: session.id, ... });` → `return { sessionId: session.id, ... };`
- [ ] Line 131: `return ok(toSessionDisplay(session));` → `return toSessionDisplay(session);`
- [ ] Line 157: `return ok(toSessionDisplay(updated));` → `return toSessionDisplay(updated);`
- [ ] Line 176: `return ok({ deleted });` → `return { deleted };`
- [ ] Line 199: `return ok(undefined);` → `return undefined;`
- [ ] Line 219: `return ok(sessions.map(toSessionDisplay));` → `return sessions.map(toSessionDisplay);`
- [ ] Line 240: `return ok({ ... });` → `return { ... };`
- [ ] Line 263: `return ok({ ... });` → `return { ... };`
- [ ] **Validation**: File compiles without errors

#### Task 2.2: Remove fail() Calls from sessions-handlers.ts
- [ ] Line 84: `return fail(IPC_ERROR_CODES.sessions.createFailed, ...);` → `throw new Error(...);`
- [ ] Line 114: `return fail(IPC_ERROR_CODES.sessions.getFailed, ...);` → `throw new Error(...);`
- [ ] Line 129: `return fail(IPC_ERROR_CODES.sessions.notFound, ...);` → `throw new Error(...);`
- [ ] Line 136: `return fail(IPC_ERROR_CODES.sessions.updateFailed, ...);` → `throw new Error(...);`
- [ ] Line 155: `return fail(IPC_ERROR_CODES.sessions.notFound, ...);` → `throw new Error(...);`
- [ ] Line 162: `return fail(IPC_ERROR_CODES.sessions.updateFailed, ...);` → `throw new Error(...);`
- [ ] Line 181: `return fail(IPC_ERROR_CODES.sessions.deleteFailed, ...);` → `throw new Error(...);`
- [ ] Line 197: `return fail(IPC_ERROR_CODES.sessions.notFound, ...);` → `throw new Error(...);`
- [ ] Line 204: `return fail(IPC_ERROR_CODES.sessions.updateTitleFailed, ...);` → `throw new Error(...);`
- [ ] Line 227: `return fail(IPC_ERROR_CODES.sessions.searchFailed, ...);` → `throw new Error(...);`
- [ ] Line 250: `return fail(IPC_ERROR_CODES.sessions.getStatisticsFailed, ...);` → `throw new Error(...);`
- [ ] **Validation**: File compiles without errors

#### Task 2.3: Test sessions-handlers.ts Changes
- [ ] Run unit tests for sessions-handlers
- [ ] Manually test `sessions:list` IPC call
- [ ] Verify response structure: `{ success: true, data: { sessions: [...] } }`
- [ ] **Validation**: Tests pass, IPC returns correctly wrapped data

#### Task 2.4: Fix ThreadListAdapter Data Access
- [ ] Update `src/renderer/hooks/useThreadListAdapter.tsx:287`
- [ ] Change: `const sessions = Array.isArray(data?.data?.sessions) ? data.data.sessions : [];`
- [ ] To: `const sessions = Array.isArray(data?.sessions) ? data.sessions : [];`
- [ ] **Validation**: Build succeeds, no TypeScript errors

#### Task 2.5: Verify Sidebar Shows Sessions
- [ ] Start Electron app
- [ ] Open sidebar
- [ ] Verify session history is visible
- [ ] **Validation**: 100+ sessions appear in sidebar

### Phase 3: Update learning-handlers.ts

#### Task 3.1: Remove ok() Calls from learning-handlers.ts
- [ ] Line 50: `return ok(result);` → `return result;`
- [ ] Line 84: `return ok(session);` → `return session;`
- [ ] Line 103: `return ok(progress);` → `return progress;`
- [ ] Line 120: `return ok(result);` → `return result;`
- [ ] Line 137: `return ok(result);` → `return result;`
- [ ] Line 154: `return ok(result);` → `return result;`
- [ ] Line 171: `return ok(sessions);` → `return sessions;`
- [ ] **Validation**: File compiles without errors

#### Task 3.2: Remove fail() Calls from learning-handlers.ts
- [ ] Line 46: `return fail(IPC_ERROR_CODES.learning.pathNotFound, ...);` → `throw new Error(...);`
- [ ] Line 55: `return fail(IPC_ERROR_CODES.learning.pathError, ...);` → `throw new Error(...);`
- [ ] Line 89: `return fail(IPC_ERROR_CODES.learning.startFailed, ...);` → `throw new Error(...);`
- [ ] Line 108: `return fail(IPC_ERROR_CODES.learning.progressFailed, ...);` → `throw new Error(...);`
- [ ] Line 125: `return fail(IPC_ERROR_CODES.learning.pauseFailed, ...);` → `throw new Error(...);`
- [ ] Line 142: `return fail(IPC_ERROR_CODES.learning.resumeFailed, ...);` → `throw new Error(...);`
- [ ] Line 159: `return fail(IPC_ERROR_CODES.learning.completeFailed, ...);` → `throw new Error(...);`
- [ ] Line 176: `return fail(IPC_ERROR_CODES.learning.recentFailed, ...);` → `throw new Error(...);`
- [ ] Line 203: `return fail(IPC_ERROR_CODES.learning.searchFailed, ...);` → `throw new Error(...);`
- [ ] **Validation**: File compiles without errors

#### Task 3.3: Test learning-handlers.ts Changes
- [ ] Run unit tests for learning-handlers
- [ ] Test key learning IPC endpoints
- [ ] **Validation**: All tests pass

### Phase 4: Update chat-handlers.ts

#### Task 4.1: Remove ok() Calls from chat-handlers.ts
- [ ] Line 55: `return ok(title);` → `return title;`
- [ ] Line 68: `return ok({ sessions: messages, ... });` → `return { sessions: messages, ... };`
- [ ] **Validation**: File compiles without errors

#### Task 4.2: Remove fail() Calls from chat-handlers.ts
- [ ] Line 59: `return fail(IPC_ERROR_CODES.chat.generateTitleFailed, ...);` → `throw new Error(...);`
- [ ] Line 72: `return fail(IPC_ERROR_CODES.system.unknown, ...);` → `throw new Error(...);`
- [ ] **Validation**: File compiles without errors

#### Task 4.3: Test chat-handlers.ts Changes
- [ ] Run unit tests for chat-handlers
- [ ] Test chat IPC endpoints
- [ ] **Validation**: All tests pass

### Phase 5: Cleanup

#### Task 5.1: Remove or Deprecate Helper Functions
- [ ] Remove `ok()` and `fail()` from `sessions-handlers.ts`
- [ ] Remove `ok()` and `fail()` from `learning-handlers.ts`
- [ ] Remove `ok()` and `fail()` from `chat-handlers.ts`
- [ ] **Validation**: No dead code warnings

#### Task 5.2: Run Full Test Suite
- [ ] Run all main process tests: `npm run test:main`
- [ ] Run all renderer tests: `npm run test:renderer`
- [ ] Run integration tests: `npm run test:integration`
- [ ] **Validation**: All tests pass (100% pass rate)

#### Task 5.3: Manual UI Testing
- [ ] Test session creation
- [ ] Test session list display
- [ ] Test chat functionality
- [ ] Test learning features
- [ ] **Validation**: All UI flows work correctly

### Phase 6: Documentation and Completion

#### Task 6.1: Update Documentation
- [ ] Document new IPC wrapping pattern in developer guide
- [ ] Update code comments in ipc-main-proxy.ts
- [ ] **Validation**: Documentation updated

#### Task 6.2: Final Validation
- [ ] Verify all success criteria met
- [ ] No regression in existing functionality
- [ ] Sidebar shows session history correctly
- [ ] **Validation**: Change ready for merge

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
- [ ] All 42 `ok()`/`fail()` calls removed from handlers
- [ ] ThreadListAdapter accesses `data.sessions` (not `data.data.sessions`)
- [ ] Session sidebar shows 100+ historical sessions
- [ ] All existing tests pass
- [ ] No new errors or warnings
- [ ] Code compiles cleanly
- [ ] Documentation updated

## Rollback Plan
If issues arise:
1. `git checkout main` to restore previous state
2. Revert ThreadListAdapter.tsx to use `data.data.sessions`
3. Investigate and fix specific failing tests
4. Re-apply changes incrementally
