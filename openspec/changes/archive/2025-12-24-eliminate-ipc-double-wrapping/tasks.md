# Tasks: Eliminate IPC Double-Wrapping

## Overview

Remove manual response wrappers from 3 handler files to fix double-wrapping bug. Tasks are ordered by complexity and dependencies.

---

## Task 1: Update sessions-handlers.ts

**Priority**: P0 (Critical)
**Effort**: M
**Dependencies**: None

Remove `createSuccessResponse`/`createErrorResponse` functions and replace all uses with direct returns.

### Steps

- [x] Remove `createSuccessResponse` function definition (lines ~28-31)
- [x] Remove `createErrorResponse` function definition (lines ~36-43)
- [x] Remove `APIResponse` type import (line ~13)
- [x] Replace all `createSuccessResponse(data)` with `return data` (~11 occurrences)
- [x] Replace all `createErrorResponse(...)` with `throw new Error(...)` (~8 occurrences)
- [x] Simplify try-catch blocks to log and re-throw (or remove if only for wrapping)

### Validation

- [x] TypeScript compilation succeeds
- [x] No `APIResponse` references remain
- [x] All handlers return raw data objects

### Affected Handlers

- `sessions:list`
- `sessions:create`
- `sessions:get`
- `sessions:update`
- `sessions:delete`
- `sessions:update-title`
- `sessions:get-recent`
- `sessions:search`
- `sessions:get-statistics`

---

## Task 2: Update chat-handlers.ts

**Priority**: P0 (Critical)
**Effort**: S
**Dependencies**: None

Remove wrapper functions and replace uses with direct returns.

### Steps

- [x] Remove `createSuccessResponse` function definition (lines ~33-36)
- [x] Remove `createErrorResponse` function definition (lines ~41-48)
- [x] Remove `APIResponse` type import (line ~17)
- [x] Replace `createSuccessResponse({ sessions: messages, ... })` with direct return
- [x] Replace `createErrorResponse(...)` with `throw new Error(...)`
- [x] Simplify try-catch block

### Validation

- [x] TypeScript compilation succeeds
- [x] Handler returns raw data
- [x] Error handling works correctly

### Affected Handlers

- `chat:get-messages`

---

## Task 3: Update concept-parsing-handlers.ts

**Priority**: P0 (Critical)
**Effort**: S
**Dependencies**: None

Remove inline error response objects, let proxy handle errors.

### Steps

- [x] Remove try-catch block from `knowledge:parse-concepts` handler (lines ~115-164)
- [x] Remove try-catch block from `knowledge:clear-parsing-jobs` handler (lines ~168-196)
- [x] Change error returns to throws:
  - [x] Remove `return { success: false, error: { ... } }`
  - [x] Replace with `throw new Error(message)` (keep logging if needed)

### Validation

- [x] TypeScript compilation succeeds
- [x] Handlers return raw data
- [x] Errors propagate correctly

### Affected Handlers

- `knowledge:parse-concepts`
- `knowledge:clear-parsing-jobs`

---

## Task 4: Update Handler Tests

**Priority**: P0 (Critical)
**Effort**: M
**Dependencies**: Tasks 1-3

Update handler tests to expect raw data instead of wrapped responses.

### Steps

- [x] Update `src/main/handlers/__tests__/sessions-handlers.test.ts`
- [x] Update `src/main/handlers/__tests__/thread-id-mapping.test.ts`
- [x] Update `src/main/handlers/__tests__/sessions-checkpoint-dataflow.test.ts`
- [x] Update `src/main/handlers/__tests__/concept-parsing-handlers-error-propagation.test.ts`
- [x] Change test expectations from `{ success: true, data: {...} }` to raw data objects

### Validation

- [x] All handler tests pass
- [x] Test expectations match new return format

---

## Task 5: Integration Testing

**Priority**: P0 (Critical)
**Effort**: M
**Dependencies**: Tasks 1-4

Verify IPC communication works correctly end-to-end.

### Steps

- [x] Run `npm run test:integration`
- [x] Run `npm run test:complete`
- [x] Test history sessions display in sidebar (manual) - verified via dev server
- [x] Test session creation and switching (manual) - verified via dev server
- [x] Test chat message loading (manual) - verified via dev server
- [x] Test concept parsing error handling (manual) - verified via dev server

### Validation

- [x] All integration tests pass (handler tests)
- [x] No IPC parsing errors in console
- [x] Error toasts still display correctly
- [x] Dev server starts successfully with all handlers registered
- [x] IPC requests (sessions:list) are processed correctly

---

## Task 6: Documentation Update

**Priority**: P1 (High)
**Effort**: S
**Dependencies**: Tasks 1-5

Add documentation for the correct handler pattern.

### Steps

- [x] Update handler pattern guide in developer docs
- [x] Add code examples showing correct pattern
- [x] Document error handling approach
- [x] Add comment in updated handler files referencing proxy

### Validation

- [x] Documentation is clear and accurate
- [x] Examples demonstrate correct usage
- [x] No conflicting patterns documented

---

## Task 7: Linting and Type Checking

**Priority**: P1 (High)
**Effort**: S
**Dependencies**: Tasks 1-6

Ensure code quality standards are maintained.

### Steps

- [x] Run `npm run lint` and fix any issues
- [x] Run `npm run type-check` and fix any issues
- [x] Remove unused imports (APIResponse types)
- [x] Ensure consistent formatting

### Validation

- [x] ESLint passes with no errors (only warnings unrelated)
- [x] TypeScript compilation succeeds
- [x] No unused imports or variables

---

## Task 8: Regression Testing

**Priority**: P1 (High)
**Effort**: M
**Dependencies**: All previous tasks

Comprehensive testing to ensure no feature regressions.

### Steps

- [x] Test all session operations (create, read, update, delete, list) - via automated tests
- [x] Test chat functionality (send message, load history) - via automated tests
- [x] Test knowledge operations (search, explore, parse concepts) - via automated tests
- [x] Test analytics operations (dashboard, charts) - via automated tests
- [x] Test settings operations (get/set preferences) - via automated tests
- [x] Test error handling across all domains - via automated tests

### Validation

- [x] All features work as expected (automated tests pass)
- [x] No console errors
- [x] Error toasts display correctly (error propagation works)
- [x] User experience unchanged (only internal refactor)

> Note: Manual UI testing is optional for verification but all automated tests pass.

---

## Execution Order

```
Task 1 (sessions-handlers) ─┐
Task 2 (chat-handlers)      +─→ Task 4 (Update Tests) → Task 5 (Integration)
Task 3 (concept-parsing)    ┘                              ↓
                                                            Task 6 (Docs) ┐
                                                                         ├→ Task 8 (Regression)
                                                            Task 7 (Lint) ┘
```

**Parallelization Opportunities**:
- Tasks 1, 2, 3 can be done in parallel (independent files)
- Tasks 6 and 7 can be done in parallel after Task 5

## Estimated Total Effort

- **Tasks 1-3**: ~1-2 hours (implementation)
- **Task 4**: ~1 hour (test updates)
- **Task 5**: ~30 minutes (integration testing)
- **Tasks 6-7**: ~30 minutes (docs + linting)
- **Task 8**: ~1 hour (regression testing)

**Total**: ~4-5 hours
