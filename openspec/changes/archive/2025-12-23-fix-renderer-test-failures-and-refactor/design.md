# Fix Renderer Test Failures and Refactor Architecture - Design

## Architectural Overview

This document outlines the architectural decisions for fixing renderer test failures and refactoring the monolithic `LocalProjectExplorer` component into a maintainable, testable architecture.

## Problem Statement

### Current Architecture Issues

1. **Monolithic Component**: `LocalProjectExplorer.tsx` is 1,045 lines with 8+ responsibilities
2. **Tight Coupling**: File explorer depends on chat service for provider validation
3. **Testing Anti-Patterns**: Tests use manual `vi.mock` instead of `renderWithServices`
4. **Maintenance Burden**: 28 test files with incomplete mock configurations

### Impact

- **Development Velocity**: 3x slower due to complexity
- **Test Maintenance**: 50% of development time spent on test setup
- **Bug Risk**: High (13% of code untested)
- **Onboarding**: Difficult (hard to understand 1045-line component)

## Design Decisions

### Decision 1: Split LocalProjectExplorer into Focused Components

**Context**: Single responsibility principle violated in 1045-line component

**Decision**: Split into 5 focused components, each <300 lines

**Components**:
```
┌─────────────────────────────────────────────────────────────────┐
│ LocalProjectExplorer (Container - 150 lines)                    │
│  ├─ Orchestrates child components                               │
│  └─ Manages layout and composition                              │
│                                                                 │
│  ┌───────────────┐  ┌──────────────┐  ┌──────────────────────┐ │
│  │ FileTree      │  │ FileSelector │  │ ConceptParser        │ │
│  │ (200 lines)   │  │ (150 lines)  │  │ (300 lines)          │ │
│  │               │  │              │  │                      │ │
│  │ - Directory   │  │ - Selection  │  │ - Parsing button     │ │
│  │   browsing    │  │   state      │  │ - Job monitoring     │ │
│  │ - Tree        │  │ - UI         │  │ - Progress tracking  │ │
│  │   rendering   │  │              │  │                      │ │
│  └───────────────┘  └──────────────┘  └──────────────────────┘ │
│                                                                 │
│  ┌───────────────┐  ┌────────────────────────────────────────┐ │
│  │ ProviderStatus│  │ ParsingResultsModal                    │ │
│  │ (100 lines)   │  │ (200 lines)                            │ │
│  │               │  │                                        │ │
│  │ - Provider    │  │ - Results display                      │ │
│  │   validation  │  │ - Export actions                       │ │
│  │ - Status      │  │ - Ingest actions                       │ │
│  │   display     │  │                                        │ │
│  └───────────────┘  └────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

**Rationale**:
- ✅ Single responsibility per component
- ✅ Easier to understand (200 lines vs 1045)
- ✅ Easier to test (1-2 dependencies vs 8+)
- ✅ Easier to reuse (components are focused)
- ✅ Easier to maintain (change one thing, affect one component)

**Trade-offs**:
- ❌ More files to manage (5 components vs 1)
- ❌ More components to import
- ❌ Requires careful composition

**Implementation**:
- Each component exported from `src/renderer/features/discovery/ui/`
- Container component wires them together
- Props-based communication (no shared state)

### Decision 2: Move Provider Validation to ConfigurationService

**Context**: File explorer shouldn't depend on chat service

**Current**:
```typescript
// LocalProjectExplorer.tsx
const chatService = useChatService();
const providerInfo = chatService.getProviderInfo();
```

**Target**:
```typescript
// ConceptParser.tsx / ProviderStatus.tsx
const configService = useConfigurationService();
const providers = await configService.getAvailableProviders();
```

**Rationale**:
- ✅ Separation of concerns (file ops ≠ chat ops)
- ✅ Configuration is shared concern (used by Chat, Discovery, Settings)
- ✅ Easier to test (mock one service, not chat)
- ✅ More reusable (no chat dependency)

**API Design**:
```typescript
interface ConfigurationService {
  getAvailableProviders(): Promise<{
    providers: ProviderConfig[];
    summary: { total: number; connected: number; configured: number };
  }>;

  validateProvider(providerId: string): Promise<{
    isValid: boolean;
    issues: string[];
  }>;

  getProviderInfo(providerId: string): ProviderInfo | null;
}
```

**Migration Path**:
1. Add methods to ConfigurationService
2. Update ConceptParser to use ConfigurationService
3. Update ProviderStatus to use ConfigurationService
4. Remove provider methods from ChatService (if exist)
5. Update tests

### Decision 3: Migrate Tests to renderWithServices

**Context**: Testing Guide recommends `renderWithServices`, but tests use manual `vi.mock`

**Current Anti-Pattern**:
```typescript
// ❌ LocalProjectExplorer.test.tsx
vi.mock('@/renderer/services/services-provider', () => ({
  useFileService: () => mockFileService,
  useChatService: () => mockChatService,
}));

