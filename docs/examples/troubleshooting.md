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
# Run comprehensive diagnostic
$> learning-catalyst --diagnostic
= Learning Catalyst Diagnostic Tool
Checking system requirements... ✓
Checking configuration... ✓
Testing AI providers... ✗
Checking memory usage... ✓
Verifying installation... ✓

# Quick status check
Learning Catalyst > /status
= System Status:
  Installation: ✓ OK
  Configuration: ✗ AI provider needed
  Memory: ✓ 245MB used (512MB available)
  Last Error: None
```

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
Learning Catalyst > /config apikey openai
= Enter OpenAI API key: sk-xxxxxxxxxxxxxxxxxxxxxxxx
# Should start with "sk-" for OpenAI

# 2. Test API key
Learning Catalyst > /config test
> Testing API connection...
✗ OpenAI: Invalid API key
✓ Deepseek: Connected

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

# 5. Configure proxy if needed
Learning Catalyst > /config proxy
< Proxy Configuration:
  HTTP Proxy: http://proxy.company.com:8080
  HTTPS Proxy: https://proxy.company.com:8080

# 6. Try alternative endpoint
Learning Catalyst > /config endpoint openai
= OpenAI Endpoint:
  Custom endpoint (optional): https://api.openai.com
```

### Issue: Model Not Available

**Error**: `Model not found or not available`

**Solutions**:

```bash
# 1. List available models
Learning Catalyst > /models list
= Available Models:
  OpenAI:
    ✗ gpt-4 (Not available)
    ✓ gpt-3.5-turbo
    ✓ gpt-4-turbo-preview

# 2. Check model availability
Learning Catalyst > /models check gpt-4
= Model Availability Check:
  gpt-4: Not available in your region/account

# 3. Switch to available model
Learning Catalyst > /config model gpt-3.5-turbo
> Model switched to: gpt-3.5-turbo

# 4. Check account permissions
# Visit provider dashboard to verify:
# - Account is active
# - Model access is enabled
# - Usage limits not exceeded

# 5. Upgrade account if needed
# Some models require higher-tier accounts
```

## Performance Issues

### Issue: Slow Response Times

**Symptom**: AI responses taking 10+ seconds

**Solutions**:

```bash
# 1. Check performance metrics
Learning Catalyst > /performance
= Performance Metrics:
  Average Response Time: 12.3 seconds
  Token Usage: 2,345 tokens
  Network Latency: 1.2 seconds

# 2. Optimize for speed
Learning Catalyst > /config optimize speed
✓ Speed Optimization:
  - Switched to faster model
  - Reduced context window
  - Enabled caching

# 3. Check network connection
Learning Catalyst > /network test
< Network Test:
  DNS Resolution: ✓ 23ms
  Connection to API: ✓ 1.1s
  Download Speed: ✓ 45 Mbps

# 4. Reduce response length
Learning Catalyst > /config max-tokens 1000
= Max response tokens set to: 1000

# 5. Use simpler models for basic queries
Learning Catalyst > /config model gpt-3.5-turbo
> Using faster model for quick responses
```

### Issue: High Memory Usage

**Symptom**: Application using >500MB memory

**Solutions**:

```bash
# 1. Check memory usage
Learning Catalyst > /memory
= Memory Usage:
  Current: 623MB
  Peak: 789MB
  Cache: 234MB

# 2. Clear cache
Learning Catalyst > /cache clear
=✓ Cache cleared: 234MB freed

# 3. Reduce cache size
Learning Catalyst > /config cache-size 50
= Cache size limited to: 50MB

# 4. Enable memory optimization
Learning Catalyst > /config optimize memory
>✓ Memory Optimization:
  - Reduced conversation history
  - Compressed cached responses
  - Enabled garbage collection

# 5. Restart application
Learning Catalyst > /restart
=✓ Restarting to free memory...
```

## Configuration Issues

### Issue: Settings Not Saved

**Symptom**: Configuration resets after restart

**Solutions**:

```bash
# 1. Check configuration file
Learning Catalyst > /config file
= Configuration file: ~/.learning-catalyst/config.json
ls -la ~/.learning-catalyst/
# Should see config.json file

# 2. Test save functionality
Learning Catalyst > /config save test
=✓ Test configuration saved
Learning Catalyst > /config load test
=✓ Test configuration loaded

# 3. Check file permissions
ls -la ~/.learning-catalyst/config.json
# Should be readable/writable

# 4. Fix permissions if needed
chmod 644 ~/.learning-catalyst/config.json

# 5. Recreate config directory
rm -rf ~/.learning-catalyst/
Learning Catalyst > /config init
=✓ Configuration directory created
```

### Issue: Invalid Configuration Format

**Error**: `Invalid JSON in configuration file`

**Solutions**:

```bash
# 1. Validate configuration
Learning Catalyst > /config validate
✗ Configuration error: Invalid JSON at line 23

# 2. Reset to defaults
Learning Catalyst > /config reset
=✓ Resetting to default configuration...

# 3. Manually edit configuration
Learning Catalyst > /config edit
= Opening configuration in default editor...
# Fix JSON syntax errors

# 4. Backup and restore
Learning Catalyst > /config backup config-backup.json
=✓ Configuration backed up
Learning Catalyst > /config restore config-backup.json
=✓ Configuration restored

# 5. Reconfigure from scratch
Learning Catalyst > /config wizard
>✓ Configuration Wizard:
  Step 1: Choose AI provider
  Step 2: Enter API key
  Step 3: Select model
  Step 4: Set preferences
```

