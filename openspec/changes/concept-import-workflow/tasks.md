# Tasks: Concepts Import Workflow (Parse vs Ingest)

## Checklist

- [ ] Decide final UX: parse-only with explicit ingest (default)
- [ ] Update parse flow so it does not write to knowledge DB
- [ ] Ensure results UI is the single place where "Ingest" happens
- [ ] Add UI guards to prevent double-ingest of the same result
- [ ] Update/adjust tests for the new flow
- [ ] Update docs that describe the import workflow (if needed)
- [ ] Run `npm run lint`
- [ ] Run `npm test` (or document unrelated pre-existing failures)
- [ ] `openspec validate concept-import-workflow`
- [ ] Archive change when complete

## Commands

Validate the proposal:

```
openspec validate concept-import-workflow
```

