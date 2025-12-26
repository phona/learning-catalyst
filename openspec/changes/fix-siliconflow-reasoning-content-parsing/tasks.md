# Tasks: Fix SiliconFlow Reasoning Content Parsing

## Checklist

- [ ] Confirm current SiliconFlow reasoning loss with a small local repro (streaming + non-streaming)
- [ ] Add RED unit tests for SiliconFlow reasoning extraction (stream + invoke)
- [ ] Add RED unit test for `streamLLM()` reasoning fallback from `additional_kwargs.reasoning_content`
- [ ] Implement SiliconFlow-only raw response capture and reasoning extraction
- [ ] Ensure `__raw_response` is removed after parsing (memory guardrail)
- [ ] Turn tests GREEN and keep them deterministic
- [ ] Run `npm test`
- [ ] Run `npm run lint`
- [ ] `openspec validate fix-siliconflow-reasoning-content-parsing --strict`
- [ ] Archive change when complete

## Commands

Validate OpenSpec structure:
```
openspec validate fix-siliconflow-reasoning-content-parsing --strict
```

Run tests + lint:
```
npm test
npm run lint
```

