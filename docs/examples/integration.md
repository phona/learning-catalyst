# AI Provider and Model Setup Examples

---
title: AI Provider and Model Setup Examples
description: Step-by-step workflows for configuring AI providers and models in Learning Catalyst CLI
version: 1.0.0
last_updated: 2025-10-08
---

## Overview

This guide provides comprehensive examples for setting up and managing AI providers and models in Learning Catalyst CLI. Each workflow includes step-by-step commands for configuring different AI services, managing API keys, and switching between models.

## Prerequisites

- Learning Catalyst CLI installed
- Active accounts with AI providers (OpenAI, Anthropic, etc.)
- API keys from your chosen providers
- Basic familiarity with command-line interface

## Workflow 1: OpenAI Provider Setup

### Scenario: Configure OpenAI GPT Models

**Perfect for**: Users wanting to use GPT-4, GPT-3.5, and other OpenAI models

```bash
# Start Learning Catalyst
$> learning-catalyst

# Check current configuration
Learning Catalyst > /config
= Current Configuration:
  Provider: None configured
  Model: None set
  Status: Not connected

# Configure OpenAI provider (using actual command syntax)
Learning Catalyst > /config provider openai
🔧 OpenAI Provider Configuration:
  Enter your OpenAI API key (or press Enter to skip): sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Check provider configuration
Learning Catalyst > /config provider openai show
📊 OpenAI Provider Details:
  Provider: openai
  Status: ✅ Configured and Connected
  API Base URL: https://api.openai.com
  Models Available:
    • gpt-4 (chat)
    • gpt-4o (chat)
    • gpt-4o-mini (chat)
    • text-embedding-3-small (embedding)
  Current Model: gpt-4o
  Connection Test: ✅ Passed (2025-10-08 13:45:22)

# Select model using interactive dialog
Learning Catalyst > /config model
🤖 Available Models (openai provider):
  ✅ gpt-4o (current)
  ✅ gpt-4
  ✅ gpt-4o-mini
[User selects gpt-4 from the list]
🤖 Model set to: gpt-4

# Test the configuration
Learning Catalyst > Hello, can you help me learn Python?
🧠 Hello! I'd be happy to help you learn Python. What specific topic would you like to start with?

# Check current configuration
Learning Catalyst > /config
= Current Configuration:
  Provider: openai
  Model: gpt-4
  API Key: ✓ Valid
  Status: ✓ Connected
```

**Note**: The current implementation uses interactive configuration dialogs. Use `/config provider <name>` to set up providers and `/config model` to select models interactively.

### Model Management Examples

```bash
# Switch models using interactive selection
Learning Catalyst > /config model
🤖 Available Models (openai provider):
  ✅ gpt-4 (current)
  ✅ gpt-3.5-turbo
  ✅ gpt-4-turbo
[User selects gpt-3.5-turbo from the list]
🤖 Model switched to: gpt-3.5-turbo

# Test different model performance
Learning Catalyst > explain machine learning basics
🧠 [Concise and fast response from GPT-3.5-turbo]

# Switch back to previous model
Learning Catalyst > /config model
🤖 Available Models (openai provider):
  ✅ gpt-3.5-turbo (current)
  ✅ gpt-4
  ✅ gpt-4-turbo
[User selects gpt-4 from the list]
🤖 Model switched to: gpt-4

Learning Catalyst > explain machine learning basics
🧠 [Detailed and comprehensive response from GPT-4]
```

### Model Selection Features

```bash
# Simple model selection using current implementation
Learning Catalyst > /config model
🤖 Available Models (deepseek provider):
  ✅ deepseek-chat (current)
  ✅ deepseek-coder
[User selects deepseek-coder from the list]
🤖 Model switched to: deepseek-coder (Programming specialized)

# Model selection shows available options for current provider
Learning Catalyst > /config model
🤖 Available Models (openai provider):
  ✅ gpt-4o (current)
  ✅ gpt-4
  ✅ gpt-3.5-turbo
[User selects gpt-3.5-turbo from the list]
🤖 Model switched to: gpt-3.5-turbo
```

## Workflow 2: Deepseek Provider Setup

### Scenario: Configure Deepseek AI Models

**Perfect for**: Users seeking cost-effective models with strong coding capabilities

