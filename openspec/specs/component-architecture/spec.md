# component-architecture Specification

## Purpose
TBD - created by archiving change fix-renderer-test-failures-and-refactor. Update Purpose after archive.
## Requirements
### Requirement: LocalProjectExplorer Split into Focused Components

The `LocalProjectExplorer` component MUST be split into 5 focused components, each with single responsibility and <300 lines.

**Priority**: P0 (Critical)
**Effort**: XL

#### Scenario: FileTree Component Extracted
**Given** directory browsing functionality
**When** extracting from LocalProjectExplorer
**Then** a FileTree component MUST be created
**And** it MUST handle directory browsing and tree rendering
**And** it MUST be <250 lines
**And** it MUST use `useFileService()` only

**File Location**:
```
src/renderer/features/discovery/ui/FileTree.tsx
```

**Responsibilities**:
- Directory browsing
- Tree node rendering
- Expansion state management
- File/folder icon display

**Dependencies**:
```typescript
// ✅ CORRECT
import { useFileService } from '@/renderer/services/services-provider';

// ❌ INCORRECT
import { useChatService } from '@/renderer/services/services-provider';
```

**Interface**:
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

**Validation**:
```bash
wc -l src/renderer/features/discovery/ui/FileTree.tsx
# Expected: <250 lines
```

#### Scenario: FileSelector Component Extracted
**Given** file selection functionality
**When** extracting from LocalProjectExplorer
**Then** a FileSelector component MUST be created
**And** it MUST handle selection state management
**And** it MUST be <200 lines
**And** it MUST use `useFileService()` only

**File Location**:
```
src/renderer/features/discovery/ui/FileSelector.tsx
```

**Responsibilities**:
- Selection state management
- Selected files tracking
- Selection UI rendering
- Select all/clear functionality

**Dependencies**:
```typescript
import { useFileService } from '@/renderer/services/services-provider';
```

**Interface**:
```typescript
interface FileSelectorProps {
  files: FileInfo[];
  selectedFiles: Set<string>;
  onFileToggle: (filePath: string) => void;
  onSelectAll?: () => void;
  onClearSelection?: () => void;
}
```

#### Scenario: ConceptParser Component Extracted
**Given** concept parsing functionality
**When** extracting from LocalProjectExplorer
**Then** a ConceptParser component MUST be created
**And** it MUST handle parsing orchestration
**And** it MUST be <350 lines
**And** it MUST use `useService('conceptParsing')` and `useConfigurationService()`

**File Location**:
```
src/renderer/features/discovery/ui/ConceptParser.tsx
```

**Responsibilities**:
- Parse button and orchestration
- Job monitoring
- Progress tracking
- Error handling

**Dependencies**:
```typescript
// ✅ CORRECT
import { useService, useConfigurationService } from '@/renderer/services/services-provider';

// ❌ INCORRECT
import { useChatService } from '@/renderer/services/services-provider';
```

**Interface**:
```typescript
interface ConceptParserProps {
  selectedFiles: string[];
  onParseComplete?: (result: ParsingResult) => void;
  onParseStart?: (jobId: string) => void;
}
```

**Critical**: MUST use ConfigurationService for provider validation, NOT ChatService!

#### Scenario: ProviderStatus Component Extracted
**Given** AI provider validation functionality
**When** extracting from LocalProjectExplorer
**Then** a ProviderStatus component MUST be created
**And** it MUST handle provider validation and status display
**And** it MUST be <150 lines
**And** it MUST use `useConfigurationService()` only

**File Location**:
```
src/renderer/features/discovery/ui/ProviderStatus.tsx
```

**Responsibilities**:
- AI provider validation
- Provider info display
- Configuration status checks

**Dependencies**:
```typescript
// ✅ CORRECT
import { useConfigurationService } from '@/renderer/services/services-provider';

// ❌ INCORRECT
import { useChatService } from '@/renderer/services/services-provider';
```

**Interface**:
```typescript
interface ProviderStatusProps {
  required?: boolean;
  onValidationComplete?: (isValid: boolean) => void;
}
```

**Critical**: MUST NOT depend on ChatService!

#### Scenario: ParsingResultsModal Component Extracted
**Given** results modal functionality
**When** extracting from LocalProjectExplorer
**Then** a ParsingResultsModal component MUST be created
**And** it MUST handle results display and actions
**And** it MUST be <250 lines
**And** it MUST use `useService('conceptParsing')`

**File Location**:
```
src/renderer/features/discovery/ui/ParsingResultsModal.tsx
```

**Responsibilities**:
- Results display
- Export functionality
- Ingest actions
- Modal open/close

**Dependencies**:
```typescript
import { useService } from '@/renderer/services/services-provider';
```

**Interface**:
```typescript
interface ParsingResultsModalProps {
  result: ParsingResult | null;
  isOpen: boolean;
  onClose: () => void;
  onExport?: (format: 'json' | 'csv') => void;
  onIngest?: (result: ParsingResult, plan: IngestionPlan) => void;
}
```

#### Scenario: New LocalProjectExplorer Container Component
**Given** the split components
**When** creating new LocalProjectExplorer
**Then** it MUST be a pure container component
**And** it MUST be <200 lines
**And** it MUST wire child components together
**And** it MUST NOT contain business logic

**File Location**:
```
src/renderer/features/discovery/ui/LocalProjectExplorer.tsx (new)
```

**Responsibilities**:
- Component composition
- State management (passed to children)
- Layout and orchestration

**Dependencies**:
```typescript
// ✅ CORRECT - Pure container, no service dependencies
import { FileTree } from './FileTree';
import { FileSelector } from './FileSelector';
import { ConceptParser } from './ConceptParser';
import { ProviderStatus } from './ProviderStatus';
import { ParsingResultsModal } from './ParsingResultsModal';

// ❌ INCORRECT
import { useChatService } from '@/renderer/services/services-provider';
```

