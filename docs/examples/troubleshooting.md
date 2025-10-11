# Troubleshooting Guide

---
title: Learning Catalyst CLI Troubleshooting Guide
description: Common issues and solutions for Learning Catalyst CLI
version: 1.0.0
last_updated: 2025-10-08
---

## Overview

This guide covers common issues, error messages, and solutions for Learning Catalyst CLI. Each troubleshooting scenario includes step-by-step diagnostic commands and practical solutions.

## Quick Diagnostics

### Start Here: Basic Health Check

```bash
# Check current configuration
Learning Catalyst > /config
= Current Configuration:
  Provider: deepseek
  Model: deepseek-chat
  Status: ✓ Connected

# Quick status check
Learning Catalyst > /config
= Current Configuration:
  Provider: deepseek
  Model: deepseek-chat
  API Key: ✓ Valid
  Status: ✓ Connected
```

## 🔧 Technical Context: How Troubleshooting Works

### Diagnostic System Architecture

Learning Catalyst includes a comprehensive diagnostic system that checks multiple layers of the application:

#### System Checks
- **Python Version**: Ensures Python 3.9+ is available
- **Dependencies**: Verifies all required packages are installed
- **Memory Usage**: Monitors available system resources
- **File Permissions**: Checks read/write access to required directories

#### Configuration Validation
- **Provider Settings**: Validates API keys and connection endpoints
- **Model Availability**: Tests access to configured AI models
- **Database Connectivity**: Ensures data storage is accessible
- **Security Settings**: Verifies secure credential storage

#### Health Monitoring
```python
# Behind the scenes: Diagnostic check structure
class DiagnosticCheck:
    def __init__(self, name: str, critical: bool = False):
        self.name = name
        self.critical = critical
        self.status = "pending"
        self.details = []

    async def run(self) -> DiagnosticResult:
        # Implementation of specific diagnostic
        pass
```

### Error Classification System

Learning Catalyst categorizes errors into distinct types for easier troubleshooting:

#### Configuration Errors
- **Missing API Keys**: Provider authentication issues
- **Invalid Models**: Requested model not available
- **Network Issues**: Connectivity problems with providers

#### Runtime Errors
- **Memory Issues**: Insufficient system resources
- **Timeout Errors**: Requests taking too long
- **Parsing Errors**: Invalid responses from providers

#### System Errors
- **Installation Problems**: Missing or corrupted files
- **Permission Issues**: File access problems
- **Database Errors**: Data storage failures

**Want to understand the technical troubleshooting system?**
- 📖 **[Testing & Debugging Workflow](../technical/workflows/testing-debugging.md)** - Systematic debugging approaches
- 🔧 **[Debugging Techniques Guide](../technical/guides/debugging-techniques.md)** - Advanced debugging methods
- 🏗️ **[System Architecture](../technical/system-architecture/)** - Understanding system components

## Installation Issues

### Issue: Command Not Found

**Error**: `bash: learning-catalyst: command not found`

**Solutions**:

```bash
# 1. Check if installed in current directory
ls -la python -m src.cli.main
# If exists, use: python -m src.cli.main

# 2. Reinstall with proper PATH
cd /path/to/learning-catalyst
pip install -e .

# 3. Check Python PATH
echo $PATH
which python
which pip

# 4. Verify installation
pip show learning-catalyst
# Should show package information

# 5. If still not working, try direct execution
python -m src.cli.main
```

### Issue: Module Import Errors

**Error**: `ModuleNotFoundError: No module named 'src'`

**Solutions**:

```bash
# 1. Check current directory
pwd
# Should be in learning-catalyst directory

# 2. Verify project structure
ls -la
# Should see src/, docs/, tests/ directories

# 3. Install in development mode
pip install -e .

# 4. Check Python path
python -c "import sys; print(sys.path)"

# 5. Add current directory to Python path
export PYTHONPATH="${PYTHONPATH}:$(pwd)"
python -m src.cli.main
```

### Issue: Permission Denied

**Error**: `PermissionError: [Errno 13] Permission denied`

**Solutions**:

```bash
# 1. Check file permissions
ls -la src/cli/main.py

# 2. Fix permissions if needed
chmod +x src/cli/main.py

# 3. Install without sudo (user installation)
pip install --user -e .

# 4. Check if directory is writable
touch test_file.txt
rm test_file.txt

# 5. Use virtual environment (recommended)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -e .
```

## AI Provider Connection Issues

### Issue: Invalid API Key

**Error**: `Authentication failed: Invalid API key`

**Solutions**:

```bash
# 1. Verify API key format
Learning Catalyst > /config provider openai
= OpenAI Provider Configuration:
  Enter your OpenAI API key: sk-xxxxxxxxxxxxxxxxxxxxxxxx
# Should start with "sk-" for OpenAI

# 2. Test API key with a simple question
Learning Catalyst > Hello, can you help me?
🧠 Hello! I'd be happy to help you learn. What topic would you like to explore?

# If this works, the API key is valid

# 3. Check API key source
# Go to provider dashboard:
# OpenAI: platform.openai.com/api-keys
# Deepseek: platform.deepseek.com/api-keys

# 4. Re-enter API key carefully
Learning Catalyst > /config provider openai
= OpenAI Provider Configuration:
  Enter your OpenAI API key: [Copy-paste directly]

# 5. Check for extra spaces
# API keys should have no leading/trailing spaces
```

### Issue: Network Connection Failed

**Error**: `Connection timeout` or `Network unreachable`

**Solutions**:

```bash
# 1. Test internet connectivity
ping api.openai.com
ping api.deepseek.com
ping api.siliconflow.cn

# 2. Check firewall settings
# Allow connections to:
# - api.openai.com (port 443)
# - api.deepseek.com (port 443)
# - api.siliconflow.cn (port 443)

# 3. Test with curl
curl -I https://api.openai.com/v1/models
# Should return HTTP 200

# 4. Check proxy settings
echo $http_proxy
echo $https_proxy

# 5. Proxy configuration is handled at system level
# Configure environment variables if needed:
export HTTP_PROXY=http://proxy.company.com:8080
export HTTPS_PROXY=https://proxy.company.com:8080

# 6. Restart application after proxy configuration
Learning Catalyst > /quit
# Then restart with new proxy settings
```

### Issue: Model Not Available

**Error**: `Model not found or not available`

**Solutions**:

```bash
# 1. Check current configuration
Learning Catalyst > /config
= Current Configuration:
  Provider: openai
  Model: gpt-4
  API Key: ✓ Valid
  Endpoint: https://api.openai.com

# 2. Test AI provider with simple question
Learning Catalyst > Hello, can you help me with a quick question?
🧠 [If AI responds, connection is working]

# If no response or error, the provider may not be available

# 3. Switch to available provider
Learning Catalyst > /config provider deepseek
= Deepseek Provider Configuration:
  Enter your Deepseek API key: [your-api-key]

# 4. Select available model
Learning Catalyst > /config model
🤖 Available Models (deepseek provider):
  ✅ deepseek-chat
  ✅ deepseek-coder
[User selects deepseek-chat from the list]
🤖 Model set to: deepseek-chat

# 5. Verify configuration
Learning Catalyst > /config
= Current Configuration:
  Provider: deepseek
  Model: deepseek-chat
  API Key: ✓ Valid
  Endpoint: https://api.deepseek.com
```

## Performance Issues

### Issue: Slow Response Times

**Symptom**: AI responses taking 10+ seconds

**Solutions**:

```bash
# 1. Use simpler models for basic queries
Learning Catalyst > /config model
🤖 Available Models (openai provider):
  ✅ gpt-4
  ✅ gpt-3.5-turbo
[User selects gpt-3.5-turbo from the list]
🤖 Model set to: gpt-3.5-turbo

# 2. Ask for more concise responses
Learning Catalyst > can you explain this briefly?
```

### Issue: High Memory Usage

**Symptom**: Application using >500MB memory

**Solutions**:

```bash
# 1. Restart application to free memory
Learning Catalyst > /quit
# Restart application to resolve memory issues
```

## Configuration Issues

### Issue: Settings Not Saved

