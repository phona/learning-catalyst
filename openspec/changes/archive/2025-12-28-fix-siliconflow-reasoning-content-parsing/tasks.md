# Tasks: Fix SiliconFlow Reasoning Content Parsing

## Checklist

- [x] Confirm current SiliconFlow reasoning loss with a small local repro (streaming + non-streaming)
- [x] Add RED unit tests for SiliconFlow reasoning extraction (stream + invoke)
- [x] Add RED unit test for `streamLLM()` reasoning fallback from `additional_kwargs.reasoning_content`
- [x] Implement SiliconFlow-only raw response capture and reasoning extraction
- [x] Ensure `__raw_response` is removed after parsing (memory guardrail)
- [x] Turn tests GREEN and keep them deterministic
- [x] Run `npm test`
- [x] Run `npm run lint`
- [x] `openspec validate fix-siliconflow-reasoning-content-parsing --strict`
- [x] Archive change when complete

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
