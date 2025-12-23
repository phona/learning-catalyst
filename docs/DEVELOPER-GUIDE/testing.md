# Testing Developer Guide

This project is split into two Vitest targets: **main process** (Electron background) and **renderer** (React). Use these scripts from repo root.

## Core commands
- `npm test` — runs main then renderer suites.
- `npm run test:main` / `npm run test:renderer` — scope to one target.
- `npm run test:main:file -- src/main/__tests__/foo.test.ts` — run a single main test file.
- `npm run test:renderer:file -- src/renderer/hooks/__tests__/bar.test.tsx` — single renderer file.
- `npm run test:coverage` — full coverage (main + renderer). Report prints to console.
- `npm run test:main:ui` / `npm run test:renderer:ui` — Vitest UI if you prefer a browser view.

## Scope guidelines
- **Unit**: pure helpers and hooks (e.g., `useRecentSessions`, toast utils). No IPC, no DOM if possible.
- **Contract/IPC**: main-process handlers (`src/main/__tests__/*contract.test.ts`) use injected/mocked Electron IPC.
- **Renderer integration (no Electron boot)**: renderer hooks/components talk to fakes (`src/test/utils/fakes/ipc-fake.ts`, `createMockElectronAPIClient`). Use `createIpcPair` to bridge renderer and main handlers for end-to-end flows while keeping Electron startup out of tests.
- **Behavior UI tests**: components rendered via Testing Library with service/provider stubs in `@/test/utils`.

## Fakes and test utilities
- `src/test/utils/fakes/ipc-fake.ts` — fake IPC bridge to pair renderer calls with main handlers.
- `@/renderer/services/api/electron-api-client` — has mock client factory for renderer tests.
- `renderWithServices` (in `@/test/utils/renderWithServices`) — injects mocked services/electronAPI.

## When to choose which suite
```
Main handler change  -> test:main or specific contract test
Renderer hook change -> test:renderer or renderer:file
Cross IPC path       -> renderer IPC integration test + main contract test
```

## Coverage expectations
- Current overall (v8) ~39% statements; focus improvements on low areas: Discovery components, service layers (analytics/catalyst/knowledge), untested hooks (useAsyncState/useQdrant/useSession), and barrel files.
- Use `npm run test:coverage` to verify gains.

## Repository rules (reminders)
- Default workflow: `npm test` and `npm lint` after JS/TS changes (lint can be skipped only if explicitly requested).
- Document public utilities when behavior changes (`CLAUDE.md`, `docs/`).
- In WSL2 use `pwsh.exe` to run npm scripts.

## Tips for fast feedback
- Prefer targeted scripts (`test:main:file`, `test:renderer:file`) while iterating.
- Keep Electron out of tests; rely on fakes/mocks.
- **Keep tests deterministic: avoid real timers/network; inject controlled time.**
- **Use dependency injection instead of module-scope mocking** for better test isolation.
- **Run tests 3x in a row** to verify determinism before committing.

## Troubleshooting

### Test Isolation Issues

**Tests pass/fail inconsistently across runs:**
- ✅ **Solution**: Add `beforeEach/afterEach` with `vi.clearAllMocks()`, `vi.resetModules()`, `vi.useFakeTimers()`
- ✅ **Verify**: Run tests 3x in a row - should get identical results

**"No export defined" errors:**
- ✅ **Cause**: Module-scope `vi.mock()` incomplete or missing exports
- ✅ **Solution**: Replace with dependency injection (pass dependencies as props/parameters)
- ✅ **Alternative**: Use `renderWithServices` for complex component trees

**Time-dependent test failures:**
- ✅ **Cause**: Tests use `Date.now()` directly
- ✅ **Solution**: Use injectable `TimeService` and `vi.setSystemTime()` in tests
- ✅ **Verify**: All time-based assertions use controlled time

**Mock configuration errors:**
- ✅ **Cause**: Module-scope mocking causing global state contamination
- ✅ **Solution**: Move mocks inside test functions, inject dependencies directly
- ✅ **Pattern**: Create mock objects and pass to service factories

### Common DI Problems

**Service doesn't accept dependencies:**
- ✅ **Solution**: Refactor service factory to accept optional dependency parameters
- ✅ **Pattern**: `createService(apiClient, options: ServiceOptions = {})`

**Component hard-codes dependencies:**
- ✅ **Solution**: Accept dependencies via props or React Context
- ✅ **Pattern**: `<Component service={injectedService} />`

**Tests still use module-scope mocking:**
- ✅ **Solution**: Replace with direct mock injection
- ✅ **Pattern**: `const service = createService(mockAPI, { idGenerator: () => 'test' })`

### General Issues

**Coverage not printing?**
- Ensure `--coverage` is used (already wired in `*:coverage` scripts).

**esbuild warnings (e.g., duplicate class members) show during coverage;**
- Fix in source or ignore if expected.

**Tests timeout on async operations:**
- ✅ **Solution**: Use `vi.useFakeTimers()` and `vi.advanceTimersByTime()` for deterministic async testing

**IPC errors in tests:**
- ✅ **Solution**: Use `createIpcPair` for integration tests instead of mocking electron module

## Test Strategy

- Approach: shift-left, risk-based, automation-first. Tests live close to code and run in CI on every PR. Prioritize high-risk surfaces: IPC handlers, data services, critical UI flows.
- Test levels and targets:
  - Unit testing — target ≥80% coverage for core helpers, hooks, and services. Measure with `npm run test:coverage` and focus on lines/branches for units.
  - Integration testing — validate API contracts across renderer↔main boundaries using fakes/mocks and contract tests. Ensure channel names, payload shapes, and error codes match `docs/DEVELOPER-GUIDE/electron-api.md`.
  - System testing — end-to-end workflows simulated without booting Electron by composing renderer components/hooks with stubbed services (see `@/test/setup/integration`). Cover key flows: session start, chat exchange, saving checkpoints, analytics panels.

