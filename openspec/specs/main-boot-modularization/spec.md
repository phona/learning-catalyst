# main-boot-modularization Specification

## Purpose
TBD - created by archiving change clean-main-process-structure. Update Purpose after archive.
## Requirements
### Requirement: Keep index.ts as Entry, Delegate Boot Logic
`src/main/index.ts` MUST remain the Electron main entrypoint, but MUST delegate boot logic to `src/main/app/*` modules.

**Priority**: P1 (High)
**Effort**: M

#### Scenario: Entry Point Is Thin
- **Given** the app is started
- **When** inspecting `src/main/index.ts`
- **Then** it primarily calls a boot function (e.g., `startApp()`)
- **And** window creation, service creation, IPC setup, and readiness live under `src/main/app/*`.

