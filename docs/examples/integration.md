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
Learning Catalyst > /config show
📋 Current Configuration:
  AI Provider: None configured
  Model: None set
  API Status: Not connected

# Configure OpenAI provider
Learning Catalyst > /config provider openai
🔧 OpenAI Provider Configuration:
  Enter your OpenAI API key (or press Enter to skip): sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Verify API key is working
Learning Catalyst > /config provider test openai
✅ OpenAI API connection successful!
  Available models: gpt-4, gpt-4-turbo, gpt-3.5-turbo

# Set your preferred model
Learning Catalyst > /config model use gpt-4
🤖 Model set to: gpt-4
  Context window: 8192 tokens
  Cost per 1K tokens: $0.03 (input) / $0.06 (output)

# Test the configuration
Learning Catalyst > Hello, can you help me learn Python?
🧠 Hello! I'd be happy to help you learn Python. What specific topic would you like to start with?

# Save configuration
Learning Catalyst > /config save
💾 Configuration saved successfully!
  Provider: OpenAI
  Model: gpt-4
  API Key: [REDACTED]
```

### Model Management Examples

```bash
# Interactive model selection dialog
Learning Catalyst > /config model switch
🔄 Model Selection Dialog
┌─ Select Model Type ───────────────────────────────────────┐
│                                                            │
│  [c]hat Models     • gpt-4, deepseek, Qwen2, llama3        │
│  [e]mbedding Models • text-embedding-3-large, bge-large    │
│  [r]erank Models    • bge-reranker, cross-encoder          │
│                                                            │
│  Press [c], [e], [r] or [Enter] for all types              │
│  [q]uit                                               [?]Help│
└────────────────────────────────────────────────────────────┘

# Press 'c' for chat models
┌─ Chat Models ─────────────────────────────────────────────┐
│                                                            │
│  📊 OpenAI Provider:                                       │
│  ✅ [Selected] gpt-4                     8K tokens  $0.03/1K   │
│    gpt-3.5-turbo                     4K tokens  $0.0015/1K  │
│    gpt-4-turbo                       128K tokens $0.01/1K   │
│                                                            │
│  [↑↓] Navigate  [Enter] Select  [b]ack  [q]uit              │
└────────────────────────────────────────────────────────────┘
Current: gpt-4 (Chat)  |  Type: chat | Use arrow keys to navigate

# Navigate with arrow keys and press Enter to select gpt-3.5-turbo
🤖 Model switched to: gpt-3.5-turbo
  Cost per 1K tokens: $0.0015 (input) / $0.002 (output)

# Compare model performance
Learning Catalyst > explain machine learning basics
[GPT-3.5 response - concise and fast]

# Switch back using interactive dialog
Learning Catalyst > /config model switch
🔄 Model Selection Dialog:
[Navigate to gpt-4 and press Enter]
🤖 Model switched to: gpt-4

Learning Catalyst > explain machine learning basics
[GPT-4 response - detailed and comprehensive]
```

### Interactive Model Selection Features

```bash
# Enhanced dialog with type selection and multiple providers
Learning Catalyst > /config model switch
🔄 Model Selection Dialog
┌─ Select Model Type ───────────────────────────────────────┐
│                                                            │
│  [c]hat Models     • 12 models across providers            │
│  [e]mbedding Models • 5 models for semantic search         │
│  [r]erank Models    • 4 models for result optimization     │
│                                                            │
│  Current Type: chat  |  Press key or [Enter] for all types      │
│  [q]uit                                               [?]Help│
└────────────────────────────────────────────────────────────┘

# After selecting 'e' for embedding models:
┌─ Embedding Models ───────────────────────────────────────────┐
│                                                            │
│  📊 OpenAI Embedding:                                      │
│    text-embedding-3-large           1536 dims  $0.13/1K   │
│    text-embedding-3-small           1536 dims  $0.02/1K   │
│                                                            │
│  🔍 Custom Embedding:                                      │
│    all-MiniLM-L6-v2                 384 dims   $0.10/1K   │
│    bge-large-en-v1.5                1024 dims  $0.15/1K   │
│                                                            │
│  [↑↓] Navigate  [Enter] Select  [b]ack  [q]uit              │
└────────────────────────────────────────────────────────────┘
Type: embedding | Current: text-embedding-3-large (OpenAI)

# Dialog shows:
# - Provider icons and names
# - Model names and specifications
# - Context window sizes
# - Cost information
# - Current model indicator
# - Navigation help
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

# Test connection
Learning Catalyst > /config provider test deepseek
✅ Deepseek API connection successful!
  Available models: deepseek-chat, deepseek-coder

# Set Deepseek model
Learning Catalyst > /config model use deepseek-chat
🤖 Model set to: deepseek-chat
  Context window: 32K tokens
  Cost per 1K tokens: $0.14 (input) / $0.28 (output)

# Test Deepseek's capabilities
Learning Catalyst > What are your strengths as a learning assistant?
🧠 As Deepseek, I excel at:
  - Programming and code explanation
  - Mathematical reasoning and problem solving
  - Technical documentation and tutorials
  - Step-by-step learning guidance
  - Cost-effective comprehensive assistance