```bash
# Start with clean configuration
$> learning-catalyst

# Configure Deepseek provider
Learning Catalyst > /config provider deepseek
🔧 Deepseek Provider Configuration:
  Enter your Deepseek API key: sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Check provider configuration
Learning Catalyst > /config provider deepseek show
📊 Deepseek Provider Details:
  Provider: deepseek
  Status: ✅ Configured and Connected
  API Base URL: https://api.deepseek.com
  Models Available:
    • deepseek-chat (chat)
    • deepseek-coder (chat)
  Current Model: deepseek-chat
  Connection Test: ✅ Passed (2025-10-08 14:30:15)

# Select model using interactive dialog
Learning Catalyst > /config model
🤖 Available Models (deepseek provider):
  ✅ deepseek-chat (current)
  ✅ deepseek-coder
[User keeps deepseek-chat as current selection]

# Test Deepseek's capabilities
Learning Catalyst > What are your strengths as a learning assistant?
🧠 As Deepseek, I excel at:
  - Programming and code explanation
  - Mathematical reasoning and problem solving
  - Technical documentation and tutorials
  - Step-by-step learning guidance
  - Cost-effective comprehensive assistance

# Configuration is automatically saved
Learning Catalyst > /config
= Current Configuration:
  Provider: deepseek
  Model: deepseek-chat
  API Key: ✓ Valid
  Status: ✓ Connected
```

### Deepseek Model Comparison

```bash
# Switch between different Deepseek models
Learning Catalyst > /config model
🤖 Available Models (deepseek provider):
  ✅ deepseek-chat (current)
  ✅ deepseek-coder
[User selects deepseek-coder from the list]
🤖 Model switched to: deepseek-coder

Learning Catalyst > explain recursion in Python
[Detailed code explanation with examples]

# Switch back to general learning model
Learning Catalyst > /config model
🤖 Available Models (deepseek provider):
  ✅ deepseek-coder (current)
  ✅ deepseek-chat
[User selects deepseek-chat from the list]
🤖 Model switched to: deepseek-chat

Learning Catalyst > explain machine learning concepts
[Clear, comprehensive explanations]
```

### Deepseek Model Selection by Use Case

```bash
# For programming tasks, choose the coding model
Learning Catalyst > /config model
🤖 Available Models (deepseek provider):
  ✅ deepseek-chat
  ✅ deepseek-coder
[User selects deepseek-coder for programming]
🤖 Model switched to: deepseek-coder

# For general learning, choose the chat model
Learning Catalyst > /config model
🤖 Available Models (deepseek provider):
  ✅ deepseek-coder (current)
  ✅ deepseek-chat
[User selects deepseek-chat for general learning]
🤖 Model switched to: deepseek-chat

# Both models offer:
# - Large context windows (32K tokens)
# - Strong reasoning capabilities
# - Cost-effective pricing
```

## Workflow 3: ChatGLM Provider Setup

### Scenario: Configure Chinese AI Model

**Perfect for**: Chinese language learning and bilingual content

```bash
# Configure ChatGLM provider
Learning Catalyst > /config provider chatglm
🔧 ChatGLM Provider Configuration:
  Enter your ChatGLM API key: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Set ChatGLM model
Learning Catalyst > /config model
🤖 Available Models (chatglm provider):
  ✅ chatglm3
  ✅ chatglm4
[User selects chatglm4 from the list]
🤖 Model set to: chatglm4

# Test Chinese capabilities
Learning Catalyst > 请用中文解释什么是机器学习
🧠 机器学习是人工智能的一个重要分支...
[Chinese explanation of machine learning concepts]

# Test bilingual capabilities
Learning Catalyst > Now explain the same concept in English
🧠 Machine learning is a branch of artificial intelligence...
[English explanation with consistent content]

# Configuration is automatically saved
```

## Workflow 4: SiliconFlow Provider Setup

### Scenario: Configure SiliconFlow AI Platform

**Perfect for**: Users wanting access to multiple Chinese and international AI models through one platform

