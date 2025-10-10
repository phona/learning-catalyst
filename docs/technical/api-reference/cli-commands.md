# CLI Commands API

---
title: Learning Catalyst CLI Commands API
description: Complete command-line interface specification with parameters and examples
version: 1.0.0
last_updated: 2025-10-08
---

## Overview

This document provides a comprehensive reference for all Learning Catalyst CLI commands, including syntax, parameters, response formats, and usage examples. The CLI follows a consistent pattern with slash-prefixed commands and supports tab completion, help system, and interactive features.

## Command Architecture

### Command Structure

All CLI commands follow this structure:
```
/[command] [subcommand] [arguments] [options]
```

### Command Categories

1. **Navigation & Discovery**: Help, concepts, status
2. **Configuration**: Provider setup, model management, preferences
3. **Learning & Analytics**: Tokens, statistics, knowledge mapping
4. **Session Management**: Reset, checkpoints, quit
5. **System Operations**: Diagnostic, optimization, maintenance

## Core Commands

### Help System

#### `/help`
Display available commands and general help information.

**Syntax:**
```bash
/help [command_name]
```

**Parameters:**
- `command_name` (optional): Specific command to get detailed help for

**Examples:**
```bash
# Show general help
Learning Catalyst > /help
= Available Commands:
  ┌────────────────────┬────────────────────────────────────────────┐
  │ Command            │ Description                                │
  ├────────────────────┼────────────────────────────────────────────┤
  │ /help              │ Show this help message                   │
  │ /concepts          │ Show available learning concepts           │
  │ /config            │ Manage AI configuration                   │
  │ /models            │ List and switch between AI models         │
  │ /tokens            │ View token usage statistics               │
  │ /reset             │ Reset the learning session                │
  │ /quit              │ Exit the application                       │
  └────────────────────┴────────────────────────────────────────────┘

# Get help for specific command
Learning Catalyst > /help config
= /config - Manage AI configuration
  Usage: /config [subcommand] [arguments]

  Subcommands:
    show           - Show current configuration
    provider       - Manage AI providers
    model          - Manage AI models
    save           - Save current configuration
    load           - Load saved configuration
    reset          - Reset to defaults
```

**Response Format:**
```json
{
  "success": true,
  "data": {
    "command": "help",
    "content": "Help content...",
    "available_commands": [...],
    "categories": [...]
  },
  "metadata": {
    "request_id": "uuid-1234",
    "timestamp": "2025-10-08T10:30:00Z"
  }
}
```

### Configuration Commands

#### `/config show`
Display current AI configuration.

**Syntax:**
```bash
/config show
```

**Examples:**
```bash
Learning Catalyst > /config show
📋 Current Configuration:
  AI Provider: OpenAI
  Model: gpt-4
  API Status: Connected
  Temperature: 0.7
  Max Tokens: 2000

  Provider Details:
    OpenAI:
      - Model: gpt-4
      - Endpoint: https://api.openai.com/v1
      - Status: Connected
      - Rate Limit: 4,999 tokens/min remaining
```

**Response Format:**
```json
{
  "success": true,
  "data": {
    "command": "config show",
    "configuration": {
      "ai": {
        "provider": "openai",
        "model": "gpt-4",
        "temperature": 0.7,
        "max_tokens": 2000
      },
      "providers": {
        "openai": {
          "status": "connected",
          "models": ["gpt-4", "gpt-3.5-turbo"],
          "rate_limit": {
            "remaining": 4999,
            "limit": 5000
          }
        }
      }
    }
  }
}
```

#### `/config provider`
Manage AI provider configuration.

**Syntax:**
```bash
/config provider [provider_name] [api_key] [options]
/config provider list
/config provider test [provider_name]
```

**Parameters:**
- `provider_name`: Name of the AI provider (openai, anthropic, deepseek, etc.)
- `api_key`: API key for the provider
- `options`: Additional provider-specific options

