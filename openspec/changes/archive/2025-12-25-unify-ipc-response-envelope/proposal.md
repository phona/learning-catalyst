# Proposal: Unify IPC Response Envelope (APIResponse)

## Why

Right now we have **two different IPC “response wrapper” shapes**:

- Main proxy wraps handler results as `ApiResponse` (string `error`, `timestamp: Date`)
- Renderer unwrap helper expects `APIResponse` (structured `error: { code, message, details }`, optional `code`)

That mismatch forces unsafe casts (ex: `as unknown as Promise<APIResponse<T>>`) and makes it easy to ship bugs where:

- errors do not carry codes/details reliably
- services “work” but types lie
- different parts of the app disagree on what IPC returns

## What Changes

- Standardize IPC responses on `APIResponse<T>` from `src/shared/types/electron-api/base.ts`.
- Update `ipc-main-proxy` to return structured errors (`{ code, message, details? }`) instead of a string.
- Preserve timing/trace info via `timestamp?: string` (ISO) on the unified envelope.
- Remove renderer-side unsafe casts by aligning types and contracts.

## Current Problem (simple picture)

Expected by renderer:
```
APIResponse<T> = { success, data, error:{code,message,details}, code? }
```

Actually returned by main proxy today:
```
ApiResponse<T> = { success, data, error?: string, timestamp: Date }
```

## Goal

Define and use **one** IPC response envelope everywhere so:

- preload + renderer services can use `unwrapAPI()` without casts
- error payloads are consistent and structured
- we can add/keep a timestamp without breaking callers

## Proposed Solution

1) **Pick `APIResponse<T>` as the single envelope** (the one already used in `src/shared/types/electron-api/base.ts`).

2) Update `ipc-main-proxy` to return `APIResponse<T>`:

- success:
  - `{ success: true, data: result }`
- failure:
  - `{ success: false, error: { code, message, details }, code }`

3) Decide what to do with timestamps:

- Add `timestamp?: string` to `APIResponse<T>` (ISO string) so the envelope stays JSON-safe (no `Date` objects across IPC).

4) Align `ElectronAPI` method return types with reality (IPC-wrapped vs raw).

## Scope

In scope:
- IPC proxy envelope shape
- Shared type definition for IPC responses
- Renderer unwrap helper compatibility (remove casts)
- Tests that validate the envelope shape and error codes

Out of scope:
- Renaming IPC channels
- Refactoring business logic inside handlers/services
- Changing UI behavior

## Acceptance Criteria

- `ipc-main-proxy` returns the same envelope shape the renderer expects.
- Renderer services no longer need `as unknown as Promise<APIResponse<...>>` for IPC calls.
- Error payloads include a stable `code` and `message` (and optional `details`).
- `npm test` and `npm run lint` pass after implementation.

## Risks / Mitigations

- **Risk: legacy code expects `timestamp: Date`**
  - Mitigation: include `timestamp?: string` in the unified envelope (if needed).
- **Risk: mixed usage of `ApiResponse` vs `APIResponse` in types**
  - Mitigation: migrate imports and add a single “source of truth” export.
