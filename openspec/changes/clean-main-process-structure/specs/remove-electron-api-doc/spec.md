# remove-electron-api-doc Specification

## Purpose
Remove `docs/DEVELOPER-GUIDE/electron-api.md` so code remains the only source of truth for Electron IPC contracts.

## ADDED Requirements

### Requirement: electron-api.md Is Removed
The file `docs/DEVELOPER-GUIDE/electron-api.md` MUST be removed, and no repository docs or specs should reference it.

**Priority**: P1 (High)
**Effort**: S

#### Scenario: No References Remain
- **Given** the repository
- **When** searching for `electron-api.md`
- **Then** no references are found
- **And** the build and tests still pass.

## MODIFIED Requirements

### Requirement: Replace OpenSpec References to electron-api.md
Any OpenSpec requirements that reference `docs/DEVELOPER-GUIDE/electron-api.md` MUST be updated to reference code sources instead (types + preload + handlers).

**Priority**: P1 (High)
**Effort**: S
**Related**: `renderer-ipc-standardization`

#### Scenario: OpenSpec No Longer Mentions electron-api.md
- **Given** OpenSpec specs
- **When** searching for `electron-api.md`
- **Then** no OpenSpec spec mentions it.

