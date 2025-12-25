# Tasks: Remove Renderer Imports From Shared IPC Types

## Task 1: Add shared request DTOs

- [ ] Create shared definitions for:
  - [ ] `SessionCreateRequest`
  - [ ] `SessionUpdateRequest`
- [ ] Decide naming and file location (prefer `src/shared/types/electron-api/`)

## Task 2: Remove `shared -> renderer` imports

- [ ] Update `src/shared/types/electron-api/sessions-api.ts` to import request DTOs from shared
- [ ] Update renderer call sites to use shared DTOs
- [ ] Delete or deprecate duplicate renderer types if they become redundant

## Task 3: Validation

- [ ] Add a test (or static check) that fails if `src/shared/**` imports `src/renderer/**`
- [ ] Run `npm test`
- [ ] Run `npm run lint`
- [ ] Run `npm run type-check`