**Examples:**
```bash
# Configure OpenAI provider
Learning Catalyst > /config provider openai
🔧 OpenAI Provider Configuration:
  Enter your OpenAI API key: sk-xxxxxxxxxxxxxxxxxxxxxxxx
  Base URL (optional): https://api.openai.com/v1
  Timeout (seconds) [30]: 30
✅ OpenAI provider configured successfully

# List all providers
Learning Catalyst > /config provider list
📊 Configured Providers:
  ✅ OpenAI (gpt-4, gpt-3.5-turbo)
  ✅ Deepseek (deepseek-chat, deepseek-coder)
  ❌ Anthropic (Not configured)
  ❌ SiliconFlow (Not configured)

# Test provider connection
Learning Catalyst > /config provider test openai
✅ OpenAI API connection successful!
  Available models: gpt-4, gpt-3.5-turbo
  Response time: 1.2s
  Rate limit: 4,999/5,000 tokens
```

**Response Format:**
```json
{
  "success": true,
  "data": {
    "command": "config provider",
    "provider": "openai",
    "status": "configured",
    "models": ["gpt-4", "gpt-3.5-turbo"],
    "connection_test": {
      "status": "success",
      "response_time": 1.2,
      "rate_limit": {
        "remaining": 4999,
        "limit": 5000
      }
    }
  }
}
```

#### `/config model`
Manage AI model selection and switching.

**Syntax:**
```bash
/config model use [model_name]
/config model list
/config model switch [provider_name]
/config model info [model_name]
```

**Parameters:**
- `model_name`: Name of the model to use
- `provider_name`: Provider to switch to

**Examples:**
```bash
# List available models
Learning Catalyst > /config model list
📋 Available Models:
  OpenAI:
    • gpt-4 (8K context, $0.03/1K input, $0.06/1K output)
    • gpt-3.5-turbo (4K context, $0.0015/1K input, $0.002/1K output)

  Deepseek:
    • deepseek-chat (32K context, $0.14/1K input, $0.28/1K output)
    • deepseek-coder (32K context, $0.14/1K input, $0.28/1K output)

# Switch to specific model
Learning Catalyst > /config model use gpt-4
🤖 Model switched to: gpt-4
  Context window: 8,192 tokens
  Cost per 1K tokens: $0.03 (input) / $0.06 (output)
  Provider: OpenAI

# Interactive model selection
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
```

**Response Format:**
```json
{
  "success": true,
  "data": {
    "command": "config model",
    "action": "use",
    "model": {
      "name": "gpt-4",
      "provider": "openai",
      "context_window": 8192,
      "pricing": {
        "input_per_1k": 0.03,
        "output_per_1k": 0.06
      }
    }
  }
}
```

### Learning Commands

#### `/concepts`
Browse and interact with available learning concepts.

**Syntax:**
```bash
/concepts
/concepts search [query]
/concepts detail [concept_id]
/concepts list [category]
```

**Parameters:**
- `query`: Search query to find concepts
- `concept_id`: ID of specific concept to view
- `category`: Category to filter concepts by

**Examples:**
```bash
# Show available concepts
Learning Catalyst > /concepts
📚 Available Learning Concepts:
  📊 Computer Science (25 concepts)
    • Data Structures (12 concepts)
    • Algorithms (8 concepts)
    • System Design (5 concepts)

  🐍 Python Programming (18 concepts)
    • Basic Syntax (6 concepts)
    • Advanced Topics (7 concepts)
    • Best Practices (5 concepts)

  🌐 Web Development (15 concepts)
    • HTML/CSS (5 concepts)
    • JavaScript (7 concepts)
    • Frameworks (3 concepts)

# Search for specific concepts
Learning Catalyst > /concepts search recursion
🔍 Search Results for "recursion":
  1. Recursion Fundamentals
     Difficulty: ⭐⭐⭐☆☆ (3/5)
     Est. Time: 45 minutes
     Prerequisites: Functions, Stack Data Structure

  2. Recursive Algorithms
     Difficulty: ⭐⭐⭐⭐☆ (4/5)
     Est. Time: 60 minutes
     Prerequisites: Recursion Fundamentals, Algorithm Analysis

# Get detailed concept information
Learning Catalyst > /concepts detail recursion-fundamentals
📖 Concept: Recursion Fundamentals
📊 Difficulty: ⭐⭐⭐☆☆ (3/5)
⏱️ Estimated Time: 45 minutes

🎯 Learning Objectives:
  • Understand the concept of recursion
  • Identify recursive vs. iterative solutions
  • Implement basic recursive functions
  • Analyze recursion complexity

📋 Prerequisites:
  • Functions and parameters
  • Stack data structure basics
  • Basic algorithm analysis

📚 Content Overview:
  1. What is Recursion?
  2. Base Cases and Recursive Cases
  3. Stack Frames and Call Stack
  4. Common Recursive Patterns
  5. When to Use Recursion

📈 Your Progress:
  • Mastery Level: 65%
  • Last Practiced: 2 days ago
  • Quiz Average: 78%
```