### Test Environment Requirements

- Hardware: 8GB+ RAM, 4 CPU cores recommended for parallel Vitest runs.
- Software:
  - Node.js ≥ 18 (see `docs/GETTING-STARTED.md` troubleshooting).
  - npm ≥ 9, Git, PowerShell (Windows) or a POSIX shell.
  - OS: Windows/macOS/Linux. In WSL2 use `pwsh.exe` for npm scripts.
- Environment setup:
  - `npm install`
  - `npm run test:renderer` / `npm run test:main` for quick checks
  - `npm run test:integration` for cross-process paths (see `CLAUDE.md`)
  - Optional: `npm run test:renderer:ui` or `npm run test:main:ui` for Vitest UI
- Test data requirements:
  - Use factories and mocks under `src/test/utils` and `src/test/setup/*` to generate deterministic data: sessions, concepts, analytics metrics.
  - Avoid real network, filesystem, or provider calls. Use `createMockElectronAPI`, mock DB factories, and provider mocks (e.g., `src/test/mocks/langchain-providers.mock.ts`).
- Configuration procedures:
  - `NODE_ENV` is set by Vitest; tests assume `process.env.NODE_ENV === 'test'`.
  - Do not require real API keys. If code reads env vars, inject safe placeholders via test setup files in `src/test/setup`.

### Test Data Management Guidelines

- Data creation/refresh:
  - Prefer factory methods and scenario builders (e.g., `test-database-factory.ts#createScenario('empty'|'full')`).
  - Keep fixtures minimal and derive data in test setup to reduce drift.
- Data masking:
  - Never store real secrets in test data. Replace with masked tokens (e.g., `sk-test-xxxxx`).
  - Sanitize logs and snapshots to exclude sensitive content.
- Version control:
  - Version fixtures and scenario definitions under `src/test/**`. Reference them from test cases using the case ID.
  - Update tests when API contracts change; link PRs to affected test case IDs.

## Test Cases

Use the template below per feature/component. Keep cases small, deterministic, and automation-first.

### Test Case Metadata

| Field | Value |
| --- | --- |
| Case ID | `[TC-XXX]` |
| Title | Short, action-oriented description |
| Component/Feature | e.g., `StudyStreak` / Analytics |
| Preconditions | Environment, data state, mocks configured |
| Priority | `P0` · `P1` · `P2` · `P3` |
| Severity | `Critical` · `High` · `Medium` · `Low` |
| Requirements | Link to user story or spec (e.g., `docs/DEVELOPER-GUIDE/architecture.md`) |

### Step-by-Step Procedure

| Step | Action | Expected Result | Actual Result |
| --- | --- | --- | --- |
| 1 | Render component with props | Component mounts without errors | (runtime) |
| 2 | Trigger user action | UI updates reflect state change | (runtime) |
| 3 | Verify output/state | Assertions pass; no warnings/errors | (runtime) |

### Pass/Fail Criteria

- All assertions pass; no console errors/warnings; coverage thresholds met for unit tests on touched code.
- Measurable thresholds: 0 failing tests, <1% snapshot drift, unit coverage ≥80% for modified helpers/hooks.

### Example (Renderer Unit)

```tsx
// [TC-101] StudyStreak displays correct streak value (emoji-free)
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { StudyStreak } from '@/renderer/components/Analytics/StudyStreak';

const mockDate = new Date('2024-01-15T10:00:00Z');
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(mockDate); });
afterEach(() => { vi.useRealTimers(); });

describe('[TC-101] StudyStreak value display', () => {
  it('renders label and count for 1 day', () => {
    render(<StudyStreak streakDays={1} />);
    expect(screen.getByText('Study Streak')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('days in a row')).toBeInTheDocument();
  });
  it('renders label and count for 5 days', () => {
    render(<StudyStreak streakDays={5} />);
    expect(screen.getByText('Study Streak')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('days in a row')).toBeInTheDocument();
  });
});
```

### Example (Main Contract)

```ts
import { describe, it, expect } from 'vitest';
import { createIpcPair } from '@/test/utils/fakes/ipc-fake';
import { setupLearningHandlers } from '@/main/handlers/learning-handlers';

describe('[TC-202] learning:get-path contract', () => {
  it('returns learning path result', async () => {
    const { ipcMain, ipcRenderer } = createIpcPair();

    const learningService = {
      getLearningPath: async (id: string) => ({ id, title: 'Saved Path' }),
      startLearningSession: async () => ({}),
      getSessionProgress: async () => ({}),
      pauseSession: async () => ({}),
      resumeSession: async () => ({}),
      completeSession: async () => ({}),
      getRecentSessions: async () => [],
      searchSessions: async () => ({ sessions: [], total: 0 }),
    } as any;

    const loggerService = { child: () => ({ info() {}, warn() {}, error() {}, debug() {} }) } as any;

    setupLearningHandlers(ipcMain, { learningService, loggerService });

    const res = await ipcRenderer.invoke('learning:get-path', 'path-123');
    expect(res.success).toBe(true);
    expect(res.data?.title).toContain('Saved');
  });
});
```

### Example (Renderer + Main E2E via Fake IPC for learning:get-path)

```ts
import { describe, it, expect } from 'vitest';
import { createIpcPair } from '@/test/utils/fakes/ipc-fake';
import { setupLearningHandlers } from '@/main/handlers/learning-handlers';
import { createElectronAPIClient } from '@/renderer/services/api/electron-api-client';

describe('[TC-204] renderer↔main learning:get-path', () => {
  it('wires renderer and main using fake IPC', async () => {
    const { ipcMain, ipcRenderer } = createIpcPair();

    const learningService = {
      getLearningPath: async (id: string) => ({ id, title: 'Saved Path' }),
      startLearningSession: async () => ({}),
      getSessionProgress: async () => ({}),
      pauseSession: async () => ({}),
      resumeSession: async () => ({}),
      completeSession: async () => ({}),
      getRecentSessions: async () => [],
      searchSessions: async () => ({ sessions: [], total: 0 }),
    } as any;

    const loggerService = { child: () => ({ info() {}, warn() {}, error() {}, debug() {} }) } as any;
    setupLearningHandlers(ipcMain, { learningService, loggerService });

    (window as any).electronAPI = {
      learning: {
        getLearningPath: (pathId: string) => ipcRenderer.invoke('learning:get-path', pathId),
      },
    };

    const client = createElectronAPIClient();
    const res = await client.learning.getLearningPath('path-123');
    expect(res.success).toBe(true);
    expect(res.data?.title).toContain('Saved');
  });
});
```

