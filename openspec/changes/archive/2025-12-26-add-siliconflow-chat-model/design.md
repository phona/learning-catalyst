# Design: SiliconFlow Chat Model

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    Application Layer                             │
│  (Workflow Nodes, Agent Tools, Chat Services)                   │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              Provider Factory Layer                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐ │
│  │   OpenAI     │  │   ChatGLM    │  │    SiliconFlow       │ │
│  │  ChatOpenAI  │  │  ChatOpenAI  │  │  SiliconFlowChatModel│ │
│  └──────────────┘  └──────────────┘  │  (extends ChatOpenAI) │ │
│                                      └──────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    LangChain Core                                │
│  - BaseChatModel                                                 │
│  - _streamResponseChunks()                                       │
│  - AIMessageChunk                                                │
│  - usage_metadata                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Component Design

### SiliconFlowChatModel Class

**Location:** `src/main/services/agent/siliconflow-chat-model.ts`

```typescript
import { ChatOpenAI } from '@langchain/openai';
import type { BaseMessage } from '@langchain/core/messages';
import type { ChatGenerationChunk } from '@langchain/core/outputs';
import type { CallbackManagerForLLMRun } from '@langchain/core/callbacks/manager';

export class SiliconFlowChatModel extends ChatOpenAI {
  /**
   * Override streaming to convert cumulative usage to deltas.
   *
   * SiliconFlow returns cumulative token counts in each chunk:
   * - Chunk 1: { input_tokens: 10, output_tokens: 5 }
   * - Chunk 2: { input_tokens: 10, output_tokens: 15 }
   * - Chunk 3: { input_tokens: 10, output_tokens: 25 }
   *
   * LangChain sums these, causing overcounting. We convert to deltas:
   * - Chunk 1: { input_tokens: 10, output_tokens: 5 }   (baseline)
   * - Chunk 2: { input_tokens: 0,  output_tokens: 10 }  (15 - 5)
   * - Chunk 3: { input_tokens: 0,  output_tokens: 10 }  (25 - 15)
   */
  async *_streamResponseChunks(
    messages: BaseMessage[],
    options: this['ParsedCallOptions'],
    runManager?: CallbackManagerForLLMRun
  ): AsyncGenerator<ChatGenerationChunk> {
    let lastInputTokens = 0;
    let lastOutputTokens = 0;

    for await (const chunk of super._streamResponseChunks(messages, options, runManager)) {
      // Only process if usage_metadata exists
      if (chunk.message?.usage_metadata) {
        const currentInput = chunk.message.usage_metadata['input_tokens'] ?? 0;
        const currentOutput = chunk.message.usage_metadata['output_tokens'] ?? 0;

        // Calculate deltas
        const inputDelta = currentInput - lastInputTokens;
        const outputDelta = currentOutput - lastOutputTokens;

        // Replace cumulative with deltas
        chunk.message.usage_metadata['input_tokens'] = inputDelta;
        chunk.message.usage_metadata['output_tokens'] = outputDelta;
        chunk.message.usage_metadata['total_tokens'] = inputDelta + outputDelta;

        // Update tracking state
        lastInputTokens = currentInput;
        lastOutputTokens = currentOutput;
      }

      yield chunk;
    }
  }
}
```

### Factory Integration

**Location:** `src/main/services/agent/provider-factory.ts`

```typescript
import { SiliconFlowChatModel } from './siliconflow-chat-model';

const PROVIDER_IMPLEMENTATIONS: Record<string, ProviderImplementation> = {
  // ... other providers
  siliconflow: {
    createModel: (settings, modelId, selectedModel) =>
      new SiliconFlowChatModel({
        modelName: modelId,
        temperature: selectedModel.temperature,
        maxTokens: selectedModel.maxTokens,
        apiKey: settings.apiKey,
        maxRetries: 1,
        configuration: settings.baseUrl ? { baseURL: settings.baseUrl } : undefined,
      }),
    createEmbeddings: makeSiliconFlowEmbeddings,
    createReranker: makeSiliconFlowReranker,
  },
};
```

## Data Flow

### Streaming Flow with Custom Model

