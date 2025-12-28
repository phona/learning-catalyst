# Tasks: Remove Renderer Imports From Shared IPC Types

## Task 1: Add shared request DTOs

- [x] Create shared definitions for:
  - [x] `SessionCreateRequest`
  - [x] `SessionUpdateRequest`
- [x] Decide naming and file location (prefer `src/shared/types/electron-api/`)

## Task 2: Remove `shared -> renderer` imports

- [x] Update `src/shared/types/electron-api/sessions-api.ts` to import request DTOs from shared
- [x] Update renderer call sites to use shared DTOs
- [x] Delete or deprecate duplicate renderer types if they become redundant

## Task 3: Validation

- [x] Add a test (or static check) that fails if `src/shared/**` imports `src/renderer/**`
- [x] Run `npm test`
- [x] Run `npm run lint`
- [x] Run `npm run type-check`