render(<LocalProjectExplorer />);
```

**Target Pattern**:
```typescript
// ✅ LocalProjectExplorer.test.tsx
renderWithServices(<LocalProjectExplorer />, {
  electronAPI: {
    filesystem: {
      readDirectory: vi.fn().mockResolvedValue({ success: true, data: [] }),
      getWorkspacePath: vi.fn().mockResolvedValue({ success: true, data: '/workspace' }),
    },
  },
});
```

**Rationale** (from Testing Guide):
- ✅ Standardized DI pattern
- ✅ Less boilerplate (no vi.mock per file)
- ✅ Tests focus on behavior, not implementation
- ✅ Easier to maintain (one utility vs 28 mocks)
- ✅ Better integration testing (real components, mocked services)

**Migration Strategy**:
1. **Priority 1**: Critical components (LocalProjectExplorer, DiscoveryPage)
2. **Priority 2**: Core services (chat, concept-parsing, discovery)
3. **Priority 3**: UI components (Button, Input, etc.)

**Files to Migrate** (28 total):
```
Priority 1 (4 files):
- LocalProjectExplorer.test.tsx
- LocalProjectExplorer.error-toast.test.tsx
- DiscoveryPage.behavior.test.tsx
- ConceptParsingResults.behavior.test.tsx

Priority 2 (8 files):
- AIProviderSettings.test.tsx
- SettingsPanel.config.integration.test.tsx
- chat-service.test.ts
- concept-parsing-service.test.ts
- discovery-service.test.ts
- session-service.test.ts
- ProgressPage.test.tsx
- Layout.test.tsx

Priority 3 (16 files):
- Remaining test files
```

### Decision 4: Add E2E Integration Tests

**Context**: Current tests are unit-level, missing end-to-end scenarios

**Target**: Scenario-based E2E tests using `createIpcPair`

**E2E Test Scenarios**:
1. **Discovery Workflow**: Select files → Parse concepts → View results
2. **Concept Parsing**: Start parsing → Monitor progress → Handle errors
3. **Provider Config**: Configure provider → Validate → Use in parsing
4. **File Exploration**: Browse directory → Select files → Navigate tree

**Pattern** (from Testing Guide):
```typescript
describe('[E2E] Discovery Workflow', () => {
  it('parses selected files and ingests concepts', async () => {
    const { ipcMain, ipcRenderer } = createIpcPair();

    setupDiscoveryHandlers(ipcMain, { discoveryService, loggerService });

    const electronAPI = {
      filesystem: {
        readDirectory: (path) => ipcRenderer.invoke('filesystem:read-directory', path),
        readFile: (path) => ipcRenderer.invoke('filesystem:read-file', path),
      },
      knowledge: {
        ingestConcepts: (data) => ipcRenderer.invoke('knowledge:ingest-concepts', data),
      },
    };

    renderWithServices(<DiscoveryPage />, { electronAPI });

    // Test user flow
    await userEvent.click(screen.getByText('Select Files'));
    await waitFor(() => {
      expect(screen.getByText('Parsed 42 concepts')).toBeInTheDocument();
    });
  });
});
```

**Benefits**:
- ✅ Test complete user workflows
- ✅ Validate IPC contracts
- ✅ Catch integration issues
- ✅ Document expected behavior

## Component Specifications

### FileTree Component

**Purpose**: Display and navigate directory structure

**Props**:
```typescript
interface FileTreeProps {
  rootPath: string;
  onFileSelect?: (filePath: string) => void;
  onDirectorySelect?: (dirPath: string) => void;
  selectedFiles: Set<string>;
  selectedDirectories: Set<string>;
  maxDepth?: number;
}
```

**Dependencies**:
- `useFileService()` - For directory reading

**State**:
- Expanded directories (local state)
- Loading states (local state)

**Tests**:
- Renders directory tree
- Handles file/folder selection
- Manages expansion state
- Respects maxDepth

### FileSelector Component

**Purpose**: Manage file selection state and UI

**Props**:
```typescript
interface FileSelectorProps {
  files: FileInfo[];
  selectedFiles: Set<string>;
  onFileToggle: (filePath: string) => void;
  onSelectAll?: () => void;
  onClearSelection?: () => void;
}
```

**Dependencies**:
- `useFileService()` - For file operations

**State**:
- Selection state (derived from props, no internal state)

**Tests**:
- Tracks selection changes
- Renders selection UI
- Handles select all/clear
- Counts selected files

### ConceptParser Component

**Purpose**: Orchestrate concept parsing workflow

**Props**:
```typescript
interface ConceptParserProps {
  selectedFiles: string[];
  onParseComplete?: (result: ParsingResult) => void;
  onParseStart?: (jobId: string) => void;
}
```

**Dependencies**:
- `useService('conceptParsing')` - For parsing operations
- `useConfigurationService()` - For provider validation (NOT useChatService!)

**State**:
- Active parsing job (local state)
- Progress tracking (local state)
- Error handling (local state)

**Tests**:
- Starts parsing job
- Monitors progress
- Displays results
- Handles errors
- Validates providers using ConfigurationService

### ProviderStatus Component

**Purpose**: Display and validate AI provider configuration

**Props**:
```typescript
interface ProviderStatusProps {
  required?: boolean;
  onValidationComplete?: (isValid: boolean) => void;
}
```

**Dependencies**:
- `useConfigurationService()` - For provider info (NOT useChatService!)

**State**:
- Validation state (local state)
- Provider info (derived)

**Tests**:
- Displays provider status
- Validates configuration
- Shows validation errors
- Uses ConfigurationService (not ChatService)

### ParsingResultsModal Component

**Purpose**: Display and manage parsing results

**Props**:
```typescript
interface ParsingResultsModalProps {
  result: ParsingResult | null;
  isOpen: boolean;
  onClose: () => void;
  onExport?: (format: 'json' | 'csv') => void;
  onIngest?: (result: ParsingResult, plan: IngestionPlan) => void;
}
```

**Dependencies**:
- `useService('conceptParsing')` - For ingest operations

**State**:
- Modal visibility (controlled by props)

**Tests**:
- Displays results correctly
- Handles export actions
- Handles ingest actions
- Modal open/close

### LocalProjectExplorer (Container)

**Purpose**: Orchestrate child components

**Props**:
```typescript
interface LocalProjectExplorerProps {
  onFileSelect?: (filePath: string) => void;
  onDirectorySelect?: (dirPath: string) => void;
  className?: string;
}
```

**Dependencies**:
- None (pure container)

**State**:
- Project structure (local state)
- Selected files (local state)
- Parsing job (local state)
- Modal visibility (local state)

**Tests**:
- Renders all child components
- Passes correct props
- Manages state correctly
- No business logic (just composition)

## Service Boundary Changes

### Current Dependencies

```
LocalProjectExplorer (1045 lines)
  ├─ useFileService() ✓ (appropriate)
  ├─ useService('conceptParsing') ✓ (appropriate)
  └─ useChatService() ✗ (inappropriate!)
