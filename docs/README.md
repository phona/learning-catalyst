# Learning Catalyst CLI Documentation

---
title: Learning Catalyst CLI Documentation
description: Command-line interface documentation for Learning Catalyst AI-powered learning assistant
version: 1.0.0
last_updated: 2025-10-07
---

## Overview

This directory contains comprehensive documentation for Learning Catalyst, an AI-powered learning assistant that operates entirely within the command line interface. Learning Catalyst helps you organize, navigate, and master complex knowledge domains through terminal-based interactions and personalized challenges.

## Documentation Structure

### 🚀 [Getting Started](#getting-started)
*Quick start guides for new users*

- [Installation Guide](installation/) - Install and set up Learning Catalyst CLI
- [Quick Start](installation/quick-start.md) - Get started in 5 minutes

### 📋 [Command Reference](commands/)
*Complete command-line interface documentation*

- [System Commands](commands/system.md) - Help, quit, clear screen
- [Configuration Commands](commands/configuration.md) - Models, preferences, config
- [Learning Commands](commands/learning.md) - Knowledge map and natural learning
- [Session Commands](commands/session.md) - Save and restore learning progress
- [Analytics Commands](commands/analytics.md) - Tokens, statistics, usage tracking
- [Context Commands](commands/context.md) - Context management and debug commands

### ⚙️ [Configuration](configuration/)
*CLI configuration and customization*

- [Configuration Guide](configuration/README.md) - Essential settings and setup
- [Command Configuration](commands/configuration.md) - Configure using CLI commands

### 💡 [Usage Examples](examples/)
*Practical CLI examples and tutorials*

- [Examples Overview](examples/README.md) - Guide to all examples
- [Basic Workflows](examples/basic-workflows.md) - Everyday learning scenarios
- [Integration Examples](examples/integration.md) - AI provider setup and configuration
- [Advanced Usage](examples/advanced.md) - Power user techniques and optimization
- [Troubleshooting](examples/troubleshooting.md) - Common issues and solutions

### 🛠️ [Technical Documentation](technical/)
*In-depth technical guides and implementation details*

- [Technical Overview](technical/README.md) - System architecture and design
- [Implementation Guides](technical/implementation-guides/) - Step-by-step development tutorials
- [Technical Workflows](technical/workflows/) - Development and deployment procedures
- [API Reference](technical/api-reference/) - Complete API documentation
- [System Architecture](technical/system-architecture/) - System design and architecture patterns
- [Performance Optimization](technical/performance-optimization/) - Performance tuning and optimization

### 🗺️ Learning Path Guide
*Structured learning paths for different user types*

- **New Users**: Start with [Quick Start](installation/quick-start.md), then [Basic Workflows](examples/basic-workflows.md)
- **Power Users**: Learn [Session Management](commands/session.md) and [Context Commands](commands/context.md)
- **Developers**: See [Development Setup](development/README.md) for extending the CLI
- **System Administrators**: Check [Technical Overview](technical/README.md) for deployment
- **AI Integrators**: Explore [Configuration Commands](commands/configuration.md) for provider setup

### 👨‍💻 [Development](development/)
*CLI development and contribution*

- [Development Overview](development/README.md) - Set up development environment
- [CLI Development](development/cli-development.md) - CLI command development
- [Testing Guide](development/testing/) - CLI testing procedures

## Quick Start

### Installation
```bash
# Clone the repository
git clone https://github.com/your-repo/learning-catalyst.git
cd learning-catalyst

# Install dependencies
pip install -e .

# Start Learning Catalyst
python -m src.cli.main
```

### Basic Usage
```bash
# Start a learning session
learning-catalyst

# Essential commands
/help                    # Show available commands
/quit                    # Exit the application
/clear                   # Clear the terminal screen

# Learning and interaction
/knowledge-map          # Visualize knowledge connections
# Natural learning: just ask questions directly!
# "Explain machine learning" or "Test me on Python lists"

# Configuration
/config                 # Manage AI providers and settings
/tokens                 # Check token usage

# Session management
/checkpoint save [name] # Save current learning session
/checkpoint load [name] # Restore a saved session

# Context management
/context                # Show current conversation context
/compress               # Compress context to save tokens
```

## CLI Features

### 🎯 Terminal-First Design
- **Native CLI Experience**: Built specifically for command-line users
- **Rich Terminal Interface**: Colored output, progress indicators, and formatting
- **Keyboard Shortcuts**: Efficient navigation and command completion
- **Session Management**: Save and resume learning sessions with `/checkpoint`
- **Context Management**: Optimize AI interactions with `/context` and `/compress`

