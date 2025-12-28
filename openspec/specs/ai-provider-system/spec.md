# ai-provider-system Specification

## Purpose
TBD - created by archiving change add-siliconflow-chat-model. Update Purpose after archive.
## Requirements
### Requirement: Provider-Specific Model Customization

The system MUST support provider-specific model implementations to handle unique API behaviors while maintaining a common interface.

**Priority**: P1 (High)
**Effort**: M

**Rationale:**
- Different providers have unique response formats and behaviors
- SiliconFlow returns cumulative usage in every chunk (unlike OpenAI)
- Custom implementations eliminate warnings and ensure accurate tracking
- Extending `ChatOpenAI` preserves compatibility with LangChain ecosystem

**Implementation:**
```typescript
// Custom model extends base LangChain class
class SiliconFlowChatModel extends ChatOpenAI {
  async *_streamResponseChunks(
    messages: BaseMessage[],
    options: this['ParsedCallOptions'],
    runManager?: CallbackManagerForLLMRun
  ): AsyncGenerator<ChatGenerationChunk> {
    // Provider-specific logic to handle cumulative usage
  }
}
```

**Validation:**
- Custom model classes extend appropriate LangChain base classes
- Factory functions return correct model type for each provider
- Type safety maintained throughout

#### Scenario: SiliconFlow streaming without warnings

**Given** User has SiliconFlow provider configured
**And** User initiates a chat session that streams responses
**When** Streaming response chunks are received from SiliconFlow API
**Then** Each chunk's cumulative usage is converted to deltas
**And** No console warnings about duplicate field merging appear
**And** Token usage is accurately tracked without overcounting

#### Scenario: Other providers unaffected by SiliconFlow changes

**Given** OpenAI provider is configured
**And** User initiates a chat session
**When** Streaming response chunks are received from OpenAI API
**Then** Standard `ChatOpenAI` class is used (no custom override)
**And** Streaming works as expected
**And** No changes to behavior compared to before

### Requirement: Token Usage Accuracy

The system MUST accurately track token usage for all providers, handling provider-specific metadata formats.

**Priority**: P1 (High)
**Effort**: M

**Rationale:**
- Token usage is needed for cost tracking and analytics
- Cumulative values cause overcounting when summed
- Delta conversion ensures accurate totals
- Different providers may have different field names

**Implementation:**
```typescript
// Track previous cumulative totals
let lastInputTokens = 0;
let lastOutputTokens = 0;

// For each chunk:
const currentInput = chunk.usage_metadata['input_tokens'] ?? 0;
const currentOutput = chunk.usage_metadata['output_tokens'] ?? 0;
const inputDelta = currentInput - lastInputTokens;
const outputDelta = currentOutput - lastOutputTokens;
// Replace with deltas
chunk.usage_metadata['input_tokens'] = inputDelta;
chunk.usage_metadata['output_tokens'] = outputDelta;
```

**Validation:**
- Delta calculation correctly handles cumulative values
- Missing metadata is handled gracefully
- Final token totals match API-reported values

#### Scenario: Cumulative usage converted to deltas

**Given** SiliconFlow API returns chunks with cumulative usage:
- Chunk 1: `{ input_tokens: 10, output_tokens: 5 }`
- Chunk 2: `{ input_tokens: 10, output_tokens: 15 }`
- Chunk 3: `{ input_tokens: 10, output_tokens: 25 }`
**When** Custom model processes each chunk
**Then** Deltas are calculated:
- Chunk 1: `{ input_tokens: 10, output_tokens: 5 }`
- Chunk 2: `{ input_tokens: 0, output_tokens: 10 }`
- Chunk 3: `{ input_tokens: 0, output_tokens: 10 }`
**And** Summing all chunks yields correct total: `{ input_tokens: 10, output_tokens: 25 }`

#### Scenario: Missing usage metadata handled gracefully

**Given** A streaming chunk does not include `usage_metadata`
**When** Custom model processes the chunk
**Then** No error is thrown
**And** Chunk is yielded without modification
**And** Streaming continues normally

### Requirement: Console Output Cleanliness

The system MUST not produce spurious console warnings during normal operation.

**Priority**: P2 (Medium)
**Effort:** S

**Rationale:**
- Console warnings clutter output and hide real issues
- Current SiliconFlow warnings are benign (streaming works)
- Clean console improves developer experience
- Easier to spot actual problems

**Validation:**
- No warnings during SiliconFlow streaming
- Other providers produce no new warnings
- Error messages remain visible for actual issues

#### Scenario: No duplicate field warnings for SiliconFlow

**Given** SiliconFlow provider is being used
**And** User sends a message that triggers streaming
**When** Response is streamed in multiple chunks
**Then** No warnings about "field already exists" appear in console
**And** Only legitimate errors or warnings are shown

### Requirement: Provider Isolation

Changes to one provider's implementation MUST NOT affect other providers.

**Priority**: P1 (High)
**Effort**: S

**Rationale:**
- Multiple providers used in production
- Regression risk if changes leak across providers
- Independent testing and validation
- Easier to add new providers

**Validation:**
- Each provider has isolated factory function
- Custom model classes are provider-specific
- Tests verify other providers still work

#### Scenario: OpenAI unaffected by SiliconFlow changes

**Given** OpenAI provider configuration exists
**And** SiliconFlow custom model is added
**When** User chats with OpenAI provider
**Then** Streaming works as before
**And** No new warnings or errors
**And** Token usage tracking unchanged

#### Scenario: ChatGLM unaffected by SiliconFlow changes

**Given** ChatGLM provider configuration exists
**And** SiliconFlow custom model is added
**When** User chats with ChatGLM provider
**Then** Streaming works as before
**And** Thinking content visualization unchanged
**And** No new warnings or errors

