# Design: IPC Argument Forwarding

## Options Considered
1) **Variadic proxy (chosen)**: Change `createIpcProxy.handle` to accept `...args` and pass them through. Minimal touch, fixes all multi-arg channels at once, no renderer/preload churn.
2) Payload objects: Rewrite call sites to send a single object `{ sessionId, title }`. Higher surface area; risks missing call sites; less future-proof.

## Selected Pattern
Use variadic forwarding while keeping the proxy’s response-wrapping logic intact. Type the handler signature as `(...args: TParams)` where `TParams` is a tuple inferred from the handler definition so existing handler types stay precise.

## Test Strategy
- Unit test: invoke proxy-registered handler with two args and assert handler receives both.
- Contract/regression: cover `sessions:update-title` path in tests to prove persistence call sees `sessionId` and `title`.
