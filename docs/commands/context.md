# Context Management Commands

---
title: Context Management Commands Reference
description: Manage conversation context, compression, and system debugging with Learning Catalyst CLI
version: 1.0.0
last_updated: 2025-10-09
---

## Overview

Context management commands help you monitor and optimize the AI conversation context, manage memory usage, and debug system behavior. These commands are essential for maintaining smooth conversations and troubleshooting performance issues.

**✅ Current Status:**
- ✅ `/context` - **Fully Implemented** - Context usage monitoring
- ✅ `/compress` - **Fully Implemented** - Conversation context compression
- ✅ `/wait` - **Fully Implemented** - Rate limiting control
- ✅ `/verbose` - **Fully Implemented** - Debug mode control

## Available Commands

### `/context` - Monitor Conversation Context

Display current conversation context usage and memory information.

**Syntax**:
```bash
/context    # Show current context usage
```

**Output Features**:
- Current token count
- Maximum context limit
- Available remaining tokens
- Memory usage information

**Examples**:
```bash
Learning Catalyst > /context
= Context Usage:
  Current: 6,500 tokens
  Maximum: 8,192 tokens
  Available: 1,692 tokens
  Memory Usage: 245MB
```

### `/compress` - Compress Conversation Context

Compress the current conversation context to free up memory while preserving essential information.

**Syntax**:
```bash
/compress    # Compress conversation context
```

**What Compression Does**:
- Summarizes key conversation points
- Removes redundant information
- Preserves essential learning context
- Frees up memory for new conversations

**Examples**:
```bash
Learning Catalyst > /compress
✅ Conversation compressed to key points
- Preserved: Python decorator concepts, key examples, practice questions
- Removed: Redundant explanations, conversational fillers
- Memory freed: 2,100 tokens
```

### `/wait` - Control Request Timing

Pause before making the next AI request to respect rate limits or manage pacing.

**Syntax**:
```bash
/wait [seconds]    # Wait specified number of seconds
```

**Parameters**:
- `[seconds]` - Number of seconds to wait (integer)

**Use Cases**:
- Rate limiting compliance
- Cost management
- Pacing learning sessions
- Avoiding API timeouts

**Examples**:
```bash
Learning Catalyst > /wait 60
✓ Waiting 60 seconds before next request...

Learning Catalyst > explain quantum computing
[AI response after waiting period]
```

### `/verbose` - Toggle Debug Mode

Enable or disable verbose output for debugging and detailed system information.

**Syntax**:
```bash
/verbose on     # Enable verbose mode
/verbose off    # Disable verbose mode
```

**Verbose Mode Features**:
- Detailed API request information
- Token usage tracking
- Response time metrics
- Error details and stack traces
- System state information

**Examples**:
```bash
Learning Catalyst > /verbose on
= Verbose mode enabled

Learning Catalyst > explain recursion
🧠 [Detailed response]
[Verbose output shows:]
  Request: 156 tokens sent to API
  Response: 423 tokens received
  Response time: 1.2 seconds
  Cost: $0.008

Learning Catalyst > /verbose off
= Verbose mode disabled
```

## Usage Scenarios

### Managing Long Conversations

```bash
# Check context usage during long learning session
Learning Catalyst > /context
= Context Usage:
  Current: 7,890 tokens
  Maximum: 8,192 tokens
  Available: 302 tokens

# Context nearly full - compress to continue
Learning Catalyst > /compress
✅ Conversation compressed to key points
- Context reduced to 2,100 tokens
- 5,790 tokens freed

# Continue conversation with fresh context
Learning Catalyst > let's explore a new topic
🧠 I'd be happy to help you explore a new topic...
```

### Rate Limit Management

```bash
# Encountered rate limit error
Learning Catalyst > explain advanced algorithms
❌ Rate limit exceeded. Please wait before making another request.

# Wait for rate limit reset
Learning Catalyst > /wait 120
✓ Waiting 120 seconds before next request...

# Continue learning after wait period
Learning Catalyst > explain algorithms step by step
🧠 Let me explain algorithms step by step...
```

### Debugging API Issues

```bash
# Enable verbose mode for debugging
Learning Catalyst > /verbose on
= Verbose mode enabled

# Make request to see detailed information
Learning Catalyst > explain machine learning
🧠 [AI response]
[Verbose details:]
  API Request: POST https://api.openai.com/v1/chat/completions
  Request Payload: 145 tokens
  Response Time: 2.3 seconds
  HTTP Status: 200 OK
  Tokens Used: 412 input, 287 output
  Cost: $0.015

# Check if there are performance issues
Learning Catalyst > /context
= Context Usage:
  Current: 3,200 tokens
  Maximum: 8,192 tokens
  Available: 4,992 tokens
  Memory Usage: 180MB

# Disable verbose when done debugging
Learning Catalyst > /verbose off
= Verbose mode disabled
```

### Memory Optimization

```bash
# Monitor memory usage during complex topic
Learning Catalyst > /context
= Context Usage:
  Current: 6,800 tokens
  Maximum: 8,192 tokens
  Available: 1,392 tokens
  Memory Usage: 320MB

# Compress to optimize memory
Learning Catalyst > /compress
✅ Conversation compressed to key points
- Key concepts preserved: Neural networks, backpropagation, gradient descent
- Examples saved: Code snippets, mathematical formulas
- Memory freed: 3,200 tokens
- New memory usage: 180MB

# Verify optimization results
Learning Catalyst > /context
= Context Usage:
  Current: 3,600 tokens
  Maximum: 8,192 tokens
  Available: 4,592 tokens
  Memory Usage: 180MB
```

## Advanced Usage Patterns

### Strategic Context Management