## Command Issues

### Issue: Unknown Command

**Error**: `Unknown command: /somecommand`

**Solutions**:

```bash
# 1. List available commands
Learning Catalyst > /help
=✓ Available Commands:
  /help, /quit, /clear, /config, /models...

# 2. Check command spelling
Learning Catalyst > /help config
=✓ /config - Manage configuration
  Usage: /config [subcommand]

# 3. Use command completion
Learning Catalyst > /conf[Tab]
# Should autocomplete to /config

# 4. Check command context
Learning Catalyst > /help --all
=✓ All Commands (including hidden):
  /debug, /verbose, /experimental...

# 5. Search for similar commands
Learning Catalyst > /help search model
= Commands matching "model":
  /models, /config model, /help model
```

### Issue: Command Arguments Not Working

**Symptom**: Commands ignoring arguments

**Solutions**:

```bash
# 1. Check command syntax
Learning Catalyst > /config --help
=✓ /config Usage:
  /config [show|save|load|provider|model...]

# 2. Use proper argument format
# Wrong: /config provider=openai
# Right: /config provider openai

# 3. Test with simple commands
Learning Catalyst > /config show
✓ Works
Learning Catalyst > /config provider openai
✓ Works

# 4. Check for special characters
# Avoid spaces, quotes in arguments
# Use: /config model gpt-3.5-turbo
# Not: /config model "gpt-3.5-turbo"

# 5. Use interactive mode
Learning Catalyst > /config provider
= Enter provider name: openai
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
Learning Catalyst > /config model gpt-3.5-turbo
> Switched to cost-effective model

# 5. Reduce request frequency
Learning Catalyst > /config rate-limit 30
✓ Rate limit: 30 requests per minute
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

# 3. Reduce context window
Learning Catalyst > /config context-size 4000
= Context size limited to: 4000 tokens

# 4. Use model with larger context
Learning Catalyst > /config model gpt-4-turbo
> Switched to model with 128K context

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
# Use forward slashes in config
/config file C:/Users/User/.learning-catalyst/config.json

# Or escape backslashes
/config file C:\\Users\\User\\.learning-catalyst\\config.json
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

## Getting Additional Help

### Built-in Help System

```bash
# General help
Learning Catalyst > /help

# Command-specific help
Learning Catalyst > /help config
Learning Catalyst > /help models

# Troubleshooting help
Learning Catalyst > /help troubleshooting
Learning Catalyst > /help errors

# Verbose mode for debugging
Learning Catalyst > /verbose on
= Verbose mode enabled
Learning Catalyst > [any command]
# Shows detailed execution information
```

### Diagnostic Commands

```bash
# Full system diagnostic
Learning Catalyst > /diagnostic --full
= Full Diagnostic Report:
  System: Linux 5.15.0
  Python: 3.9.7
  Memory: 8GB total, 2GB used
  Network: Connected
  Providers: OpenAI ✗, Deepseek ✓, SiliconFlow ✗
  Configuration: Valid
  Last Error: None

# Network diagnostic
Learning Catalyst > /diagnostic --network
< Network Diagnostic:
  DNS: ✓ Working
  Internet: ✓ Connected
  API Endpoints: ✓ All reachable
  Latency: 1.2s average

# Configuration diagnostic
Learning Catalyst > /diagnostic --config
✓ Configuration Diagnostic:
  Config File: ✓ Exists and readable
  API Keys: ✓ Valid format
  Settings: ✓ Valid JSON
  Permissions: ✓ Read/write OK
```

### Report Issues

```bash
# Generate bug report
Learning Catalyst > /bug-report
= Bug Report Generated:
  Version: 1.0.0
  System: Linux x86_64
  Python: 3.9.7
  Error: [Error details]
  Configuration: [Config details]
  Recent Commands: [Command history]

# Export diagnostic data
Learning Catalyst > /export-diagnostic diagnostic.json
=✓ Diagnostic data exported to diagnostic.json
```

## Quick Fix Checklist

### Before Seeking Help
- [ ] Run `/diagnostic --full`
- [ ] Check internet connection
- [ ] Verify API keys are correct
- [ ] Try restarting the application
- [ ] Check configuration file exists
- [ ] Test with a different AI provider

### Common Quick Fixes
1. **API not working**: `/config provider <provider>` → re-enter API key
2. **Slow responses**: `/config optimize speed`
3. **Memory issues**: `/cache clear`
4. **Command not found**: Use `python -m src.cli.main`
5. **Configuration lost**: `/config save`

### Emergency Reset
```bash
# Complete reset to defaults
Learning Catalyst > /reset --all
=✓ Complete reset:
  ✓ Configuration reset
  ✓ Cache cleared
  ✓ History cleared
  ✓ Settings restored to defaults
```

---

*Last updated: October 8, 2025*
*Version: 1.0.0*
*Category: Troubleshooting Guide*