**Symptom**: Configuration resets after restart

**Solutions**:

```bash
# 1. Check current configuration
Learning Catalyst > /config
= Current Configuration:
  Provider: openai
  Model: gpt-4
  Status: ✓ Connected

# 2. Check daily limit and cost alert settings
Learning Catalyst > /config daily-limit
✅ Current daily limit: 5,000 tokens

Learning Catalyst > /config cost-alert
✅ Current cost alert: $0.50

# 3. Reset configuration settings
Learning Catalyst > /config daily-limit 10000
✅ Daily limit updated to 10,000 tokens

Learning Catalyst > /config cost-alert 1.00
✅ Cost alert updated to $1.00

# 4. If settings are not saving, restart the application
```

### Issue: Advanced Configuration Problems

**Symptom**: Configuration subcommands not working as expected

**Solutions**:

```bash
# 1. Test provider-specific configuration
Learning Catalyst > /config provider openai show
📋 OpenAI Provider Configuration:
  Status: ✅ Connected
  Models: gpt-4, gpt-3.5-turbo, gpt-4-turbo
  Daily Limit: 5,000 tokens
  Cost Alert: $0.50

# 2. Test model removal
Learning Catalyst > /config model gpt-3.5-turbo remove
✅ Model gpt-3.5-turbo removed from OpenAI provider

# 3. Test provider testing functionality
Learning Catalyst > /config provider openai test
🔄 Testing OpenAI provider connection...
✅ Connection test successful
  Response time: 1.2 seconds
  Model availability: 2 models available

# 4. Check response configuration
Learning Catalyst > /config response-length
✅ Current response length: concise

Learning Catalyst > /config response-style
✅ Current response style: conversational

# 5. Reset response settings if needed
Learning Catalyst > /config response-length detailed
✅ Response length set to detailed

Learning Catalyst > /config response-style technical
✅ Response style set to technical
```

### Issue: Knowledge Map Display Problems

**Symptom**: Knowledge map not showing or displaying incorrectly

**Solutions**:

```bash
# 1. Test knowledge map functionality
Learning Catalyst > /knowledge-map
🗺️ Your Interactive Learning Space:
┌─ Computer Science ─────────────────────────────────────┐
│  [✅] Basic Programming (Mastered)                     │
│  [🔄] Data Structures (75% Complete)                  │
│  │   ├── [✅] Arrays & Strings                          │
│  │   ├── [✅] Linked Lists                             │
│  │   └── [🔄] Trees & Graphs (In Progress)             │
│  [⏳] Algorithms (Not Started)                        │
│     └── prerequisites: Data Structures                │
└───────────────────────────────────────────────────────┘
Navigation: ↑↓←→ Move | Enter: Zoom In | (e)xplain | (a)sk AI | (q)uit

# 2. If knowledge map is empty, check if there's learning data
Learning Catalyst > /tokens
📊 Token Usage Statistics:
  Current Session: 1,234 tokens
  Daily Usage: 2,456 tokens

# 3. Start a learning topic to populate knowledge map
Learning Catalyst > I want to learn Python programming
🧠 [AI response about Python programming]

# 4. Check knowledge map again
Learning Catalyst > /knowledge-map
🗺️ Your Interactive Learning Space:
┌─ Programming & Development ───────────────────────────┐
│  [🔄] Python Programming (In Progress)                │
│  │   ├── [⏳] Variables and Data Types                 │
│  │   ├── [⏳] Control Flow                            │
│  │   └── [⏳] Functions                               │
│  [⏳] Web Development (Not Started)                   │
│     └── prerequisites: Python Programming              │
└──────────────────────────────────────────────────────────┘

# 5. Test knowledge map navigation
Learning Catalyst > [Navigate using arrow keys and Enter]
🔍 Zooming into Python Programming...
┌─ Python Programming Module ────────────────────────────┐
│  [⏳] Variables and Data Types (Currently Learning)     │
│     ├── Concept: Storing and manipulating data         │
│     ├── Difficulty: ⭐⭐☆☆☆ (2/5)                       │
│     ├── Prerequisites: None                            │
│     └── Leads to: Control Flow                        │
│                                                        │
│  [⏳] Control Flow (Next Topic)                       │
│     ├── Concept: Conditional logic and loops          │
│     ├── Difficulty: ⭐⭐☆☆☆ (2/5)                       │
│     ├── Prerequisites: Variables and Data Types        │
│     └── Leads to: Functions                           │
└─────────────────────────────────────────────────────────┘
Current: Variables and Data Types | (l)earn | (e)xplain | (p)ractice | (b)ack

# 6. Test AI interaction from knowledge map
Learning Catalyst > [Selects (e)xplain from Variables and Data Types]
🧠 Variables and Data Types - Interactive Explanation:
[Detailed explanation with examples and interactive elements]

# 7. If knowledge map is still not working, check context
Learning Catalyst > /context
= Context Usage:
  Current: 1,200 tokens
  Maximum: 8,192 tokens
  Available: 6,992 tokens
```

