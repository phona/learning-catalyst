# Proposal: Break Workflow `state.ts` <-> `plan.ts` Import Cycle

## Why

There is a real circular dependency in the workflow domain:

- `src/main/services/domain/workflow/state.ts` imports `SessionBlueprint` from `nodes/plan.ts`
- `src/main/services/domain/workflow/nodes/plan.ts` imports `WorkflowStateAnnotation` from `state.ts`

This makes refactors risky and can create subtle issues when module loading order changes.

It also breaks a simple layering rule:

- `state.ts` is **core** workflow state (used everywhere)
- `nodes/*` are **leaf** workflow steps (should depend on state, not the other way around)

Simple picture:
```
state.ts  ----imports---->  plan.ts
  ^                         |
  |----imports--------------|
```

## Goal

Move shared workflow types so the dependency graph becomes one-directional:

```
state.ts  ->  types/session-blueprint.ts  <-  nodes/plan.ts
```

## What Changes

- Extract `SessionBlueprintSchema` + `SessionBlueprint` into a neutral module under `workflow/types/`.
- Update imports so `state.ts` never imports from `workflow/nodes/*`.

## Proposed Solution

1) Extract the session blueprint schema + types into a neutral module, for example:

- `src/main/services/domain/workflow/types/session-blueprint.ts`

This module should contain:
- `SessionBlueprintSchema`
- `SessionBlueprint` type
- any helper constants directly related to the blueprint schema

2) Update:
- `state.ts` to import `SessionBlueprint` from the new module (prefer `import type` to avoid runtime coupling)
- `plan.ts` to import schema/types from the new module (it can optionally re-export them to avoid churn in tests/callers)

Now `state.ts` no longer imports from `nodes/`.

## Scope

In scope:
- Type/schema extraction
- Import rewrites
- Update any tests that reference the old exports

Out of scope:
- Changing workflow behavior or prompts
- Refactoring node logic

## Acceptance Criteria

- `madge --circular` reports no workflow cycles.
- Workflow tests pass unchanged (or with only import updates).
- No runtime behavior changes.
