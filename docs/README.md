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
- [First Session](installation/first-session.md) - Your first learning session

### 📋 [Command Reference](commands/)
*Complete command-line interface documentation*

- [System Commands](commands/system.md) - Help, quit, clear screen
- [Configuration Commands](commands/configuration.md) - Models, preferences, config
- [Learning Commands](commands/learning.md) - Concepts, explain, quiz, knowledge map
- [Analytics Commands](commands/analytics.md) - Tokens, statistics, usage tracking

### ⚙️ [Configuration](configuration/)
*CLI configuration and customization*

- [Basic Configuration](configuration/basic.md) - Essential settings
- [AI Provider Setup](configuration/ai-providers.md) - Configure AI models
- [Preferences](configuration/preferences.md) - Customize your experience
- [Advanced Configuration](configuration/advanced.md) - Power user settings

### 💡 [Usage Examples](examples/)
*Practical CLI examples and tutorials*

- [Examples Overview](examples/README.md) - Guide to all examples
- [Basic Workflows](examples/basic-workflows.md) - Everyday learning scenarios
- [Integration Examples](examples/integration.md) - AI provider setup and configuration
- [Troubleshooting](examples/troubleshooting.md) - Common issues and solutions

### 👨‍💻 [Development](development/)
*CLI development and contribution*

- [Development Setup](development/setup.md) - Set up development environment
- [CLI Development](development/cli-development.md) - CLI command development
- [Testing Guide](development/testing/) - CLI testing procedures
- [Contributing](development/contributing.md) - How to contribute

### 📁 [Project Documentation](project/)
*Project planning and management*

- [Requirements](project/requirements.md) - Project requirements
- [User Stories](project/user-stories.md) - User stories and use cases
- [Development Plan](project/development-plan.md) - Roadmap and milestones
- [Changelog](project/changelog.md) - Version history and changes

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

# Available commands
/help                    # Show available commands
/concepts               # Browse learning topics
/explain [topic]        # Get explanations
/quiz [topic]           # Take a quiz
/progress               # View learning progress
/tokens                 # Check token usage
/quit                   # Exit the application
```

## CLI Features

### 🎯 Terminal-First Design
- **Native CLI Experience**: Built specifically for command-line users
- **Rich Terminal Interface**: Colored output, progress indicators, and formatting
- **Keyboard Shortcuts**: Efficient navigation and command completion
- **Session Management**: Save and resume learning sessions

### 🤖 AI-Powered Learning
- **Natural Language Interaction**: Talk to your AI tutor in plain English
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

## Command Categories

### System Commands
Essential system operations:
- `/help` - Show help and available commands
- `/quit` - Exit the application
- `/clear` - Clear the terminal screen

### Configuration Commands
Manage your CLI setup:
- `/models` - List and manage AI models
- `/preferences` - Set user preferences
- `/config` - Configure application settings

### Learning Commands
Core learning functionality:
- `/concepts` - Browse available learning concepts
- `/explain` - Get detailed explanations
- `/quiz` - Take quizzes and challenges
- `/knowledge-map` - Visualize knowledge structure

### Analytics Commands
Track your progress:
- `/tokens` - Monitor API token usage
- `/statistics` - View learning statistics
- `/progress` - Track learning progress

## Key Workflows

### Start Learning
```bash
# Launch and explore topics
learning-catalyst
/concepts
/explain "machine learning basics"
```

### Practice & Test
```bash
# Take a quiz on a topic
/quiz "python data structures"
# View your progress
/progress
```

### Configuration
```bash
# Set up AI provider
/config
# View available models
/models
# Set preferences
/preferences learning.difficulty=intermediate
```

## Navigation Guide

### For New Users
1. [Installation Guide](installation/) - Get Learning Catalyst running
2. [Quick Start](installation/quick-start.md) - Learn basics in 5 minutes
3. [Command Reference](commands/) - Explore available commands
4. [Basic Workflows](examples/basic-workflows.md) - See practical examples

### For Power Users
1. [Advanced Configuration](configuration/advanced.md) - Customize your setup
2. [Integration Examples](examples/integration.md) - CLI with other tools
3. [Development Guide](development/) - Contribute to the project

### For Developers
1. [Development Setup](development/setup.md) - Set up development environment
2. [CLI Development](development/cli-development.md) - Understand CLI architecture
3. [Testing Guide](development/testing/) - Testing procedures
4. [Contributing](development/contributing.md) - How to contribute

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
/help concepts
/help /quiz

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