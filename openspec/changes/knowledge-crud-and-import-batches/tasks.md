# Tasks: Knowledge CRUD API and Import Batches

## Checklist

- [ ] Define CRUD API surface (concept + relationship) and types
- [ ] Implement CRUD handlers in main process and preload bridge
- [ ] Update UI to use CRUD for manual edits (stop using `ingestConcepts` for CRUD)
- [ ] Implement ingestion import batch tracking (`importBatchId`)
- [ ] Add tests for CRUD and batch tracking
- [ ] Update docs for the new API surface and import semantics
- [ ] Run `npm run lint`
- [ ] Run `npm test` (or document unrelated pre-existing failures)
- [ ] `openspec validate knowledge-crud-and-import-batches`
- [ ] Archive change when complete

## Commands

Validate the proposal:

```
openspec validate knowledge-crud-and-import-batches
```