### Issue: Knowledge Map Performance Problems

**Symptom**: Knowledge map running slowly or freezing

**Solutions**:

```bash
# 1. Check context usage
Learning Catalyst > /context
= Context Usage:
  Current: 7,500 tokens
  Maximum: 8,192 tokens
  Available: 692 tokens

# 2. Compress conversation to improve performance
Learning Catalyst > /compress
✅ Conversation compressed to key points
- Key concepts preserved: Python basics, variables, functions
- Examples saved: Code snippets, practice problems
- Memory freed: 3,200 tokens

# 3. Test knowledge map performance
Learning Catalyst > /knowledge-map
🗺️ Your Interactive Learning Space:
[Optimized knowledge map display with faster loading]

# 4. Check memory usage
Learning Catalyst > /context
= Context Usage:
  Current: 4,300 tokens
  Maximum: 8,192 tokens
  Available: 3,892 tokens

# 5. If performance is still poor, restart application
Learning Catalyst > /quit
# Restart application to clear memory and improve performance
```

### Issue: Invalid Configuration Format

**Error**: `Invalid JSON in configuration file`

**Solutions**:

```bash
# Check configuration and restart if needed
Learning Catalyst > /config
= Current Configuration:
  Provider: openai
  Model: gpt-4
  Status: ✓ Connected

# If configuration is corrupted, restart the application
```

## Command Issues

### Issue: Unknown Command

**Error**: `Unknown command: /somecommand`

**Solutions**:

```bash
# 1. List available commands
Learning Catalyst > /help
=✓ Available Commands:
  /help, /quit, /clear, /config, /tokens, /checkpoint, /context, /compress, /wait, /verbose

# 2. Check command spelling
Learning Catalyst > /help
=✓ Available Commands:
  /help, /quit, /clear, /config, /tokens, /checkpoint, /context, /compress, /wait, /verbose

# 3. Check current configuration
Learning Catalyst > /config
= Current Configuration:
  Provider: openai
  Model: gpt-4
  Status: ✓ Connected
```

### Issue: Command Arguments Not Working

**Symptom**: Commands ignoring arguments

**Solutions**:

```bash
# 1. Use proper argument format
# Wrong: /config provider=openai
# Right: /config provider openai

# 2. Test with simple commands
Learning Catalyst > /config provider openai
✓ Works

# 3. Check for special characters
# Avoid spaces, quotes in arguments
# Use: /config model gpt-3.5-turbo
# Not: /config model "gpt-3.5-turbo"

# 4. Use interactive mode
Learning Catalyst > /config provider
🔧 Provider Configuration:
  Enter provider name: openai
```

## Error Messages

### API Rate Limit Error

**Error**: `Rate limit exceeded`

**Solutions**:

```bash
# 1. Check usage statistics
Learning Catalyst > /tokens
> Token Usage:
  Current session: 2,345 tokens
  Daily limit: 10,000 tokens (76% used)

# 2. Wait and retry
Learning Catalyst > /wait 60
✓ Waiting 60 seconds before next request...

# 3. Upgrade to higher tier
# Visit provider dashboard to increase limits

# 4. Use more efficient model
Learning Catalyst > /config model
🤖 Available Models (openai provider):
  ✅ gpt-4
  ✅ gpt-3.5-turbo
[User selects gpt-3.5-turbo from the list]
🤖 Model set to: gpt-3.5-turbo

# 5. Wait between requests to avoid rate limits
Learning Catalyst > /wait 30
✓ Waiting 30 seconds before next request...
```