### Example (Renderer + Main E2E via Fake IPC)

```ts
import { describe, it, expect } from 'vitest';
import { createIpcPair } from '@/test/utils/fakes/ipc-fake';
import { setupLearningHandlers } from '@/main/handlers/learning-handlers';
import { createElectronAPIClient } from '@/renderer/services/api/electron-api-client';

describe('[TC-203] renderer↔main learning:get-recent-sessions', () => {
  it('bridges renderer and main using fake IPC', async () => {
    const { ipcMain, ipcRenderer } = createIpcPair();

    const learningService = {
      getRecentSessions: async () => [{ id: 's1', title: 'Test Session', status: 'active' }],
      startLearningSession: async () => ({}),
      getLearningPath: async () => ({}),
      getSessionProgress: async () => ({}),
      pauseSession: async () => ({}),
      resumeSession: async () => ({}),
      completeSession: async () => ({}),
      searchSessions: async () => ({ sessions: [], total: 0 }),
    } as any;

    const loggerService = { child: () => ({ info() {}, warn() {}, error() {}, debug() {} }) } as any;
    setupLearningHandlers(ipcMain, { learningService, loggerService });

    (window as any).electronAPI = {
      learning: {
        getRecentSessions: (opts?: any) => ipcRenderer.invoke('learning:get-recent-sessions', opts),
      },
    };

    const client = createElectronAPIClient();
    const res = await client.learning.getRecentSessions({ limit: 5 });
    expect(res.success).toBe(true);
    expect(res.data?.[0].id).toBe('s1');
  });
});
```

### Scenario-Based UI E2E (Renderer + Main via Fake IPC)

- Organize E2E tests by user scenarios rather than single components. Suggested categories:
  - Session Lifecycle: start, progress, complete, recent sessions listing
  - Chat Workflow: send message, stream updates, save transcript
  - Analytics Overview: dashboard load, progress charts, streaks and trends
  - Settings & Providers: provider configuration, validation, model discovery

Place tests under `src/test/integration/` with scenario-based filenames, for example:

```
src/test/integration/
├── e2e-session-lifecycle.test.tsx
├── e2e-chat-workflow.test.tsx
├── e2e-analytics-overview.test.tsx
└── e2e-settings-provider-config.test.tsx
```

#### Example Scenario: Session Lifecycle (UI + Fake IPC)

```tsx
import React from 'react';
import { describe, it, expect } from 'vitest';
import userEvent from '@testing-library/user-event';
import { createIpcPair } from '@/test/utils/fakes/ipc-fake';
import { setupLearningHandlers } from '@/main/handlers/learning-handlers';
import { renderWithServices, screen, waitFor } from '@/test/utils/renderWithServices';

// Component under test
import { LearningDashboard } from '@/renderer/components/Dashboard/LearningDashboard';

describe('[E2E Scenario] Session Lifecycle: load recent sessions and start flow', () => {
  it('loads sessions via fake IPC and starts a session from the UI', async () => {
    const { ipcMain, ipcRenderer } = createIpcPair();

    const learningService = {
      getRecentSessions: async () => [
        { id: 's1', title: 'Intro to React', status: 'completed' },
        { id: 's2', title: 'Async Patterns', status: 'active' },
      ],
      startLearningSession: async (params: any) => ({ id: 's3', title: params?.topic ?? 'New', status: 'active' }),
      getLearningPath: async () => ({}),
      getSessionProgress: async () => ({ completionPercentage: 0 }),
      pauseSession: async () => ({}),
      resumeSession: async () => ({}),
      completeSession: async () => ({}),
      searchSessions: async () => ({ sessions: [], total: 0 }),
    } as any;

    const loggerService = { child: () => ({ info() {}, warn() {}, error() {}, debug() {} }) } as any;
    setupLearningHandlers(ipcMain, { learningService, loggerService });

    const electronAPI = {
      learning: {
        getRecentSessions: (opts?: any) => ipcRenderer.invoke('learning:get-recent-sessions', opts),
        startLearningSession: (params: any) => ipcRenderer.invoke('learning:start-session', params),
      },
    } as any;

    renderWithServices(<LearningDashboard />, { electronAPI });

    // Verify recent sessions list renders
    await waitFor(() => {
      expect(screen.getByText('Intro to React')).toBeTruthy();
      expect(screen.getByText('Async Patterns')).toBeTruthy();
    });

    // Start a new session via UI action
    const startButton = screen.getByRole('button', { name: /start session/i });
    await userEvent.click(startButton);

    // Confirm UI reflects an active session (example assertion; adapt to component text)
    await waitFor(() => {
      expect(screen.getByText(/session started/i)).toBeTruthy();
    });
  });
});
```

Notes:

- For multi-domain scenarios (e.g., chat + learning + analytics), bind multiple domain calls to `ipcRenderer.invoke('<domain:method>', ...)` as needed.
- Use `renderWithServices` to pass a scenario-specific `electronAPI` while preserving app providers.
- Prefer `userEvent` for realistic user interactions; avoid real timers and network.

## Test Execution

### Workflow

- Planning: define test cycles per milestone/sprint; select features with highest risk and user impact.
- Scheduling: prioritize `P0/P1` cases for regression on each PR; `P2/P3` for weekly runs.
- Assignment: code owners of affected modules own authoring; reviewers validate coverage and determinism.
- Status tracking: `Not Run` · `Pass` · `Fail` · `Blocked`. Track in PR checklist or issue templates; link Case IDs.

