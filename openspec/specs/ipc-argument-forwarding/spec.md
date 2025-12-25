# ipc-argument-forwarding Specification

## Purpose
TBD - created by archiving change forward-ipc-args. Update Purpose after archive.
## Requirements
### Requirement: IPC Proxy Must Forward All Invoke Arguments
The IPC proxy (`createIpcProxy.handle`) MUST forward every argument received from `ipcRenderer.invoke` to the registered handler, preserving order and arity.

#### Scenario: Two-Argument Handler Receives Both Values
- **Given** the renderer calls `ipcRenderer.invoke('sessions:update-title', 'session-123', 'AI Title')`
- **When** the IPC proxy dispatches the request
- **Then** the `sessions:update-title` handler is invoked with `sessionId='session-123'` and `title='AI Title'`
- **And** the handler can persist the title without `undefined` values.

#### Scenario: Three-Argument Handler Retains Order
- **Given** a handler registered via `createIpcProxy.handle('channel', (event, a, b, c) => ...)`
- **When** the renderer invokes `ipcRenderer.invoke('channel', 1, 2, 3)`
- **Then** the handler receives arguments `(1, 2, 3)` in that order.

### Requirement: Typings Preserve Handler Signatures
TypeScript typings for the proxy MUST allow handler signatures with multiple parameters without forcing a single `params` object.

#### Scenario: Type Check Passes For Multi-Arg Handler
- **Given** a TypeScript handler signature `(event, sessionId: string, title: string) => Promise<void>`
- **When** it is registered via `createIpcProxy.handle`
- **Then** TypeScript accepts the registration without casting, and the inferred invoke contract includes both parameters.