```bash
# Start with clean configuration
$> learning-catalyst

# Configure SiliconFlow provider
Learning Catalyst > /config provider siliconflow
🔧 SiliconFlow Provider Configuration:
  Enter your SiliconFlow API key: sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Set SiliconFlow model
Learning Catalyst > /config model
🤖 Available Models (siliconflow provider):
  ✅ Qwen2-72B
  ✅ Baichuan2-13B
  ✅ ChatGLM3-6B
  ✅ DeepSeek-V2
[User selects Qwen2-72B from the list]
🤖 Model set to: Qwen2-72B

# Test SiliconFlow's capabilities
Learning Catalyst > What are your strengths as a learning assistant?
🧠 As SiliconFlow's Qwen model, I excel at:
  - Chinese and English bilingual instruction
  - Mathematical and scientific reasoning
  - Cultural context understanding
  - Multi-domain knowledge integration
  - Cost-effective high-quality responses

# Configuration is automatically saved
```

### SiliconFlow Model Selection

```bash
# Switch between SiliconFlow models
Learning Catalyst > /config model
🤖 Available Models (siliconflow provider):
  ✅ Qwen2-72B (current)
  ✅ Baichuan2-13B
  ✅ ChatGLM3-6B
  ✅ DeepSeek-V2
[User selects Baichuan2-13B for balanced performance]
🤖 Model switched to: Baichuan2-13B

Learning Catalyst > explain Chinese literature
[Comprehensive explanation with cultural context]

# Switch to cost-effective model
Learning Catalyst > /config model
🤖 Available Models (siliconflow provider):
  ✅ Baichuan2-13B (current)
  ✅ Qwen2-72B
  ✅ ChatGLM3-6B
  ✅ DeepSeek-V2
[User selects ChatGLM3-6B for cost-effective learning]
🤖 Model switched to: ChatGLM3-6B

Learning Catalyst > practice Chinese conversation
[Interactive Chinese language practice]
```

### SiliconFlow Model Specializations

```bash
# For advanced reasoning tasks
Learning Catalyst > /config model
🤖 Available Models (siliconflow provider):
  ✅ Qwen2-72B
  ✅ Baichuan2-13B
  ✅ ChatGLM3-6B
  ✅ DeepSeek-V2
[User selects Qwen2-72B for advanced tasks]
🤖 Model switched to: Qwen2-72B

# For balanced general learning
Learning Catalyst > /config model
🤖 Available Models (siliconflow provider):
  ✅ Qwen2-72B (current)
  ✅ Baichuan2-13B
  ✅ ChatGLM3-6B
  ✅ DeepSeek-V2
[User selects Baichuan2-13B for balanced learning]
🤖 Model switched to: Baichuan2-13B

# Platform advantages:
# - Multiple model types in one platform
# - Competitive pricing across all models
# - Strong Chinese language capabilities
# - API stability and reliability
```

## Workflow 5: Multi-Provider Management

### Scenario: Switch Between Providers

**Perfect for**: Users with multiple provider accounts wanting optimal performance

```bash
# Configure multiple providers
Learning Catalyst > /config provider openai
🔧 OpenAI API key: sk-xxxxxxxxxxxxxxxxxxxxxxxx

Learning Catalyst > /config provider deepseek
🔧 Deepseek API key: sk-xxxxxxxxxxxxxxxxxxxxxxxx

Learning Catalyst > /config provider siliconflow
🔧 SiliconFlow API key: sk-xxxxxxxxxxxxxxxxxxxxxxxx

# Check current configuration
Learning Catalyst > /config
= Current Configuration:
  Provider: openai
  Model: gpt-4
  Status: ✓ Connected

# Switch providers on the fly
Learning Catalyst > /config provider openai
🔄 Switched to OpenAI provider
  Current model: gpt-4

Learning Catalyst > explain quantum computing
[GPT-4 response]

Learning Catalyst > /config provider deepseek
🔄 Switched to Deepseek provider
  Current model: deepseek-chat

Learning Catalyst > explain quantum computing
[Deepseek response with practical examples]

Learning Catalyst > /config provider siliconflow
🔄 Switched to SiliconFlow provider
  Current model: Qwen2-72B

Learning Catalyst > explain quantum computing
[Qwen2 response with bilingual perspective]
```

### Provider Comparison Workflow

