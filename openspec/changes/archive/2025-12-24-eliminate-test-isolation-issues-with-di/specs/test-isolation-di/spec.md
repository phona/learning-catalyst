# Test Isolation via Dependency Injection - Specification

## Purpose
Eliminate test isolation issues (non-deterministic failures, shared mock state, time-dependent tests) by mandating dependency injection patterns and banning module-scope monkey patching.

## ADDED Requirements

### Requirement: All Test Files Use Mandatory Test Setup

All test files MUST include `beforeEach/afterEach` with cleanup and time control.

**Priority**: P0 (Critical)
**Effort**: S
**Validation**: `npm run test:renderer` shows consistent results across runs

#### Scenario: Test File Has Mandatory Setup
**Given** a test file (`.test.ts` or `.test.tsx`)
**When** the test file is executed
**Then** it MUST include `beforeEach` with:
- `vi.clearAllMocks()`
- `vi.resetModules()`
- `vi.useFakeTimers()`
- `vi.setSystemTime(new Date('2020-01-01'))`
**And** it MUST include `afterEach` with:
- `vi.useRealTimers()`

**Implementation**:
```typescript
// ✅ CORRECT
describe('chat-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2020-01-01'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('sends message', async () => {
    // Test logic
  });
});

// ❌ INCORRECT - VIOLATION
describe('chat-service', () => {
  it('sends message', async () => {
    // No setup - WILL FAIL on subsequent runs!
  });
});
```

**Files Affected**:
- All test files in `src/**/__tests__/*.test.ts`
- All test files in `src/**/__tests__/*.test.tsx`

**Validation**:
```bash
npm run test:renderer
# Expected: No test isolation errors
# Expected: Same results when run 3x in a row
```

---

### Requirement: No Module-Scope vi.mock() Calls

Test files MUST NOT use `vi.mock()` at module scope (outside describe/test blocks).

**Priority**: P0 (Critical)
**Effort**: M
**Validation**: Grep finds zero module-scope mocks

#### Scenario: Mock Moved Inside Test Function
**Given** a test file with module-scope `vi.mock()`
**When** refactoring for isolation
**Then** the mock MUST be moved inside the test function or `beforeEach`
**And** MUST use `vi.mocked()` for existing mocks instead

**Implementation**:
```typescript
// ✅ CORRECT - Mock inside test
describe('chat-service', () => {
  it('sends message', async () => {
    vi.mock('@/renderer/services/api/electron-api-client');
    const mockAPI = {
      catalyst: { sendChat: vi.fn().mockResolvedValue({ success: true }) },
    };

    const service = createChatService(mockAPI as ElectronAPI);
    const result = await service.sendMessage('hi', { sessionId: 's1' });

    expect(result).toBeDefined();
  });
});

// ✅ ALSO CORRECT - Use vi.mocked()
describe('chat-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends message', async () => {
    const mockAPI = {
      catalyst: { sendChat: vi.fn().mockResolvedValue({ success: true }) },
    };

    const service = createChatService(mockAPI as ElectronAPI);
    const result = await service.sendMessage('hi', { sessionId: 's1' });

    expect(result).toBeDefined();
  });
});

// ❌ INCORRECT - VIOLATION
vi.mock('@/renderer/services/api/electron-api-client');

describe('chat-service', () => {
  it('sends message', async () => {
    // Mock is global - causes isolation issues!
  });
});
```

**Files to Refactor**:
- `src/renderer/services/chat/__tests__/chat-service.test.ts`
- `src/renderer/features/discovery/ui/__tests__/LocalProjectExplorer.test.tsx`
- `src/renderer/features/config/ui/__tests__/AIProviderSettings.test.tsx`
- All test files with module-scope `vi.mock()`

**Validation**:
```bash
rg "^\s*vi\.mock\(" src --type ts --type tsx
# Expected: Zero results (all mocks are inside tests)
```

---

### Requirement: Services Accept Injectable Dependencies

All service factories MUST accept dependencies as optional parameters with defaults.

**Priority**: P1 (High)
**Effort**: L
**Validation**: Services can be created with injected test doubles

#### Scenario: Chat Service Accepts ID Generator
**Given** the `createChatService` factory
**When** creating a service for testing
**Then** it MUST accept an optional `idGenerator` parameter
**And** MUST use injected generator when provided
**And** MUST use default generator when not provided