### Defect Reporting

- Required fields:
  - Title, Description, Steps to Reproduce, Expected vs Actual, Environment, Logs/Screenshots, Severity, Priority, Linked Case IDs, Affected Version.
- Lifecycle:
  - `New` → `Triaged` → `In Progress` → `Fixed` → `Retested` → `Closed` (or `Reopened`).
- Suggested format (Issue template):

| Field | Content |
| --- | --- |
| Summary | Brief description |
| Steps | 1) … 2) … 3) … |
| Expected | Clear outcome |
| Actual | Observed result |
| Severity/Priority | e.g., High/P0 |
| Environment | OS, Node version, commit SHA |
| Evidence | links to logs, screenshots |
| Related | `[TC-XXX]`, PR links |

### Metrics

- Coverage: unit coverage ≥80% for targeted areas; monitor overall via `npm run test:coverage`.
- Defect density: defects per KLOC per sprint; trend should decline over time.
- Execution progress: percentage of planned cases run; pass rate; mean time to fix.

## E2E Without Electron (Fake IPC Pair)

- Pair renderer and main without booting Electron using `src/test/utils/fakes/ipc-fake.ts`.
- Register IPC handlers against the fake `ipcMain` and bind renderer calls to `ipcRenderer.invoke('<channel>', payload)`.
- Drive flows via renderer services or components; assert `APIResponse` shapes for contracts.
- For event channels, use `emitToRenderer('<channel>', payload)` and `flushAsync()` to process microtasks.

```ts
import { createIpcPair } from '@/test/utils/fakes/ipc-fake';
import { setupLearningHandlers } from '@/main/handlers/learning-handlers';
import { createElectronAPIClient } from '@/renderer/services/api/electron-api-client';

const { ipcMain, ipcRenderer } = createIpcPair();

setupLearningHandlers(ipcMain, {
  learningService: { getRecentSessions: async () => [{ id: 's1', title: 'Test' }] } as any,
  loggerService: { child: () => ({ info() {}, warn() {}, error() {}, debug() {} }) } as any,
});

(window as any).electronAPI = {
  learning: {
    getRecentSessions: (opts?: any) => ipcRenderer.invoke('learning:get-recent-sessions', opts),
  },
};

const client = createElectronAPIClient();
const res = await client.learning.getRecentSessions({ limit: 5 });
expect(res.success).toBe(true);
expect(res.data?.[0].id).toBe('s1');
```

## Design for Testability

- **Favor pure functions/hooks**; inject dependencies via parameters/providers (see `docs/DEVELOPER-GUIDE/services.md`).
- **Split large components** into smaller presentational parts plus container logic.
- **Isolate IPC calls** behind thin clients; mock at the boundary (`@/renderer/services/api/electron-api-client`).
- **Avoid global state**; use test setups under `src/test/setup/*` to configure environment.
- **Keep side-effects behind interfaces** to simplify mocking (see `docs/DEVELOPER-GUIDE/architecture.md`).

## Dependency Injection Patterns (CRITICAL)

**The Learning Catalyst project MANDATES Dependency Injection (DI) patterns for all testable code. Module-scope mocking (`vi.mock()`) is STRONGLY DISCOURAGED and causes test isolation issues.**

### Core Principle: Inject, Don't Import

**Dependencies should be injected as parameters, not imported or mocked.**

#### Why DI Over Mocking?

| Aspect | Module-Scope Mocking | Dependency Injection |
|--------|---------------------|---------------------|
| **Isolation** | ❌ Global state leaks | ✅ Each test isolated |
| **Determinism** | ❌ Order-dependent | ✅ Order-independent |
| **Speed** | ❌ Module re-initialization | ✅ No overhead |
| **Maintainability** | ❌ Must update mocks on changes | ✅ Works with refactoring |
| **Clarity** | ❌ Hidden dependencies | ✅ Clear dependencies |
| **Flakiness** | ❌ Pass/fail inconsistent | ✅ Always deterministic |

#### Mandatory Test Setup

**EVERY test file MUST include proper isolation setup:**

```typescript
// ✅ REQUIRED in every test file
describe('test suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();           // Reset all mocks
    vi.resetModules();            // Clear module cache
    vi.useFakeTimers();           // Control time
    vi.setSystemTime(new Date('2020-01-01')); // Deterministic time
  });

  afterEach(() => {
    vi.useRealTimers();           // Restore real timers
  });

  // tests...
});
```

#### Pattern 1: Service Factory with DI

**Services MUST accept dependencies as optional parameters:**

```typescript
// ✅ GOOD - Service accepts injectable dependencies
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
      const id = generateId();
      const timestamp = timeService.now();
      // Use injected dependencies
    },
  };
};

// ✅ Test - Inject dependencies directly
test('sendMessage generates predictable ID', async () => {
  const service = createChatService(mockAPI, {
    idGenerator: () => 'm1',
    timeService: { now: () => 0, format: () => '2020-01-01' },
    logger: { info: vi.fn() },
  });

  const result = await service.sendMessage('hi', { sessionId: 's1' });
  expect(result.id).toBe('m1');           // Deterministic!
  expect(result.timestamp).toBe(0);       // Controlled time!
});

// ✅ Production - Use defaults
const service = createChatService(apiClient); // Uses default implementations
```

#### Pattern 2: Component Props DI

**Components SHOULD accept dependencies via props:**