```bash
# Test the same question across providers
Learning Catalyst > What are the key differences between supervised and unsupervised learning?

# With OpenAI GPT-4
Learning Catalyst > /config provider openai
Learning Catalyst > /config model
🤖 Available Models (openai provider):
  ✅ gpt-4o
  ✅ gpt-4
  ✅ gpt-3.5-turbo
[User selects gpt-4 from the list]
🤖 Model switched to: gpt-4
🤖 [GPT-4 provides structured, technical comparison]

# With Deepseek
Learning Catalyst > /config provider deepseek
Learning Catalyst > /config model
🤖 Available Models (deepseek provider):
  ✅ deepseek-chat
  ✅ deepseek-coder
[User selects deepseek-chat from the list]
🤖 Model switched to: deepseek-chat
🤖 [Deepseek provides practical, code-oriented explanation]

# Check token usage for cost comparison
Learning Catalyst > /tokens
📊 Token Usage Statistics:
  Current Session: 2,345 tokens
  Cost: $0.12 total
```

## Workflow 6: Custom Provider Setup

### Scenario: Configure Custom AI Providers

**Perfect for**: Users wanting to integrate various AI services, local LLMs, or proxy services

```bash
# Create first custom provider (Groq)
Learning Catalyst > /config provider custom
🔧 Custom Provider Configuration:
  Provider name: groq
  API base URL: https://api.groq.com/openai/v1
  Enter API key: gsk_xxxxxxxxxxxxxxxxxxxxxxxxx

# Test the custom provider
Learning Catalyst > Hello, can you help me?
🧠 [If AI responds, the custom provider is working]

# Set model from custom provider
Learning Catalyst > /config model
🤖 Available Models (groq provider):
  ✅ llama3-70b-8192
  ✅ mixtral-8x7b-32768
[User selects llama3-70b-8192 from the list]
🤖 Model switched to: llama3-70b-8192

# Test the custom provider
Learning Catalyst > explain machine learning basics
🧠 [Groq's fast response using Llama 3]
```

### Multiple Custom Providers

```bash
# Add second custom provider (DeepSeek)
Learning Catalyst > /config provider custom
🔧 Custom Provider Configuration:
  Provider name: deepseek
  API base URL: https://api.deepseek.com/v1
  Enter API key: sk-xxxxxxxxxxxxxxxxxxxxxxxx

# Add third custom provider (Together AI)
Learning Catalyst > /config provider custom
🔧 Custom Provider Configuration:
  Provider name: together
  API base URL: https://api.together.xyz/v1
  Enter API key: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Add local LLM as custom provider
Learning Catalyst > /config provider custom
🔧 Custom Provider Configuration:
  Provider name: local-llm
  API base URL: http://localhost:8000/v1
  Enter API key: local-key (or empty for no auth)

# Check current configuration
Learning Catalyst > /config
= Current Configuration:
  Provider: groq
  Model: llama3-70b-8192
  Status: ✓ Connected

# Switch to different custom provider
Learning Catalyst > /config provider together
🔄 Switched to custom provider: together

Learning Catalyst > /config model
🤖 Available Models (together provider):
  ✅ meta-llama/Llama-2-70b-chat-hf
[User selects model from the list]
🤖 Model set to: meta-llama/Llama-2-70b-chat-hf
```

### Advanced Custom Provider Configuration

```bash
# Configure proxy service as custom provider
Learning Catalyst > /config provider custom
🔧 Custom Provider Configuration:
  Provider name: proxy-service
  API base URL: https://my-proxy.com/api/v1
  Enter API key: proxy-xxxxxxxxxxxxxxxx
  Custom headers (optional): {"X-Custom-Header": "value"}

# Configure enterprise gateway
Learning Catalyst > /config provider custom
🔧 Custom Provider Configuration:
  Provider name: enterprise-gateway
  API base URL: https://gateway.company.com/ai/v1
  Enter API key: enterprise-key-xxxxxxxxxxxxxxxx
  Organization ID: org-xxxxxxxxxxxxxxxx

# Test individual providers by checking configuration
Learning Catalyst > /config provider groq show
📋 Groq Provider Configuration:
  Status: ✅ Connected
  Models: llama3-70b-8192, mixtral-8x7b-32768

Learning Catalyst > /config provider deepseek show
📋 Deepseek Provider Configuration:
  Status: ✅ Connected
  Models: deepseek-chat, deepseek-coder

Learning Catalyst > /config provider enterprise-gateway show
📋 Enterprise Gateway Provider Configuration:
  Status: ❌ Connection failed (check network)
```