**Implementation**:
```typescript
// ✅ CORRECT - Service accepts injectable deps
interface ChatServiceOptions {
  idGenerator?: () => string;
  timeService?: TimeService;
  logger?: Logger;
}

export const createChatService = (
  apiClient: ElectronAPI,
  options: ChatServiceOptions = {}
): ChatService => {
  const generateId = options.idGenerator ?? (() => `msg_${Date.now()}`);
  const timeService = options.timeService ?? createTimeService();
  const logger = options.logger ?? createLogger();

  return {
    sendMessage: async (content, options) => {
      logger.info('Sending message');
      const id = generateId(); // Uses injected generator
      // Use timeService, logger, etc.
    },
  };
};

// ✅ Test - Inject fixed ID generator
test('generates predictable ID', () => {
  const service = createChatService(mockAPI, {
    idGenerator: () => 'm1',
  });

  const result = await service.sendMessage('hi', { sessionId: 's1' });
  expect(result.id).toBe('m1'); // Deterministic!
});

// ✅ Production - Use defaults
const service = createChatService(apiClient); // Uses default ID generator
```

**Files to Update**:
- `src/renderer/services/chat/chat-service.ts`
- `src/renderer/services/session/session-service.ts`
- `src/renderer/services/analytics/analytics-service.ts`
- All service factories

**Validation**:
```bash
npm run test:renderer
# Expected: All service tests pass with injected dependencies
# Expected: No vi.mock() needed for services
```

---

### Requirement: Components Accept Dependencies via Props or Context

All components that use services MUST accept them via props or React Context.

**Priority**: P1 (High)
**Effort**: M
**Validation**: Components can be tested with injected service mocks

#### Scenario: ProviderStatus Accepts Configuration Service
**Given** the `ProviderStatus` component
**When** testing the component
**Then** it MUST accept `configurationService` as a prop
**Or** MUST use React Context DI pattern
**And** MUST NOT directly import services

**Implementation**:
```typescript
// ✅ CORRECT - Props-based DI
interface ProviderStatusProps {
  configurationService: () => ConfigurationService;
}

export const ProviderStatus = ({ configurationService }: ProviderStatusProps) => {
  const config = configurationService(); // Injected dependency
  return <div>Config: {config.status}</div>;
};

// ✅ Test - Inject service directly
test('renders configuration status', () => {
  render(
    <ProviderStatus
      configurationService={() => ({ status: 'ready' })}
    />
  );

  expect(screen.getByText('Config: ready')).toBeInTheDocument();
});

// ✅ ALSO CORRECT - Context-based DI
const ServicesContext = createContext<ServicesContextValue | null>(null);

export const ProviderStatus = () => {
  const config = useConfigurationService(); // From context
  return <div>Config: {config.status}</div>;
};

// ✅ Test - Provide via context
test('renders configuration status', () => {
  render(
    <ServicesProvider services={{ configurationService: () => ({ status: 'ready' }) }}>
      <ProviderStatus />
    </ServicesProvider>
  );

  expect(screen.getByText('Config: ready')).toBeInTheDocument();
});

// ❌ INCORRECT - VIOLATION
import { useConfigurationService } from '@/renderer/services/services-provider';

export const ProviderStatus = () => {
  const config = useConfigurationService(); // Hard-coded import!
  return <div>Config: {config.status}</div>;
};
```

**Files to Update**:
- `src/renderer/features/discovery/ui/ProviderStatus.tsx`
- `src/renderer/features/discovery/ui/LocalProjectExplorer.tsx`
- All components using services

**Validation**:
```bash
npm run test:renderer
# Expected: Components testable without vi.mock()
# Expected: No "No export defined" errors
```

---

### Requirement: Time-Dependent Code Uses Injectable Time Service

All code using `Date.now()` or time operations MUST use an injectable `TimeService`.

**Priority**: P1 (High)
**Effort**: M
**Validation**: Tests control time deterministically

#### Scenario: Chat Service Uses Time Service
**Given** code that generates timestamps or IDs
**When** creating the code
**Then** it MUST use an injectable `TimeService` interface
**And** MUST NOT use `Date.now()` directly
**And** MUST accept `timeService` as optional dependency

**Implementation**:
```typescript
// ✅ CORRECT - Injectable time service
interface TimeService {
  now: () => number;
  format: (date: Date) => string;
}

const createTimeService = (): TimeService => ({
  now: () => Date.now(),
  format: (date) => date.toISOString(),
});

// ✅ Service uses injected time
interface ChatServiceOptions {
  timeService?: TimeService;
}

export const createChatService = (
  apiClient: ElectronAPI,
  options: ChatServiceOptions = {}
): ChatService => {
  const timeService = options.timeService ?? createTimeService();

  return {
    sendMessage: async (content, options) => {
      const timestamp = timeService.now(); // Uses injected time
      return { id: `msg_${timestamp}`, content, timestamp };
    },
  };
};

// ✅ Test - Control time
test('generates deterministic timestamp', () => {
  const service = createChatService(mockAPI, {
    timeService: { now: () => 0, format: () => '2020-01-01' },
  });

  const result = await service.sendMessage('hi', { sessionId: 's1' });
  expect(result.timestamp).toBe(0); // Deterministic!
});

// ❌ INCORRECT - VIOLATION
export const createChatService = (apiClient: ElectronAPI) => {
  return {
    sendMessage: async (content, options) => {
      const timestamp = Date.now(); // Not injectable!
      return { id: `msg_${timestamp}`, content, timestamp };
    },
  };
};
```

