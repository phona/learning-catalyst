# Interactive Shell Commands Reference

---
title: Learning Catalyst Interactive Shell Commands
description: Available commands in the Learning Catalyst interactive shell
version: 1.0.0
last_updated: 2025-10-08
---

## Overview

Learning Catalyst provides an interactive shell with slash-based commands for learning, configuration, and system operations. All commands use the `/` prefix and are designed for intuitive interaction during learning sessions.

### 🎯 Available Commands

**✅ Working Commands:**
- **🚀 Learning**: `/knowledge-map` - Visualize knowledge connections and progress
- **🧠 Natural Learning**: Ask questions directly without commands - "Explain neural networks" or "Test me on Python"
- **⚙️ Configuration**: `/config` - Manage AI providers and settings
- **📊 Analytics**: `/tokens` - Track usage and costs
- **🔧 System**: `/help`, `/quit`, `/clear` - Essential shell operations
- **💾 Session**: `/checkpoint` - Save and restore learning progress
- **🧩 Context**: `/context`, `/compress`, `/wait`, `/verbose` - Context management commands

**🔗 See Examples:**
- [Basic Workflows](../examples/basic-workflows.md) - Commands in action
- [Configuration Examples](../examples/integration.md) - Setup and configuration

## Available Commands

### 🔧 System Commands
Essential shell operations
- `/help` - ✅ Show available commands and usage
- `/quit` - ✅ Exit the interactive shell
- `/clear` - ✅ Clear the terminal screen

### ⚙️ Configuration Commands
Manage AI providers and application settings
- `/config` - ✅ Interactive configuration management
- `/config provider` - ✅ Switch between AI providers
- `/config provider [name]` - ✅ Setup a new AI provider
- `/config provider [name] show` - ✅ Show provider details
- `/config model` - ✅ Switch between AI models

### 📚 Learning Commands
Explore and interact with learning content
- `/knowledge-map` - ✅ Visualize knowledge connections and track progress

**🧠 Natural Learning (No Commands Needed):**
Just ask questions naturally in the shell:
- **Explanations**: "Explain neural networks" or "How do decorators work?"
- **Practice**: "Test me on Python lists" or "Give me questions about React"
- **Learning**: Focus on natural conversation with the AI for personalized learning

### 💾 Session Commands
Save and restore learning progress
- `/checkpoint save [name]` - ✅ Save current session state (auto-names if no name provided)
- `/checkpoint load [name]` - ✅ Restore a saved session

### 📊 Analytics Commands
Track usage and learning progress
- `/tokens` - ✅ Show API token usage and costs

### 🧩 Context Commands
Manage conversation context and system behavior
- `/context` - ✅ Show current conversation context
- `/compress` - ✅ Compress conversation context to save tokens
- `/wait [seconds]` - ✅ Set delay between API requests (rate limiting)
- `/verbose [on/off]` - ✅ Toggle debug mode for detailed output

## Command Summary

| Command | What It Does | Example Usage |
|---------|--------------|---------------|
| **System Commands** |
| `/help` | Show all available commands | `/help` |
| `/quit` | Exit the shell | `/quit` |
| `/clear` | Clear screen | `/clear` |
| **Configuration** |
| `/config` | Show current settings | `/config` |
| `/config provider` | Switch AI provider | `/config provider` |
| `/config model` | Switch AI model | `/config model` |
| **Learning** |
| `/knowledge-map` | See connections & progress | `/knowledge-map` |
| **Natural Learning** |
| *(no command)* | Ask questions directly | `Explain machine learning` |
| **Session** |
| `/checkpoint save [name]` | Save progress | `/checkpoint save python-basics` |
| `/checkpoint save` | Auto-save with timestamp | `/checkpoint save` (creates: `react-hooks_2025-10-09_143022`) |
| `/checkpoint load [name]` | Restore progress | `/checkpoint load python-basics` |
| **Analytics** |
| `/tokens` | Check usage | `/tokens` |
| **Context** |
| `/context` | Show conversation context | `/context` |
| `/compress` | Compress context to save tokens | `/compress` |
| `/wait 60` | Set 60-second delay between requests | `/wait 60` |
| `/verbose on` | Enable debug mode | `/verbose on` |

## Getting Started

### First Time Setup
```bash
# Start Learning Catalyst
learning-catalyst

# Configure AI provider (first time only)
/config provider openai
/config model
# Select a model from the interactive dialog

# Start learning
/knowledge-map      # See your learning progress
# Or ask naturally: "What can I learn about?"
```

### Basic Usage
```bash
# Ask questions directly (no commands needed)
Explain machine learning
How do Python decorators work?

# Use commands for specific actions
/help              # See all commands
/clear             # Clear screen
/tokens            # Check usage
/quit              # Exit shell
```

---

*For detailed information about each command, see the specific command category pages:*
- *[System Commands](system.md)* - Help, quit, and clear operations
- *[Configuration Commands](configuration.md)* - AI provider and model setup
- *[Learning Commands](learning.md)* - Knowledge mapping and natural learning
- *[Session Commands](session.md)* - Save and restore learning progress
- *[Analytics Commands](analytics.md)* - Usage tracking and costs
- *[Context Commands](context.md)* - Context management and debug commands