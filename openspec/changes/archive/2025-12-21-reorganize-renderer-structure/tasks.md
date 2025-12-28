# Tasks: reorganize-renderer-structure

These tasks implement the renderer folder restructure described in:
- `openspec/changes/reorganize-renderer-structure/proposal.md`
- `openspec/changes/reorganize-renderer-structure/specs/renderer-structure/spec.md`

## 1. Implementation

- [x] Create the new `src/renderer/{app,pages,widgets,features,shared}` directory skeleton
- [x] Move UI primitives to `src/renderer/shared/ui/` and add `src/renderer/shared/ui/index.ts`
- [x] Move utilities from `src/renderer/utils/` to `src/renderer/shared/lib/` and add `src/renderer/shared/lib/index.ts`
- [x] Move initialization state machine from `src/renderer/init/` to `src/renderer/app/init/`
- [x] Move app composition from `src/renderer/components/App/` to `src/renderer/app/` and add `src/renderer/app/index.ts`
- [x] Move layout components to `src/renderer/widgets/layout/` and add `src/renderer/widgets/layout/index.ts`
- [x] Create route-level pages under `src/renderer/pages/` and add per-page `index.ts` barrels
- [x] Move feature UI under `src/renderer/features/*/` and add per-feature `index.ts` barrels
- [x] Update all imports to the new module boundaries (`app/`, `pages/`, `widgets/`, `features/`, `shared/`)
- [x] Remove old renderer directories: `src/renderer/components/`, `src/renderer/ui/`, `src/renderer/utils/`, `src/renderer/init/`

## 2. Validation

- [x] `npm run type-check`
- [ ] `npm test` (currently failing in existing main + renderer test suites; see latest CLI output)
- [ ] `npm run lint` (currently failing due to existing lint errors outside the renderer move; see latest CLI output)
