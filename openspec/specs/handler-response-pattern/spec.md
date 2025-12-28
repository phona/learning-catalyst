# handler-response-pattern Specification

## Purpose
TBD - created by archiving change eliminate-ipc-double-wrapping. Update Purpose after archive.
## Requirements
### Requirement: Handlers Must Return Raw Data

All IPC handlers MUST return raw data objects without wrapping them in `APIResponse<T>` format. The `ipc-main-proxy` is responsible for wrapping all responses in `APIResponse<T>` format.

**Priority**: P0 (Critical)
**Effort**: M

**Rationale:**
- The `ipc-main-proxy` already wraps all handler responses
- Manual wrapping causes double-wrapping bugs
- Consistent pattern simplifies handler code
- Single source of truth for response wrapping

**Implementation:**
```typescript
// ✅ CORRECT: Return raw data
ipcMainInstance.handle('sessions:list', async (event, options) => {
  const sessions = await service.getRecentSessions();
  return { sessions, total: sessions.length };
});

// ❌ WRONG: Manual wrapper causes double-wrapping
ipcMainInstance.handle('sessions:list', async (event, options) => {
  const sessions = await service.getRecentSessions();
  return createSuccessResponse({ sessions, total: sessions.length });
});
```

**Validation:**
- No `createSuccessResponse` or `createErrorResponse` functions in handler files
- No inline `return { success: true/false, ... }` patterns
- Handlers return plain JavaScript objects or primitives
- TypeScript compilation succeeds without `APIResponse` return types

#### Scenario: Handler Returns Session List
**Given** User requests session list from sidebar
**When** `sessions:list` handler executes
**Then** Handler returns raw object `{ sessions: [...], total: 10, hasMore: false }`
**And** `ipc-main-proxy` wraps it as `{ success: true, data: { sessions: [...], total: 10, hasMore: false }, timestamp: ... }`
**And** Renderer's `unwrapAPI` extracts `{ sessions: [...], total: 10, hasMore: false }`
**And** Sessions display correctly in sidebar ✅

#### Scenario: Handler Returns Single Object
**Given** User requests session details
**When** `sessions:get` handler executes
**Then** Handler returns raw session object `{ id, title, status, ... }`
**And** `ipc-main-proxy` wraps it as `{ success: true, data: { id, title, status, ... }, timestamp: ... }`
**And** Renderer receives correct session data ✅

#### Scenario: Handler Returns Array
**Given** User requests recent sessions
**When** `sessions:get-recent` handler executes
**Then** Handler returns raw array `[{ id, title, ... }, ...]`
**And** `ipc-main-proxy` wraps it as `{ success: true, data: [...], timestamp: ... }`
**And** Renderer receives correct array ✅

---

### Requirement: No Manual Error Wrapping in Handlers

All IPC handlers MUST NOT manually wrap errors in `APIResponse<T>` format. Error handling is the responsibility of the `ipc-main-proxy`.

**Priority**: P0 (Critical)
**Effort**: M

**Rationale:**
- The `ipc-main-proxy` catches all handler errors and wraps them
- Manual error wrapping creates inconsistent error formats
- Simpler handler code without try-catch boilerplate
- Centralized error handling in proxy

**Implementation:**
```typescript
// ✅ CORRECT: Let proxy handle errors
ipcMainInstance.handle('sessions:get', async (event, sessionId) => {
  const session = await service.getSession(sessionId);
  if (!session) {
    throw new Error('Session not found');
  }
  return session;
});

// ❌ WRONG: Manual error wrapping
ipcMainInstance.handle('sessions:get', async (event, sessionId) => {
  try {
    const session = await service.getSession(sessionId);
    if (!session) {
      return createErrorResponse('sessions.not_found', 'Session not found');
    }
    return createSuccessResponse(session);
  } catch (error) {
    return createErrorResponse('sessions.error', 'Failed to get session');
  }
});
```

**Allowed Pattern (Logging Only):**
```typescript
// ✅ ALLOWED: Try-catch for logging, then re-throw
ipcMainInstance.handle('sessions:get', async (event, sessionId) => {
  try {
    const session = await service.getSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }
    return session;
  } catch (error) {
    logger.error('sessions:get failed', { sessionId, error });
    throw error;  // Re-throw for proxy to handle
  }
});
```

**Validation:**
- No `createErrorResponse` calls in handler files
- No inline `return { success: false, error: ... }` patterns
- Errors are thrown, not returned
- Try-catch blocks only used for logging (optional)

