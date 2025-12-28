# renderer-lint-health Specification

## Purpose
TBD - created by archiving change stabilize-test-health. Update Purpose after archive.
## Requirements
### Requirement: Renderer TSX Modules Preserve Fast Refresh Constraints

Renderer TSX modules MUST be structured so that React Fast Refresh can reliably track component boundaries, and ESLint MUST NOT report persistent `react-refresh/only-export-components` warnings for production renderer code.

**Related Specs**:
- `component-architecture`
- `renderer-structure`

**Priority**: P2 (Medium)  
**Effort**: M

#### Scenario: Hooks and Providers Export Only React-Facing APIs from TSX

**Given** a renderer TSX module that defines React hooks or providers  
**And** ESLint previously reported `react-refresh/only-export-components` for that file  
**When** the module is refactored  
**Then** the TSX file MUST primarily export React-facing APIs (components, hooks, providers)  
**And** generic helper functions and constants MUST be moved into adjacent `.ts` modules and imported where needed  
**And** running `npm run lint` MUST NOT report `react-refresh/only-export-components` for the updated TSX file

**Files Affected (Examples)**:
- `src/renderer/hooks/useElectronAPI.tsx`  
- `src/renderer/hooks/useThreadListAdapter.tsx`  
- `src/renderer/services/services-provider.tsx`  
- `src/renderer/stores/chat/ChatStoreProvider.tsx`

#### Scenario: Renderer Test Utilities Respect Fast Refresh Structure

**Given** TSX-based test utility modules under `src/test/utils/**`  
**And** ESLint previously reported `react-refresh/only-export-components` warnings for these files  
**When** the test utilities are refactored  
**Then** TSX files that contain providers/components MUST separate generic helpers into `.ts` modules  
**And** helper-only modules that do not need JSX SHOULD be converted to `.ts` where reasonable  
**And** `npm run lint` MUST NOT report `react-refresh/only-export-components` warnings for these test utility modules

**Files Affected (Examples)**:
- `src/test/utils/helpers/test-utils.tsx`  
- `src/test/utils/helpers/utils.tsx`  
- `src/test/utils/test-providers.tsx`

### Requirement: Renderer Hooks Maintain Explicit Dependencies

Renderer hooks MUST maintain explicit and correct dependency declarations for React effects so that `react-hooks/exhaustive-deps` warnings do not appear in production renderer code.

**Related Specs**:
- `component-architecture`

**Priority**: P2 (Medium)  
**Effort**: S

#### Scenario: FileTree Effect Dependencies Are Explicit and Stable

**Given** the `FileTree` component in `src/renderer/features/discovery/ui/FileTree.tsx`  
**And** a `useEffect` hook that calls helper functions such as `loadDirectory` and `loadDefaultDirectory`  
**When** the component is linted with `npm run lint`  
**Then** the effect's dependency array MUST include all referenced callbacks (or the logic MUST be restructured so that no missing dependencies are referenced)  
**And** the effect MUST preserve existing runtime behaviour for initial directory loading  
**And** `react-hooks/exhaustive-deps` MUST NOT report warnings for this effect