**Files to Update**:
- `src/renderer/services/chat/chat-service.ts`
- All files using `Date.now()`
- New: `src/renderer/utils/time-service.ts`

**Validation**:
```bash
rg "Date\.now\(\)" src --type ts --type tsx
# Expected: Zero results (all replaced with TimeService)
```

---

### Requirement: ID Generation Uses Injectable Generator

All code generating IDs MUST use an injectable `IDGenerator` interface.

**Priority**: P1 (High)
**Effort**: S
**Validation**: Tests use fixed IDs

#### Scenario: Chat Service Uses ID Generator
**Given** code that generates IDs
**When** creating the code
**Then** it MUST use an injectable `IDGenerator` interface
**And** MUST accept `idGenerator` as optional dependency
**And** MUST NOT generate IDs with `Date.now()` directly

**Implementation**:
```typescript
// ✅ CORRECT - Injectable ID generator
interface IDGenerator {
  generate: () => string;
}

const createIDGenerator = (): IDGenerator => ({
  generate: () => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    return `msg_${timestamp}_${random}`;
  },
});

// ✅ Service uses injected generator
interface ChatServiceOptions {
  idGenerator?: IDGenerator;
}

export const createChatService = (
  apiClient: ElectronAPI,
  options: ChatServiceOptions = {}
): ChatService => {
  const generateId = options.idGenerator ?? createIDGenerator();

  return {
    sendMessage: async (content, options) => {
      const id = generateId.generate(); // Uses injected generator
      return { id, content };
    },
  };
};

// ✅ Test - Use fixed ID
test('generates predictable ID', () => {
  const service = createChatService(mockAPI, {
    idGenerator: { generate: () => 'm1' },
  });

  const result = await service.sendMessage('hi', { sessionId: 's1' });
  expect(result.id).toBe('m1'); // Deterministic!
});

// ❌ INCORRECT - VIOLATION
export const createChatService = (apiClient: ElectronAPI) => {
  return {
    sendMessage: async (content, options) => {
      const id = `msg_${Date.now()}`; // Not injectable!
      return { id, content };
    },
  };
};
```

**Files to Update**:
- `src/renderer/services/chat/chat-service.ts`
- All files generating IDs
- New: `src/renderer/utils/id-generator.ts`

**Validation**:
```bash
npm run test:renderer
# Expected: Message IDs deterministic in tests
# Expected: Tests pass consistently
```

---

### Requirement: Tests Use Direct Mock Injection, Not Module Mocking

Tests MUST inject mocks directly as parameters, not via `vi.mock()`.

**Priority**: P0 (Critical)
**Effort**: L
**Validation**: Zero module-scope `vi.mock()` calls

#### Scenario: Test Injects Mock API
**Given** a test for a service
**When** setting up test dependencies
**Then** it MUST create mock objects directly
**And** MUST pass them as parameters to the service factory
**And** MUST NOT use `vi.mock()` for service dependencies

**Implementation**:
```typescript
// ✅ CORRECT - Direct mock injection
test('sendMessage calls API', async () => {
  const mockAPI = {
    catalyst: {
      sendChat: vi.fn().mockResolvedValue({
        success: true,
        data: { id: 'm1', role: 'assistant', content: 'hello' },
      }),
    },
  };

  const service = createChatService(mockAPI);
  const result = await service.sendMessage('hi', { sessionId: 's1' });

  expect(mockAPI.catalyst.sendChat).toHaveBeenCalledWith({
    message: 'hi',
    sessionId: 's1',
  });
  expect(result.id).toBe('m1');
});

// ❌ INCORRECT - VIOLATION
vi.mock('@/renderer/services/api/electron-api-client');

test('sendMessage calls API', async () => {
  const service = createChatService({} as ElectronAPI);
  // Depends on global mock - isolation issues!
});
```

**Files to Update**:
- All test files currently using `vi.mock()` for services
- See list in "No Module-Scope vi.mock() Calls" requirement

**Validation**:
```bash
npm run test:renderer
# Expected: All tests pass with direct injection
# Expected: No "No export defined" errors
```

---

### Requirement: E2E Tests Use createIpcPair for IPC Communication

Integration tests MUST use `createIpcPair` from `@/test/utils/fakes/ipc-fake`.