#### Scenario: Handler Throws Error on Not Found
**Given** User requests non-existent session
**When** Handler calls `service.getSession(sessionId)` and gets `null`
**Then** Handler throws `new Error('Session not found')`
**And** `ipc-main-proxy` catches it and wraps as `{ success: false, error: 'Session not found', timestamp: ... }`
**And** Renderer's `unwrapAPI` throws `IPCError` with error message
**And** Error toast displays "Session not found" ✅

#### Scenario: Handler Throws Error on Service Failure
**Given** Database connection fails during session query
**When** Handler calls `service.getRecentSessions()` and it throws
**Then** Handler lets error propagate (no try-catch needed)
**And** `ipc-main-proxy` catches it and wraps in error response
**And** Renderer receives structured error via `unwrapAPI`
**And** Error toast displays failure message ✅

#### Scenario: Handler Logs Error Before Throwing
**Given** Handler encounters unexpected error condition
**When** Handler catches error for logging purposes
**Then** Handler logs error with context
**And** Handler re-throws original error
**And** `ipc-main-proxy` catches and wraps it
**And** Both logs and error response are correct ✅

---

### Requirement: Remove APIResponse Type from Handlers

Handler files MUST NOT import or reference `APIResponse<T>` type. Response wrapping is handled by the `ipc-main-proxy`.

**Priority**: P1 (High)
**Effort**: S

**Rationale:**
- Handlers don't create `APIResponse` objects
- Importing unused types creates confusion
- Type safety maintained through proxy
- Clear separation of concerns

**Implementation:**
```typescript
// ❌ REMOVE this import
import type { APIResponse } from '@/shared/types/electron-api/base';

// ❌ REMOVE these function definitions
const createSuccessResponse = <T>(data: T): APIResponse<T> => ({
  success: true,
  data,
});

const createErrorResponse = (code: string, message: string): APIResponse<never> => ({
  success: false,
  error: { code, message },
});
```

**Validation:**
- No `APIResponse` imports in handler files
- No type annotations using `APIResponse<T>`
- TypeScript compilation succeeds
- IDE doesn't suggest `APIResponse` types

#### Scenario: Handler File Has No APIResponse Import
**Given** Developer opens handler file
**When** Developer checks imports
**Then** No `APIResponse` import present
**And** Only necessary types imported (service types, logger, etc.)
**And** File is clean and focused ✅

#### Scenario: New Handler Created Without Wrappers
**Given** Developer creates new handler file
**When** Following handler template
**Then** Template doesn't include `APIResponse` import
**And** Template shows raw data return pattern
**And** Developer implements correct pattern from start ✅

---

### Requirement: Consistent Pattern Across All Handlers

All IPC handler files MUST follow the same response pattern: return raw data, let proxy handle wrapping and errors.

**Priority**: P1 (High)
**Effort**: M

**Rationale:**
- Predictable code structure across all handlers
- Easy to understand and maintain
- Reduces cognitive load for developers
- Prevents double-wrapping bugs

**Correct Handler Template:**
```typescript
export const setupXxxHandlers = (
  ipcMainInstance: typeof ipcMain,
  services: XxxDeps,
): void => {
  const logger = services.loggerService.child({ handler: 'xxx' });

  ipcMainInstance.handle('xxx:operation', async (_event, params) => {
    // Return raw data - proxy wraps it
    const result = await services.xxxService.operation(params);
    return result;
  });

  // Optional: try-catch for logging only
  ipcMainInstance.handle('xxx:other', async (_event, id) => {
    try {
      const result = await services.xxxService.get(id);
      if (!result) {
        throw new Error('Not found');
      }
      return result;
    } catch (error) {
      logger.error('xxx:other failed', { id, error });
      throw error;  // Re-throw for proxy
    }
  });

  logger.info('XXX handlers registered');
};
```

**Validation:**
- All handler files follow the template pattern
- No handler files have custom wrapper functions
- Code review confirms consistency
- New handlers use correct pattern

#### Scenario: All Handlers Follow Same Pattern
**Given** Developer reviews handler files
**When** Comparing different handler files
**Then** All have similar structure
**And** All return raw data
**And** None have custom wrappers
**And** Code is predictable ✅

#### Scenario: New Handler Uses Correct Pattern
**Given** Developer adds new handler file
**When** Following established template
**Then** Handler returns raw data
**And** No custom wrappers added
**And** Pattern matches other handlers
**And** Review passes quickly ✅

---

