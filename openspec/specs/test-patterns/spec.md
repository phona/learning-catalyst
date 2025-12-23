# test-patterns Specification

## Purpose
TBD - created by archiving change fix-renderer-test-failures-and-refactor. Update Purpose after archive.
## Requirements
### Requirement: All Renderer Component Tests Use renderWithServices

All React component test files MUST use `renderWithServices` instead of manual `vi.mock` for dependency injection.

**Priority**: P0 (Critical)
**Effort**: L

#### Scenario: Component Test Uses renderWithServices
**Given** a React component test file
**When** testing components with dependencies
**Then** the test MUST use `renderWithServices` from `@/test/utils/renderWithServices`
**And** MUST provide `electronAPI` mock with required methods
**And** MUST NOT use manual `vi.mock` for service hooks

**Implementation**:
```typescript
// ✅ CORRECT
import { renderWithServices } from '@/test/utils/renderWithServices';

renderWithServices(<Component />, {
  electronAPI: {
    sessions: { list: vi.fn().mockResolvedValue([]) },
    filesystem: { readDirectory: vi.fn() },
    // ... other required API methods
  },
});

// ❌ INCORRECT - VIOLATION
vi.mock('@/renderer/services/services-provider', () => ({
  useFileService: () => mockFileService,
  useChatService: () => mockChatService,
}));

render(<Component />);
```

**Files Affected**:
- All test files in `src/renderer/**/__tests__/*.test.tsx`
- Specifically: LocalProjectExplorer.test.tsx, DiscoveryPage.behavior.test.tsx, etc.

#### Scenario: ElectronAPI Mock Provides Required Methods
**Given** a test using renderWithServices
**When** the component under test calls electronAPI methods
**Then** the electronAPI mock MUST provide all methods the component needs
**And** methods MAY be mocked with vi.fn()
**And** methods MUST return expected data structures

**Implementation**:
```typescript
const electronAPI = {
  filesystem: {
    readDirectory: vi.fn().mockResolvedValue({ success: true, data: [] }),
    readFile: vi.fn().mockResolvedValue({ success: true, data: { content: '', fileName: '' } }),
    getWorkspacePath: vi.fn().mockResolvedValue({ success: true, data: '/workspace' }),
  },
  sessions: {
    list: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
  },
  // ... other domains
};

renderWithServices(<Component />, { electronAPI });
```

**Validation**:
```bash
npm run test:renderer
# Expected: All tests pass without "No export defined" errors
```

### Requirement: Service Hook Mocks Complete All Exports

Test files that mock `@/renderer/services/services-provider` MUST export ALL hooks that the component imports.

**Priority**: P0 (Critical)
**Effort**: S

#### Scenario: Mock Includes All Required Hooks
**Given** a component that imports service hooks
**When** the test mocks the services-provider module
**Then** the mock MUST export every hook the component imports
**And** missing exports WILL cause test failures

**Component Example**:
```typescript
// Component under test
import { useFileService, useService, useChatService } from '@/renderer/services/services-provider';
```

**Required Mock**:
```typescript
// ✅ CORRECT - All exports present
vi.mock('@/renderer/services/services-provider', () => ({
  useFileService: () => mockFileService,
  useService: (name: string) => mockService,
  useChatService: () => mockChatService,  // Required!
}));

// ❌ INCORRECT - Missing useChatService
vi.mock('@/renderer/services/services-provider', () => ({
  useFileService: () => mockFileService,
  useService: (name: string) => mockService,
  // Missing: useChatService - WILL FAIL!
}));
```

**Files Affected**:
- LocalProjectExplorer.error-toast.test.tsx (missing useChatService)
- AIProviderSettings.test.tsx (audit needed)
- All test files with incomplete mocks

**Validation**:
```bash
npm run test:renderer 2>&1 | grep "No.*export.*defined"
# Expected: No results after fixes
```

### Requirement: Priority Migration Order

Test files MUST migrate to renderWithServices in priority order.

**Priority**: P1 (High)
**Effort**: M

#### Scenario: Priority 1 Tests Migrated First
**Given** the test migration effort
**When** planning migration order
**Then** Priority 1 tests MUST migrate before Priority 2 and 3

**Priority 1 (Critical Components)**:
- LocalProjectExplorer.test.tsx
- LocalProjectExplorer.error-toast.test.tsx
- DiscoveryPage.behavior.test.tsx
- ConceptParsingResults.behavior.test.tsx

**Priority 2 (Core Services)**:
- AIProviderSettings.test.tsx
- SettingsPanel.config.integration.test.tsx
- chat-service.test.ts
- concept-parsing-service.test.ts
- discovery-service.test.ts
- session-service.test.ts
- ProgressPage.test.tsx
- Layout.test.tsx

**Priority 3 (UI Components)**:
- All other test files

**Implementation**:
```typescript
// Migrate in order:
// 1. Complete Phase 1 (emergency mock fixes)
// 2. Migrate Priority 1 tests (Phase 2, Day 1-2)
// 3. Migrate Priority 2 tests (Phase 2, Day 3-4)
// 4. Migrate Priority 3 tests (Phase 2, Day 5)
```

### Requirement: E2E Tests Use createIpcPair

Integration and E2E tests MUST use `createIpcPair` from `@/test/utils/fakes/ipc-fake` for renderer ↔ main communication.

**Priority**: P1 (High)
**Effort**: M

#### Scenario: E2E Test Uses Fake IPC
**Given** an E2E test for user workflows
**When** testing renderer and main process interaction
**Then** the test MUST use `createIpcPair` utility
**And** MUST setup handlers on fake ipcMain
**And** MUST bind renderer calls to ipcRenderer.invoke

**Implementation**:
```typescript
// ✅ CORRECT
import { createIpcPair } from '@/test/utils/fakes/ipc-fake';
import { renderWithServices, screen, waitFor } from '@/test/utils/renderWithServices';

describe('[E2E] Discovery Workflow', () => {
  it('parses selected files', async () => {
    const { ipcMain, ipcRenderer } = createIpcPair();

    setupDiscoveryHandlers(ipcMain, { discoveryService, loggerService });

    const electronAPI = {
      filesystem: {
        readDirectory: (path) => ipcRenderer.invoke('filesystem:read-directory', path),
      },
    };

    renderWithServices(<DiscoveryPage />, { electronAPI });

    // Test workflow...
  });
});

// ❌ INCORRECT - VIOLATION
vi.mock('electron', () => ({
  ipcRenderer: { invoke: vi.fn() }
}));
```

**Files to Create**:
- `src/test/integration/e2e-discovery-workflow.test.tsx`
- `src/test/integration/e2e-concept-parsing.test.tsx`
- `src/test/integration/e2e-provider-config.test.tsx`
- `src/test/integration/e2e-file-exploration.test.tsx`

### Requirement: Test Coverage Targets

Test coverage MUST meet minimum thresholds after migration.

**Priority**: P0 (Critical)
**Effort**: M

#### Scenario: Overall Coverage Above Threshold
**Given** the complete test suite
**When** coverage is measured
**Then** overall coverage MUST be >85%
**And** critical modules MUST have >90% coverage

**Coverage Targets**:
- Overall: >85% (currently ~39%)
- Main process: >90%
- Renderer: >85%
- Critical modules (chat, discovery, knowledge): >90%

**Measurement**:
```bash
npm run test:coverage
# Expected: Overall >85%
# Expected: No critical modules <90%
```

**Modules Requiring Coverage Improvement**:
- Discovery components (currently low)
- Service layers (analytics, catalyst, knowledge)
- Untested hooks (useAsyncState, useQdrant, useSession)
- Barrel files

