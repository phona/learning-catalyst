# Design: Clean Main Process Structure (ProviderFactory-only AI)

## Goals

1) Single AI gateway: `ProviderFactory`
2) IPC correctness: preload invokes only implemented channels
3) Smaller main entry: `src/main/index.ts` delegates to `src/main/app/*`
4) Code is truth: remove drifting Electron API doc

## Architecture overview (target)

```
src/main/index.ts
  -> app/start.ts
     -> app/window.ts (BrowserWindow)
     -> app/services.ts (build services container)
     -> ipc/setup.ts (register handlers)
     -> app/readiness.ts (SYSTEM_READY + replay)

Renderer
  -> preload exposes window.electronAPI
     -> invokes only channels registered by ipc/setup.ts
```

## AI gateway design (Option A)

### Today (mixed)
```
workflow nodes  -> ProviderFactory -> LangChain model
agent tools     -> aiService       -> provider impls
content service -> aiService (presets only)
```

### Target
```
ALL main-process callers -> ProviderFactory -> LangChain models/embeddings/rerank
```

Rationale:
- ProviderFactory already centralizes config reading, validation, caching, and provider-specific implementations.
- It aligns with existing workflow code that already depends on ProviderFactory.
- It avoids a second, parallel provider implementation stack.

Implementation strategy:
- Replace `aiService.chatCompletion()` callers with `providerFactory.getModel()` + `model.invoke(...)` (or streaming if needed).
- Replace `aiService.getModelPreset(...)` usage with a small local selection rule that still resolves through ProviderFactory configs (no second preset system).

## IPC surface consistency

### Rule
Preload is the public bridge. Any channel used by preload must be registered in main:

```
preload invoke list  ==  main handle registrations
```

This proposal removes or implements any missing channels.

### Catalyst decision
Default: remove `catalyst:*` if it is not implemented in main.

Alternative (if requested): implement `catalyst:*` as a compatibility layer that forwards to existing domain services, with clear deprecation notes.

## Removing docs as source of truth

We remove the old Developer Guide page for Electron IPC contracts and update any OpenSpec requirements that reference it.

New rule:
- Types (`src/shared/types/electron-api/*`) + preload (`src/main/preload/*`) + main handlers (`src/main/handlers/*`) are the contract.

## Migration / sequencing (to reduce risk)

1) Align IPC (fix missing channels or remove call sites) to get runtime stable.
2) Migrate AI usage to ProviderFactory (call sites first).
3) Remove ai-service code.
4) Refactor boot into `src/main/app/*` (no behavior change).
5) Delete drifting doc + remove all references.
