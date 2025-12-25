# Tasks: Break Workflow `state.ts` <-> `plan.ts` Import Cycle

## Task 1: Create neutral types module

- [ ] Add `src/main/services/domain/workflow/types/session-blueprint.ts`
- [ ] Move `SessionBlueprintSchema` and `SessionBlueprint` into it

## Task 2: Update imports

- [ ] Update `src/main/services/domain/workflow/state.ts` to import `SessionBlueprint` from new module
- [ ] Update `src/main/services/domain/workflow/nodes/plan.ts` to import schema/types from new module

## Task 3: Validation

- [ ] Run `npx madge --circular --extensions ts,tsx --ts-config tsconfig.json src/main/index.ts`
- [ ] Run `npm test`
- [ ] Run `npm run lint`
- [ ] Run `npm run type-check`