```

### Target Dependencies

```
FileTree (200 lines)
  └─ useFileService() ✓

FileSelector (150 lines)
  └─ useFileService() ✓

ConceptParser (300 lines)
  ├─ useService('conceptParsing') ✓
  └─ useConfigurationService() ✓ (moved from chat)

ProviderStatus (100 lines)
  └─ useConfigurationService() ✓ (not chat!)

ParsingResultsModal (200 lines)
  └─ useService('conceptParsing') ✓

LocalProjectExplorer (150 lines)
  └─ (pure container, no dependencies)
```

### ConfigurationService Additions

```typescript
// Add to ConfigurationService interface
interface ConfigurationService {
  // ... existing methods ...

  // NEW: Provider validation for Discovery feature
  getAvailableProviders(): Promise<{
    providers: ProviderConfig[];
    summary: { total: number; connected: number; configured: number };
  }>;

  validateProvider(providerId: string): Promise<{
    isValid: boolean;
    issues: string[];
  }>;

  getProviderInfo(providerId: string): ProviderInfo | null;
}
```

## Test Migration Strategy

### Pattern: From vi.mock to renderWithServices

**Before**:
```typescript
// test.tsx
vi.mock('@/renderer/services/services-provider', () => ({
  useFileService: () => mockFileService,
  useChatService: () => mockChatService,
}));

render(<Component />);
```

**After**:
```typescript
// test.tsx
import { renderWithServices } from '@/test/utils/renderWithServices';