**Validation**:
```bash
wc -l src/renderer/features/discovery/ui/LocalProjectExplorer.tsx
# Expected: <200 lines (container only)
```

### Requirement: Provider Validation in ConfigurationService

AI provider validation logic MUST be in `ConfigurationService`, not `ChatService`.

**Priority**: P0 (Critical)
**Effort**: M

#### Scenario: ConfigurationService Has Provider Validation
**Given** Discovery feature needs provider validation
**When** accessing provider information
**Then** it MUST use `ConfigurationService`
**And** ConfigurationService MUST provide provider validation methods

**API Design**:
```typescript
interface ConfigurationService {
  // ... existing methods ...

  // NEW: Provider validation for Discovery
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

**Implementation**:
```typescript
// src/renderer/services/configuration/configuration-service.ts

async getAvailableProviders() {
  const response = await unwrapAPI(apiClient.settings.getAvailableProviders());
  return {
    providers: response.providers || [],
    summary: {
      total: response.providers?.length || 0,
      connected: response.summary?.connected || 0,
      configured: response.summary?.configured || 0,
    },
  },
}

async validateProvider(providerId: string) {
  // Validate provider configuration
  const config = await this.getConfig();
  const provider = config?.ai?.providers?.[providerId];

  if (!provider) {
    return { isValid: false, issues: ['Provider not configured'] };
  }

  const issues = [];
  if (!provider.apiKey) issues.push('Missing API key');
  if (!provider.model) issues.push('Missing model');

  return { isValid: issues.length === 0, issues };
}

getProviderInfo(providerId: string): ProviderInfo | null {
  // Return provider info for UI display
  return {
    id: providerId,
    name: provider.name,
    type: provider.type,
    // ... other info
  };
}
```

**Usage in Components**:
```typescript
// ✅ CORRECT - ConceptParser.tsx
const configService = useConfigurationService();
const providers = await configService.getAvailableProviders();

// ✅ CORRECT - ProviderStatus.tsx
const configService = useConfigurationService();
const validation = await configService.validateProvider(providerId);

// ❌ INCORRECT - Don't use ChatService
const chatService = useChatService();
const providerInfo = chatService.getProviderInfo(); // NO!
```

### Requirement: Service Dependency Boundaries

Components MUST NOT have cross-feature dependencies.

**Priority**: P0 (Critical)
**Effort**: M

#### Scenario: No Chat Service in Discovery Feature
**Given** Discovery feature components
**When** accessing services
**Then** they MUST NOT import or use `useChatService()`
**And** they MUST use shared services only

**Allowed Dependencies**:
```
FileTree:
  └─ useFileService() ✓

FileSelector:
  └─ useFileService() ✓

ConceptParser:
  ├─ useService('conceptParsing') ✓
  └─ useConfigurationService() ✓

ProviderStatus:
  └─ useConfigurationService() ✓

ParsingResultsModal:
  └─ useService('conceptParsing') ✓

LocalProjectExplorer (container):
  └─ (no dependencies) ✓
```

**Forbidden Dependencies**:
```
Any Discovery Component:
  ✗ useChatService() - Chat is a different feature!
  ✗ useAnalyticsService() - Analytics is separate
  ✗ useSessionService() - Sessions are separate
```

**Validation**:
```bash
grep -r "useChatService" src/renderer/features/discovery/ --include="*.tsx"
# Expected: No results

grep -r "useAnalyticsService" src/renderer/features/discovery/ --include="*.tsx"
# Expected: No results
```

### Requirement: Component Size Limits

All components MUST adhere to size limits to ensure maintainability.

**Priority**: P1 (High)
**Effort**: S

#### Scenario: Components Under Size Limit
**Given** extracted components
**When** measuring line count
**Then** each component MUST be under its size limit

**Size Limits**:
- FileTree: <250 lines
- FileSelector: <200 lines
- ConceptParser: <350 lines
- ProviderStatus: <150 lines
- ParsingResultsModal: <250 lines
- LocalProjectExplorer (container): <200 lines

**Validation**:
```bash
# Check component sizes
wc -l src/renderer/features/discovery/ui/FileTree.tsx
wc -l src/renderer/features/discovery/ui/FileSelector.tsx
wc -l src/renderer/features/discovery/ui/ConceptParser.tsx
wc -l src/renderer/features/discovery/ui/ProviderStatus.tsx
wc -l src/renderer/features/discovery/ui/ParsingResultsModal.tsx
wc -l src/renderer/features/discovery/ui/LocalProjectExplorer.tsx

# Expected: All under limits
```

### Requirement: Barrel Exports

Each component directory MUST have barrel exports.

**Priority**: P2 (Medium)
**Effort**: S

#### Scenario: Barrel Exports in Discovery UI
**Given** split components
**When** importing components
**Then** barrel exports MUST be available

**Implementation**:
```typescript
// src/renderer/features/discovery/ui/index.ts
export { FileTree } from './FileTree';
export { FileSelector } from './FileSelector';
export { ConceptParser } from './ConceptParser';
export { ProviderStatus } from './ProviderStatus';
export { ParsingResultsModal } from './ParsingResultsModal';
export { LocalProjectExplorer } from './LocalProjectExplorer';
```

**Usage**:
```typescript
// ✅ CORRECT - Clean imports
import { FileTree, ConceptParser } from '@/renderer/features/discovery/ui';

// ❌ INCORRECT - Multiple imports
import { FileTree } from '@/renderer/features/discovery/ui/FileTree';
import { ConceptParser } from '@/renderer/features/discovery/ui/ConceptParser';
```