```typescript
// ✅ GOOD - Component accepts dependencies
interface ProviderStatusProps {
  configurationService: () => ConfigurationService;
}

export const ProviderStatus = ({ configurationService }: ProviderStatusProps) => {
  const config = configurationService(); // Injected, not imported!
  return <div>Status: {config.status}</div>;
};

// ✅ Test - Inject service directly (NO vi.mock needed!)
test('renders configuration status', () => {
  render(
    <ProviderStatus
      configurationService={() => ({ status: 'ready', provider: 'openai' })}
    />
  );

  expect(screen.getByText('Status: ready')).toBeInTheDocument();
});

// ✅ Alternative - Context-based DI
const ServicesContext = createContext<ServicesContextValue | null>(null);

export const ProviderStatus = () => {
  const { configurationService } = useContext(ServicesContext);
  const config = configurationService();
  return <div>Status: {config.status}</div>;
};

// ✅ Test - Provide via context
test('renders configuration status', () => {
  render(
    <ServicesProvider services={{
      configurationService: () => ({ status: 'ready', provider: 'openai' })
    }}>
      <ProviderStatus />
    </ServicesProvider>
  );

  expect(screen.getByText('Status: ready')).toBeInTheDocument();
});
```

#### Pattern 3: Direct Mock Injection (No Module Mocking)

**Tests MUST inject mocks directly, NOT use module-scope `vi.mock()`:**

```typescript
// ✅ GOOD - Direct mock injection
test('chat service sends message', async () => {
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

// ❌ BAD - Module-scope mocking (CAUSES ISOLATION ISSUES!)
vi.mock('@/renderer/services/api/electron-api-client');

describe('chat service', () => {
  test('sends message', async () => {
    // This mock is global and shared - causes flaky tests!
  });
});
```

#### Pattern 4: Time Control for Deterministic Tests

**All time-dependent code MUST use injectable time service:**

```typescript
// ✅ GOOD - Injectable time service
interface TimeService {
  now: () => number;
  format: (date: Date) => string;
}

const createTimeService = (): TimeService => ({
  now: () => Date.now(),
  format: (date) => date.toISOString(),
});

// Service uses injected time
export const createChatService = (apiClient: ElectronAPI, options: ChatServiceOptions = {}) => {
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
    timeService: { now: () => 0, format: () => '2020-01-01T00:00:00Z' },
  });

  const result = service.sendMessage('hi', { sessionId: 's1' });
  expect(result.timestamp).toBe(0); // Always deterministic!
});

// ❌ BAD - Direct Date.now() usage
export const createChatService = (apiClient: ElectronAPI) => {
  return {
    sendMessage: async (content, options) => {
      const timestamp = Date.now(); // Not injectable - causes flaky tests!
      return { id: `msg_${timestamp}`, content, timestamp };
    },
  };
};
```

#### Pattern 5: ID Generation for Testability

**All ID generation MUST use injectable ID generator:**

```typescript
// ✅ GOOD - Injectable ID generator
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

// Service uses injected generator
export const createChatService = (apiClient: ElectronAPI, options: ChatServiceOptions = {}) => {
  const generateId = options.idGenerator ?? createIDGenerator();

  return {
    sendMessage: async (content, options) => {
      const id = generateId.generate(); // Uses injected generator
      return { id, content };
    },
  };
};

// ✅ Test - Use fixed ID
test('sendMessage uses predictable ID', () => {
  const service = createChatService(mockAPI, {
    idGenerator: { generate: () => 'm1' },
  });

  const result = service.sendMessage('hi', { sessionId: 's1' });
  expect(result.id).toBe('m1'); // Always 'm1' - deterministic!
});

// ❌ BAD - Hardcoded ID generation
export const createChatService = (apiClient: ElectronAPI) => {
  return {
    sendMessage: async (content, options) => {
      const id = `msg_${Date.now()}`; // Changes every millisecond!
      return { id, content };
    },
  };
};
```

### Anti-Patterns to AVOID

#### ❌ Module-Scope Mocking
```typescript
// DON'T DO THIS - Causes global contamination!
vi.mock('@/renderer/services/services-provider', () => ({
  useConfigurationService: vi.fn(),
}));

describe('tests', () => {
  // All tests share this mock - isolation issues!
});
```

#### ❌ Time-Dependent Tests Without Control
```typescript
// DON'T DO THIS - Flaky on different dates!
test('generates ID', () => {
  const id = generateId();
  expect(id).toBe('msg_1577836800000'); // Breaks on different date!
});
```

#### ❌ Direct Imports in Testable Code
```typescript
// DON'T DO THIS - Can't inject different implementations!
import { useConfigurationService } from '@/renderer/services/services-provider';

export const ProviderStatus = () => {
  const config = useConfigurationService(); // Hard-coded dependency!
  return <div>{config.status}</div>;
};
```

### When DI Isn't Possible

**In rare cases where DI isn't feasible, use `renderWithServices`:**

```typescript
// Use renderWithServices for complex component trees
import { renderWithServices } from '@/test/utils/renderWithServices';

test('complex component tree', () => {
  renderWithServices(<ComplexComponent />, {
    electronAPI: {
      sessions: { list: vi.fn().mockResolvedValue([]) },
      filesystem: { readDirectory: vi.fn() },
    },
  });

  // Component receives services via context
});
```

### Migration Checklist

**For existing code:**

- [ ] Add `beforeEach/afterEach` with cleanup to all test files
- [ ] Move module-scope `vi.mock()` inside test functions
- [ ] Extract time-dependent logic to injectable `TimeService`
- [ ] Extract ID generation to injectable `IDGenerator`
- [ ] Update service factories to accept optional dependencies
- [ ] Update components to accept dependencies via props/context
- [ ] Replace module mocking with direct mock injection
- [ ] Run tests 3x to verify determinism

### Benefits of DI Pattern

✅ **Deterministic tests** - Pass consistently across runs
✅ **No flakiness** - Each test isolated from others
✅ **Maintainable** - Clear dependencies, easy to update
✅ **Fast** - No module re-initialization overhead
✅ **Testable** - All code can be tested without mocking
✅ **Flexible** - Easy to inject different implementations

## LangGraph Workflow Node Testing Best Practices

The Learning Catalyst uses LangGraph for AI workflow orchestration. This section documents proven patterns for testing workflow nodes effectively.

