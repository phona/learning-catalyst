# ChatGLM Thinking API

---
title: ChatGLM Thinking API Reference
description: Complete API specification for ChatGLM reasoning display and thinking features
version: 1.0.0
last_updated: 2025-10-15
difficulty: "Intermediate"
estimated_time: "20 minutes"
---

## Overview

The ChatGLM Thinking API provides comprehensive support for displaying AI reasoning processes from ChatGLM models. This API enables real-time visualization of the AI's thinking process, enhancing the learning experience by showing how the AI approaches problems step by step.

## 🎯 Core Features

### Primary Capabilities

- **🧠 Thinking Process Visualization**: Real-time display of AI reasoning content
- **📊 Performance Metrics**: Word count, speed, and timing analytics
- **⚡ Streaming Support**: Progressive content delivery with live updates
- **🎨 Visual Design**: Clean separation of thinking and response content
- **⏹️ Cancellation Control**: User-controlled response cancellation
- **🔄 Fallback Handling**: Graceful degradation when thinking unavailable

### Use Cases

- **Educational Learning**: Students can observe AI reasoning patterns
- **Problem Solving**: Step-by-step breakdown of complex problems
- **Teaching Tools**: Instructors can demonstrate logical thinking processes
- **Code Explanation**: Understanding AI approach to programming challenges
- **Analytics**: Performance tracking and learning insights

## 🏗️ Architecture

### System Integration

The ChatGLM Thinking API integrates seamlessly with the existing Learning Catalyst architecture:

```
User Input → Command Processor → ChatGLM Provider → API Response
                                    ↓
                              Thinking + Content
                                    ↓
                           Response Processing
                                    ↓
                         LiveStreamingManager
                                    ↓
                             Rich UI Display
```

### Component Architecture

**Core Components:**
- **ChatGLM Provider**: Handles thinking mode enablement and content extraction
- **ChatResponse Wrapper**: Unified interface for thinking and response content
- **LiveStreamingManager**: Real-time display and performance metrics
- **UI Components**: Rich-based visual elements for thinking display

## 📡 API Specification

### Provider Configuration

#### Enable Thinking Mode

```python
# ChatGLM Provider Configuration
completion_params = {
    "model": "glm-4",
    "messages": messages,
    "temperature": 0.7,
    "stream": True,
    "extra_body": {
        "thinking": {
            "type": "enabled"
        }
    }
}
```

**Parameters:**
- `extra_body.thinking.type`: `"enabled"` - Enables thinking mode
- All other standard ChatGLM API parameters supported

**Response Format:**
```json
{
  "choices": [
    {
      "delta": {
        "reasoning_content": "AI thinking process...",
        "content": "Actual response content..."
      },
      "finish_reason": "stop"
    }
  ],
  "model": "glm-4",
  "usage": {...}
}
```

### Content Processing

#### ChatResponse Interface

```python
class ChatResponse:
    """Unified response wrapper for thinking and content."""

    @property
    def reasoning_content(self) -> Optional[str]:
        """Extract thinking/reasoning content from response."""
        if self._is_streaming:
            return getattr(self._response.choices[0].delta, 'reasoning_content', None)
        else:
            return getattr(self._response.choices[0].message, 'reasoning_content', None)

    @property
    def content(self) -> str:
        """Extract main response content."""
        if self._is_streaming:
            return self._response.choices[0].delta.content or ""
        else:
            return self._response.choices[0].message.content

    @property
    def is_thinking(self) -> bool:
        """Check if response contains thinking content."""
        return self._is_thinking
```

**Key Methods:**
- `reasoning_content`: Gets AI thinking process
- `content`: Gets main response content
- `is_thinking`: Checks if thinking is active
- `stream()`: Iterator for streaming responses

### Streaming Integration

#### Real-time Processing

