# Configuration Commands

---
title: Configuration Commands Reference
description: Manage application configuration and settings for Learning Catalyst CLI
version: 1.0.0
last_updated: 2025-10-07
---

## Overview

Configuration commands allow you to manage AI providers, set preferences, and customize the Learning Catalyst CLI experience to match your learning style and technical requirements.

**✅ Current Status:**
- ✅ `/config` - **Fully Implemented** - Configuration management with essential subcommands validated in examples

## Available Commands

### `/config` - Comprehensive Configuration Management

Manage application configuration, AI providers, models, and system settings. This is the primary command for all configuration operations.

**Aliases**: `/cfg`, `/conf`

## Configuration Subcommands

### Basic Configuration Operations

```bash
/config                        # Show current configuration
/config provider               # Show interactive dialog with all configured providers
                               # Displays current provider and allows selection
/config model                  # Show interactive dialog with all configured models
                               # Displays current model and allows selection
/config provider openai        # Setup/configure OpenAI provider
/config model embedding-model --type embedding  # Set a model as embedding-model, type: chat, embed, rerank
                                                # embed and rerank can't change after setup
```

### AI Provider Management

```bash
/config provider               # Show interactive dialog with all configured providers
                               # Displays current provider and allows selection
/config provider [name]        # Setup/configure a new AI provider
/config provider [name] show   # Show detailed information about specific provider
                               # Includes connection status, available models, and configuration
/config provider [name] remove # Remove a configured provider
                               # Requires confirmation and prevents removal of active provider
```

**Real Examples from Current Implementation:**
```bash
/config provider               # Interactive provider selection dialog
                               # Shows list of configured providers with current one marked
                               # User can select a different provider from the list
                               # After selection, user must choose a model from that provider

/config provider openai        # Setup/configure OpenAI provider
/config provider openai show   # Show OpenAI provider details (includes connection status)
/config provider deepseek      # Setup/configure Deepseek provider
/config provider deepseek show # Show Deepseek provider details (includes connection status)
```

**Provider Removal Examples:**
```bash
/config provider siliconflow remove
# ⚠️ Remove Provider Confirmation:
#   Are you sure you want to remove 'siliconflow' provider?
#   This will delete all stored credentials and configurations.
#   Type 'yes' to confirm: yes
# ✅ Provider 'siliconflow' removed successfully

/config provider deepseek remove
# ❌ Cannot Remove Active Provider:
#   'deepseek' is currently active. Please switch to another provider first.
#   Use '/config provider' to select a different provider.

/config provider non-existent remove
# ❌ Provider Not Found:
#   Provider 'non-existent' is not configured.
#   Use '/config provider' to see available providers.
```

**Provider Selection Workflow:**
```bash
/config provider
# Opens interactive dialog showing:
# 📊 Available AI Providers:
# ✅ deepseek (current)    - Models: deepseek-chat, deepseek-coder
# ✅ openai                - Models: gpt-4, gpt-4o, gpt-4o-mini
# ✅ anthropic             - Models: claude-3-sonnet, claude-3-haiku

# User selects a provider → System shows available models for that provider
# User must select a model to complete the provider switch
```

**Provider Information Display:**
```bash
/config provider deepseek show
# 📊 Deepseek Provider Details:
# Provider: deepseek
# Status: ✅ Configured and Connected
# API Base URL: https://api.deepseek.com
# Models Available:
#   • deepseek-chat (chat)
#   • deepseek-coder (chat)
# Current Model: deepseek-chat
# Connection Test: ✅ Passed (2025-10-08 14:30:15)

/config provider openai show
# 📊 OpenAI Provider Details:
# Provider: openai
# Status: ✅ Configured and Connected
# API Base URL: https://api.openai.com
# Models Available:
#   • gpt-4 (chat)
#   • gpt-4o (chat)
#   • gpt-4o-mini (chat)
#   • text-embedding-3-small (embedding)
# Current Model: gpt-4o
# Connection Test: ✅ Passed (2025-10-08 13:45:22)
```

### Model Management

```bash
/config model                          # Show interactive dialog with all configured models
                                      # Displays current model and allows selection
/config model [name] remove            # Remove a specific model from configuration
                                      # Requires confirmation and prevents removal of active model
/config model [name] remove --force    # Force remove a model (bypass some safety checks)
```

**Real Examples from Current Implementation:**
```bash
/config model                          # Interactive model selection dialog
                                      # Shows list of available models with current one marked
                                      # User can select a different model from the list
```