# Save configuration
Learning Catalyst > /config save
💾 Deepseek configuration saved!
```

### Deepseek Model Comparison

```bash
# Interactive Deepseek model selection with type filtering
Learning Catalyst > /config model switch --type chat
🔄 Model Selection Dialog
┌─ Chat Models ─────────────────────────────────────────────┐
│                                                            │
│  💻 Deepseek Provider:                                     │
│    deepseek-chat                    32K tokens $0.14/1K    │
│  ✅ [Selected] deepseek-coder           32K tokens $0.14/1K   │
│                                                            │
│  [↑↓] Navigate  [Enter] Select  [t]ype filter  [q]uit        │
└────────────────────────────────────────────────────────────┘
Type: chat | Current: deepseek-chat (Deepseek)  |  Selected: deepseek-coder

# Navigate to deepseek-coder and press Enter for programming tasks
🤖 Model switched to: deepseek-coder (Programming specialized)
  Cost per 1K tokens: $0.14 (input) / $0.28 (output)

Learning Catalyst > explain recursion in Python
[Detailed code explanation with examples]

# Switch to deepseek-chat for general learning
Learning Catalyst > /config model switch
🔄 Model Selection Dialog:
[Navigate to deepseek-chat and press Enter]
🤖 Model switched to: deepseek-chat (General purpose)
  Cost per 1K tokens: $0.14 (input) / $0.28 (output)

Learning Catalyst > explain machine learning concepts
[Clear, comprehensive explanations]
```

### Deepseek Model Selection by Use Case

```bash
# Choose model based on learning focus
Learning Catalyst > /config model switch
🔄 Model Selection Dialog
┌─ Deepseek Models by Use Case ──────────────────────────────┐
│                                                            │
│  💻 deepseek-coder (Programming Specialist)                │
│     Code explanation, debugging, algorithm design         │
│     32K tokens • $0.14/1K input • $0.28/1K output         │
│                                                            │
│  🎯 deepseek-chat (General Learning)                       │
│     Broad knowledge, explanations, tutorials              │
│     32K tokens • $0.14/1K input • $0.28/1K output         │
│                                                            │
│  💰 Both models offer excellent value for money            │
│     - Large context windows (32K tokens)                  │
│     - Strong reasoning capabilities                       │
│     - Multilingual support                                 │
│                                                            │
│  [↑↓] Navigate  [Enter] Select  [Esc] Cancel  [q] Quit        │
└────────────────────────────────────────────────────────────┘

# Dialog helps choose based on:
# - Programming vs general learning needs
# - Cost efficiency (both models same price)
# - Context requirements
# - Technical specialization
```

## Workflow 3: ChatGLM Provider Setup

### Scenario: Configure Chinese AI Model

**Perfect for**: Chinese language learning and bilingual content

```bash
# Configure ChatGLM provider
Learning Catalyst > /config provider chatglm
🔧 ChatGLM Provider Configuration:
  Enter your ChatGLM API key: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Test connection
Learning Catalyst > /config provider test chatglm
✅ ChatGLM API connection successful!
  Available models: chatglm3, chatglm4

# Set ChatGLM model
Learning Catalyst > /config model use chatglm4
🤖 Model set to: chatglm4
  Language: Chinese/English bilingual
  Context window: 8192 tokens

# Test Chinese capabilities
Learning Catalyst > 请用中文解释什么是机器学习
🧠 机器学习是人工智能的一个重要分支...
[Chinese explanation of machine learning concepts]

# Test bilingual capabilities
Learning Catalyst > Now explain the same concept in English
🧠 Machine learning is a branch of artificial intelligence...
[English explanation with consistent content]

# Save configuration
Learning Catalyst > /config save
💾 ChatGLM configuration saved!
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

# Test connection
Learning Catalyst > /config provider test siliconflow
✅ SiliconFlow API connection successful!
  Available models: Qwen2-72B, Baichuan2-13B, ChatGLM3-6B, DeepSeek-V2

# Set SiliconFlow model
Learning Catalyst > /config model use Qwen2-72B
🤖 Model set to: Qwen2-72B
  Context window: 32K tokens
  Cost per 1K tokens: $0.12 (input) / $0.24 (output)

# Test SiliconFlow's capabilities
Learning Catalyst > What are your strengths as a learning assistant?
🧠 As SiliconFlow's Qwen model, I excel at:
  - Chinese and English bilingual instruction
  - Mathematical and scientific reasoning
  - Cultural context understanding
  - Multi-domain knowledge integration
  - Cost-effective high-quality responses

# Save configuration
Learning Catalyst > /config save
💾 SiliconFlow configuration saved!
```

### SiliconFlow Model Selection

```bash
# Interactive SiliconFlow model selection
Learning Catalyst > /config model switch --type chat
🔄 Model Selection Dialog
┌─ Chat Models ─────────────────────────────────────────────┐
│                                                            │
│  🌊 SiliconFlow Provider:                                  │
│    Qwen2-72B                        32K tokens $0.12/1K    │
│  ✅ [Selected] Baichuan2-13B             32K tokens $0.08/1K   │
│    ChatGLM3-6B                      32K tokens $0.06/1K    │
│    DeepSeek-V2                      32K tokens $0.14/1K    │
│                                                            │
│  [↑↓] Navigate  [Enter] Select  [t]ype filter  [q]uit        │
└────────────────────────────────────────────────────────────┘
Type: chat | Current: Qwen2-72B (SiliconFlow)  |  Selected: Baichuan2-13B

