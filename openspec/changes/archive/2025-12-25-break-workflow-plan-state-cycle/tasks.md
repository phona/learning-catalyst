# Tasks: Break Workflow `state.ts` <-> `plan.ts` Import Cycle

Related spec:
- `openspec/changes/break-workflow-plan-state-cycle/specs/workflow-import-graph/spec.md`

## Task 1: Create neutral types module

- [x] Add `src/main/services/domain/workflow/types/session-blueprint.ts`
- [x] Move `SessionBlueprintSchema` and `SessionBlueprint` into it

## Task 2: Update imports

- [x] Update `src/main/services/domain/workflow/state.ts` to import `SessionBlueprint` from new module
- [x] Update `src/main/services/domain/workflow/nodes/plan.ts` to import schema/types from new module

## Task 3: Validation

- [x] Run `npx madge --circular --extensions ts,tsx --ts-config tsconfig.json src/main/index.ts`
- [x] Run `npm test` (passes; Vitest v4 logs a `test.poolOptions` deprecation warning)
- [x] Run `npm run lint`
- [x] Run `npm run type-check`
