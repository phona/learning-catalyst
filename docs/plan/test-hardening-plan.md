# Testing Reliability Plan

## Goals
- Catch DI/prop wiring regressions without launching the full Electron app.
- Ensure core flows (settings panel, chat surface) render under real-world empty states.
- Keep tests fast (Vitest only) and deterministic.

## Strategy

### 1. Harness: Service-Backed Rendering
- Create `test/utils/renderWithServices.tsx` that wraps components in:
  - `<ConfigServiceProvider>` → `<ServiceProvider>` → `<ServicesProvider>`
- Export helpers: `renderSettingsPanel()`, `renderChatInterface()` to reuse across suites.
- Run once per suite to fail fast when DI wiring breaks.

### 2. Runtime-Shaped Fixtures
- Add `test/utils/fixtures/config.ts` with helpers:
  - `makeEmptyConfig()` – mirrors freshly booted state (`providers: {}`, `model_types: {}`).
  - `makeProviderConfig(overrides)` – ensures `provider_type`, `capabilities`, etc. match shared types.
- Use these fixtures instead of bespoke literals so tests see the same shape as production.

### 3. Negative-Path Assertions
- For every settings test covering provider/model assignment:
  - Assert toggles are disabled when `config.ai.model_types.chat` is missing.
  - Expect a warning toast when `validateProvider` rejects.
  - Verify dropdowns stay empty until provider configs arrive.
- For chat-related tests, assert the component shows a friendly empty state when `currentSession` is `null`.

### 4. Configurable Service Mocks
- Build `createConfigServiceMock(options)` returning a mock object with defaults plus per-test overrides (e.g., `validateProviderResult`, `getProviderModelsReject`).
- Apply similar pattern for `SessionService`, `CatalystService`.
- Replace ad-hoc `vi.mocked(useService).mockReturnValue(...)` with these helpers to keep behavior aligned.

### 5. Smoke Tests (no assertions)
- Add Vitest cases:
  ```ts
  it('renders SettingsPanel without crashing', () => {
    expect(() => renderSettingsPanel()).not.toThrow();
  });
  ```
  - Same for `ChatInterface`.
  - These run through the full JSX tree, catching null dereferences early.

### 6. Global Electron Mock for Vitest + Dev
- Create `test/setup/electron-mock.ts` that defines `createMockElectronAPI()` and assigns it to `globalThis.window.electronAPI`.
- Import that setup file via Vitest config (so every suite sees the same mock) and via Vite when `VITE_USE_MOCK_ELECTRON=true`.
- Override methods per-test via `vi.spyOn(window.electronAPI.chat, 'sendMessage')` when needed, but keep the baseline centralized.

### 7. Fixture Gallery / Storybook
- Host a fixture route (or Storybook stories) that renders Settings/Chat with saved config snapshots (`emptyConfig`, `partialProvider`, `activeSession`).
- Designers and devs can verify edge cases instantly; the same fixtures feed unit tests.

### 8. IPC Contract Tests
- Codify `window.electronAPI` modules in shared types.
- Add a Vitest suite that imports the preload export and asserts every method exists & returns a promise. Breaks when an IPC handler is removed.

### 9. Fast-Boot Route Smoke Tests
- With the render harness, mount entire routes (`<Layout><SettingsPanel/></Layout>`) and assert they render without throwing.
- These tests exercise the real tree but still finish in milliseconds.

### 10. CI Gate
- Add a `test:integration` npm script (Vitest) covering harness-based suites + smoke tests.
- CI runs `npm run test -- --runInBand` followed by `npm run test:integration` to gate regressions without spinning up Electron.

## Rollout Checklist
1. Implement render harness + fixtures.
2. Update `AIProviderSettings` + `ResponseSettings` tests to use new fixtures/mocks.
3. Add smoke tests for Settings & Chat.
4. Add mock Electron setup + fixture gallery scripts.
5. Wire `test:integration` into CI.
6. Document in `docs/plan/test-hardening-plan.md` (this file) and reference in CONTRIBUTING.

## Success Criteria
- Rendering SettingsPanel with empty config passes (no runtime errors).
- Tests fail if `configService`/`sessionService` are removed from the DI container.
- Coverage includes at least one negative-path assertion per critical settings interaction.
- CI completes under 2 minutes per test job (no Electron startup).

## Recent Progress
- ✅ Added shared renderer fixtures, a centralized electron settings mock, and a render harness that wraps `<ConfigServiceProvider> → <ServiceProvider> → <ServicesProvider>` for deterministic component mounts.
- ✅ Introduced smoke tests for `SettingsPanel` and `ChatInterface` that exercise the real JSX tree with empty/default configs and loading/ready states.