```python
async def process_thinking_stream(response: ChatResponse):
    """Process streaming thinking and response content."""

    thinking_content = ""
    response_content = []

    async for chunk in response:
        # Handle thinking content
        if chunk.reasoning_content:
            thinking_content += chunk.reasoning_content
            update_thinking_display(thinking_content)

        # Handle response content
        if chunk.content:
            response_content.append(chunk.content)
            update_response_display(''.join(response_content))

        # Update metrics
        update_performance_metrics(chunk)
```

**Features:**
- Progressive content updates
- Real-time metrics calculation
- Cancellation support
- Error handling and fallback

## 🎨 UI Components

### Display Structure

#### Visual Layout

```
🤖 AI Response (chatglm:glm-4)
┌─ 🧠 Thinking Process ─────────────────────────────────┐
│ [AI reasoning content displayed progressively]          │
└─────────────────────────────────────────────────────────┘
[Main response content with markdown rendering]

⚡ Streaming... 156 words (12.3 w/s) • Thinking: 89 words • 8.4s

📊 Response: 203 words (15.8 w/s) • Thinking: 124 words • ⏱️ 12.9s
───────────────────────────────────────────────────────────
```

#### Component Implementation

```python
# LiveStreamingManager Content Creation
def _create_content(self) -> List[Any]:
    """Create complete content layout for thinking display."""
    elements = []

    # Header with provider info
    header = Text(f"🤖 AI Response ({self.provider}:{self.model})", style="bold blue")
    elements.append(header)

    # Thinking content panel
    if self.thinking_content:
        thinking_panel = Panel(
            self.thinking_content,
            title="🧠 Thinking Process",
            border_style="cyan",
            padding=(0, 1)
        )
        elements.append(thinking_panel)

    # Main response content
    if self.response_content:
        elements.append(self.response_content)

    # Progress indicator (streaming)
    if self.is_streaming:
        progress = Text(f"⚡ Streaming... {metrics}", style="cyan")
        elements.append(progress)

    # Visual separator
    elements.append(Rule(style="blue"))

    return elements
```

### Performance Metrics

#### Metrics Calculation

```python
def calculate_performance_metrics(
    thinking_word_count: int,
    response_word_count: int,
    elapsed_time: float
) -> Dict[str, Any]:
    """Calculate comprehensive performance metrics."""

    # Words per second calculations
    thinking_wps = thinking_word_count / max(elapsed_time, 0.1) if thinking_word_count > 0 else 0
    response_wps = response_word_count / max(elapsed_time, 0.1) if response_word_count > 0 else 0
    total_wps = (thinking_word_count + response_word_count) / max(elapsed_time, 0.1)

    return {
        "thinking_word_count": thinking_word_count,
        "response_word_count": response_word_count,
        "total_word_count": thinking_word_count + response_word_count,
        "thinking_wps": round(thinking_wps, 1),
        "response_wps": round(response_wps, 1),
        "total_wps": round(total_wps, 1),
        "elapsed_time": round(elapsed_time, 1)
    }
```

**Metrics Display Formats:**
- **During Streaming**: `⚡ Streaming... 45 words | 12.3 w/s | 3.6s`
- **Completion with Thinking**: `📊 Response: 156 words (12.3 w/s) • Thinking: 89 words • ⏱️ 12.7s`
- **Completion without Thinking**: `📊 203 words (15.8 w/s) • ⏱️ 12.9s`

## 🔧 Configuration

### Model Support

#### Supported ChatGLM Models

| Model | Thinking Support | Performance | Use Case |
|-------|------------------|-------------|----------|
| `glm-4` | ✅ Full Support | High | Advanced reasoning |
| `glm-4-plus` | ✅ Enhanced Support | Very High | Complex problem solving |
| `glm-4-flash` | ✅ Fast Support | Fast | Quick responses |
| `glm-4-air` | ✅ Cost-Effective | Balanced | Educational use |

#### Model Selection

```bash
# Interactive model selection
Learning Catalyst > /config model
🤖 Available Models (chatglm provider):
  ✅ glm-4 (current) - Advanced reasoning
  ✅ glm-4-plus - Enhanced capabilities
  ✅ glm-4-flash - Fast responses
  ✅ glm-4-air - Cost-effective

[User selects model]
🤖 Model switched to: glm-4-plus
```

