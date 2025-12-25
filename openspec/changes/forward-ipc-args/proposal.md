# Proposal: Forward IPC Args Through Proxy

## Problem
Renderer title-generation calls `ipcRenderer.invoke('sessions:update-title', sessionId, title)`, but `ipc-main-proxy.handle` only forwards a single `params` argument. The handler therefore receives `title` as `undefined`, so generated titles never persist to SQLite even though calls appear successful.

## Goal
Ensure the IPC proxy passes all invoke arguments to handlers so multi-argument channels (e.g., `sessions:update-title`) receive the full payload and can persist titles.

## Scope
- Update IPC proxy argument forwarding.
- Adjust typings to reflect variadic args.
- Add regression coverage for multi-arg IPC calls (handler + renderer contract).

## Out of Scope
- Changing existing IPC channel names or business logic.
- Refactoring renderer/preload call sites beyond what’s needed for tests.

## Approach
Adopt the minimal fix: make `createIpcProxy.handle` variadic (`(...args)`) and forward them to the handler. This preserves existing call sites and ensures future multi-arg handlers work without extra boilerplate.

## Risks / Mitigations
- **Type drift**: Variadic typing must stay type-safe—use tuple typing to preserve handler signatures.
- **Coverage gap**: Add focused tests to prevent regressions on multi-arg handlers.

## Validation
- Unit tests for proxy forwarding multiple args.
- Existing handler/renderer contract tests continue to pass.
- `npm test` and `npm lint` per repo rules.