**Response Format:**
```json
{
  "success": true,
  "data": {
    "command": "concepts",
    "action": "list",
    "concepts": [
      {
        "id": "recursion-fundamentals",
        "title": "Recursion Fundamentals",
        "category": "computer-science",
        "difficulty": 3,
        "estimated_time": 45,
        "prerequisites": ["functions", "stack-basics"],
        "user_progress": {
          "mastery_level": 0.65,
          "last_practiced": "2025-10-06T10:30:00Z",
          "quiz_average": 0.78
        }
      }
    ]
  }
}
```

#### `/tokens`
View token usage statistics and costs.

**Syntax:**
```bash
/tokens
/tokens summary [period]
/tokens detailed [model_name]
/tokens export [format]
```

**Parameters:**
- `period`: Time period (day, week, month, all)
- `model_name`: Specific model to show details for
- `format`: Export format (json, csv)

**Examples:**
```bash
# Show token usage summary
Learning Catalyst > /tokens
📊 Token Usage Summary:
  Current Session: 1,234 tokens
  Daily Usage: 2,456 tokens
  Monthly Usage: 15,678 tokens

  Cost Breakdown:
    • OpenAI GPT-4: $12.34 (8,234 tokens)
    • Deepseek Chat: $2.18 (5,234 tokens)
    • Total Today: $14.52

  Usage by Context:
    • Explanations: 45% (7,055 tokens)
    • Quizzes: 30% (4,703 tokens)
    • Chat: 25% (3,918 tokens)

# Detailed usage for specific model
Learning Catalyst > /tokens detailed gpt-4
📊 Detailed Token Usage for gpt-4:
┌─────────────────────┬──────────────┬───────────────┬──────────────┐
│ Timestamp           │ Input Tokens │ Output Tokens │ Context      │
├─────────────────────┼──────────────┼───────────────┼──────────────┤
│ 2025-10-08 10:30:22 │ 450          │ 280           │ explanation  │
│ 2025-10-08 09:15:47 │ 320          │ 195           │ challenge    │
│ 2025-10-08 08:45:12 │ 180          │ 120           │ chat        │
└─────────────────────┴──────────────┴───────────────┴──────────────┘

  Summary:
    Total Requests: 15
    Total Tokens: 1,545
    Total Cost: $2.17
    Average Response Time: 2.3s

# Export usage data
Learning Catalyst > /tokens export json
✅ Token usage exported to: token_usage_2025-10-08.json
```

**Response Format:**
```json
{
  "success": true,
  "data": {
    "command": "tokens",
    "action": "summary",
    "usage": {
      "current_session": 1234,
      "daily": 2456,
      "monthly": 15678,
      "by_provider": {
        "openai": {
          "tokens": 8234,
          "cost": 12.34,
          "models": {
            "gpt-4": {"tokens": 6234, "cost": 9.35},
            "gpt-3.5-turbo": {"tokens": 2000, "cost": 3.00}
          }
        },
        "deepseek": {
          "tokens": 5234,
          "cost": 2.18,
          "models": {
            "deepseek-chat": {"tokens": 5234, "cost": 2.18}
          }
        }
      },
      "by_context": {
        "explanation": 7055,
        "quiz": 4703,
        "chat": 3918
      }
    }
  }
}
```

### Session Management Commands

#### `/reset`
Reset the current learning session.

**Syntax:**
```bash
/reset [options]
```

**Parameters:**
- `options`: Reset options (--hard, --soft, --conversation-only)

**Examples:**
```bash
# Soft reset (clear conversation, keep configuration)
Learning Catalyst > /reset
🔄 Session reset.
  ✓ Conversation history cleared
  ✓ Current topic cleared
  ✓ Short-term memory reset
  Configuration remains unchanged
  You can continue learning with your current settings.

# Hard reset (clear everything)
Learning Catalyst > /reset --hard
🔄 Hard reset completed.
  ✓ All session data cleared
  ✓ Conversation history removed
  ✓ Learning progress reset
  ✓ Cache cleared
  ✓ Checkpoints preserved
  System restored to default state.

# Conversation-only reset
Learning Catalyst > /reset --conversation-only
🔄 Conversation reset.
  ✓ Conversation history cleared
  ✓ Current context reset
  ✓ AI memory cleared
  Learning progress and configuration preserved
```