### Provider Configuration

#### Setup Process

```bash
# Configure ChatGLM provider
Learning Catalyst > /config provider chatglm
🔧 ChatGLM Provider Configuration:
  Enter your ChatGLM API key: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Verify configuration
Learning Catalyst > /config provider chatglm show
📊 ChatGLM Provider Details:
  Provider: chatglm
  Status: ✅ Configured and Connected
  API Base URL: https://open.bigmodel.cn/api/paas/v4
  Thinking Support: ✅ Enabled
  Models Available: glm-4, glm-4-plus, glm-4-flash, glm-4-air
  Current Model: glm-4
  Connection Test: ✅ Passed (2025-10-15 14:30:22)
```

## 🚨 Error Handling

### Fallback Mechanisms

#### Thinking Content Unavailable

```python
def handle_missing_thinking(response: ChatResponse):
    """Graceful handling when thinking content unavailable."""

    if not response.reasoning_content:
        # Display only response content
        show_response_only(response.content)
        log_info("Thinking content not available for this response")
    else:
        # Display both thinking and response
        show_complete_response(response)
```

#### Streaming Failures

```python
async def handle_streaming_failure(error: Exception):
    """Fallback to non-streaming when streaming fails."""

    try:
        # Try non-streaming fallback
        response = await client.chat.completions.create(
            **params,
            stream=False
        )
        return ChatResponse.from_complete(response)
    except Exception as fallback_error:
        # Final error handling
        handle_complete_failure(fallback_error)
        raise ProviderError("chatglm", "Failed to get response")
```

#### Network Issues

```python
def handle_connection_error(error: Exception):
    """Handle network and API connection issues."""

    if isinstance(error, openai.APIConnectionError):
        log_error(f"ChatGLM connection error: {error}")
        raise ProviderConnectionError("chatglm", f"Connection failed: {str(error)}")
    elif isinstance(error, openai.APITimeoutError):
        log_error(f"ChatGLM timeout: {error}")
        raise ProviderConnectionError("chatglm", f"Request timeout: {str(error)}")
    else:
        log_error(f"Unexpected ChatGLM error: {error}")
        raise ProviderError("chatglm", f"Unexpected error: {str(error)}")
```

### Error Recovery

#### Automatic Retries

```python
async def retry_with_backoff(
    func: Callable,
    max_retries: int = 3,
    base_delay: float = 1.0
):
    """Implement exponential backoff retry logic."""

    for attempt in range(max_retries):
        try:
            return await func()
        except Exception as e:
            if attempt == max_retries - 1:
                raise e

            delay = base_delay * (2 ** attempt)
            log_warning(f"Attempt {attempt + 1} failed, retrying in {delay}s: {e}")
            await asyncio.sleep(delay)
```

## 📊 Performance Optimization

### Streaming Efficiency

#### Update Frequency

```python
# Optimize refresh rate for smooth display
LIVE_REFRESH_RATE = 4  # Updates per second

async def optimized_display_update():
    """Balance smooth updates with performance."""

    with Live(console=Console(), refresh_per_second=LIVE_REFRESH_RATE) as live:
        async for chunk in response_stream:
            # Update display efficiently
            live.update(create_display_content())

            # Small delay to prevent excessive updates
            await asyncio.sleep(1.0 / LIVE_REFRESH_RATE)
```

#### Memory Management

```python
def efficient_content_accumulation():
    """Minimize memory usage during streaming."""

    thinking_buffer = []
    response_buffer = []

    def add_thinking_chunk(chunk: str):
        thinking_buffer.append(chunk)
        # Periodically combine to prevent list bloat
        if len(thinking_buffer) > 10:
            return ''.join(thinking_buffer)
        return None

    def add_response_chunk(chunk: str):
        response_buffer.append(chunk)
        # Similar optimization for response content
        if len(response_buffer) > 10:
            return ''.join(response_buffer)
        return None
```

### Content Rendering

#### Markdown Processing