**Model Removal Examples:**
```bash
/config model gpt-4o-mini remove
# ⚠️ Remove Model Confirmation:
#   Are you sure you want to remove 'gpt-4o-mini' model?
#   This will remove the model from your available models list.
#   Type 'yes' to confirm: yes
# ✅ Model 'gpt-4o-mini' removed successfully

/config model deepseek-chat remove
# ❌ Cannot Remove Active Model:
#   'deepseek-chat' is currently active. Please switch to another model first.
#   Use '/config model' to select a different model.

/config model claude-3-haiku remove --force
# ⚠️ Force Remove Model Confirmation:
#   WARNING: Force removing 'claude-3-haiku' model!
#   This may affect provider configuration and cannot be undone.
#   Type 'FORCE' to confirm: FORCE
# ✅ Model 'claude-3-haiku' force removed successfully

/config model non-existent remove
# ❌ Model Not Found:
#   Model 'non-existent' is not configured.
#   Use '/config model' to see available models.
```

**Model Selection Workflow:**
```bash
/config model
# Opens interactive dialog showing:
# 🤖 Available Models (deepseek provider):
# ✅ deepseek-chat (current)
# ✅ deepseek-coder

# Or if multiple providers:
# 🤖 Available Models:
# ✅ deepseek-chat (current)     - Provider: deepseek
# ✅ gpt-4                        - Provider: openai
# ✅ claude-3-sonnet              - Provider: anthropic
# ✅ gpt-4o-mini                  - Provider: openai

# User selects a model → System switches to that model immediately
```

### Rate Management

```bash
/config daily-limit [number]   # Set daily token limit
/config cost-alert [amount]    # Set cost alert threshold
/config rate-limit [number]    # Set requests per minute rate limit
```

**Default Values:**
- Daily token limit: `50,000` tokens
- Cost alert: `$10.00` per day
- Rate limit: `60` requests per minute

**Real Examples from Current Implementation:**
```bash
/config daily-limit 10000      # Set daily token limit to 10,000
/config cost-alert 5.00        # Set cost alert to $5.00 per day
/config rate-limit 30          # Set rate limit to 30 requests per minute
```

### Response and Context Settings

```bash
/config max-tokens [number]     # Set maximum response tokens
/config context-size [size]    # Set context window size
/config response-length [level] # Set response length preference
```

**Default Values:**
- Maximum response tokens: `4,096` tokens
- Context window size: `8,192` tokens
- Response length: `medium` (options: short, medium, long, detailed)

### Network and Advanced Settings

```bash
/config proxy                   # Configure proxy settings
/config endpoint [provider]     # Set custom API endpoint
```

**Proxy Configuration:**
```bash
/config proxy
# Interactive proxy setup dialog:
# 🔧 Proxy Configuration:
#   Enable proxy? (y/n): y
#   Proxy host: proxy.company.com
#   Proxy port: 8080
#   Username (optional):
#   Password (optional):
#   Proxy type: HTTP (options: HTTP, HTTPS, SOCKS5)
```

**Custom API Endpoints:**
```bash
/config endpoint openai https://api.custom-openai.com/v1
# Set custom endpoint for OpenAI-compatible API

/config endpoint deepseek https://internal-deepseek.company.com/api
# Set custom endpoint for internal Deepseek instance

/config endpoint custom https://api.local-ai.com/v1
# Set custom endpoint for local AI models
```

**Advanced Network Options:**
```bash
/config timeout 30              # Set request timeout to 30 seconds
/config retries 3               # Set number of retry attempts
/config verify-ssl false        # Disable SSL verification (for testing)
```

### Autocomplete Features

```bash
/config autocomplete enable     # Enable autocomplete
/config autocomplete disable suggestions  # Disable suggestions
/config autocomplete mode      # Set autocomplete mode
```

**Autocomplete Modes:**
```bash
/config autocomplete mode
# Interactive dialog showing:
# 🔧 Autocomplete Configuration:
#   1. commands    - Complete command names
#   2. topics      - Suggest learning topics
#   3. full        - Both commands and topics
#   4. minimal     - Basic command completion only
```

**Usage Examples:**
```bash
/config autocomplete enable
# Output: ✅ Autocomplete enabled - Mode: full

/config autocomplete disable suggestions
# Output: ⚠️ Autocomplete disabled - Use '/config autocomplete enable' to re-enable

/config autocomplete mode commands
# Output: ✅ Autocomplete set to commands mode
```

**How Autocomplete Works:**
- **Commands Mode**: Completes `/config`, `/explain`, `/quiz` etc.
- **Topics Mode**: Suggests subjects like "python", "machine learning", "algorithms"
- **Full Mode**: Combines both commands and topics
- **Minimal Mode**: Basic command completion only

