# Tasks: Clean Main Process Structure (ProviderFactory-only AI)

## Checklist

### Phase 0: Decisions
- [x] Decide whether to **remove** `catalyst:*` IPC surface or keep it as a **compat layer**
  - Decision: keep `catalyst:*` as a compat layer (production renderer uses it)

### Phase 1: Grounding / inventory
- [x] Capture the list of preload IPC channels (from `src/main/preload/*`)
- [x] Capture the list of main IPC registrations (from `src/main/handlers/*` and `src/main/index.ts`)
- [x] Produce a diff list: missing in main vs unused in preload
  - [x] Specifically: list all `catalyst:*` uses in non-test renderer code and decide if they can be replaced by domain APIs

### Phase 2: IPC cleanup (make bridge truthful)
- [x] Remove or implement missing preload channels (based on Phase 0 decision)
- [x] Add/adjust tests so IPC contract matches runtime

### Phase 3: Option A AI consolidation
- [x] Identify all `aiService`/`aiServiceManager` call sites
- [x] Migrate callers to `ProviderFactory`:
  - [x] agent tools
  - [x] content service (remove preset dependency)
- [x] Remove `ai-service` and `ai-service-manager` code

### Phase 4: Main bootstrap modularization
- [x] Create `src/main/app/*` modules and move logic out of `src/main/index.ts`
- [x] Keep boot order and behavior unchanged (readiness + replay)

### Phase 5: Remove doc and spec references
- [x] Delete the old Developer Guide page for Electron IPC contracts
- [x] Remove all references to the removed Electron IPC doc page in repo + OpenSpec specs

### Phase 6: Validation
- [x] Run `npm test`
- [x] Run `npm run lint`