**Priority**: P1 (High)
**Effort**: M
**Validation**: E2E tests use fake IPC, not electron module mocking

#### Scenario: E2E Test Uses Fake IPC
**Given** an E2E test for renderer ↔ main communication
**When** testing IPC calls
**Then** it MUST use `createIpcPair` utility
**And** MUST setup handlers on fake `ipcMain`
**And** MUST bind renderer calls to `ipcRenderer.invoke`
**And** MUST NOT mock the `electron` module

**Implementation**:
```typescript
// ✅ CORRECT - Fake IPC
import { createIpcPair } from '@/test/utils/fakes/ipc-fake';
import { setupChatHandlers } from '@/main/handlers/chat-handlers';

describe('[E2E] Chat Workflow', () => {
  it('sends message via IPC', async () => {
    const { ipcMain, ipcRenderer } = createIpcPair();

    const chatService = {
      sendMessage: vi.fn().mockResolvedValue({ id: 'm1', content: 'hello' }),
    };

    setupChatHandlers(ipcMain, { chatService });

    const electronAPI = {
      catalyst: {
        sendChat: (params) => ipcRenderer.invoke('catalyst:send-chat', params),
      },
    };

    const service = createChatService(electronAPI);
    const result = await service.sendMessage('hi', { sessionId: 's1' });

    expect(chatService.sendMessage).toHaveBeenCalled();
    expect(result.id).toBe('m1');
  });
});

// ❌ INCORRECT - VIOLATION
vi.mock('electron', () => ({
  ipcRenderer: { invoke: vi.fn() },
}));
```

**Files to Create**:
- `src/test/integration/e2e-chat-workflow.test.tsx`
- `src/test/integration/e2e-discovery-workflow.test.tsx`
- `src/test/integration/e2e-provider-config.test.tsx`

**Validation**:
```bash
npm run test:integration
# Expected: E2E tests pass using createIpcPair
# Expected: No electron module mocking
```

---

## MODIFIED Requirements

### Modified from test-patterns spec: Service Hook Mocks Complete All Exports

**OLD**: Test files that mock `services-provider` MUST export ALL hooks

**NEW**: Test files MUST NOT mock `services-provider` at all

**Rationale**: Replacing module mocking with DI makes this requirement obsolete

**Migration**:
- Remove all `vi.mock('@/renderer/services/services-provider')` calls
- Inject services directly via props or context
- Use `renderWithServices` pattern from test-patterns spec

---

## REMOVED Requirements

### Removed: Module-Scope Mocking Pattern

**OLD**: Test files MAY use module-scope `vi.mock()` for complex dependencies

**NEW**: Test files MUST NOT use module-scope `vi.mock()`

**Rationale**: Module-scope mocking causes test isolation issues

**Replacement**: Use dependency injection patterns defined in this spec

---

## Validation Commands

### Check Test Isolation
```bash
# Run tests 3 times and compare results
./scripts/run-tests-3x.sh

# Expected: All 3 runs identical
```

### Check for Module-Scope Mocks
```bash
# Find all module-scope vi.mock() calls
rg "^\s*vi\.mock\(" src --type ts --type tsx

# Expected: Zero results
```

### Check for Date.now() Usage
```bash
# Find direct Date.now() calls
rg "Date\.now\(\)" src --type ts --type tsx

# Expected: Zero results (replaced with TimeService)
```

### Check Test Coverage
```bash
npm run test:coverage

# Expected:
# Overall: >85%
# Main process: >90%
# Renderer: >85%
# Critical modules: >90%
```

### Run Specific Test Suites
```bash
# Renderer tests
npm run test:renderer

# Main process tests
npm run test:main

# Complete test suite
npm run test:complete

# Expected: 100% pass rate for all suites
```

---

## Success Criteria

All requirements MUST be met:

- [ ] All test files have `beforeEach/afterEach` with cleanup and time control
- [ ] Zero module-scope `vi.mock()` calls
- [ ] All services accept injectable dependencies
- [ ] All components accept dependencies via props/context
- [ ] All time-dependent code uses `TimeService`
- [ ] All ID generation uses `IDGenerator`
- [ ] Tests use direct mock injection, not module mocking
- [ ] E2E tests use `createIpcPair`
- [ ] Test pass rate: 100% (renderer and main)
- [ ] Tests deterministic: 3/3 runs identical
- [ ] Test coverage >85% overall, >90% critical modules

---

## Alignment with Existing Specs

This spec **extends** the `test-patterns` specification:

- **test-patterns**: Recommends `renderWithServices` (this spec mandates it)
- **test-patterns**: Recommends DI (this spec makes it required)
- **test-patterns**: Priority migration order (this spec adds isolation requirements)

This spec **replaces** the mock-focused patterns with DI patterns for better test isolation.
