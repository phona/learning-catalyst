# Proposal: Remove Renderer Imports From Shared IPC Types

## Why

`src/shared/` should be safe to import from **both** main and renderer.

Today, a shared IPC contract file imports renderer-only types:

- `src/shared/types/electron-api/sessions-api.ts` imports from `src/renderer/types/session.ts`

That creates a **layering inversion**:

```
Renderer (UI types)
   ^   (import)
   |
Shared IPC contracts  (should be below renderer)
```

This makes it harder to:
- reuse shared contracts from main safely
- refactor renderer types without “breaking shared”
- keep clean boundaries (shared = contracts + DTOs)

## What Changes

- Move sessions IPC request DTOs into `src/shared/` so both main and renderer use the same wire types.
- Remove any `src/shared/** -> src/renderer/**` imports (hard boundary).

## Goal

Make `src/shared/types/electron-api/*` independent of `src/renderer/*`.

## Proposed Solution

1) Move session request DTOs (`SessionCreateRequest`, `SessionUpdateRequest`) into shared:

Suggested new location:
- `src/shared/types/electron-api/sessions-requests.ts` (or similar)

2) Update:
- `src/shared/types/electron-api/sessions-api.ts` to import request types from shared
- renderer to import the same shared request types (instead of renderer-local definitions)

3) Keep the renderer “display model” separate if needed:
- renderer can still have its own UI-specific `SessionDisplay` model, but it must not leak into the IPC contract.

## Scope

In scope:
- Move/duplicate request DTOs into `src/shared/`
- Update imports to remove `shared -> renderer` dependency
- Update related tests/typing

Out of scope:
- Changing runtime behavior
- Changing IPC channel names

## Acceptance Criteria

- No files under `src/shared/` import anything from `src/renderer/`.
- Sessions IPC request/response types are clearly “wire DTOs” and stable.
- `npm test` and `npm run lint` pass after implementation.
