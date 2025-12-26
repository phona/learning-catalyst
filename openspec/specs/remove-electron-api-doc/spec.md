# remove-electron-api-doc Specification

## Purpose
TBD - created by archiving change clean-main-process-structure. Update Purpose after archive.
## Requirements
### Requirement: Old Electron IPC Doc Page Is Removed
The old Developer Guide page for Electron IPC contracts MUST be removed, and no repository docs or specs should reference it.

**Priority**: P1 (High)
**Effort**: S

#### Scenario: No References Remain
- **Given** the repository
- **When** searching for the removed Electron IPC doc filename
- **Then** no references are found
- **And** the build and tests still pass.

### Requirement: OpenSpec No Longer Mentions Removed Electron IPC Doc Page
OpenSpec requirements MUST NOT reference the removed Developer Guide Electron IPC doc page and MUST reference code sources instead (types + preload + handlers).

**Priority**: P1 (High)
**Effort**: S
**Related**: `renderer-ipc-standardization`

#### Scenario: OpenSpec No Longer Mentions Removed Electron IPC Doc Page
- **Given** OpenSpec specs
- **When** searching for the removed Electron IPC doc filename
- **Then** no OpenSpec spec mentions it.