renderWithServices(<Component />, {
  electronAPI: {
    filesystem: {
      readDirectory: vi.fn().mockResolvedValue({ success: true, data: [] }),
      getWorkspacePath: vi.fn().mockResolvedValue({ success: true, data: '/workspace' }),
    },
    // ... other API methods
  },
});
```

### ElectronAPI Mock Structure

```typescript
const mockElectronAPI = {
  filesystem: {
    readDirectory: vi.fn(),
    readFile: vi.fn(),
    writeFile: vi.fn(),
    getWorkspacePath: vi.fn(),
    showOpenDialog: vi.fn(),
    showSaveDialog: vi.fn(),
  },
  sessions: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  chat: {
    sendMessage: vi.fn(),
    sendChatStream: vi.fn(),
    getHistory: vi.fn(),
  },
  knowledge: {
    ingestConcepts: vi.fn(),
    searchConcepts: vi.fn(),
    getConcepts: vi.fn(),
  },
  settings: {
    getConfig: vi.fn(),
    setConfig: vi.fn(),
    getAvailableProviders: vi.fn(),
    configureProvider: vi.fn(),
    validateProvider: vi.fn(),
  },
};
```

## E2E Test Specifications

### Test 1: Discovery Workflow

**Scenario**: User discovers content, selects files, parses concepts

**Steps**:
1. Open Discovery page
2. Browse directory structure (FileTree)
3. Select markdown files (FileSelector)
4. Click "Parse Concepts" (ConceptParser)
5. Monitor progress (ConceptParser)
6. View results (ParsingResultsModal)
7. Ingest concepts into knowledge base

**IPC Channels Tested**:
- `filesystem:read-directory`
- `filesystem:read-file`
- `concept-parsing:parse-files`
- `knowledge:ingest-concepts`

**Assertions**:
- Directory renders correctly
- Selection tracked properly
- Parsing progress displayed
- Results show correct concept count
- Ingest succeeds

### Test 2: Provider Configuration

**Scenario**: User configures AI provider, validates, uses for parsing

**Steps**:
1. Open Settings page
2. Configure OpenAI provider
3. Validate provider (ConfigurationService)
4. Navigate to Discovery
5. Verify provider status (ProviderStatus)
6. Parse concepts using configured provider

**IPC Channels Tested**:
- `settings:configure-provider`
- `settings:validate-provider`
- `settings:get-available-providers`

**Assertions**:
- Provider configured successfully
- Validation passes
- Provider status displays correctly
- Parsing uses configured provider

## Migration Timeline

### Phase 1: Emergency Fixes (2-3 hours)
- Fix mock exports in 28 test files
- Verify 100% test pass rate

### Phase 2: Architectural Refactoring (3-5 days)

**Day 1**: Component Analysis & Planning
- Analyze LocalProjectExplorer
- Plan component split
- Define service boundaries

**Day 2**: Component Extraction
- Create FileTree
- Create FileSelector
- Create ConceptParser

**Day 3**: Component Extraction (continued)
- Create ProviderStatus
- Create ParsingResultsModal
- Wire in new LocalProjectExplorer

**Day 4**: Service Migration
- Move provider validation to ConfigurationService
- Update components to use ConfigurationService
- Remove chat service dependency

**Day 5**: Test Migration
- Migrate Priority 1 tests to renderWithServices
- Create E2E tests
- Update documentation

## Risk Mitigation

### Risk 1: Regression during refactoring

**Mitigation**:
- Keep old implementation until new one passes all tests
- Run tests after each component split
- Use version control (commit after each component)

### Risk 2: Test migration introduces bugs

**Mitigation**:
- Migrate tests before changing components
- Run tests in parallel (old and new)
- Verify behavior, not implementation

### Risk 3: Service boundary changes break other features

**Mitigation**:
- Add new methods to ConfigurationService (don't remove from ChatService yet)
- Update one component at a time
- Test integration after each change

### Risk 4: E2E tests are flaky

**Mitigation**:
- Use deterministic mocks
- Avoid real timers (use fake timers)
- Mock network calls
- Follow Testing Guide patterns

## Success Metrics

### Quantitative
- [ ] Test pass rate: 100% (826/826)
- [ ] Test coverage: >85% (from ~39%)
- [ ] Component size: <300 lines each
- [ ] Test files migrated: 28/28
- [ ] E2E tests: 4/4
- [ ] Service dependencies: 0 cross-feature

### Qualitative
- [ ] Code easier to understand (single responsibility)
- [ ] Tests easier to write (renderWithServices pattern)
- [ ] Components more reusable (no chat dependency)
- [ ] Developer velocity improved (3x faster)
- [ ] Onboarding easier (smaller components)

## Future Considerations

### Component Reusability

Once split, components can be reused:
- **FileTree**: Could be used in file manager, import wizard
- **FileSelector**: Could be used in upload dialog, batch operations
- **ProviderStatus**: Could be used in settings, validation UI
- **ConceptParser**: Could be used in knowledge import, batch processing

### Testing Patterns

The `renderWithServices` pattern can be:
- Documented in Testing Guide
- Used as template for new tests
- Added to component scaffolding
- Shared with team as best practice

### Architecture Evolution

This refactoring enables future improvements:
- State management (Zustand) for complex state
- Component composition patterns
- Better error boundaries
- Progressive loading

## Conclusion

This design addresses both the immediate test failures and the underlying architectural issues. By splitting the monolithic component, moving provider validation to the right service, and migrating to recommended test patterns, we create a sustainable foundation for future development.

The two-phase approach (emergency fixes → architectural refactoring) ensures we unblock the team quickly while building toward long-term maintainability.