### Context Length Error

**Error**: `Maximum context length exceeded`

**Solutions**:

```bash
# 1. Check context usage
Learning Catalyst > /context
= Context Usage:
  Current: 7,890 tokens
  Maximum: 8,192 tokens
  Available: 302 tokens

# 2. Clear conversation history
Learning Catalyst > /clear
=✓ Conversation history cleared

# 3. Compress conversation to free up context
Learning Catalyst > /compress
✓ Conversation compressed to key points

# 4. Use different model if available
Learning Catalyst > /config model
🤖 Available Models (openai provider):
  ✅ gpt-4
  ✅ gpt-3.5-turbo
[Select appropriate model from the list]

# 5. Summarize and compress
Learning Catalyst > /compress
=✓ Conversation compressed to key points
```

## System-Specific Issues

### Windows-Specific Issues

**Issue**: PowerShell execution policy

```powershell
# Check execution policy
Get-ExecutionPolicy

# Allow script execution
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Run Learning Catalyst
python -m src.cli.main
```

**Issue**: Windows path separators

```cmd
# Configuration is stored in workspace
# No manual file path management needed
```

### macOS-Specific Issues

**Issue**: Python from Homebrew**

```bash
# Check Python installation
which python3
brew list python3

# Use python3 explicitly
python3 -m src.cli.main

# Update PATH if needed
echo 'export PATH="/opt/homebrew/bin:$PATH"' >> ~/.zshrc
```

### Linux-Specific Issues

**Issue**: Package dependencies

```bash
# Install system dependencies
sudo apt-get update
sudo apt-get install python3-dev python3-pip

# Install in virtual environment
python3 -m venv venv
source venv/bin/activate
pip install -e .
```

## AI Conversation Issues

### Issue: AI Doesn't Understand My Request

**Symptom**: AI provides irrelevant or confused responses to natural language questions

**Solutions**:

```bash
# 1. Be more specific in your request
Instead of: "tell me about programming"
Try: "can you explain Python variables with examples for beginners?"

# 2. Check if the context is clear
Learning Catalyst > can you explain React Hooks?
🤖 I notice this is your first question about React. Would you like me to:
- Start with basic React concepts first?
- Jump directly to Hooks?
- Ask about your current React knowledge level?

# 3. Provide context about your learning level
Learning Catalyst > I'm a beginner programmer, can you explain what variables are in simple terms?
🧠 Absolutely! Let me explain variables in the simplest way possible...

# 4. Break down complex questions
Instead of: "explain machine learning"
Try: "what is machine learning?" followed by "can you give me a simple example?"
```

### Issue: AI Responses Are Too Generic

**Symptom**: AI gives very general or textbook-like answers without practical examples

**Solutions**:

```bash
# 1. Ask for specific examples
Learning Catalyst > can you show me a practical example of using decorators in a web application?
🧠 Here's how you might use decorators in a Flask web application...

# 2. Request different difficulty levels
Learning Catalyst > explain recursion like I'm 10 years old
Learning Catalyst > explain recursion for computer science students
Learning Catalyst > explain recursion at an expert level

# 3. Ask for analogies and real-world comparisons
Learning Catalyst > can you compare database indexes to something in everyday life?
🧠 Think of database indexes like the index at the back of a book...

# 4. Request step-by-step explanations
Learning Catalyst > break down how a sorting algorithm works step by step
📝 Let me walk through bubble sort step by step...
```

### Issue: AI Loses Context of Conversation

**Symptom**: AI doesn't remember previous parts of the conversation or seems confused

**Solutions**:

