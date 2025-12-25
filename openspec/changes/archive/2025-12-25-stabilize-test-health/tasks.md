# stabilize-test-health Tasks

## Overview

These tasks implement the goals from the `stabilize-test-health` proposal:

- Stabilize workflow E2E tests for complete learning paths.
- Restore a clean lint baseline for renderer code affected by Fast Refresh and hook dependency rules.

Tasks are ordered to deliver a green test and lint baseline as early as possible.

## Tasks

- [x] 1. **Audit failing workflow tests**
   - Re-run targeted tests for faster feedback:
     - `npm test -- --run src/main/services/domain/workflow/__tests__/full-workflow.test.ts`
     - `npm test -- --run src/main/services/domain/workflow/__tests__/workflow-graph.test.ts`
   - Confirm which assertions fail and capture current `result` shapes (e.g., message count, topic, completion message).
   - Ensure failures are due to brittle message-count expectations rather than genuine workflow regressions.

- [x] 2. **Align workflow E2E tests with semantic expectations**
   - Update `full-workflow.test.ts`:
     - For `executes complete standard learning path from start to finish`:
       - Assert that `result.messages` is a non-empty array.
       - Assert that `result.topic` (or equivalent) is defined.
       - Assert that the last message contains completion/summary content.
       - Remove or relax `messages.length >= 3` to a semantic assertion that is not sensitive to internal message grouping.
     - For `executes complete fast-track assessment for experienced learners`:
       - Assert non-empty `messages`.
       - Assert that the fast-track path completes (e.g., by checking state, topic, or completion message).
       - Remove or relax `messages.length > 2` in favour of semantic conditions.
   - Update `workflow-graph.test.ts`:
     - For the `executes complete standard learning path from start to finish` test, mirror the semantic assertions used in `full-workflow.test.ts`.

- [x] 3. **Run workflow tests and validate**
   - Run:
     - `npm run test:main`
   - Confirm:
     - All main-process workflow tests pass.
     - No new failures appear in other main-process suites.
   - Current status:
     - `npm run test:main` passes.

- [x] 4. **Fix `FileTree` hook dependency warning**
   - In `src/renderer/features/discovery/ui/FileTree.tsx`:
     - Review the `useEffect` that invokes `loadDirectory` / `loadDefaultDirectory`.
     - Ensure dependencies are correctly declared (e.g. include `loadDirectory` or restructure to avoid referencing functions not listed in the dependency array).
     - Preserve current runtime behaviour for initial directory loading.

- [x] 5. **Refactor TSX modules with `react-refresh/only-export-components` warnings (renderer hooks/providers)**
   - For each of:
     - `src/renderer/hooks/useElectronAPI.tsx`
     - `src/renderer/hooks/useThreadListAdapter.tsx`
     - `src/renderer/services/services-provider.tsx`
     - `src/renderer/stores/chat/ChatStoreProvider.tsx`
   - Identify non-React helper exports (utility functions, constants, etc.).
   - Move these helpers into adjacent `.ts` files (e.g. `useElectronAPI.helpers.ts`) and import them into the TSX modules as needed.
   - Ensure TSX files primarily export React components/hooks/providers to satisfy Fast Refresh rules.

- [x] 6. **Refactor TSX test utilities with `react-refresh/only-export-components` warnings**
   - For:
     - `src/test/utils/helpers/test-utils.tsx`
     - `src/test/utils/helpers/utils.tsx`
     - `src/test/utils/test-providers.tsx`
   - Decide per file:
     - If the file primarily provides helpers and does not need JSX, convert it to `.ts` and adjust imports.
     - If the file mixes providers/components and helpers, move generic helpers to `.ts` modules and keep TSX focused on React components/providers.
   - Confirm test suites still compile and run after refactors.

- [x] 7. **Re-run lint and adjust as needed**
   - Run:
     - `npm run lint`
   - Confirm:
     - No `react-hooks/exhaustive-deps` warnings for production renderer code.
     - No `react-refresh/only-export-components` warnings for renderer and test utility TSX modules.
   - If any remaining warnings are intentional (e.g. in narrowly scoped test helpers), either:
     - Adjust structure to remove them, or
     - Add narrowly scoped `eslint-disable` comments with clear justification and update specs if needed.

- [x] 8. **Update docs/specs and validate change**
   - Ensure the `workflow-test-stability` and `renderer-lint-health` spec deltas accurately reflect the implemented behaviour.
   - Run:
     - `openspec validate stabilize-test-health --strict`
   - Fix any validation issues in `proposal.md`, `tasks.md`, `design.md`, or spec delta files.

- [x] 9. **Final verification**
   - Run:
     - `npm run test:main`
     - `npm run lint`
   - Confirm:
     - All main-process tests pass.
     - Lint passes without the previously reported warnings.
   - Prepare a brief change summary referencing this OpenSpec change for inclusion in PR description.
   - Current status:
     - `npm run lint` passes.
     - `npm test` (main + renderer) passes.
