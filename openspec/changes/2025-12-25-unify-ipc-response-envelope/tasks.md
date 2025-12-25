# Tasks: Unify IPC Response Envelope (APIResponse)

## Task 1: Choose final envelope fields

- [ ] Decide whether IPC responses include `timestamp`:
  - [ ] If yes: add `timestamp?: string` (ISO) to `APIResponse<T>`
  - [ ] If no: ensure nothing relies on it

## Task 2: Update IPC proxy wrapper

- [ ] Update `src/main/handlers/ipc-main-proxy.ts` to return `APIResponse<T>`
- [ ] Ensure error mapping produces `{ code, message, details? }`
- [ ] Remove usage of `src/shared/types/api.ts::ApiResponse` for IPC envelopes (or rename/re-scope it to non-IPC uses)

## Task 3: Fix renderer call sites and typings

- [ ] Remove unsafe casts like `as unknown as Promise<APIResponse<T>>` in renderer services
- [ ] Align `src/shared/types/electron-api/index.ts` method return types (wrapped vs raw)

## Task 4: Add regression tests

- [ ] Add/extend tests to assert:
  - [ ] success response shape
  - [ ] error response shape includes `code` + `message`
  - [ ] `unwrapAPI()` works without casts

## Task 5: Validation

- [ ] Run `npm test`
- [ ] Run `npm run lint`
- [ ] Run `npm run type-check`