```python
def efficient_markdown_rendering(content: str):
    """Optimize markdown rendering for large content."""

    # Cache rendered markdown for repeated content
    if content in _markdown_cache:
        return _markdown_cache[content]

    # Render and cache
    rendered = Markdown(content)
    _markdown_cache[content] = rendered

    # Limit cache size
    if len(_markdown_cache) > 100:
        _markdown_cache.clear()

    return rendered
```

## 🧪 Testing

### Unit Tests

#### Content Extraction

```python
def test_thinking_content_extraction():
    """Test thinking content extraction from responses."""

    # Mock response with thinking
    mock_response = create_mock_chatglm_response(
        reasoning_content="Step 1: Analyze the problem",
        content="Here's the solution..."
    )

    response = ChatResponse(mock_response, is_streaming=False)

    assert response.reasoning_content == "Step 1: Analyze the problem"
    assert response.content == "Here's the solution..."
    assert response.is_thinking is True

def test_streaming_thinking():
    """Test streaming thinking content processing."""

    stream_chunks = [
        {"reasoning_content": "Step 1: "},
        {"reasoning_content": "Analyze problem"},
        {"content": "Solution: "},
        {"content": "Detailed explanation"}
    ]

    thinking_accumulated = ""
    response_accumulated = ""

    for chunk in stream_chunks:
        if chunk.get("reasoning_content"):
            thinking_accumulated += chunk["reasoning_content"]
        if chunk.get("content"):
            response_accumulated += chunk["content"]

    assert thinking_accumulated == "Step 1: Analyze problem"
    assert response_accumulated == "Solution: Detailed explanation"
```

### Integration Tests

#### End-to-End Workflow

```python
async def test_chatglm_thinking_workflow():
    """Test complete ChatGLM thinking workflow."""

    # Setup
    provider = ChatGLMProvider(test_config)
    model = provider.create_chat_model("glm-4")

    # Execute request with thinking
    response = await model.send_message(
        messages=[Message("user", "Solve step by step: 2x + 5 = 15")],
        enable_thinking=True,
        stream=True
    )

    # Verify thinking content
    thinking_chunks = []
    response_chunks = []

    async for chunk in response:
        if chunk.reasoning_content:
            thinking_chunks.append(chunk.reasoning_content)
        if chunk.content:
            response_chunks.append(chunk.content)

    # Assertions
    assert len(thinking_chunks) > 0, "Should have thinking content"
    assert len(response_chunks) > 0, "Should have response content"
    assert chunk.is_thinking is True, "Should indicate thinking active"

    # Verify performance metrics
    metrics = calculate_performance_metrics(
        thinking_word_count=len(''.join(thinking_chunks).split()),
        response_word_count=len(''.join(response_chunks).split()),
        elapsed_time=chunk.timestamp
    )

    assert metrics["thinking_word_count"] > 0
    assert metrics["response_word_count"] > 0
    assert metrics["thinking_wps"] > 0
```

### Performance Tests

#### Streaming Performance

```python
async def test_streaming_performance():
    """Test streaming performance under load."""

    start_time = time.time()

    # Simulate high-frequency streaming
    response = await model.send_message(
        messages=[Message("user", "Complex math problem")],
        enable_thinking=True,
        stream=True
    )

    chunk_count = 0
    async for chunk in response:
        chunk_count += 1
        # Simulate processing time
        await asyncio.sleep(0.01)

    end_time = time.time()
    duration = end_time - start_time

    # Performance assertions
    assert chunk_count > 10, "Should receive multiple chunks"
    assert duration < 30, "Should complete within reasonable time"
    assert chunk_count / duration > 1, "Should maintain reasonable chunk rate"
```

## 🔗 Integration Examples

### Basic Usage