### Test Organization

- **Location**: Node tests live in `src/main/services/domain/workflow/nodes/__tests__/`
- **Pattern**: `{node-name}-node.test.ts` (e.g., `assess-node.test.ts`, `evaluate-node.test.ts`)
- **Rationale**: Keep node tests close to implementation for easy navigation and maintenance

### Core Testing Principles

1. **Dependency Injection (DI) Pattern**
   - Only mock **stateful dependencies** (e.g., LLM, agent manager, database)
   - Use **real packages** for stateless utilities (e.g., ChatPromptTemplate, StructuredOutputParser)
   - Pass mocked dependencies via factory functions

2. **LangChain Chain Testing**
   - Nodes using `.pipe()` chains need `RunnableLambda` with correct constructor signature
   - Return `AIMessage` with JSON string content for structured output parsers

3. **Chunk Emitter Testing**
   - Nodes using streaming need `LangGraphRunnableConfig` with `writer` function
   - Provide minimal config: `{ writer: vi.fn() }` (mock writer only)

4. **Interrupt Handling Testing**
   - **CRITICAL**: Nodes that call `interrupt()` MUST be tested with StateGraph streaming
   - **NEVER** call nodes directly that use `interrupt()` outside a graph context
   - Use `streamMode: 'updates'` to capture interrupt events
   - Import `isInterruptEvent` and `extractInterrupt` from `../interrupt`

### Example 1: Testing a Node with .pipe() Chain (titleGenerateNode)

```typescript
import { describe, it, expect, vi } from 'vitest';
import { titleGenerateNode } from '../titleGenerate';
import { RunnableLambda } from '@langchain/core/runnables';
import { AIMessage } from '@langchain/core/messages';

describe('Title Generation Worknode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should generate title from user message', async () => {
    // Use RunnableLambda with correct constructor signature for .pipe() chains
    const mockLlm = new RunnableLambda({
      func: async (_input) => {
        // Parser expects JSON matching Zod schema
        return new AIMessage(JSON.stringify({ title: 'Test Title' }));
      },
    });

    const mockDeps = {
      providerFactory: {
        getModel: vi.fn().mockResolvedValue(mockLlm),
      },
    } as any;

    const node = titleGenerateNode(mockDeps);

    const state = {
      messages: [{ role: 'user', content: 'Test message' }],
      sessionMetadata: { title: 'New Chat' },
    } as any;

    const result = await node(state);

    expect(result.sessionMetadata.title).toBe('Test Title');
    expect(mockDeps.providerFactory.getModel).toHaveBeenCalled();
  });
});
```

**Key Points:**
- ✅ Use `RunnableLambda` with `{ func: ... }` constructor (not bare function)
- ✅ Return `AIMessage(JSON.stringify({...}))` for structured output
- ✅ Mock only the LLM via `providerFactory.getModel()`
- ✅ Use real `ChatPromptTemplate` and `StructuredOutputParser` (not mocked)

### Example 2: Testing a Node with Chunk Emitter (planNode)

```typescript
import { describe, it, expect, vi } from 'vitest';
import { planNode } from '../plan';
import { RunnableLambda } from '@langchain/core/runnables';
import { AIMessage } from '@langchain/core/messages';
import type { LangGraphRunnableConfig } from '@langchain/langgraph';

// DI pattern - only mock writer, use real chunk-emitter
const createMockConfig = (): LangGraphRunnableConfig => ({
  writer: vi.fn(), // Mock writer function only
} as any);

describe('plan node', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('generates session blueprint based on assessment confidence', async () => {
    const mockBlueprint = {
      learnerProfile: {
        topic: 'JavaScript Basics',
        level: 'intermediate',
        timeAvailable: 60,
      },
      goal: {
        userGoal: 'Master JavaScript',
        successCriteria: ['Understand concepts'],
      },
      session: {
        primaryConcept: 'JavaScript',
        practiceBlocks: [
          { type: 'retrieval', prompt: 'Test', minutes: 10, scoring: 'manual' },
          { type: 'apply', prompt: 'Test', minutes: 10, scoring: 'auto' },
          { type: 'teach_back', prompt: 'Test', minutes: 10, scoring: 'manual' },
          { type: 'open_question', prompt: 'Test', minutes: 10, scoring: 'manual' },
        ],
        checks: { targetRetrievalScore: 80 },
      },
      tacticsApplied: {
        retrieval: true,
        feynmanTeachBack: true,
        spaced: false,
      },
    };

    const mockLlm = new RunnableLambda({
      func: async (_input) => {
        return new AIMessage(JSON.stringify(mockBlueprint));
      },
    });

    const mockDeps = {
      providerFactory: {
        getModel: vi.fn().mockResolvedValue(mockLlm),
      },
      loggerService: {
        warn: vi.fn(),
      },
    } as any;

    const node = planNode(mockDeps);

    const state = {
      topic: 'JavaScript Basics',
      confidence: 0.6,
      gaps: ['Array methods'],
      messages: [],
      sessionMetadata: {},
    } as any;

    // Provide config with writer function for chunk-emitter
    const config = createMockConfig();
    const result = await node(state, config);

    expect(result.sessionBlueprint).toBeDefined();
    expect(result.sessionBlueprint.learnerProfile.level).toBe('intermediate');
  });
});
```