💡 **Tip**: Use Tab key while typing to trigger autocomplete suggestions

### Custom System Prompts

```bash
/config system-prompt              # get current system prompt
/config system-prompt <new-prompt> # set system prompt
/config system-prompt --reset      # reset system prompt
```

**System Prompt Examples:**

**Default System Prompt:**
```bash
/config system-prompt
# Output: "You are Learning Catalyst, an AI assistant focused on helping users learn and understand complex topics through interactive dialogue."
```

**Custom Learning Style Prompt:**
```bash
/config system-prompt "You are an expert tutor who explains concepts using analogies, real-world examples, and step-by-step breakdowns. Always check for understanding before proceeding."
```

**Technical Documentation Style:**
```bash
/config system-prompt "You are a technical documentation expert. Provide clear, concise explanations with code examples, and highlight best practices and common pitfalls."
```

**Creative Problem-Solving Style:**
```bash
/config system-prompt "You are a creative problem-solving coach. Help users think through challenges by asking guiding questions and exploring multiple approaches."
```

**Reset to Default:**
```bash
/config system-prompt --reset
# Resets to the original Learning Catalyst system prompt
```

## Configuration File Location

Learning Catalyst stores configuration in:
- **Location**: `./.catalyst/config.json`
- **Logs**: `./.catalyst/logs/`

### Manual Configuration

You can manually edit the configuration file:

```json
{
  "provider": "deepseek",
  "model": "deepseek-chat",
  "api_key": "sk-your-api-key-here",
  "settings": {
    "daily_limit": 50000,
    "cost_alert": 10.0,
    "rate_limit": 60,
    "max_tokens": 4096,
    "context_size": 8192,
    "response_length": "medium"
  },
  "providers": {
    "deepseek": {
      "api_key": "sk-deepseek-key",
      "base_url": "https://api.deepseek.com",
      "models": ["deepseek-chat", "deepseek-coder"]
    }
  }
}
```

⚠️ **Warning**: Manual editing requires application restart to take effect. Use `/config` commands for immediate changes.

## Usage Examples

### Basic Provider Setup
```bash
# Configure OpenAI provider
/config provider deepseek
🔧 Deepseek Provider Configuration:
  Enter your Deepseek API key: sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# View provider details (includes connection status)
/config provider deepseek show
✅ Deepseek Provider Details:
  Status: Configured and Connected
  Models: deepseek-chat, deepseek-coder
  Connection Test: Passed

/config model
# Interactive model selection dialog - select deepseek-chat
🤖 Model set to: deepseek-chat

# show config status
/config
= Current Configuration:
  Provider: deepseek
  Model: deepseek-chat
  API Key: ✓ Valid
  Status: ✓ Connected
```

### Multiple Provider Setup
```bash
# Add Deepseek provider
Learning Catalyst > /config provider siliconflow
🔧 SiliconFlow API key: sk-xxxxxxxxxxxxxxxxxxxxxxxx

# Add custom provider
/config provider custom groq
🔧 Config provider groq:
  Enter API base URL: https://api.groq.com/openai/v1
  Enter API key: gsk_xxxxxxxxxxxxxxxxxxxxxxxxx

# View current configuration (shows providers)
/config
```

### Provider Cleanup
```bash
# Switch to primary provider before cleanup
/config provider openai
/config model gpt-4o

# Remove unused providers
/config provider siliconflow remove
# ⚠️ Remove Provider Confirmation:
#   Are you sure you want to remove 'siliconflow' provider?
#   Type 'yes' to confirm: yes
# ✅ Provider 'siliconflow' removed successfully

/config provider groq remove
# ⚠️ Remove Provider Confirmation:
#   Are you sure you want to remove 'groq' provider?
#   Type 'yes' to confirm: yes
# ✅ Provider 'groq' removed successfully
```

### Model Management
```bash
# Interactive model selection
/config model

# Select model from interactive dialog
# (system shows available models with current one marked)
```

### Model Cleanup
```bash
# Switch to preferred model before cleanup
/config model gpt-4o

# Remove unused models
/config model gpt-4o-mini remove
# ⚠️ Remove Model Confirmation:
#   Are you sure you want to remove 'gpt-4o-mini' model?
#   Type 'yes' to confirm: yes
# ✅ Model 'gpt-4o-mini' removed successfully

# Force remove problematic model (emergency use only)
/config model broken-model remove --force
# ⚠️ Force Remove Model Confirmation:
#   WARNING: Force removing 'broken-model' model!
#   Type 'FORCE' to confirm: FORCE
# ✅ Model 'broken-model' force removed successfully
```