### 🤖 AI-Powered Learning
- **Natural Language Interaction**: Talk to your AI tutor in plain English - no commands needed!
- **Contextual Responses**: AI understands your learning materials and history
- **Adaptive Difficulty**: Challenges adapt to your skill level
- **Multi-Provider Support**: Works with OpenAI, Deepseek, SiliconFlow, ChatGLM, and local models

### 📊 Local-First Approach
- **Privacy Focused**: All data stored locally on your machine
- **Offline Capable**: Works without internet after initial setup
- **Custom Materials**: Use your own Markdown files as learning content
- **No Vendor Lock-in**: Export your data anytime

### ⚡ Performance Optimized
- **Fast Startup**: Optimized loading for quick access
- **Lazy Loading**: Content loads only when needed
- **Caching System**: Intelligent caching for improved performance
- **Resource Efficient**: Low memory and CPU usage
- **Token Optimization**: Context compression and management to reduce API costs

## Command Categories

### System Commands
Essential system operations:
- `/help` - Show help and available commands
- `/quit` - Exit the application
- `/clear` - Clear the terminal screen

### Configuration Commands
Manage your CLI setup:
- `/config` - Configure AI providers and application settings
- `/config provider` - Switch between AI providers
- `/config model` - Switch between AI models

### Learning Commands
Core learning functionality:
- `/knowledge-map` - Visualize knowledge connections and progress
- **Natural Learning**: Ask questions directly without commands - "Explain neural networks" or "Test me on Python"

### Session Commands
Save and restore learning progress:
- `/checkpoint save [name]` - Save current session state
- `/checkpoint load [name]` - Restore a saved session

### Analytics Commands
Track your progress:
- `/tokens` - Monitor API token usage and costs

### Context Commands
Manage conversation context and system behavior:
- `/context` - Show current conversation context
- `/compress` - Compress conversation context to save tokens
- `/wait [seconds]` - Set delay between API requests
- `/verbose [on/off]` - Toggle debug mode

## Key Workflows

### Start Learning
```bash
# Launch and start learning naturally
learning-catalyst
/knowledge-map      # See your learning progress
# Or just ask: "Explain machine learning basics"
```

### Save & Resume Learning
```bash
# Save your current session
/checkpoint save python-basics
# Resume later
/checkpoint load python-basics
```

### Configuration
```bash
# Set up AI provider
/config
/config provider openai
/config model
```

### Context Management
```bash
# Check conversation context
/context
# Save tokens by compressing context
/compress
```

## Navigation Guide

### For New Users
1. [Installation Guide](installation/) - Get Learning Catalyst running
2. [Quick Start](installation/quick-start.md) - Learn basics in 5 minutes
3. [Command Reference](commands/) - Explore available commands
4. [Basic Workflows](examples/basic-workflows.md) - See practical examples

### For Power Users
1. [Session Commands](commands/session.md) - Save and restore learning progress
2. [Context Commands](commands/context.md) - Advanced context management
3. [Integration Examples](examples/integration.md) - CLI with other tools
4. [Advanced Usage](examples/advanced.md) - Power user techniques

### For Developers
1. [Development Overview](development/README.md) - Set up development environment
2. [CLI Development](development/cli-development.md) - Understand CLI architecture
3. [Testing Guide](development/testing/) - Testing procedures
4. [Technical Documentation](technical/) - System architecture and implementation

## Getting Help

### Self-Service Resources
- 📖 **Documentation**: Browse the sections above
- 🔍 **Command Help**: Use `/help [command]` for command-specific help
- 💡 **Examples**: Check the [Examples](examples/) directory for use cases

### Community Support
- 💬 **Discussions**: Join community discussions
- 🐛 **Issues**: Report bugs or request features via GitHub Issues
- 📝 **Feedback**: Share your experience and suggestions

### In-Application Help
```bash
# General help
/help

# Command-specific help
/help knowledge-map
/help checkpoint

# List all commands
/help --all
```

## System Requirements

### Prerequisites
- **Python**: 3.8 or higher
- **Terminal**: Any modern terminal emulator
- **OS**: Linux, macOS, or Windows (with WSL)
- **Memory**: 512MB RAM minimum
- **Storage**: 100MB free space

### Optional Requirements
- **AI Provider Account**: OpenAI, Deepseek, SiliconFlow, or supported providers
- **Local Models**: For offline AI processing (optional)

---

*Last updated: October 7, 2025*
*Version: 1.0.0*
*Platform: Command-Line Interface*