# Navigate to Baichuan2-13B for balanced performance
🤖 Model switched to: Baichuan2-13B (Balanced)
  Cost per 1K tokens: $0.08 (input) / $0.16 (output)

Learning Catalyst > explain Chinese literature
[Comprehensive explanation with cultural context]

# Switch to ChatGLM3-6B for cost-effective learning
Learning Catalyst > /config model switch
🔄 Model Selection Dialog:
[Navigate to ChatGLM3-6B and press Enter]
🤖 Model switched to: ChatGLM3-6B (Cost-effective)
  Cost per 1K tokens: $0.06 (input) / $0.12 (output)

Learning Catalyst > practice Chinese conversation
[Interactive Chinese language practice]
```

### SiliconFlow Specialized Models

```bash
# Choose model based on learning specialization
Learning Catalyst > /config model switch
🔄 Model Selection Dialog
┌─ SiliconFlow Models by Specialization ────────────────────┐
│                                                            │
│  🧠 Qwen2-72B (Most Capable)                               │
│     Advanced reasoning, complex problems, research         │
│     32K tokens • $0.12/1K input • $0.24/1K output         │
│                                                            │
│  ⚖️ Baichuan2-13B (Balanced)                               │
│     General knowledge, bilingual learning, tutorials       │
│     32K tokens • $0.08/1K input • $0.16/1K output         │
│                                                            │
│  💬 ChatGLM3-6B (Conversational)                           │
│     Language practice, casual learning, chat               │
│     32K tokens • $0.06/1K input • $0.12/1K output         │
│                                                            │
│  🔬 DeepSeek-V2 (Technical)                                │
│     Programming, mathematics, technical subjects           │
│     32K tokens • $0.14/1K input • $0.28/1K output         │
│                                                            │
│  [↑↓] Navigate  [Enter] Select  [Esc] Cancel  [q] Quit        │
└────────────────────────────────────────────────────────────┘

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

# List all configured providers
Learning Catalyst > /config providers
📊 Configured Providers:
  ✅ OpenAI (gpt-4, gpt-3.5-turbo)
  ✅ Deepseek (deepseek-chat, deepseek-coder)
  ✅ SiliconFlow (Qwen2-72B, Baichuan2-13B)
  ❌ ChatGLM (Not configured)

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
Learning Catalyst > /config provider openai && /config model use gpt-4
🤖 [GPT-4 provides structured, technical comparison]

# With Deepseek
Learning Catalyst > /config provider deepseek && /config model use deepseek-chat
🤖 [Deepseek provides practical, code-oriented explanation]

# With SiliconFlow
Learning Catalyst > /config provider siliconflow && /config model use Qwen2-72B
🤖 [Qwen2 provides comprehensive, bilingual explanation]

# With ChatGLM
Learning Catalyst > /config provider chatglm && /config model use chatglm4
🤖 [ChatGLM provides Chinese language perspective]

# Compare costs and performance
Learning Catalyst > /config models
📊 Model Comparison (Last 10 queries):
  OpenAI GPT-4:          $0.45 total, 2.3s avg response
  Deepseek deepseek-chat: $0.18 total, 1.5s avg response
  SiliconFlow Qwen2-72B:  $0.22 total, 2.1s avg response
  ChatGLM4:              $0.12 total, 3.1s avg response
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
Learning Catalyst > /config provider groq test
✅ Custom provider 'groq' connection successful!
  Available models: llama3-70b-8192, mixtral-8x7b-32768

# Set model from custom provider
Learning Catalyst > /config model use llama3-70b-8192
🤖 Model set to: llama3-70b-8192
  Provider: groq (Custom)
  Context window: 8192 tokens
  Cost per 1K tokens: $0.59 (input) / $0.79 (output)

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

# List all configured providers
Learning Catalyst > /config providers
📊 Configured Providers:
  ✅ OpenAI (gpt-4, gpt-3.5-turbo)
  ✅ Deepseek (deepseek-chat, deepseek-coder)
  ✅ SiliconFlow (Qwen2-72B, Baichuan2-13B)
  ✅ groq (llama3-70b-8192, mixtral-8x7b)
  ✅ together (meta-llama/Llama-2-70b-chat-hf)
  ✅ local-llm (custom-model)

# Switch between custom providers
Learning Catalyst > /config provider deepseek
🔄 Switched to custom provider: deepseek

Learning Catalyst > /config model use deepseek-coder
🤖 Model set to: deepseek-coder
  Provider: deepseek (Custom)
  Context window: 32K tokens
  Specialization: Code generation
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

# Test individual providers as needed
Learning Catalyst > /config provider groq test
✅ groq: Connected and working (fast response)

Learning Catalyst > /config provider deepseek test
✅ deepseek: Connected and working

Learning Catalyst > /config provider enterprise-gateway test
❌ enterprise-gateway: Connection failed (check network)
```

### Interactive Model Selection Across Providers

```bash
# Switch between models across all configured providers
Learning Catalyst > /config model switch
🔄 Model Selection Dialog
┌─ Select Model Type ───────────────────────────────────────┐
│                                                            │
│  [c]hat Models     • gpt-4, deepseek, Qwen2, llama3        │
│  [e]mbedding Models • text-embedding-3-large, bge-large    │
│  [r]erank Models    • bge-reranker, cross-encoder          │
│                                                            │
│  Current: chat  |  Press key or [Enter] for all types         │
│  [q]uit                                               [?]Help│
└────────────────────────────────────────────────────────────┘

