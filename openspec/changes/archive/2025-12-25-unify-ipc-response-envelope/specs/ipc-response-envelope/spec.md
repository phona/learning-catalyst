# Capability: IPC Response Envelope Consistency

## ADDED Requirements

### Requirement: IPC Proxy Returns `APIResponse<T>`
The IPC proxy MUST return responses that match `APIResponse<T>` from `src/shared/types/electron-api/base.ts`.

**Priority**: P0 (Critical)
**Effort**: M

#### Scenario: Successful Handler Result Is Wrapped Once
- **Given** a handler returns a raw object `{ sessions: [], total: 0, hasMore: false }`
- **When** the renderer invokes the IPC channel through preload
- **Then** the renderer receives `{ success: true, data: { sessions: [], total: 0, hasMore: false } }`
- **And** no additional wrapping layers are present.

### Requirement: Errors Are Structured With Codes
When a handler throws, the IPC proxy MUST return `{ success: false, error: { code, message, details? }, code? }`.

**Priority**: P0 (Critical)
**Effort**: M

#### Scenario: Handler Throw Becomes Structured Error
- **Given** a handler throws `new Error('Session not found')`
- **When** the IPC proxy catches it
- **Then** the renderer receives `success=false`
- **And** `error.message` is `'Session not found'`
- **And** `error.code` is a stable string (ex: `'HANDLER_ERROR'`).

### Requirement: Optional Timestamp Uses ISO Strings
If the IPC envelope includes a timestamp, it MUST be an ISO string (not a `Date` object).

**Priority**: P1 (High)
**Effort**: S

#### Scenario: Timestamp Is JSON-Safe
- **Given** the IPC proxy includes `timestamp`
- **When** the renderer inspects the response
- **Then** `typeof timestamp === 'string'`
- **And** it parses as a valid ISO date string.
