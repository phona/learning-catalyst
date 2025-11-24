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
- Keep tests deterministic: avoid real timers/network; mock time where needed.

## Troubleshooting
- Coverage not printing? Ensure `--coverage` is used (already wired in `*:coverage` scripts).
- esbuild warnings (e.g., duplicate class members) show during coverage; fix in source or ignore if expected.

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

- Favor pure functions/hooks; inject dependencies via parameters/providers (see `docs/DEVELOPER-GUIDE/services.md`).
- Split large components into smaller presentational parts plus container logic.
- Isolate IPC calls behind thin clients; mock at the boundary (`@/renderer/services/api/electron-api-client`).
- Avoid global state; use test setups under `src/test/setup/*` to configure environment.
- Keep side-effects behind interfaces to simplify mocking (see `docs/DEVELOPER-GUIDE/architecture.md`).

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
| 1.1.1 | 2025-11-24 | Added fake IPC E2E guidance and corrected contract example. |
| 1.1.0 | 2025-11-24 | Added comprehensive test strategy, templates, execution, and metrics; AI-friendly and design-for-testability guidance; expanded troubleshooting and references. |