# After selecting 'c' for chat models:
┌─ Chat Models Across All Providers ────────────────────────┐
│                                                            │
│  📊 OpenAI Provider:                                       │
│    gpt-4                            8K tokens  $0.03/1K   │
│    gpt-3.5-turbo                    4K tokens  $0.0015/1K  │
│                                                            │
│  💻 Deepseek Provider:                                      │
│    deepseek-chat                   32K tokens $0.14/1K    │
│    deepseek-coder                  32K tokens $0.14/1K    │
│                                                            │
│  🌊 SiliconFlow Provider:                                   │
│    Qwen2-72B                       32K tokens $0.12/1K    │
│    Baichuan2-13B                   32K tokens $0.08/1K    │
│                                                            │
│  🚀 Custom Providers:                                       │
│  ✅ [Current] groq/llama3-70b-8192   8K tokens  $0.59/1K     │
│    groq/mixtral-8x7b-32768        32K tokens  $0.27/1K    │
│    together/meta-llama/Llama-2-70b  4K tokens  $0.90/1K    │
│                                                            │
│  [↑↓] Navigate  [Enter] Select  [t]ype filter  [q]uit        │
└────────────────────────────────────────────────────────────┘
Type: chat | Current: groq/llama3-70b-8192 (Custom)  |  Selected: deepseek-coder

# Navigate to deepseek-coder for programming tasks and press Enter
🤖 Model switched to: deepseek-coder
  Provider: deepseek (Custom)
  Context window: 32K tokens
  Specialization: Code generation
```

### Model Selection by Use Case

```bash
# Choose model based on task requirements
Learning Catalyst > /config model switch
🔄 Model Selection Dialog
┌─ Models by Use Case ───────────────────────────────────────┐
│                                                            │
│  ⚡ Fast Responses (Groq/Llama3)                           │
│     Quick answers, simple explanations                    │
│     8K tokens • 0.8s avg response • $0.59/1K             │
│                                                            │
│  💻 Code Generation (DeepSeek/Coder)                       │
│     Programming, debugging, technical content             │
│     32K tokens • 1.5s avg response • $0.14/1K             │
│                                                            │
│  🧠 Complex Reasoning (OpenAI/GPT-4)                        │
│     Deep analysis, research, expert content              │
│     8K tokens • 2.3s avg response • $0.03/1K              │
│                                                            │
│  🎯 Balanced Performance (Anthropic/Claude-3-sonnet)         │
│     Detailed explanations, analysis, writing             │
│     200K tokens • 1.8s avg response • $3.00/1K             │
│                                                            │
│  [↑↓] Navigate  [Enter] Select  [Esc] Cancel  [q] Quit        │
└────────────────────────────────────────────────────────────┘

# Dialog categorizes models by:
# - Speed and response time
# - Specialization and use case
# - Cost efficiency
# - Context window size
# - Provider type
```

### Smart Model Recommendations

```bash
# Interactive model selection with AI recommendations
Learning Catalyst > /config model switch
🔄 Model Selection Dialog
┌─ Smart Model Selection ───────────────────────────────────┐
│                                                            │
│  🤖 AI Recommendation Based on Your History:                 │
│                                                            │
│  📊 Task: Quick Python Explanation                          │
│  💡 Suggested: groq/llama3-70b-8192 (Fast, $0.59/1K)        │
│  🎯 Reason: You prefer fast responses for simple topics     │
│                                                            │
│  📊 Task: Complex Algorithm Design                          │
│  💡 Suggested: deepseek/deepseek-coder (Specialized, $0.14/1K)│
│  🎯 Reason: Strong coding background + cost-effective       │
│                                                            │
│  📊 Task: Creative Writing                                  │
│  💡 Suggested: deepseek-chat (Balanced, $0.14/1K)         │
│  🎯 Reason: Excellent for nuanced content generation        │
│                                                            │
│  [↑↓] Navigate  [Enter] Select  [r]ecommendations  [q] Quit   │
└────────────────────────────────────────────────────────────┘

# AI recommendations based on:
# - Your previous model preferences
# - Task complexity analysis
# - Cost/performance optimization
# - Response time requirements
# - Content type specialization
```

## Workflow 7: Model Type Configuration

### Scenario: Configure Different Model Types

**Perfect for**: Setting up models for different AI tasks (conversation, vector search, result optimization)

```bash
# Quick setup for chat models (most common use case)
Learning Catalyst > /config model type chat
🔧 Chat Model Configuration:
  Purpose: Conversation, explanation, content generation
  Current Type: chat