**Response Format:**
```json
{
  "success": true,
  "data": {
    "command": "reset",
    "reset_type": "soft",
    "cleared_items": [
      "conversation_history",
      "current_topic",
      "short_term_memory"
    ],
    "preserved_items": [
      "configuration",
      "user_progress",
      "checkpoints"
    ]
  }
}
```

#### `/checkpoint`
Manage session checkpoints for saving and restoring state.

**Syntax:**
```bash
/checkpoint save [name]
/checkpoint load [name]
/checkpoint list
/checkpoint delete [name]
```

**Parameters:**
- `name`: Name for the checkpoint

**Examples:**
```bash
# Save current session as checkpoint
Learning Catalyst > /checkpoint save react-hooks-progress
✅ Checkpoint saved: react-hooks-progress
  • Session state: Saved
  • Conversation history: 23 messages
  • Current topic: React Hooks
  • Learning progress: 67% complete
  • Timestamp: 2025-10-08T10:30:00Z

# List available checkpoints
Learning Catalyst > /checkpoint list
📋 Available Checkpoints:
  1. react-hooks-progress
     Created: 2025-10-08 10:30:00Z
     Size: 2.3MB
     Messages: 23
     Topic: React Hooks

  2. python-data-structures
     Created: 2025-10-07 15:45:00Z
     Size: 1.8MB
     Messages: 18
     Topic: Python Data Structures

# Load checkpoint
Learning Catalyst > /checkpoint load react-hooks-progress
🔄 Checkpoint loaded: react-hooks-progress
  ✓ Session state restored
  ✓ Conversation history loaded (23 messages)
  ✓ Current topic: React Hooks
  ✓ Learning progress: 67% complete
  ✓ Context: useState, useEffect patterns

# Delete checkpoint
Learning Catalyst > /checkpoint delete python-data-structures
✅ Checkpoint deleted: python-data-structures
```

**Response Format:**
```json
{
  "success": true,
  "data": {
    "command": "checkpoint",
    "action": "save",
    "checkpoint_name": "react-hooks-progress",
    "checkpoint_info": {
      "created_at": "2025-10-08T10:30:00Z",
      "size_bytes": 2457600,
      "message_count": 23,
      "current_topic": "React Hooks",
      "progress_percentage": 0.67
    }
  }
}
```

### System Commands

#### `/status`
Display system status and health information.

**Syntax:**
```bash
/status [--detailed]
```

**Parameters:**
- `--detailed`: Show detailed system information

**Examples:**
```bash
# Basic status
Learning Catalyst > /status
= System Status:
  Installation: ✓ OK
  Configuration: ✓ Configured
  AI Providers: ✓ Connected
  Memory: ✓ 245MB used (512MB available)
  Last Error: None

# Detailed status
Learning Catalyst > /status --detailed
= Detailed System Status:

  Application:
    Version: 1.0.0
    Uptime: 2h 34m
    Memory Usage: 245MB / 512MB
    Cache Hit Rate: 87%

  AI Configuration:
    Active Provider: OpenAI
    Active Model: gpt-4
    Provider Status: Connected
    Model Availability: All models available

  Database:
    Status: Connected
    Size: 15.6MB
    Records: 2,345
    Last Backup: 2025-10-08 09:00:00Z

  Session:
    Session ID: sess_abc123
    Duration: 45m
    Messages: 12
    Current Topic: React Hooks
```

**Response Format:**
```json
{
  "success": true,
  "data": {
    "command": "status",
    "system_info": {
      "application": {
        "version": "1.0.0",
        "uptime": 9240,
        "memory_usage": {
          "used": 245,
          "available": 512,
          "percentage": 0.48
        },
        "cache_hit_rate": 0.87
      },
      "ai_configuration": {
        "active_provider": "openai",
        "active_model": "gpt-4",
        "provider_status": "connected",
        "model_availability": "all_available"
      },
      "database": {
        "status": "connected",
        "size_bytes": 16357888,
        "record_count": 2345,
        "last_backup": "2025-10-08T09:00:00Z"
      },
      "session": {
        "session_id": "sess_abc123",
        "duration_minutes": 45,
        "message_count": 12,
        "current_topic": "React Hooks"
      }
    }
  }
}
```

