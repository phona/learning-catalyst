# Tasks: Fix Stuck Workflow Error State (TDD)

## Checklist

- [x] Confirm regression test fails (Red)
- [x] Implement reducer change to allow `null` clear (Green)
- [x] Run regression test 3x for determinism
- [x] Run `npm run lint`
- [x] Run `npm test` (or document unrelated pre-existing failures)
- [x] Archive change when complete

## Commands

Run a single main test file while iterating:

```
npm run test:main:file -- src/main/services/domain/workflow/__tests__/error-stuck-regression.test.ts
```

Then lint:

```
npm run lint
```
