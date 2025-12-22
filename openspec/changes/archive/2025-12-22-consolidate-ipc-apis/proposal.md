# Consolidate IPC API Surface

**Change ID**: `consolidate-ipc-apis`
**Status**: Complete
**Author**: Claude Code Assistant
**Date**: 2025-12-21

## Why

The IPC API surface had unused domains and orphaned type definitions that created maintenance overhead. After investigation, the actual unused APIs were:
- **Content API** - Exposed in preload but had no handlers implemented
- **Agents API** - Exposed in preload but had no handlers, renderer service never used
- **LearningAPI interface** - Type defined but never exposed in ElectronAPI

Analytics, Knowledge, Sessions, Settings, Chat, and Catalyst APIs were all actively used and were kept.

## What Changes

### Phase 1: Remove Unused API Domains

1. **Remove Content API**
   - DELETE: `ContentAPI` interface from base.ts
   - DELETE: `contentAPI` from preload
   - DELETE: Related display types (moved to local definitions in content-service.ts)

2. **Remove Agents API**
   - DELETE: `AgentsAPI` interface from base.ts
   - DELETE: `agentsAPI` from preload
   - DELETE: `renderer/services/agents/` directory
   - DELETE: `agentService` from services-provider.tsx

3. **Remove LearningAPI Interface**
   - DELETE: `LearningAPI` interface from base.ts (type-only, never exposed)

### Phase 2: Clean Up Index Exports

1. **Fix READY_TIMEOUT_MS export** - Changed from `export type` to `export`
2. **Add missing ElectronAPI interface members** - onIPCError, getErrorBuffer, clearErrorBuffer, etc.
3. **Fix awaitReady signature** - Accept optional options parameter

## Impact

- Reduced IPC surface by removing 2 unused API domains
- Cleaned up 1 orphaned type interface
- Fixed TypeScript errors in ElectronAPI interface
- No breaking changes to existing functionality

<!-- delta:renderer-ipc-standardization -->

## MODIFIED Requirements

### Requirement: ElectronAPI Interface Completeness
The ElectronAPI interface MUST include all methods exposed by the preload script.

**Priority**: P0 (Critical)
**Effort**: S

**Rationale:**
- Type definitions must match actual preload implementations
- Ensures TypeScript compilation succeeds across renderer code
- Prevents runtime errors from missing type definitions

**Implementation:**
```typescript
interface ElectronAPI {
  // Error handling methods
  onIPCError: (handler: (payload: IPCErrorPayload) => void) => () => void;
  getErrorBuffer: () => Promise<BufferedIPCError[]>;
  clearErrorBuffer: () => Promise<{ cleared: boolean }>;

  // System utilities
  awaitReady: (options?: { timeoutMs?: number }) => Promise<SystemReadyPayload>;
  awaitConfigChange: (options?: { timeoutMs?: number }) => Promise<ConfigChangedPayload>;
  // ... other methods
}
```

**Validation:**
- TypeScript compilation succeeds
- No "property does not exist" errors on ElectronAPI
- All preload methods have corresponding type definitions

#### Scenario: AppContent Uses Error Buffer
**Given** Application initializes
**When** AppContent calls `electronAPI.getErrorBuffer()`
**Then** TypeScript compilation succeeds
**And** Method returns buffered errors
**And** No type errors in IDE ✅

---

### Requirement: Unused API Domains Removed
The ElectronAPI interface MUST NOT include domains that have no handler implementations.

**Priority**: P1 (High)
**Effort**: M

**Rationale:**
- Reduces confusion about available functionality
- Prevents calling methods that would fail at runtime
- Keeps type definitions aligned with actual capabilities

**Implementation:**
- ContentAPI removed (no handlers exist)
- AgentsAPI removed (no handlers exist)
- LearningAPI type removed (never exposed)

**Validation:**
- No `content` domain on ElectronAPI
- No `agents` domain on ElectronAPI
- TypeScript compilation succeeds

#### Scenario: Content API Not Available
**Given** Developer tries to use content API
**When** Developer types `electronAPI.content`
**Then** TypeScript shows property does not exist
**And** Developer knows feature not implemented ✅

<!-- /delta -->