#### `/quit`
Exit the application.

**Syntax:**
```bash
/quit [--force]
```

**Parameters:**
- `--force`: Force quit without saving

**Examples:**
```bash
# Normal quit
Learning Catalyst > /quit
💾 Session saved: 12 messages, 45 minutes
🔄 Cleaning up temporary files...
✓ Cache cleared: 45MB freed
✓ Configuration saved
Thanks for using Learning Catalyst. Goodbye! 👋

# Force quit
Learning Catalyst > /quit --force
⚠️ Force quitting without saving...
✓ Clean shutdown completed
```

**Response Format:**
```json
{
  "success": true,
  "data": {
    "command": "quit",
    "session_saved": true,
    "cleanup_completed": true,
    "messages_saved": 12,
    "cache_cleared": 45
  }
}
```

## Error Handling

### Error Response Format

All commands return consistent error responses:

```json
{
  "success": false,
  "error": {
    "code": "INVALID_COMMAND",
    "message": "Unknown command: /invalid-command",
    "details": {
      "suggestions": [
        "Try: /help to see available commands",
        "Try: /config to manage configuration"
      ],
      "similar_commands": [
        "/config",
        "/concepts"
      ]
    },
    "request_id": "uuid-5678",
    "timestamp": "2025-10-08T10:30:00Z"
  }
}
```

### Common Error Codes

| Error Code | Description | Example |
|-----------|-------------|---------|
| `INVALID_COMMAND` | Command not found | `/unknown-command` |
| `MISSING_ARGUMENT` | Required argument missing | `/config use` |
| `INVALID_ARGUMENT` | Invalid argument value | `/config model use invalid-model` |
| `API_ERROR` | AI provider error | `/explain something` with invalid API key |
| `NETWORK_ERROR` | Network connectivity issue | Any command requiring AI |
| `PERMISSION_DENIED` | Insufficient permissions | `/config` without proper file access |
| `RATE_LIMITED` | Too many requests | Multiple rapid AI queries |

## Command Development

### Adding New Commands

```python
from learning_catalyst.cli.commands import BaseCommand
from learning_catalyst.api import Response

class CustomCommand(BaseCommand):
    """Example custom command implementation"""

    name = "custom"
    description = "Custom command for demonstration"
    aliases = ["demo", "example"]

    def add_arguments(self, parser):
        """Add command arguments"""
        parser.add_argument(
            "action",
            choices=["show", "create", "delete"],
            help="Action to perform"
        )
        parser.add_argument(
            "--name",
            help="Name for the item"
        )
        parser.add_argument(
            "--force",
            action="store_true",
            help="Force action without confirmation"
        )

    async def execute(self, args, context):
        """Execute command logic"""
        if args.action == "show":
            return await self._show_items(args, context)
        elif args.action == "create":
            return await self._create_item(args, context)
        elif args.action == "delete":
            return await self._delete_item(args, context)

    async def _show_items(self, args, context):
        """Show available items"""
        items = await self.data_manager.get_items()

        return Response.success({
            "items": items,
            "count": len(items)
        })

    async def _create_item(self, args, context):
        """Create new item"""
        if not args.name:
            return Response.error("MISSING_ARGUMENT", "Name is required for create action")

        # Check if item already exists
        existing = await self.data_manager.get_item(args.name)
        if existing and not args.force:
            return Response.error("ITEM_EXISTS", f"Item '{args.name}' already exists. Use --force to overwrite")

        # Create item
        item = await self.data_manager.create_item(args.name)

        return Response.success({
            "item": item,
            "message": f"Item '{args.name}' created successfully"
        })

    async def _delete_item(self, args, context):
        """Delete existing item"""
        if not args.name:
            return Response.error("MISSING_ARGUMENT", "Name is required for delete action")

        # Check if item exists
        existing = await self.data_manager.get_item(args.name)
        if not existing:
            return Response.error("ITEM_NOT_FOUND", f"Item '{args.name}' not found")

        # Delete item
        await self.data_manager.delete_item(args.name)

        return Response.success({
            "message": f"Item '{args.name}' deleted successfully"
        })

# Register command
command_registry.register(CustomCommand())
```

### Command Testing

