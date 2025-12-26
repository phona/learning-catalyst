# Tasks: Clean Main Process Structure (ProviderFactory-only AI)

## Checklist

### Phase 0: Decisions
- [x] Decide whether to **remove** `catalyst:*` IPC surface or keep it as a **compat layer**
  - Decision: remove `catalyst:*` only if unnecessary (see proposal)

### Phase 1: Grounding / inventory
- [ ] Capture the list of preload IPC channels (from `src/main/preload/*`)
- [ ] Capture the list of main IPC registrations (from `src/main/handlers/*` and `src/main/index.ts`)
- [ ] Produce a diff list: missing in main vs unused in preload
  - [ ] Specifically: list all `catalyst:*` uses in non-test renderer code and decide if they can be replaced by domain APIs

### Phase 2: IPC cleanup (make bridge truthful)
- [ ] Remove or implement missing preload channels (based on Phase 0 decision)
- [ ] Add/adjust tests so IPC contract matches runtime

### Phase 3: Option A AI consolidation
- [ ] Identify all `aiService`/`aiServiceManager` call sites
- [ ] Migrate callers to `ProviderFactory`:
  - [ ] agent tools
  - [ ] content service (remove preset dependency)
- [ ] Remove `ai-service` and `ai-service-manager` code

### Phase 4: Main bootstrap modularization
- [ ] Create `src/main/app/*` modules and move logic out of `src/main/index.ts`
- [ ] Keep boot order and behavior unchanged (readiness + replay)

### Phase 5: Remove doc and spec references
- [ ] Delete `docs/DEVELOPER-GUIDE/electron-api.md`
- [ ] Remove all references to `electron-api.md` in repo + OpenSpec specs

### Phase 6: Validation
- [ ] Run `npm test`
- [ ] Run `npm run lint`
