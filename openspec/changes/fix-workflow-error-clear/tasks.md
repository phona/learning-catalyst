# Tasks: Fix Stuck Workflow Error State (TDD)

## Checklist

- [ ] Confirm regression test fails (Red)
- [ ] Implement reducer change to allow `null` clear (Green)
- [ ] Run regression test 3x for determinism
- [ ] Run `npm run lint`
- [ ] Run `npm test` (or document unrelated pre-existing failures)
- [ ] Archive change when complete

## Commands

Run a single main test file while iterating:

```
npm run test:main:file -- src/main/services/domain/workflow/__tests__/error-stuck-regression.test.ts
```

Then lint:

```
npm run lint
```