**Key Points:**
- ✅ Provide `LangGraphRunnableConfig` with `writer: vi.fn()`
- ✅ Use **real chunk-emitter** (don't mock it with vi.mock)
- ✅ Only mock the **stateful writer function**
- ✅ Follows DI principle: mock stateful, use real stateless

### Example 3: Testing a Node with Direct LLM Invocation (assessNode)

```typescript
import { describe, it, expect, vi } from 'vitest';
import { assessNode } from '../assess';
import type { LangGraphRunnableConfig } from '@langchain/langgraph';

const createMockConfig = (): LangGraphRunnableConfig => ({
  writer: vi.fn(),
} as any);

const makeDeps = (score: string = 'Score: 85%') => {
  const knowledgeService = {
    searchKnowledge: vi.fn().mockResolvedValue({ results: [] }),
  } as any;

  const learningService = {
    getPracticeHistory: vi.fn(),
    listMessages: vi.fn(),
  } as any;

  const providerFactory = {
    getModel: vi.fn(async () => ({
      invoke: vi.fn().mockResolvedValue({ content: score }) // Direct invoke, not .pipe()
    }))
  } as any;

  return { knowledgeService, learningService, providerFactory };
};

describe('assess node', () => {
  it('calculates confidence based on practice history', async () => {
    const { learningService } = makeDeps();
    const now = new Date().toISOString();

    learningService.getPracticeHistory.mockResolvedValue([
      { result: 'pass', rubricScores: { retrieval: 90 }, timestamp: now },
    ]);

    const deps = {
      knowledgeService: { searchKnowledge: vi.fn().mockResolvedValue({ results: [] }) },
      learningService,
      providerFactory: {
        getModel: vi.fn(async () => ({
          invoke: vi.fn().mockResolvedValue({ content: 'Score: 85%' })
        }))
      },
    } as any;

    const node = assessNode(deps);
    const state = { topic: 'Algebra', messages: [] } as any;

    const result = await node(state, createMockConfig());
    expect(result.confidence).toBeGreaterThanOrEqual(0.75);
  });
});
```

**Key Points:**
- ✅ Use plain mock object for LLM when using direct `invoke()` (not `.pipe()`)
- ✅ Pattern: `{ invoke: vi.fn().mockResolvedValue({ content: '...' }) }`
- ✅ Works because node calls `model.invoke()` directly, not through chain

### Example 4: Testing a Node with Interrupt (askQuestionNode)

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StateGraph, MemorySaver, START, END } from '@langchain/langgraph';
import { askQuestionNode } from '../askQuestion';
import { isInterruptEvent, extractInterrupt, type InterruptEvent } from '../../../interrupt';
import { PracticeAnnotation } from '../../state';

describe('[TC-401] askQuestion Node with Interrupt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Create test graph factory for interrupt testing
  const createTestGraph = (mockDeps: any) => {
    const graph = new StateGraph(PracticeAnnotation)
      .addNode('askQuestion', askQuestionNode(mockDeps))
      .addNode('complete', async (state: any) => ({ done: true }))
      .addEdge(START, 'askQuestion')
      .addEdge('askQuestion', 'complete')
      .addEdge('complete', END);

    return graph.compile({ checkpointer: new MemorySaver() });
  };

  it('executes interrupt through StateGraph with streaming', async () => {
    const mockDeps = createMockDeps();
    const graph = createTestGraph(mockDeps);

    /**
     * Streaming mode required: askQuestion node calls interrupt() for user interaction
     * Using streamMode: 'updates' allows us to capture interrupt events
     */
    const stream = await graph.stream(
      {
        practice: {
          attemptCount: 0,
          focusConcepts: ['closures'],
          relatedConcepts: ['functions'],
        },
        topic: 'JavaScript Closures',
        userAnswer: '',
      },
      {
        configurable: { thread_id: 'test-thread-interrupt' },
        streamMode: 'updates' as const,
      }
    );

    // Collect and verify interrupt events
    let gotInterrupt = false;
    for await (const evt of stream) {
      if (isInterruptEvent(evt)) {
        gotInterrupt = true;
        const interruptValue = extractInterrupt(evt) as any;
        expect(interruptValue.type).toBe('practice_question');
        expect(interruptValue.prompt).toBeDefined();
        expect(interruptValue.questionId).toBeDefined();
        break;
      }
    }

    expect(gotInterrupt).toBe(true);
  });

  // Unit tests only for cases before interrupt is called
  it('handles no knowledge found gracefully', async () => {
    const mockDeps = createMockDeps();
    mockDeps.knowledgeService.searchKnowledge.mockResolvedValue({ results: [] });

    const node = askQuestionNode(mockDeps);
    const state = { topic: 'Unknown Topic' } as any;

    const result = await node(state);
    expect(result.error).toBeDefined();
    expect(result.practice?.isComplete).toBe(true);
  });
});
```

**Key Points:**
- ✅ **NEVER** call `interrupt()` nodes directly - use StateGraph
- ✅ Use `streamMode: 'updates'` to capture interrupt events
- ✅ Import `isInterruptEvent` and `extractInterrupt` helpers
- ✅ Create test graph with MemorySaver checkpointer
- ✅ Unit tests only for logic before `interrupt()` is called

### Example 5: Testing Workflow with Multiple Interrupts (full-workflow.test.ts)

```typescript
describe('[TC-402] Full Workflow Interrupt Handling', () => {
  it('handles TEACH node interrupts with streaming', async () => {
    const deps = makeDeps();
    const graph = createWorkflowGraph(deps);

    /**
     * Streaming mode required: TEACH node calls interrupt() for user interaction
     * Using streamMode: 'updates' allows us to capture interrupt events
     */
    const stream = await graph.stream(
      {
        messages: [new HumanMessage('Teach me Python basics')],
        topic: 'Python',
        confidence: 0.5,
      },
      {
        configurable: { thread_id: 'teach-stream-test' },
        streamMode: 'updates' as const,
        interrupt_after: 'TEACH',
      }
    );

    let gotInterrupt = false;
    for await (const evt of stream) {
      if (isInterruptEvent(evt)) {
        gotInterrupt = true;
        const interruptValue = extractInterrupt(evt) as any;
        expect(['teach_followup', 'teach_response']).toContain(interruptValue.type);
        expect(interruptValue.prompt).toBeDefined();
        break;
      }
    }

    expect(gotInterrupt).toBe(true);
  });

  it('handles practice conversation interrupts', async () => {
    const deps = makeDeps();
    const graph = createWorkflowGraph(deps);

    /**
     * Streaming mode required: handleConversation calls interrupt() for hints/give_up
     * Using streamMode: 'updates' allows us to capture practice conversation interrupts
     */
    const stream = await graph.stream(
      {
        messages: [new HumanMessage('I need practice')],
        topic: 'Python',
        practicePrompt: 'Write a function',
        userAnswer: 'Give me a hint',
      },
      {
        configurable: { thread_id: 'practice-interrupt' },
        streamMode: 'updates' as const,
        interrupt_after: 'HANDLE_CONVERSATION',
      }
    );

    let gotInterrupt = false;
    for await (const evt of stream) {
      if (isInterruptEvent(evt)) {
        gotInterrupt = true;
        const interruptValue = extractInterrupt(evt) as any;
        expect(['hint_request', 'give_up', 'practice_followup']).toContain(interruptValue.type);
        break;
      }
    }

    expect(gotInterrupt).toBe(true);
  });
});
```

**Key Points:**
- ✅ Full workflow tests use `createWorkflowGraph()` not single nodes
- ✅ Test multiple interrupt types from different nodes
- ✅ Use `interrupt_after` to stop execution at specific nodes
- ✅ Document why streaming is required in comments

### When to Use Which Pattern

| Node Pattern | Test Approach | Example |
| --- | --- | --- |
| `.pipe()` chain: `template.pipe(llm).pipe(parser)` | `RunnableLambda` with `{ func: ... }` returning `AIMessage(JSON.stringify(...))` | titleGenerateNode, planNode |
| Direct LLM: `model.invoke()` | Plain mock: `{ invoke: vi.fn().mockResolvedValue({...}) }` | assessNode, evaluateNode |
| Uses chunk-emitter | Provide config: `{ writer: vi.fn() }` | planNode, assessNode, evaluateNode |
| **Calls `interrupt()`** | **StateGraph with streaming**: `streamMode: 'updates'` + `isInterruptEvent/extractInterrupt` | askQuestionNode, teachNode, handleConversationNode |
| Stateless utilities | Use **real packages** (don't mock) | ChatPromptTemplate, StructuredOutputParser, chunk-emitter |

### Common Patterns Reference

```typescript
// 1. Create mock config for chunk-emitter
const createMockConfig = (): LangGraphRunnableConfig => ({
  writer: vi.fn(),
} as any);

