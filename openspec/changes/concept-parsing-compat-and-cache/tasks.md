# Tasks: Concept Parsing Compatibility and Cache UX

## Checklist

- [ ] Define the supported parse formats and document them (markdown-only vs fallback)
- [ ] Add preflight checks and clear user-facing messages for unsupported inputs
- [ ] Add retention controls for parsing job cache (age and/or count based)
- [ ] Surface cache stats (count, last job id) in the parsing UI
- [ ] Add/adjust tests for preflight and retention behaviors
- [ ] Run `npm run lint`
- [ ] Run `npm test` (or document unrelated pre-existing failures)
- [ ] `openspec validate concept-parsing-compat-and-cache`
- [ ] Archive change when complete

## Commands

Validate the proposal:

```
openspec validate concept-parsing-compat-and-cache
```

