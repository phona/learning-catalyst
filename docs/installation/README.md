# Installation Guide

---
title: Learning Catalyst CLI Installation Guide
description: Complete installation and setup instructions for Learning Catalyst command-line interface
version: 1.0.0
last_updated: 2025-10-07
---

## Overview

Learning Catalyst is a Python-based command-line application that runs on any system with Python 3.8 or higher. This guide will walk you through the installation process for different operating systems and setups.

## System Requirements

### Minimum Requirements
- **Python**: 3.8 or higher
- **Operating System**: Linux, macOS, or Windows (with WSL)
- **Memory**: 512MB RAM minimum
- **Storage**: 100MB free disk space
- **Terminal**: Any modern terminal emulator

### Recommended Requirements
- **Python**: 3.9 or higher
- **Memory**: 2GB RAM or more
- **Storage**: 500MB free disk space
- **Network**: Internet connection for AI features

### Optional Requirements
- **GPU**: For local AI model acceleration
- **API Keys**: OpenAI, Anthropic, or other AI provider accounts
- **Local Models**: For offline AI processing

## Installation Methods

### Method 1: Git Clone (Recommended)

**Best for**: Development, latest features, full control

```bash
# Clone the repository
git clone https://github.com/your-repo/learning-catalyst.git
cd learning-catalyst

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Linux/macOS:
source venv/bin/activate
# On Windows:
venv\Scripts\activate

# Install dependencies
pip install -e .

# Verify installation
python -m src.cli.main --version
```

### Method 2: pip Install

**Best for**: Quick installation, stable releases

```bash
# Install from PyPI (when available)
pip install learning-catalyst

# Or install from GitHub
pip install git+https://github.com/your-repo/learning-catalyst.git

# Verify installation
learning-catalyst --version
```

### Method 3: Docker

**Best for**: Isolated environment, cross-platform consistency

```bash
# Pull the image
docker pull learning-catalyst/cli:latest

# Run with your workspace mounted
docker run -it -v /path/to/your/workspace:/workspace learning-catalyst/cli

# Or use docker-compose for persistent setup
docker-compose up -d
```

## Platform-Specific Instructions

### Linux (Ubuntu/Debian)

```bash
# Update package manager
sudo apt update

# Install Python and pip
sudo apt install python3 python3-pip python3-venv

# Install additional dependencies
sudo apt install git build-essential

# Follow Method 1 or 2 from above
```

### macOS

```bash
# Install Homebrew if not already installed
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Python
brew install python3

# Follow Method 1 or 2 from above
```

### Windows (with WSL)

```bash
# Enable WSL (run in PowerShell as Administrator)
wsl --install

# After WSL is installed, open WSL terminal
sudo apt update
sudo apt install python3 python3-pip python3-venv git

# Follow Method 1 from above
```

### Windows (Native)

```powershell
# Install Python from python.org
# Download and run the installer from https://python.org

# Install Git
# Download and install from https://git-scm.com/

# Open PowerShell or Command Prompt
# Follow Method 1 or 2 from above
```

## Post-Installation Setup

### 1. Initial Configuration

```bash
# Start Learning Catalyst
python -m src.cli.main

# Follow the interactive setup:
# 1. Choose AI provider
# 2. Configure API key (if required)
# 3. Select model
# 4. Set content analysis preferences
```

### 2. AI Provider Configuration

Choose from the following providers:

#### OpenAI (Recommended)
```bash
# Get API key from https://platform.openai.com/api-keys
# During setup, choose: OpenAI
# Enter your API key when prompted
# Select model: gpt-4, gpt-3.5-turbo, etc.
```

#### Anthropic
```bash
# Get API key from https://console.anthropic.com/
# During setup, choose: Anthropic
# Enter your API key when prompted
# Select model: claude-3-opus, claude-3-sonnet, etc.
```

#### Local Models (Offline)
```bash
# During setup, choose: Local
# Select model: llama3, mistral, etc.
# Requires Ollama or similar local model server
```

#### Other Providers
```bash
# ChatGLM, SiliconFlow, DeepSeek also supported
# Follow similar setup process with respective API keys
```

### 3. Workspace Setup

```bash
# Navigate to your learning materials directory
cd /path/to/your/learning/materials

# Start Learning Catalyst
python -m src.cli.main

# The application will automatically scan for:
# - Markdown files (.md)
# - Text files (.txt)
# - Code files (.py, .js, etc.)
```

## Verification

### Basic Functionality Test

```bash
# Test installation
python -m src.cli.main --version

# Test help command
python -m src.cli.main --help

# Test basic commands
echo -e "/help\n/quit" | python -m src.cli.main
```

### AI Functionality Test

```bash
# Test AI-powered features (requires API key)
echo -e "/explain machine learning\n/quit" | python -m src.cli.main

# Test quiz functionality
echo -e "/quiz python\n/quit" | python -m src.cli.main
```

## Common Issues and Solutions

### Python Version Issues

**Error**: `Python 3.8 or higher required`

