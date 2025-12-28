# ipc-surface-consistency Specification

## Purpose
TBD - created by archiving change clean-main-process-structure. Update Purpose after archive.
## Requirements
### Requirement: Preload Invocations Must Be Backed by Main Handlers
Every IPC channel invoked in `src/main/preload/*` MUST be implemented and registered in the main process, unless explicitly removed from preload.

**Priority**: P0 (Critical)
**Effort**: L

#### Scenario: showOpenDialog Works End-to-End
- **Given** the renderer calls `window.electronAPI.showOpenDialog(...)`
- **When** preload invokes the underlying IPC channel
- **Then** the main process handles the request
- **And** the renderer receives a valid dialog result.

---

### Requirement: Remove Unimplemented Catalyst Surface (Default)
If `catalyst:*` IPC channels are not implemented in main, preload MUST NOT expose them.

**Priority**: P1 (High)
**Effort**: M

#### Scenario: No Catalyst Calls After Cleanup
- **Given** the renderer codebase
- **When** searching for `electronAPI.catalyst`
- **Then** no production code depends on it
- **And** chat/sessions flows still work via domain APIs.

---

### Requirement: Catalyst Compat Layer Only If Required (Forwarder Only)
If Catalyst cannot be removed within the scope of this change without losing production behavior, a temporary `catalyst:*` compatibility layer MAY be kept/added, but it MUST be a pure forwarder (no new features) and MUST have an explicit removal plan in `tasks.md`.

**Priority**: P2 (Medium)
**Effort**: M

#### Scenario: No New Catalyst Handlers Introduced
- **Given** Catalyst was deemed unnecessary
- **When** inspecting main IPC handler registrations
- **Then** there are no `catalyst:*` handlers registered
- **And** the renderer uses domain APIs instead.

#### Scenario: Compat Forwarder Exists Only As Bridge
- **Given** Catalyst removal would break production behavior within scope
- **When** a `catalyst:*` handler exists
- **Then** it forwards to existing domain services/handlers
- **And** it does not introduce new payload shapes or new side effects
- **And** `tasks.md` contains a concrete follow-up removal item.