// 2. Mock LLM with .pipe() support (for chain nodes)
const mockLlm = new RunnableLambda({
  func: async (input) => {
    return new AIMessage(JSON.stringify({ data: 'value' }));
  },
});

// 3. Mock LLM with direct invoke (for simple nodes)
const mockLlm = {
  invoke: vi.fn().mockResolvedValue({ content: 'response' }),
};

// 4. Factory for common dependencies
const makeDeps = () => ({
  providerFactory: {
    getModel: vi.fn(async () => mockLlm),
  },
  knowledgeService: {
    searchKnowledge: vi.fn().mockResolvedValue({ results: [] }),
  },
  // ... other dependencies
});
```

### Testing Checklist for Workflow Nodes

- [ ] Is the node's LLM mocked correctly? (RunnableLambda vs plain mock)
- [ ] Does the test provide `LangGraphRunnableConfig` with `writer` if node uses chunk-emitter?
- [ ] Are stateless utilities tested with **real packages**, not mocks?
- [ ] Does the test file live in `src/main/services/domain/workflow/nodes/__tests__/`?
- [ ] Are only stateful dependencies mocked?
- [ ] Does the test verify the node's **output state**, not just internal behavior?
- [ ] **CRITICAL**: If node calls `interrupt()`, is it tested with StateGraph streaming?
  - [ ] Uses `streamMode: 'updates'`?
  - [ ] Imports `isInterruptEvent` and `extractInterrupt`?
  - [ ] Creates test graph with MemorySaver checkpointer?
  - [ ] Unit tests only cover logic before `interrupt()`?

## AI-Assisted Testing

- Use consistent Case IDs `[TC-XXX]` and structured tables so AI tools can generate/augment cases.
- Keep tests deterministic and labeled to enable automated triage and summarization.
- Prefer code snippets over screenshots for renderer tests; include minimal, focused examples.

## References

- `docs/DEVELOPER-GUIDE/architecture.md` — module layout and test organization
- `docs/DEVELOPER-GUIDE/electron-api.md` — IPC channels and payload contracts
- `docs/DEVELOPER-GUIDE/services.md` — service boundaries and injection
- `docs/DEVELOPER-GUIDE/agents.md` — agent tests and integration patterns
- `CLAUDE.md` — scripts overview and testing commands

## Version History

| Version | Date | Changes |
| --- | --- | --- |
| 1.4.0 | 2025-12-23 | **MAJOR UPDATE**: Added comprehensive "Dependency Injection Patterns (CRITICAL)" section emphasizing DI over monkey patching. Includes 5 detailed patterns: Service Factory DI, Component Props DI, Direct Mock Injection, Time Control, and ID Generation. Added extensive anti-patterns section, migration checklist, and troubleshooting for test isolation issues. Updated Tips for Fast Feedback and Troubleshooting sections. |
| 1.3.0 | 2025-12-21 | Added LangGraph Interrupt Testing patterns with comprehensive examples for testing nodes that call interrupt() using StateGraph streaming. Includes critical guidance on using isInterruptEvent/extractInterrupt helpers and streaming mode for interrupt detection. |
| 1.2.0 | 2025-12-16 | Added LangGraph Workflow Node Testing Best Practices section with DI pattern, RunnableLambda for .pipe() chains, chunk-emitter testing, and comprehensive code examples from actual implementations. |
| 1.1.1 | 2025-11-24 | Added fake IPC E2E guidance and corrected contract example. |
| 1.1.0 | 2025-11-24 | Added comprehensive test strategy, templates, execution, and metrics; AI-friendly and design-for-testability guidance; expanded troubleshooting and references. |