```bash
# 1. Reference previous parts explicitly
Learning Catalyst > going back to what we discussed about Python decorators, can you show me how to stack them?
🧠 Yes! Building on our decorator discussion...

# 2. Use transition phrases
Learning Catalyst > now that we've covered variables, let's move on to functions. How do they relate?
🔗 Great question! Functions and variables work together...

# 3. Check if context is getting too long
Learning Catalyst > /context
= Context Usage:
  Current: 6,500 tokens
  Maximum: 8,192 tokens
  Available: 1,692 tokens

# 4. Clear context if needed and restart topic
Learning Catalyst > /clear
=✓ Conversation history cleared
Learning Catalyst > let's continue our discussion about React Hooks, specifically useState
```

### Issue: AI Gives Incorrect or Outdated Information

**Symptom**: AI responses contain factual errors or outdated information

**Solutions**:

```bash
# 1. Ask for current information
Learning Catalyst > what's the current version of React and what are the latest features?
📊 As of 2024, React 18 is the current version with these features...

# 2. Request verification
Learning Catalyst > can you double-check that information about Python decorators?
✅ Let me verify: Yes, that information is correct for Python 3.9+

# 3. Ask for multiple perspectives
Learning Catalyst > what are different ways to solve this problem?
🔧 Here are three different approaches...

# 4. Cross-reference with official documentation
Learning Catalyst > according to the official Python documentation, how do decorators work?
📖 According to PEP 318 and the Python docs...
```

### Issue: AI Responses Are Too Long or Too Short

**Symptom**: AI gives either overly detailed explanations or very brief answers

**Solutions**:

```bash
# 1. Specify desired length
Learning Catalyst > explain microservices in about 3-4 sentences
Learning Catalyst > give me a detailed explanation of blockchain with examples

# 2. Ask for summaries or deep dives
Learning Catalyst > can you summarize that in one sentence?
Learning Catalyst > can you go deeper into that topic?

# 3. Request specific format
Learning Catalyst > explain this using bullet points
Learning Catalyst > give me a code example for this concept
Learning Catalyst > explain this using an analogy

# 4. Ask for specific response length
Learning Catalyst > can you explain this in about 3 sentences?
Learning Catalyst > can you give me a detailed explanation with examples?
```

## Getting Additional Help

### Built-in Help System

```bash
# General help
Learning Catalyst > /help

# General help shows all available commands
Learning Catalyst > /help
=✓ Available Commands:
  /help, /quit, /clear, /config, /tokens, /checkpoint, /context, /compress, /wait, /verbose

# Verbose mode for debugging
Learning Catalyst > /verbose on
= Verbose mode enabled
Learning Catalyst > [any command]
# Shows detailed execution information
```

### Diagnostic Commands

```bash
# Check current configuration
Learning Catalyst > /config
= Current Configuration:
  Provider: openai
  Model: gpt-4o
  Status: ✓ Connected

# Configuration check
Learning Catalyst > /config
= Current Configuration:
  Provider: openai
  Model: gpt-4o
  API Key: ✓ Valid
  Endpoint: https://api.openai.com
  Status: ✓ Connected

# Test specific provider with a question
Learning Catalyst > Hello, can you help me?
🧠 [If AI responds, the provider is working correctly]
```

### Report Issues

```bash
# Show current configuration for support
Learning Catalyst > /config
= Current Configuration:
  Provider: openai
  Model: gpt-4o
  API Key: ✓ Valid
  Endpoint: https://api.openai.com

# Copy configuration details for support requests
```

## Quick Fix Checklist

### Before Seeking Help
- [ ] Check `/config` to verify current configuration
- [ ] Check internet connection
- [ ] Verify API keys are correct
- [ ] Try restarting the application
- [ ] Test with a different AI provider

### Common Quick Fixes
1. **API not working**: `/config provider <provider>` → re-enter API key
2. **Memory issues**: Restart application with `/quit`
3. **Command not found**: Use `python -m src.cli.main`
4. **Configuration issues**: Restart application to reset settings

### Emergency Reset
```bash
# Clear conversation history
Learning Catalyst > /clear
=✓ Conversation history cleared

# For configuration issues, restart the application
Learning Catalyst > /quit
# Then restart to reset settings
```

---

*Last updated: October 8, 2025*
*Version: 1.0.0*
*Category: Troubleshooting Guide*