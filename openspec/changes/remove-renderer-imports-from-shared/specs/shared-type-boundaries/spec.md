# Capability: Shared Type Boundaries (No `shared -> renderer` Imports)

## MODIFIED Requirements

### Requirement: Shared Code Does Not Import Renderer Code
Files under `src/shared/` MUST NOT import from `src/renderer/` (directly or via aliased paths).

**Priority**: P0 (Critical)
**Effort**: S

#### Scenario: Sessions IPC Types Are Renderer-Independent
- **Given** `src/shared/types/electron-api/sessions-api.ts`
- **When** it is type-checked
- **Then** it does not import any module under `src/renderer/`.

### Requirement: Sessions Request DTOs Live In Shared
`SessionCreateRequest` and `SessionUpdateRequest` used by IPC MUST be defined in `src/shared/` and imported by both processes.

**Priority**: P0 (Critical)
**Effort**: S

#### Scenario: Both Main and Renderer Compile Against Same DTOs
- **Given** the main sessions handler and renderer sessions service
- **When** they import request DTOs
- **Then** they both import from the shared DTO module
- **And** no duplicate request DTO definitions exist across layers.