### Usage Management
```bash
# Set daily limits
/config daily-limit 10000
/config cost-alert 5.00

# Set rate limits
/config rate-limit 30
```

## Usage Patterns

### Initial Setup
```bash
# Check current configuration
/config

# Set up AI provider and model
/config provider openai
/config model
# Interactive dialog shows available models - select gpt-4
```

### Daily Configuration
```bash
# Check current setup
/config

# Switch providers if needed
/config provider anthropic
/config model
# Interactive dialog shows available models - select claude-3-sonnet
```

### Performance Tuning
```bash
# Check current settings
/config model

# Optimize for speed
/config model
# Interactive dialog shows available models - select gpt-4o-mini

# Optimize for quality
/config model
# Interactive dialog shows available models - select gpt-4o
```

## Configuration Examples

### Basic Configuration

The current implementation supports simple configuration management:

```bash
# Configure AI provider and model
/config provider openai
/config model
# Interactive dialog shows available models - select gpt-4o
```

**Note**: Use `/config` to see current configuration status.

## Error Handling

### Common Configuration Errors

**API Connection Issues:**
```bash
# Error: "Failed to connect to provider"
/config provider openai show
# Check status and connection details

# Solution: Reconfigure API key
/config provider openai
🔧 OpenAI Provider Configuration:
  Enter your OpenAI API key: sk-new-valid-key
```

**Model Selection Issues:**
```bash
# Error: "Model not available for current provider"
/config model gpt-4
# Model might not be available for your current provider

# Solution: Check available models first
/config provider openai show
# View all available models, then select valid one
```

**Rate Limit Errors:**
```bash
# Error: "Rate limit exceeded"
/config rate-limit 30  # Reduce rate limit
/config daily-limit 5000  # Reduce daily limit
```

**Provider Removal Errors:**
```bash
# Error: "Cannot remove active provider"
/config provider deepseek remove
# ❌ Cannot remove active provider 'deepseek'
# Solution: Switch to another provider first
/config provider openai  # Switch to openai provider
/config provider deepseek remove  # Now can remove deepseek

# Error: "Cannot remove last provider"
/config provider openai remove
# ❌ Cannot remove last configured provider
# Solution: Add another provider first
/config provider anthropic  # Add new provider
/config provider openai remove  # Now can remove openai
```

**Model Removal Errors:**
```bash
# Error: "Cannot remove active model"
/config model gpt-4 remove
# ❌ Cannot remove active model 'gpt-4'
# Solution: Switch to another model first
/config model gpt-4o-mini  # Switch to different model
/config model gpt-4 remove  # Now can remove gpt-4

# Error: "Model not found in configuration"
/config model invalid-model remove
# ❌ Model 'invalid-model' not found
# Solution: Check available models first
/config model  # Show available models
```

### Recovery Strategies

1. **Check Configuration**: Use `/config` to review current settings
2. **Test Provider Connection**: Use `/config provider [name] show` to verify status
3. **Reset to Defaults**: Delete `./.catalyst/config.json` and restart
4. **Use Basic Operations**: Stick to `provider|model` operations
5. **Document Changes**: Keep track of configuration changes for rollback

### Safety Best Practices for Removal

**⚠️ Before Removing Providers:**
- Always switch to another provider first
- Ensure you have at least 2 providers configured
- Test the new provider connection before removing the old one
- Keep API keys backed up in a secure location

**⚠️ Before Removing Models:**
- Switch to a different model first
- Verify the alternative model works for your use case
- Consider keeping backup models for different tasks (chat vs coding)
- Document model-specific settings or prompts

**🔒 Safety Features:**
- **Active Protection**: Cannot remove currently active provider/model
- **Last Provider Protection**: Cannot remove the last configured provider
- **Confirmation Dialogs**: All removals require explicit confirmation
- **Force Option**: `--force` flag for emergency removals (use with caution)

**💡 Recommended Workflow:**
```bash
# Before removal - verify setup
/config                    # Check current configuration
/config provider show      # Verify all providers working

# Safe provider removal
/config provider new-provider      # Switch to different provider
/config provider old-provider remove  # Now safe to remove

# Safe model removal
/config model alternative-model      # Switch to different model
/config model unwanted-model remove  # Now safe to remove
```

### Configuration Reset

If configuration becomes corrupted:

```bash
# Option 1: Manual reset
rm ./.catalyst/config.json
# Restart application - will create fresh config

# Option 2: Provider-specific reset
/config provider openai
# Reconfigure from scratch
```

*See [Command Reference Overview](README.md) for complete command listing and [Configuration Guide](../configuration/) for detailed setup instructions.*