### Simple Model Selection

```bash
# Check current model
Learning Catalyst > /config
= Current Configuration:
  Provider: deepseek
  Model: deepseek-chat
  Status: ✓ Connected

# Switch to different model using interactive selection
Learning Catalyst > /config model
🤖 Available Models (deepseek provider):
  ✅ deepseek-chat (current)
  ✅ deepseek-coder
[User selects deepseek-coder from the list]
🤖 Model switched to: deepseek-coder
```

## Workflow 8: Basic Configuration Management

### Scenario: Switch Between Providers

**Perfect for**: Users with multiple provider accounts wanting optimal performance

```bash
# Configure OpenAI provider
Learning Catalyst > /config provider openai
🔧 OpenAI API key: sk-xxxxxxxxxxxxxxxxxxxxxxxx

# Configure Deepseek provider
Learning Catalyst > /config provider deepseek
🔧 Deepseek API key: sk-xxxxxxxxxxxxxxxxxxxxxxxx

# Switch between providers
Learning Catalyst > /config provider openai
🔄 Switched to OpenAI provider
  Current model: gpt-4

Learning Catalyst > explain quantum computing
[GPT-4 response]

Learning Catalyst > /config provider deepseek
🔄 Switched to Deepseek provider
  Current model: deepseek-chat

Learning Catalyst > explain quantum computing
[Deepseek response with practical examples]
```

## Basic Usage Tips

### Cost Management

**Perfect for**: Users wanting optimal performance and cost management

```bash
# Check current configuration
Learning Catalyst > /config
= Current Configuration:
  Provider: deepseek
  Model: deepseek-chat
  Status: ✓ Connected

# Switch to more cost-effective model if needed
Learning Catalyst > /config model
🤖 Available Models (deepseek provider):
  ✅ deepseek-chat (current)
  ✅ deepseek-coder
[User selects deepseek-coder for programming tasks]
🤖 Model switched to: deepseek-coder

# Model parameters are optimized automatically for learning
```


## Workflow 11: Troubleshooting Provider Issues

### Scenario: Fix Common Provider Problems

**Perfect for**: Users experiencing connection or authentication issues

```bash
# Check provider configuration
Learning Catalyst > /config provider show openai
📋 OpenAI Provider Configuration:
  API Key: sk-abc...123
  Endpoint: https://api.openai.com
  Model: gpt-4
  Status: ❌ Connection failed

# Reconfigure provider with correct settings
Learning Catalyst > /config provider openai
🔧 OpenAI Provider Configuration:
  Enter your OpenAI API key: sk-xxxxxxxxxxxxxxxxxxxxxxxx
✅ Provider configured successfully

# Test the updated configuration
Learning Catalyst > Hello, can you help me learn?
🧠 Hello! I'd be happy to help you learn. What topic would you like to explore?

# If the response works, the configuration is successful
Learning Catalyst > /config
= Current Configuration:
  Provider: openai
  Model: gpt-4
  Status: ✓ Connected
```

## Workflow 12: Updating and Removing Models & Providers

### Scenario: Manage AI Provider and Model Lifecycle

**Perfect for**: Users needing to update provider configurations, switch between different AI services, or remove unused providers

#### Provider Update Workflows

```bash
# Update existing provider with new API key
Learning Catalyst > /config provider openai
🔧 OpenAI Provider Configuration:
  Current API key: sk-abc...123 (last 4 chars shown)
  Enter new API key (or press Enter to keep current): sk-xyz...789
✅ API key updated successfully!

# Update provider endpoint (useful for proxy services)
Learning Catalyst > /config provider custom local-provider
🔧 Custom Provider Configuration:
  Provider name: local-provider
  Current URL: https://api.openai.com
  New API base URL: https://proxy.company.com/openai/v1
  Enter API key: sk-proxy-xxxxxxxxxxxxxxxx
✅ Provider endpoint updated!
```

#### Model Management

