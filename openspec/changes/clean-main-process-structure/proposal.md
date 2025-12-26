# OpenSpec Change Proposal: Clean Main Process Structure (ProviderFactory-only AI)

## Why

The main process has multiple overlapping "sources of truth" and duplicated layers:

- AI access is split across **ProviderFactory** and **ai-service / ai-service-manager**, leading to drift.
- Preload exposes IPC channels that are **not implemented** in main (runtime break risk).
- The developer guide `docs/DEVELOPER-GUIDE/electron-api.md` duplicates the contract and is already drifting; we want **code as the only truth**.
- `src/main/index.ts` is doing too many jobs (window + services + IPC + readiness), which makes it hard to maintain safely.

## What changes (high level)

### 1) One AI gateway (Option A)
Make `ProviderFactory` the only supported AI gateway in the main process.

- Migrate callers off `ai-service` / `ai-service-manager`
- Remove `src/main/services/ai/*` and `src/main/services/core/ai/ai-service-manager.ts`
- Keep provider-specific behavior inside `ProviderFactory` (it already supports chat/embeddings/rerank)

### 2) IPC surface becomes self-consistent
Ensure `src/main/preload/*` only calls channels that are actually registered in main.

- Remove or implement missing channels (no "fake" APIs)
- Reduce "mystery channels" by centralizing and auditing preload invoke usage

### 3) Main bootstrap becomes modular
Keep `src/main/index.ts` as the Electron entrypoint, but move responsibilities into small modules under `src/main/app/*`.

### 4) Remove drifting doc (code is truth)
Delete `docs/DEVELOPER-GUIDE/electron-api.md` and remove references to it (including OpenSpec requirements that mention it).

## Current behavior (grounding)

Main flow today (simplified):

```
Renderer -> window.electronAPI (preload) -> ipcRenderer.invoke/postMessage
  -> IPC handlers (main) -> services (domain/core/agent)
```

Problems observed:
- Preload calls channels like `dialog:*`, `catalyst:*`, and others that are not implemented in main.
- Main boot uses `aiServiceManager`, but workflow nodes mostly use `ProviderFactory` already.

## Scope

In scope:
- Main process boot structure (`src/main/index.ts` and new `src/main/app/*`)
- IPC alignment between preload and main handlers
- Removing `ai-service` and migrating callers to `ProviderFactory`
- Removing `docs/DEVELOPER-GUIDE/electron-api.md` and removing references

Out of scope:
- New features or new IPC domains
- Changing UI/UX flows (only wiring refactors)
- Adding new production dependencies

## Key decisions / clarifications needed

1) **Catalyst IPC surface**
   - Decision: remove `catalyst:*` **only if it is unnecessary**.
   - Definition of “unnecessary” for this change:
     - No production (non-test) renderer code calls `electronAPI.catalyst.*`, OR
     - All current production uses can be migrated to existing domain IPC (`chat:*`, `sessions:*`, `knowledge:*`, `analytics:*`, `settings:*`) without losing behavior.
   - If production code still needs Catalyst-only behavior that cannot be replaced within scope, we will keep the surface temporarily and either:
     - defer removal to a follow-up change, or
     - implement a minimal forwarder (no new features), marked for removal.

## Risks

- Removing `ai-service` may break agent tools and any content analysis paths that currently call `aiService.chatCompletion()` or `getModelPreset()`.
- IPC cleanup may require renderer service changes if it currently depends on missing channels.
- Splitting boot code risks subtle init ordering bugs (mitigated by tests + preserving the same init sequence).

## Success criteria

1) No main-process code depends on `src/main/services/ai/*` or `ai-service-manager`.
2) All preload IPC invocations map to real main handlers (or are removed).
3) `src/main/index.ts` is small and delegates to `src/main/app/*`.
4) `docs/DEVELOPER-GUIDE/electron-api.md` is removed and no specs/documents reference it.
5) `npm test` and `npm run lint` pass.