```bash
# Before complex topics - check context
Learning Catalyst > /context
= Context Usage: 4,100/8,192 tokens

# Save current context before deep dive
Learning Catalyst > /checkpoint save before-complex-topic
✅ Checkpoint saved: before-complex-topic

# Or use auto-naming for quick save
Learning Catalyst > /checkpoint save
✅ Checkpoint saved: context-management_2025-10-09_143022

# Compress to maximize available context
Learning Catalyst > /compress
✅ Conversation compressed

# Now tackle complex topic with full context
Learning Catalyst > explain quantum computing in detail
🧠 [Comprehensive explanation with full context available]
```

### Cost Management

```bash
# Use verbose mode to track costs
Learning Catalyst > /verbose on
= Verbose mode enabled

# Monitor expensive requests
Learning Catalyst > write a comprehensive tutorial on React
🧠 [Detailed tutorial]
[Verbose shows:]
  Tokens: 1,234 input, 2,456 output
  Cost: $0.089
  Response time: 4.2 seconds

# Use wait to pace expensive requests
Learning Catalyst > /wait 30
✓ Waiting 30 seconds (cost management)

# Continue with more cost-effective approach
Learning Catalyst > can you give me a brief overview instead?
🧠 [Concise overview]
[Verbose shows:]
  Tokens: 89 input, 156 output
  Cost: $0.004
  Response time: 0.8 seconds
```

### Learning Session Pacing

```bash
# Use wait for effective learning pacing
Learning Catalyst > explain neural networks
🧠 [Detailed explanation]

# Pause for reflection and practice
Learning Catalyst > /wait 30
✓ Waiting 30 seconds for reflection...

# Test understanding after pause
Learning Catalyst > can you give me practice questions about neural networks?
🧠 Practice Questions: Neural Networks
Here are some questions to test your understanding...

# Continue at comfortable pace
Learning Catalyst > /wait 60
✓ Waiting 60 seconds for review...

Learning Catalyst > I think I'm ready for the next topic
🧠 Great! Let's move on to the next concept...
```

## Troubleshooting

### Context Length Errors

```bash
# Error: Maximum context length exceeded
Learning Catalyst > explain the entire history of AI
❌ Error: Maximum context length exceeded

# Solution 1: Check context usage
Learning Catalyst > /context
= Context Usage:
  Current: 8,200 tokens
  Maximum: 8,192 tokens
  Available: -8 tokens (over limit)

# Solution 2: Compress context
Learning Catalyst > /compress
✅ Conversation compressed to key points
- Context reduced to 1,800 tokens
- Can now continue conversation

# Solution 3: Ask for more focused questions
Learning Catalyst > can you give me a brief overview of AI history instead?
🧠 [Concise overview within context limits]
```

### Rate Limit Issues

```bash
# Error: Rate limit exceeded
Learning Catalyst > explain advanced mathematics
❌ Rate limit exceeded. Maximum 60 requests per minute.

# Check when limit resets
Learning Catalyst > /verbose on
= Verbose mode enabled

Learning Catalyst > /wait 60
✓ Waiting 60 seconds for rate limit reset

# Monitor usage in verbose mode
Learning Catalyst > explain calculus basics
🧠 [Explanation]
[Verbose shows:]
  Rate limit status: 58/60 requests used
  Time until reset: 45 seconds
```

### Performance Issues

```bash
# Slow responses - debug with verbose mode
Learning Catalyst > /verbose on
= Verbose mode enabled

Learning Catalyst > explain complex algorithms
🧠 [Response taking long time]
[Verbose shows:]
  Response time: 8.5 seconds
  Context size: 7,200 tokens (large)
  Network latency: 1.2 seconds

# Solution: Compress large context
Learning Catalyst > /compress
✅ Conversation compressed

# Try again with optimized context
Learning Catalyst > explain algorithms
🧠 [Faster response]
[Verbose shows:]
  Response time: 2.1 seconds
  Context size: 2,100 tokens (optimized)
```

## Best Practices

1. **Monitor Context**: Use `/context` before complex topics
2. **Compress When Needed**: Compress when approaching context limits
3. **Rate Limit Awareness**: Use `/wait` to respect API limits
4. **Debug When Necessary**: Use `/verbose` for troubleshooting
5. **Strategic Pauses**: Use `/wait` for learning reflection

## Integration with Other Commands

### Configuration Integration
```bash
# Check current configuration
Learning Catalyst > /config
= Current Configuration:
  Provider: openai
  Model: gpt-4
  Status: ✓ Connected

# Monitor context usage
Learning Catalyst > /context
= Context Usage:
  Current: 1,200 tokens
  Maximum: 8,192 tokens
  Available: 6,992 tokens
```

### Session Management Integration
```bash
# Save checkpoint before context management
Learning Catalyst > /checkpoint save pre-compression
✅ Checkpoint saved: pre-compression

# Or use auto-naming for quick save
Learning Catalyst > /checkpoint save
✅ Checkpoint saved: context-optimization_2025-10-09_143045

# Compress context
Learning Catalyst > /compress
✅ Conversation compressed

# Continue with optimized context
Learning Catalyst > /checkpoint save post-compression
✅ Checkpoint saved: post-compression

# Auto-save after optimization
Learning Catalyst > /checkpoint save
✅ Checkpoint saved: post-compression-optimized_2025-10-09_143108
```

## Getting Help

```bash
# Get help with available commands
Learning Catalyst > /help
=✓ Available Commands:
  /help, /quit, /clear, /config, /tokens, /checkpoint, /context, /compress, /wait, /verbose

# Check current status
Learning Catalyst > /context
```

---

*Last updated: October 9, 2025*
*Version: 1.0.0*
*Category: Context Management Commands*