```python
# Simple thinking display
async def basic_thinking_example():
    """Demonstrate basic thinking functionality."""

    # Configure ChatGLM with thinking
    response = await model.send_message(
        messages=[Message("user", "Explain quantum computing")],
        enable_thinking=True,
        stream=True
    )

    thinking = ""
    answer = ""

    async for chunk in response:
        if chunk.reasoning_content:
            thinking += chunk.reasoning_content
            print(f"🧠 Thinking: {thinking}")

        if chunk.content:
            answer += chunk.content
            print(f"🤖 Response: {answer}")

    # Final metrics
    print(f"📊 Complete: {chunk}")
```

### Advanced Integration

```python
# Custom thinking processor
class CustomThinkingProcessor:
    """Advanced thinking content processor."""

    def __init__(self):
        self.thinking_steps = []
        self.current_step = ""

    async def process_thinking_stream(self, response: ChatResponse):
        """Process thinking with custom analysis."""

        async for chunk in response:
            # Process thinking content
            if chunk.reasoning_content:
                await self.analyze_thinking_step(chunk.reasoning_content)

            # Process response content
            if chunk.content:
                await self.enhance_response_display(chunk.content)

            # Custom metrics
            await self.update_custom_metrics(chunk)

    async def analyze_thinking_step(self, thinking: str):
        """Analyze individual thinking steps."""

        # Detect reasoning patterns
        if "step" in thinking.lower():
            self.thinking_steps.append(thinking)
            print(f"🎯 Reasoning Step: {thinking}")

        # Detect problem-solving approach
        if "approach" in thinking.lower() or "method" in thinking.lower():
            print(f"💡 Problem-Solving Approach Detected")

        # Track confidence indicators
        if "certain" in thinking.lower() or "confident" in thinking.lower():
            print(f"✅ High Confidence Indicated")
```

## 📚 Best Practices

### Performance Optimization

1. **Refresh Rate Management**: Use 4 updates/second for smooth display
2. **Memory Efficiency**: Accumulate content in buffers, limit cache sizes
3. **Cancellation Handling**: Implement graceful cancellation for long responses
4. **Error Recovery**: Use exponential backoff for retries

### User Experience

1. **Visual Clarity**: Separate thinking and response content distinctly
2. **Progress Indicators**: Show real-time metrics during streaming
3. **Cancellation Control**: Allow users to cancel long responses
4. **Fallback Handling**: Gracefully degrade when thinking unavailable

### Integration Patterns

1. **Provider Abstraction**: Maintain compatibility with existing provider patterns
2. **Configuration Management**: Use existing configuration infrastructure
3. **Error Handling**: Follow established error handling patterns
4. **Testing Strategy**: Comprehensive unit, integration, and performance tests

## 🔍 Troubleshooting

### Common Issues

#### Thinking Content Not Displaying

**Problem**: Thinking content appears but no reasoning process shown
**Solution**:
1. Verify ChatGLM model supports thinking mode
2. Check `extra_body.thinking.type` parameter is set to `"enabled"`
3. Ensure API key has sufficient permissions
4. Check network connectivity to ChatGLM API

#### Performance Issues

**Problem**: Slow streaming response display
**Solution**:
1. Reduce update frequency in Live display
2. Optimize content accumulation buffers
3. Check network latency to ChatGLM API
4. Monitor memory usage during streaming

#### Cancellation Not Working

**Problem**: Ctrl+C doesn't cancel long responses
**Solution**:
1. Verify signal handling is properly implemented
2. Check streaming cancellation logic
3. Ensure proper cleanup of async tasks
4. Test with different response lengths

### Debug Information

#### Enable Debug Logging

```bash
# Enable verbose mode for detailed debugging
Learning Catalyst > /verbose on

# Check provider configuration
Learning Catalyst > /config provider chatglm show

# Test provider connection
Learning Catalyst > /config provider chatglm test
```

#### Log Analysis

```python
# Enable detailed logging
import logging
logging.getLogger("chatglm_provider").setLevel(logging.DEBUG)

# Monitor API calls
logging.getLogger("openai").setLevel(logging.DEBUG)
```

---

*Last updated: October 15, 2025*
*Version: 1.0.0*
*Category: API Reference*
*Related: [Provider Interface](provider-interfaces.md), [CLI Commands API](cli-commands.md)*