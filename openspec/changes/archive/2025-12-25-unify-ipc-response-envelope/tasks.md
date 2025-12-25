# Tasks: Unify IPC Response Envelope (APIResponse)

## Task 1: Choose final envelope fields

- [x] Decide whether IPC responses include `timestamp`:
  - [x] If yes: add `timestamp?: string` (ISO) to `APIResponse<T>`
  - [ ] If no: ensure nothing relies on it

## Task 2: Update IPC proxy wrapper

- [x] Update `src/main/handlers/ipc-main-proxy.ts` to return `APIResponse<T>`
- [x] Ensure error mapping produces `{ code, message, details? }`
- [x] Remove usage of `src/shared/types/api.ts::ApiResponse` for IPC envelopes (or rename/re-scope it to non-IPC uses)

## Task 3: Fix renderer call sites and typings

- [x] Remove unsafe casts like `as unknown as Promise<APIResponse<T>>` in renderer services
- [x] Align `src/shared/types/electron-api/index.ts` method return types (wrapped vs raw)

## Task 4: Add regression tests

- [x] Add/extend tests to assert:
  - [x] success response shape
  - [x] error response shape includes `code` + `message`
  - [x] `unwrapAPI()` works without casts

## Task 5: Validation

- [x] Run `npm test`
- [x] Run `npm run lint`
- [x] Run `npm run type-check`