```python
import unittest
from learning_catalyst.cli.commands import CustomCommand
from learning_catalyst.testing import CommandTestCase

class TestCustomCommand(CommandTestCase):
    def setUp(self):
        super().setUp()
        self.command = CustomCommand()

    async def test_show_items(self):
        """Test show items functionality"""
        args = self.parse_args("custom show")
        response = await self.command.execute(args, self.create_context())

        self.assertTrue(response.success)
        self.assertIn("items", response.data)
        self.assertIn("count", response.data)

    async def test_create_item(self):
        """Test item creation"""
        args = self.parse_args("custom create --name test-item")
        response = await self.command.execute(args, self.create_context())

        self.assertTrue(response.success)
        self.assertIn("item", response.data)
        self.assertIn("message", response.data)

    async def test_create_item_missing_name(self):
        """Test create item with missing name"""
        args = self.parse_args("custom create")
        response = await self.command.execute(args, self.create_context())

        self.assertFalse(response.success)
        self.assertEqual(response.error.code, "MISSING_ARGUMENT")

if __name__ == "__main__":
    unittest.main()
```

## Integration Examples

### Python API Integration

```python
from learning_catalyst.api import CLIClient

# Initialize client
client = CLIClient()

# Execute command programmatically
response = client.execute_command(
    command="/config show",
    timeout=30
)

if response.success:
    config = response.data
    print(f"Current provider: {config['ai']['provider']}")
    print(f"Current model: {config['ai']['model']}")
else:
    print(f"Error: {response.error.message}")

# Handle interactive commands
response = client.execute_command(
    command="/concepts search python",
    interactive=True
)

for concept in response.data['concepts']:
    print(f"- {concept['title']} ({concept['difficulty']}/5)")
```

### Shell Script Integration

```bash
#!/bin/bash

# Learning Catalyst automation script

# Check system status
echo "Checking system status..."
learning-catalyst /status --detailed > status.json

# Extract configuration
CURRENT_PROVIDER=$(jq -r '.data.ai_configuration.active_provider' status.json)
CURRENT_MODEL=$(jq -r '.data.ai_configuration.active_model' status.json)

echo "Current configuration: $CURRENT_PROVIDER - $CURRENT_MODEL"

# Check token usage
echo "Checking token usage..."
learning-catalyst /tokens > tokens.json

DAILY_USAGE=$(jq -r '.data.usage.daily' tokens.json)
MONTHLY_COST=$(jq -r '.data.usage.by_provider.openai.cost' tokens.json)

echo "Daily usage: $DAILY_USAGE tokens"
echo "Monthly OpenAI cost: \$$MONTHLY_COST"

# Create checkpoint if usage is high
if [ "$DAILY_USAGE" -gt 5000 ]; then
    echo "High usage detected, creating checkpoint..."
    learning-catalyst /checkpoint save "high-usage-$(date +%Y%m%d)"
fi
```

## Troubleshooting Command Issues

### Common Problems

#### Issue: Command Not Recognized
```bash
# Symptom: Unknown command error
Learning Catalyst > /invalid-command
❌ Error: Unknown command: /invalid-command

# Solution: Check available commands
Learning Catalyst > /help
✓ Available commands listed

# Use tab completion
Learning Catalyst > /conf[Tab]
= Suggestions: /config, /concepts
```

#### Issue: Missing Required Arguments
```bash
# Symptom: Missing argument error
Learning Catalyst > /config model use
❌ Error: Missing required argument: model_name

# Solution: Check command help
Learning Catalyst > /help config model
✓ Usage: /config model use [model_name]

# Provide required argument
Learning Catalyst > /config model use gpt-4
✅ Model switched to: gpt-4
```

#### Issue: Invalid Configuration
```bash
# Symptom: Configuration error
Learning Catalyst > /explain something
❌ Error: No AI provider configured

# Solution: Configure provider
Learning Catalyst > /config provider openai
✅ OpenAI provider configured successfully
```

## Related Documentation

- **[Configuration API](configuration-api.md)**: Configuration management details
- **[Provider Interface](provider-interfaces.md)**: AI provider integration
- **[Implementation Guides](../implementation-guides/)**: Development and setup
- **[Examples](../../examples/)**: Practical usage examples

---

*Last updated: October 8, 2025*
*Version: 1.0.0*
*Category: API Reference*