**Solution**:
```bash
# Check your Python version
python --version
python3 --version

# Install correct Python version
# On Ubuntu/Debian:
sudo apt install python3.9

# On macOS:
brew install python@3.9

# Use pyenv for multiple Python versions
curl https://pyenv.run | bash
pyenv install 3.9.16
pyenv global 3.9.16
```

### Permission Issues

**Error**: `Permission denied` during installation

**Solution**:
```bash
# Use virtual environment (recommended)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -e .

# Or install for user only
pip install --user -e .

# Never use sudo with pip unless absolutely necessary
```

### Network Issues

**Error**: Connection timeouts during installation

**Solution**:
```bash
# Use different package index
pip install -e . -i https://pypi.org/simple/

# Or use trusted hosts
pip install -e . --trusted-host pypi.org --trusted-host pypi.python.org --trusted-host files.pythonhosted.org
```

### AI Provider Issues

**Error**: Invalid API key or connection failed

**Solution**:
```bash
# Reconfigure AI provider
python -m src.cli.main
/config

# Test API key manually
curl -H "Authorization: Bearer YOUR_API_KEY" https://api.openai.com/v1/models

# Use local provider as fallback
/config
# Choose: Local
# Select: llama3 (or other available local model)
```

### Terminal Issues

**Error**: Display problems in terminal

**Solution**:
```bash
# Test terminal compatibility
python -m src.cli.main --test-terminal

# Use basic mode
python -m src.cli.main --no-color

# Update terminal
# On Ubuntu: sudo apt install gnome-terminal
# On macOS: Terminal.app is usually fine
# On Windows: Use Windows Terminal or WSL
```

## Upgrading

### From Git Repository
```bash
cd learning-catalyst
git pull origin main
pip install -e .
```

### From pip
```bash
pip install --upgrade learning-catalyst
```

### Docker
```bash
docker pull learning-catalyst/cli:latest
```

## Uninstallation

### Remove Package
```bash
pip uninstall learning-catalyst
```

### Remove Data
```bash
# Remove application data (optional)
rm -rf ~/.learning-catalyst
rm -rf .catalyst  # In your workspace directories
```

### Remove Docker
```bash
docker rmi learning-catalyst/cli:latest
```

## Advanced Configuration

### Environment Variables
```bash
# Add to ~/.bashrc or ~/.zshrc

# Set default AI provider
export LEARNING_CATALYST_PROVIDER="openai"

# Set default model
export LEARNING_CATALYST_MODEL="gpt-4"

# Set workspace directory
export LEARNING_CATALYST_WORKSPACE="/path/to/learning/materials"

# Enable debug mode
export LEARNING_CATALYST_DEBUG="1"
```

### Custom Configuration
```bash
# Create custom config file
mkdir -p ~/.learning-catalyst
cat > ~/.learning-catalyst/config.yaml << EOF
providers:
  openai:
    api_key: "your-api-key"
    model: "gpt-4"

preferences:
  learning:
    difficulty: "intermediate"
    session_length: 30  # minutes

  display:
    theme: "dark"
    show_progress: true
EOF
```

### Shell Integration
```bash
# Add to ~/.bashrc or ~/.zshrc

# Command completion
complete -W "help quit clear concepts explain quiz knowledge-map tokens statistics" learning-catalyst

# Custom aliases
alias lc="python -m src.cli.main"
alias lc-concepts="echo '/concepts' | lc"
alias lc-quiz="echo '/quiz' | lc"
```

## Performance Optimization

### Faster Startup
```bash
# Use workspace caching
python -m src.cli.main --cache

# Preload models (if using local models)
python -m src.cli.main --preload-models
```

### Memory Usage
```bash
# Limit memory usage
python -m src.cli.main --memory-limit 512

# Use disk-based caching
python -m src.cli.main --disk-cache
```

### Network Optimization
```bash
# Use offline mode (no AI features)
python -m src.cli.main --offline

# Set request timeout
python -m src.cli.main --timeout 30
```

## Next Steps

After successful installation:

1. **Read the [Quick Start Guide](quick-start.md)** - Learn basics in 5 minutes
2. **Check [Basic Workflows Guide](../examples/basic-workflows.md)** - Walk through your first learning session
3. **Explore [Command Reference](../commands/)** - Learn about all available commands
4. **Set up [Configuration](../configuration/)** - Customize your experience
5. **Try [Usage Examples](../examples/)** - See practical examples

## Support

### Installation Help
- **Documentation**: Browse these installation guides
- **Issues**: Report installation problems via GitHub Issues
- **Community**: Join discussions for community support

### Common Resources
- [Python Installation Guide](https://python.org/about/gettingstarted/)
- [Virtual Environment Tutorial](https://docs.python.org/3/library/venv.html)
- [Git Installation Guide](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git)
- [Docker Installation](https://docs.docker.com/get-docker/)

---

*See [Quick Start Guide](quick-start.md) for your first steps with Learning Catalyst.*