```bash
# Switch between available models
Learning Catalyst > /config model
🤖 Available Models (openai provider):
  ✅ gpt-4 (current)
  ✅ gpt-3.5-turbo
  ✅ gpt-4-turbo
[User selects different model as needed]
🤖 Model switched to: [selected model]

# Remove specific model from provider
Learning Catalyst > /config model gpt-3.5-turbo remove
✅ Model gpt-3.5-turbo removed from OpenAI provider

# Check updated model list
Learning Catalyst > /config model
🤖 Available Models (openai provider):
  ✅ gpt-4 (current)
  ✅ gpt-4-turbo
```

#### Provider Removal and Testing

```bash
# Test provider connection before removal
Learning Catalyst > /config provider openai test
🔄 Testing OpenAI provider connection...
✅ Connection test successful
  Response time: 1.2 seconds
  Model availability: gpt-4, gpt-3.5-turbo, gpt-4-turbo

# Remove provider completely
Learning Catalyst > /config provider openai remove
⚠️ Confirm removal: Remove OpenAI provider and all its models? (y/N): y
✅ OpenAI provider removed successfully

# Verify provider removal
Learning Catalyst > /config
= Current Configuration:
  Provider: deepseek
  Model: deepseek-chat
  Status: ✓ Connected

# Check remaining providers
Learning Catalyst > /config provider list
📋 Configured Providers:
  ✅ deepseek - Active
  ✅ siliconflow - Available
    ❌ openai - Not configured

# Add provider back if needed
Learning Catalyst > /config provider openai
🔧 OpenAI Provider Configuration:
  Enter your OpenAI API key: sk-xxxxxxxxxxxxxxxxxxxxxxxx
✅ OpenAI provider configured successfully

# Test newly added provider
Learning Catalyst > /config provider openai test
🔄 Testing OpenAI provider connection...
✅ Connection test successful
  Response time: 0.8 seconds
  All models available

# Test knowledge mapping with new provider
Learning Catalyst > /knowledge-map
🗺️ Your Interactive Learning Space:
┌─ Programming & Development ─────────────────────────────┐
│  [✅] Python Programming (Mastered)                     │
│  [🔄] Web Development (60% Complete)                   │
│  │   ├── [✅] HTML/CSS Basics                           │
│  │   ├── [🔄] JavaScript Fundamentals                  │
│  │   └── [⏳] React Framework (Next Topic)             │
│  [⏳] Machine Learning (Not Started)                   │
│     └── prerequisites: Python Programming              │
└──────────────────────────────────────────────────────────┘
Navigation: ↑↓←→ Move | Enter: Zoom In | (e)xplain | (a)sk AI | (q)uit

# Test AI interaction with new provider
Learning Catalyst > [Selects React Framework]
🤖 AI Context-Aware Assistant (OpenAI GPT-4):
"I see you're interested in React Framework! Based on your progress:
📊 Your Readiness: 90% (Strong in JavaScript fundamentals)
🎯 Recommended Next Steps:
  1. Learn component-based architecture
  2. Master state management with hooks
  3. Practice building small projects

Would you like me to explain React components or show you a quick example?"
```


## Quick Reference Commands

### Basic Configuration
```bash
/config                          # Show current configuration
/config provider <name>          # Set AI provider
/config provider <name> show     # Show provider details
/config model                    # Select model interactively
```

### Available Providers
```bash
/config provider openai          # Configure OpenAI
/config provider deepseek        # Configure Deepseek
/config provider chatglm         # Configure ChatGLM
/config provider siliconflow     # Configure SiliconFlow
/config provider custom          # Configure custom provider
```

## Getting Help

### Provider-Specific Support
- **OpenAI**: [OpenAI API Documentation](https://platform.openai.com/docs)
- **Deepseek**: [Deepseek API Documentation](https://platform.deepseek.com)
- **SiliconFlow**: [SiliconFlow API Documentation](https://docs.siliconflow.cn)
- **ChatGLM**: [ChatGLM Documentation](https://chatglm.cn)

### Troubleshooting
- Check [Troubleshooting Guide](troubleshooting.md) for common issues
- Use `/config provider show <provider>` to check provider configuration
- Review API key formatting and permissions

---

*Last updated: October 8, 2025*
*Version: 1.0.0*
*Category: Integration Examples*