# Set up embedding models for AI's internal semantic search
Learning Catalyst > /config model use text-embedding-3-large --type embedding
🔍 Embedding Model Configuration:
  Model: text-embedding-3-large
  Type: embedding (for AI's internal use)
  Dimensions: 1536
  Max Input: 8192 tokens
  Cost: $0.13 per 1K tokens

# Set up rerank models for AI's result optimization
Learning Catalyst > /config model use bge-reranker-large --type rerank
📊 Rerank Model Configuration:
  Model: bge-reranker-large
  Type: rerank (for AI's internal use)
  Max Documents: 100
  Context Length: 512 tokens
  Cost: $0.10 per 1K tokens

# Test all configured model types
Learning Catalyst > /config model test
🧪 Model Test Results:
  ✅ Chat Model: gpt-4 (Working)
  ✅ Embedding Model: text-embedding-3-large (Working)
  ✅ Rerank Model: bge-reranker-large (Working)
```

### Model Type Use Cases

```bash
# Configure for research and knowledge management
Learning Catalyst > /config provider openai
Learning Catalyst > /config model use gpt-4 --type chat
Learning Catalyst > /config model use text-embedding-3-large --type embedding
Learning Catalyst > /config model use bge-reranker-large --type rerank

# AI can now use all model types internally
Learning Catalyst > research machine learning concepts
# AI uses: chat for explanation + embedding for semantic search + rerank for result ranking

Learning Catalyst > find similar topics to neural networks
# AI uses embedding model internally to find semantically similar concepts

Learning Catalyst > rank these research papers by relevance
# AI uses rerank model internally to order results
```

### Practical Setup Examples

**Code Development Setup:**
```bash
# Configure for programming tasks
Learning Catalyst > /config provider custom deepseek https://api.deepseek.com
Learning Catalyst > /config model use deepseek-coder --type chat

# AI can now assist with coding
Learning Catalyst > write a Python function to implement binary search
Learning Catalyst > debug this Python code for me
Learning Catalyst > explain this algorithm step by step
```

**Content Creation Setup:**
```bash
# Configure for writing tasks
Learning Catalyst > /config provider deepseek
Learning Catalyst > /config model use deepseek-chat --type chat

# AI can now help with writing
Learning Catalyst > help me write a technical blog post about quantum computing
Learning Catalyst > improve the clarity and flow of this article
Learning Catalyst > generate a summary of these research findings
```

**Multi-Provider Research Setup:**
```bash
# Configure for comprehensive research assistance
Learning Catalyst > /config provider openai
Learning Catalyst > /config provider custom groq https://api.groq.com
Learning Catalyst > /config model use gpt-4 --type chat
Learning Catalyst > /config model use text-embedding-3-large --type embedding

# AI can switch providers and use different model types
Learning Catalyst > explain artificial intelligence ethics
# AI uses gpt-4 for detailed explanation

Learning Catalyst > compare different AI safety approaches
# AI might switch to groq for faster comparison while maintaining quality
```

### Model Type Management

```bash
# List available models by type
Learning Catalyst > /config model list --type chat
📊 Chat Models Available:
  OpenAI: gpt-4, gpt-3.5-turbo, gpt-4-turbo
  Deepseek: deepseek-chat, deepseek-coder
  SiliconFlow: Qwen2-72B, Baichuan2-13B, ChatGLM3-6B
  Custom: groq/llama3-70b-8192, together/meta-llama/Llama-2-70b

Learning Catalyst > /config model list --type embedding
📊 Embedding Models Available:
  OpenAI: text-embedding-3-large, text-embedding-3-small
  Custom: all-MiniLM-L6-v2, bge-large-en-v1.5

Learning Catalyst > /config model list --type rerank
📊 Rerank Models Available:
  Custom: bge-reranker-large, bge-reranker-base

# Switch model types interactively
Learning Catalyst > /config model switch --type chat
🔄 Model Selection Dialog
┌─ Chat Models ─────────────────────────────────────────────┐
│  📊 OpenAI: gpt-4, gpt-3.5-turbo                         │
│  💻 Deepseek: deepseek-chat, deepseek-coder             │
│  🌊 SiliconFlow: Qwen2-72B, Baichuan2-13B                │
│  🚀 Custom: groq/llama3-70b, together/meta-llama/Llama-2-70b │
│                                                            │
│  [↑↓] Navigate  [Enter] Select  [b]ack  [q]uit              │
└────────────────────────────────────────────────────────────┘
```

### Benefits of Model Type Configuration

**For Users:**
- Simple commands to set up different AI capabilities
- AI automatically uses the right model type for each task
- No need to understand internal AI workflows
- Better performance with specialized models

**For AI System:**
- Access to specialized models for different tasks
- Chat models for conversation and generation
- Embedding models for semantic understanding
- Rerank models for result optimization
- Automatic model selection based on task requirements

## Workflow 8: API Key Management

### Scenario: Basic API Key Setup

**Perfect for**: Getting started with API keys

```bash
# Set up API key for each provider
Learning Catalyst > /config apikey openai
🔧 Enter your OpenAI API key: sk-xxxxxxxxxxxxxxxxxxxxxxxx

Learning Catalyst > /config apikey anthropic
🔧 Enter your Anthropic API key: sk-ant-xxxxxxxxxxxxxxxxxxxxxxxx

Learning Catalyst > /config apikey chatglm
🔧 Enter your ChatGLM API key: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Test API keys
Learning Catalyst > /config provider test openai
✅ OpenAI: Connected

Learning Catalyst > /config provider test anthropic
✅ Anthropic: Connected

Learning Catalyst > /config provider test chatglm
✅ ChatGLM: Connected
```

## Workflow 9: Model Performance Optimization

### Scenario: Fine-Tune Model Settings

**Perfect for**: Users wanting optimal performance and cost management

```bash
# Check current performance metrics
Learning Catalyst > /config performance
📊 Performance Metrics:
  Current Model: gpt-4
  Avg Response Time: 2.3 seconds
  Token Usage: 1,234 tokens/session
  Cost: $0.45 this session

# Optimize for speed
Learning Catalyst > /config optimize speed
⚡ Speed Optimization:
  - Switched to gpt-3.5-turbo (3x faster)
  - Reduced context window to 4K tokens
  - Enabled response caching

# Optimize for cost
Learning Catalyst > /config optimize cost
💰 Cost Optimization:
  - Using gpt-3.5-turbo (10x cheaper)
  - Set daily token limit: 10,000 tokens
  - Enabled cost tracking alerts

# Optimize for quality
Learning Catalyst > /config optimize quality
🎯 Quality Optimization:
  - Using gpt-4 (highest quality)
  - Full context window (8K tokens)
  - Enhanced reasoning prompts

# Custom optimization
Learning Catalyst > /config optimize custom
🔧 Custom Settings:
  Model: deepseek-chat
  Temperature: 0.7 (balanced creativity)
  Max Tokens: 2000 (detailed responses)
  Top P: 0.9 (focused output)
```

## Workflow 10: Smart Configuration with Autocomplete
*Complete AI provider setup using intelligent autocomplete features*

#### Step 1: Discover Available Commands with Tab Completion
```bash
# Start typing and press Tab to see available options
Learning Catalyst > /conf[Tab]
= Available commands:
  /config    • Configuration management
  /concepts  • Browse learning concepts

# Press Tab again to see config subcommands
Learning Catalyst > /config [Tab]
= Config subcommands:
  provider    • Manage AI providers (setup, test, switch)
  model       • Manage AI models (list, use, switch, type)
  show        • Show current configuration
  save        • Save configuration
  load        • Load configuration
  test        • Test configuration
  reset       • Reset to defaults

# Use Tab to complete partial commands
Learning Catalyst > /config prov[Tab]
# Automatically completes to: /config provider
```

#### Step 2: Smart Provider Discovery
```bash
# Tab to see available providers
Learning Catalyst > /config provider [Tab]
= Available providers:
  openai      • OpenAI (GPT models)
  deepseek    • Deepseek (Coding & General AI)
  siliconflow • SiliconFlow (Multiple Chinese Models)
  chatglm     • ChatGLM (Chinese models)
  custom      • Custom provider (any OpenAI-compatible API)

# Use abbreviation with fuzzy matching
Learning Catalyst > /config provider oa[Tab]
# Automatically completes to: /config provider openai

# Even with typos, autocomplete suggests corrections
Learning Catalyst > /config provdier openia[Tab]
= Did you mean: /config provider openai?
# Press Enter to accept the correction
```

#### Step 3: Interactive Provider Setup with Enhanced Navigation
```bash
# Enhanced setup dialog with tab completion
Learning Catalyst > /config provider setup
= 🚀 Provider Setup Wizard (Tab/Shift+Tab to navigate, Enter to select)
┌─ Provider Selection ─────────────────────────────────────────┐
│                                                              │
│  [🤖] OpenAI          • GPT-3.5, GPT-4, DALL-E           ✓  │
│  [💻] Deepseek        • deepseek-chat, deepseek-coder     ✓  │
│  [🌊] SiliconFlow     • Qwen2, Baichuan, ChatGLM         ✓  │
│  [🇨🇳] ChatGLM        • ChatGLM3, ChatGLM4              ✓  │
│  [⚙️]  Custom         • Your own OpenAI-compatible API  ✓  │
│                                                              │
│  Current: openai    Status: ✅ Connected                    │
│                                                              │
│  [Tab] Navigate • [Enter] Select • [Esc] Cancel               │
└──────────────────────────────────────────────────────────────┘

# Tab completion also works in interactive mode
Provider Selection: open[Tab]  # Auto-completes to "openai"
```

#### Step 4: Model Management with Intelligent Completion
```bash
# Tab to see model-related commands
Learning Catalyst > /config model [Tab]
= Model commands:
  list        • List all available models
  use         • Switch to specific model
  switch      • Interactive model selection
  type        • Configure model types
  info        • Show model details

# Use action-based commands with completion
Learning Catalyst > /config model use [Tab][Tab]
= Available models by type:
  Chat Models:      gpt-4, gpt-3.5-turbo, deepseek-chat
  Embedding Models: text-embedding-3-large, text-embedding-3-small
  Rerank Models:    bge-reranker-large, cross-encoder

# Continue typing to filter options
Learning Catalyst > /config model use gpt[Tab]
= Matching models:
  gpt-4           • OpenAI - Most capable
  gpt-4-turbo     • OpenAI - Fast and affordable
  gpt-3.5-turbo   • OpenAI - Fast and cheap
```

#### Step 5: Model Type Configuration with Smart Prompts
```bash
# Configure model types with tab completion
Learning Catalyst > /config model type use --type [Tab]
= Available model types:
  chat       • For conversation and explanation tasks
  embedding  • For text embedding and semantic search
  rerank     • For result reranking and optimization

# Use abbreviations for quick access
Learning Catalyst > /config model type use --type ch[Tab]
# Auto-completes to: --type chat

# Get intelligent suggestions based on usage patterns
Learning Catalyst > /config model type suggest
= 💡 Model Type Suggestions:
  Current usage pattern: 70% chat, 20% embedding, 10% rerank

  Recommended configuration:
    Chat tasks:      gpt-3.5-turbo (fast, cost-effective)
    Embedding tasks: text-embedding-3-small (good value)
    Rerank tasks:    bge-reranker-base (efficient)

  Apply this configuration? [Y/n]
```

#### Step 6: Enhanced Interactive Model Selection
```bash
# Model selection with keyboard shortcuts and autocomplete
Learning Catalyst > /config model switch
= 🔄 Model Selection Dialog (Use Tab/Arrow keys, type to filter)
┌─ Filter: [gpt]                                            ─┐
│                                                          │
│  Chat Models (3 matching)                                │
│  🤖 gpt-4           • Most capable    [Currently Active] │
│  ⚡ gpt-4-turbo     • Fast & capable  Recommended        │
│  💰 gpt-3.5-turbo   • Fast & cheap    Popular           │
│                                                          │
│  [Enter] Select • [Tab] Next field • [Esc] Cancel          │
│  Type to filter • [Ctrl+C] Clear filter                   │
└──────────────────────────────────────────────────────────┘

# Type to filter models in real-time
Filter: [embed]  # Shows only embedding models
= 🔄 Model Selection Dialog (Use Tab/Arrow keys, type to filter)
┌─ Filter: [embed]                                          ─┐
│                                                          │
│  Embedding Models (2 matching)                           │
│  🔍 text-embedding-3-large   • High quality              │
│  ⚡ text-embedding-3-small   • Fast & cheap    Active     │
│                                                          │
│  [Enter] Select • [Tab] Next field • [Esc] Cancel          │
└──────────────────────────────────────────────────────────┘
```

#### Step 7: Configuration Testing with Smart Suggestions
```bash
# Test with auto-complete and smart defaults
Learning Catalyst > /config provider test [Tab]
= Available providers to test:
  openai      • Currently configured
  deepseek    • Available but not configured
  siliconflow • Available but not configured
  chatglm     • Available but not configured
  custom      • Custom providers (if configured)

# Test multiple providers with intelligent batching
Learning Catalyst > /config provider test openai deepseek siliconflow
= 🧪 Provider Test Results:
┌─ OpenAI Test Results ─────────────────────────────────────┐
│  ✅ Connection:     1.2s latency                         │
│  ✅ Authentication: API key valid                        │
│  ✅ Models:         3 models available                   │
│  ⚠️  Rate Limit:    4,999 tokens/min (80% used)         │
│  ✅ Quota:          $2.34 remaining this month           │
└──────────────────────────────────────────────────────────┘

┌─ Deepseek Test Results ────────────────────────────────────┐
│  ❌ Connection:     Failed - API key required              │
│  💡 Suggestion:     Run '/config provider setup deepseek'   │
└─────────────────────────────────────────────────────────────┘

┌─ SiliconFlow Test Results ──────────────────────────────────┐
│  ❌ Connection:     Failed - API key required              │
│  💡 Suggestion:     Run '/config provider setup siliconflow'│
└─────────────────────────────────────────────────────────────┘

# Get actionable suggestions based on test results
Learning Catalyst > /config suggest
= 💡 Configuration Suggestions:
  Based on test results:

  1. OpenAI is working well but approaching rate limits
     → Consider upgrading to higher tier or use gpt-3.5-turbo

  2. Deepseek is not configured - great for coding tasks
     → Run '/config provider setup deepseek' for cost-effective AI

  3. SiliconFlow is not configured - excellent for Chinese content
     → Run '/config provider setup siliconflow' for bilingual models

  4. No embedding models configured
     → Run '/config model type use --type embedding text-embedding-3-small'
```

#### Step 8: Auto-correction and Fuzzy Matching
```bash
# Even with typos, the system understands what you mean
Learning Catalyst > /confog model sue gpt-4
= 🔧 Auto-correction applied:
  /confog → /config
  sue → use

  Executing: /config model use gpt-4
  ✓ Model switched to: gpt-4

# Fuzzy matching for providers and models
Learning Catalyst > /config provider test opanai
= Did you mean 'openai'?
  Found similar provider: openai (95% match)

  Execute: /config provider test openai? [Y/n]
```

### 🎯 Key Benefits of Autocomplete-Enhanced Configuration

#### ✅ **Error Prevention**
- **Auto-correction**: Common typos automatically fixed
- **Validation**: Invalid options highlighted before execution
- **Suggestions**: Smart recommendations based on context

#### ⚡ **Speed & Efficiency**
- **Tab Completion**: Complete long commands instantly
- **Fuzzy Matching**: Find providers/models with partial input
- **Keyboard Shortcuts**: Navigate dialogs without mouse

#### 🎯 **Discovery & Learning**
- **Command Hints**: See available options at each step
- **Progressive Disclosure**: Complex options shown when needed
- **Interactive Guidance**: Real-time help during configuration

#### 🔧 **Smart Defaults**
- **Context-Aware**: Suggestions based on usage patterns
- **Usage-Based**: Frequently used options prioritized
- **Intelligent Filtering**: Show only relevant options

### ⚙️ Autocomplete Configuration

```bash
# Enable/disable autocomplete features
Learning Catalyst > /config autocomplete enable
✓ Autocomplete enabled for all commands

Learning Catalyst > /config autocomplete disable suggestions
✓ Auto-suggestions disabled (tab completion still works)

# Configure autocomplete behavior
Learning Catalyst > /config autocomplete mode
= Autocomplete Modes:
  [1] Full    • Tab completion + suggestions + auto-correction
  [2] Smart   • Tab completion + suggestions (no auto-correction)
  [3] Basic   • Tab completion only
  [4] Minimal • No autocomplete features

  Current mode: [1] Full
  Select mode [1-4]:
```

## Workflow 11: Troubleshooting Provider Issues

### Scenario: Fix Common Provider Problems

**Perfect for**: Users experiencing connection or authentication issues

```bash
# Diagnose provider issues
Learning Catalyst > /config diagnose
🔍 Provider Diagnosis:
  Testing OpenAI... ❌ Connection failed
  Testing Anthropic... ✅ Connected
  Testing local models... ✅ Available

# Fix OpenAI connection
Learning Catalyst > /config fix openai
🔧 OpenAI Troubleshooting:
  Issue: Invalid API key format
  Solution: Re-enter API key carefully

Learning Catalyst > /config apikey openai
🔧 Enter OpenAI API key: sk-xxxxxxxxxxxxxxxxxxxxxxxx
  Testing... ✅ API key is valid!

# Fix model loading issues
Learning Catalyst > /config fix model
🔧 Model Troubleshooting:
  Issue: Model not available in current region
  Solution: Switch to available model

Learning Catalyst > /config model use gpt-3.5-turbo
🤖 Switched to available model: gpt-3.5-turbo

# Test specific configurations
Learning Catalyst > /config provider openai test
✅ OpenAI: Connected and working

Learning Catalyst > /config provider deepseek test
✅ Deepseek: Connected and working

Learning Catalyst > /config provider siliconflow test
✅ SiliconFlow: Connected and working

Learning Catalyst > /config model gpt-4 test
✅ GPT-4: Configuration working properly
```

## Advanced Configuration Examples

### Custom Prompts and System Messages

```bash
# Set custom system prompt for learning
Learning Catalyst > /config system-prompt
🧠 System Prompt Configuration:
Enter custom system prompt (or press Enter for default):
You are an expert learning assistant specializing in programming and computer science.
Always provide step-by-step explanations and include practical examples.
Adapt your teaching style to the user's experience level.

# Test custom system prompt
Learning Catalyst > teach me about recursion
🧠 [Response with programming-focused explanations and examples]

# Save custom prompts for different subjects
Learning Catalyst > /config save-prompt programming
💾 Programming prompt saved!

Learning Catalyst > /config save-prompt mathematics
💾 Mathematics prompt saved!

# Switch between saved prompts
Learning Catalyst > /config load-prompt programming
🔄 Loaded programming-focused system prompt
```

### Batch Configuration

```bash
# Import configuration from file
Learning Catalyst > /config import learning-catalyst-config.json
📁 Importing configuration...
  ✅ Provider settings imported
  ✅ Model preferences imported
  ✅ Custom prompts imported
  ✅ Settings imported

# Export current configuration
Learning Catalyst > /config export my-config.json
💾 Exporting configuration...
  ✅ Configuration exported to my-config.json
  ⚠️ API keys are excluded for security

# Reset to defaults
Learning Catalyst > /config reset
🔄 Resetting to default configuration...
  ⚠️ This will clear all your settings
  Confirm? (y/N): y
  ✅ Configuration reset to defaults
```

## Quick Reference Commands

### Provider Management
```bash
/config provider <name> [url]     # Set provider (custom needs URL)
/config provider list             # List all providers
/config provider test <name>      # Test specific provider
/config providers               # List configured providers
```

### Model Management
```bash
/config model use <model>         # Use specific model
/config model switch              # Interactive selection dialog
/config model type <type>         # Set model type (chat/embedding/rerank)
/config model list               # List available models
/config model test <model>        # Test specific model
/config models                  # List and compare models
```

### Model Types
```bash
/config model type chat           # For conversation and generation
/config model type embedding      # For AI's internal vector search
/config model type rerank         # For AI's result optimization
```

### Configuration
```bash
/config show                    # Show current configuration
/config save                    # Save current settings
/config load <config>           # Load saved configuration
/config reset                   # Reset to defaults
/config export <file>           # Export configuration
```

### API Key Management
```bash
/config apikey <provider>       # Set API key for provider
/config provider <provider> test     # Test API connections
```

## Getting Help

### Provider-Specific Support
- **OpenAI**: [OpenAI API Documentation](https://platform.openai.com/docs)
- **Deepseek**: [Deepseek API Documentation](https://platform.deepseek.com)
- **SiliconFlow**: [SiliconFlow API Documentation](https://docs.siliconflow.cn)
- **ChatGLM**: [ChatGLM Documentation](https://chatglm.cn)

### Troubleshooting
- Check [Troubleshooting Guide](troubleshooting.md) for common issues
- Use `/config diagnose` for automatic problem detection
- Review API key formatting and permissions

---

*Last updated: October 8, 2025*
*Version: 1.0.0*
*Category: Integration Examples*