```
┌─────────────────────┐
│  Workflow/Agent     │
│  calls model.stream │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────────────────────┐
│  SiliconFlowChatModel               │
│  _streamResponseChunks()            │
│  ┌───────────────────────────────┐  │
│  │ Track: lastTokens = 0        │  │
│  │ FOR each chunk:               │  │
│  │   1. Get super._stream()      │  │
│  │   2. Extract cumulative usage│  │
│  │   3. Calculate delta         │  │
│  │   4. Replace metadata        │  │
│  │   5. Update lastTokens       │  │
│  │   6. yield chunk             │  │
│  └───────────────────────────────┘  │
└───────────────────┬─────────────────┘
                    │
                    ▼
┌─────────────────────────────────────┐
│  LangChain Merge Logic              │
│  _mergeDicts() receives chunks      │
│  with unique delta values           │
│  → No duplicate field warnings      │
└─────────────────────────────────────┘
```

## Edge Cases and Handling

| Edge Case | Behavior | Mitigation |
|-----------|----------|------------|
| Missing `usage_metadata` | Skip delta calculation | Optional chaining `chunk.message?.usage_metadata` |
| Zero tokens in chunk | Delta = 0 - 0 = 0 | Handled naturally |
| Non-monotonic counts | Negative delta possible | LangChain sum still correct over stream |
| Empty response | No chunks yielded | Generator completes normally |
| Concurrent streams | Separate generator instances | State local to each invocation |

## Performance Considerations

| Aspect | Impact | Justification |
|--------|--------|----------------|
| **CPU overhead** | ~2 subtractions per chunk | Negligible |
| **Memory overhead** | 2 integer variables | 16 bytes total |
| **Network overhead** | None | Same API calls |
| **Latency** | None | Synchronous operation |

## Type Safety

All code maintains TypeScript strict mode compliance:

```typescript
// Explicit type annotations
async *_streamResponseChunks(
  messages: BaseMessage[],
  options: this['ParsedCallOptions'],
  runManager?: CallbackManagerForLLMRun
): AsyncGenerator<ChatGenerationChunk>

// Optional chaining for safety
chunk.message?.usage_metadata?.['input_tokens'] ?? 0
```

## Testing Strategy

### Unit Tests

1. **Delta calculation**: Verify correct delta computation
2. **Missing metadata**: Handle chunks without usage
3. **Cumulative edge cases**: Zero, monotonic, non-monotonic
4. **Generator completion**: Proper cleanup

### Integration Tests

1. **End-to-end streaming**: Full response with multiple chunks
2. **No console warnings**: Verify clean output
3. **Token accuracy**: Compare with API dashboard
4. **Other providers**: Ensure OpenAI, ChatGLM unaffected

## Alternatives Considered

### Alternative 1: Console.warn Patch
**Pros:** Simple, 5 lines of code
**Cons:** Hides warnings vs. fixes root cause; global side effects
**Decision:** Rejected in favor of proper fix

### Alternative 2: Fork LangChain
**Pros:** Full control
**Cons:** Maintenance burden; upgrade challenges
**Decision:** Rejected due to maintenance cost

### Alternative 3: Live with warnings
**Pros:** No code changes
**Cons:** Noisy console; potential token overcounting
**Decision:** Rejected due to user experience impact

## Maintenance Notes

### LangChain Version Compatibility

The override depends on:
- `ChatOpenAI` class structure
- `_streamResponseChunks()` protected method signature
- `AIMessageChunk.usage_metadata` field names

**Action required on LangChain upgrades:**
- Verify override still compiles
- Run test suite
- Check for new streaming APIs

### SiliconFlow API Changes

If SiliconFlow changes their streaming format:
- Update field names in delta calculation
- Adjust cumulative vs. delta assumption
- Add handling for new fields

## Implementation Phases

### Phase 1: Core Implementation
- Create `SiliconFlowChatModel` class
- Override `_streamResponseChunks()`
- Implement delta calculation logic

### Phase 2: Integration
- Update `provider-factory.ts`
- Replace `makeSiliconFlowChatModel` usage
- Import new class

### Phase 3: Testing
- Write unit tests
- Write integration tests
- Verify no warnings in console
- Validate token accuracy

### Phase 4: Validation
- Run full test suite
- Test with actual SiliconFlow API
- Verify other providers unaffected
- Code review and merge
