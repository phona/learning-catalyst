# CLI Configuration Guide

---
title: Learning Catalyst CLI Configuration Guide
description: Complete configuration and customization guide for Learning Catalyst command-line interface
version: 1.0.0
last_updated: 2025-10-07
---

## Overview

Learning Catalyst CLI is highly configurable and can be customized to match your learning preferences, technical requirements, and workflow needs. This guide covers all configuration options from basic setup to advanced customization.

## Quick Configuration

### Initial Setup (Required)
```bash
# Start Learning Catalyst
learning-catalyst

# Run initial configuration
/config

# Follow the interactive prompts:
# 1. Choose AI provider
# 2. Enter API key (if required)
# 3. Select model
# 4. Set basic preferences
```

### Basic Configuration
```bash
# View current configuration
/config --show

# Change AI provider
/config --provider openai

# Set default model
/config --model gpt-4

# Update preferences
/preferences learning.difficulty=intermediate
```

## AI Provider Configuration

### OpenAI (Recommended)

**Setup**:
```bash
/config
# Choose: 1) OpenAI
# Enter API key from https://platform.openai.com/api-keys
# Select model: gpt-4o, gpt-3.5-turbo, etc.
```

**Configuration File**:
```yaml
providers:
  openai:
    api_key: "sk-your-api-key-here"
    base_url: "https://api.openai.com/v1"
    model: "gpt-4o"
    max_tokens: 4096
    temperature: 0.7
```

**Available Models**:
- `gpt-4o` - Most capable, fast
- `gpt-4o-mini` - Fast, cost-effective
- `gpt-4-turbo` - Advanced reasoning
- `gpt-3.5-turbo` - Fast, affordable

### Anthropic Claude

**Setup**:
```bash
/config
# Choose: 2) Anthropic
# Enter API key from https://console.anthropic.com/
# Select model: claude-3-opus, claude-3-sonnet, etc.
```

**Configuration File**:
```yaml
providers:
  anthropic:
    api_key: "sk-ant-your-api-key-here"
    base_url: "https://api.anthropic.com"
    model: "claude-3-sonnet-20240229"
    max_tokens: 4096
    temperature: 0.7
```

**Available Models**:
- `claude-3-opus-20240229` - Most capable
- `claude-3-sonnet-20240229` - Balanced performance
- `claude-3-haiku-20240307` - Fast, efficient

### Local Models (Offline)

**Setup with Ollama**:
```bash
# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Pull a model
ollama pull llama3
ollama pull mistral

# Configure Learning Catalyst
/config
# Choose: 6) Local
# Enter model: llama3, mistral, etc.
# Enter base URL: http://localhost:11434
```

**Configuration File**:
```yaml
providers:
  local:
    base_url: "http://localhost:11434"
    model: "llama3"
    max_tokens: 4096
    temperature: 0.7
```

### Other Providers

**ChatGLM**:
```yaml
providers:
  chatglm:
    api_key: "your-chatglm-key"
    base_url: "https://open.bigmodel.cn/api/paas/v4/"
    model: "glm-4"
```

**SiliconFlow**:
```yaml
providers:
  siliconflow:
    api_key: "your-siliconflow-key"
    base_url: "https://api.siliconflow.cn/v1"
    model: "deepseek-chat"
```

## Preference Configuration

### Learning Preferences

```bash
# Set difficulty level
/preferences learning.difficulty=beginner
# Options: beginner, intermediate, advanced, expert

# Set session length
/preferences learning.session_length=30
# Duration in minutes

# Enable adaptive learning
/preferences learning.adaptive=true

# Set quiz frequency
/preferences learning.quiz_frequency=3
# Quiz every N concepts learned
```

**Configuration File**:
```yaml
preferences:
  learning:
    difficulty: "intermediate"
    session_length: 30
    adaptive: true
    quiz_frequency: 3
    auto_save: true
    review_frequency: 7  # days
```

### Display Preferences

```bash
# Set color theme
/preferences display.theme=dark
# Options: dark, light, auto

# Enable progress indicators
/preferences display.progress=true

# Set output verbosity
/preferences display.verbosity=normal
# Options: minimal, normal, detailed

# Show timestamps
/preferences display.timestamps=true
```

**Configuration File**:
```yaml
preferences:
  display:
    theme: "dark"
    progress: true
    verbosity: "normal"
    timestamps: true
    unicode_symbols: true
    line_numbers: false
```

### Performance Preferences

```bash
# Enable caching
/preferences performance.caching=true

# Set cache size limit
/preferences performance.cache_size_mb=100

# Enable parallel processing
/preferences performance.parallel=true

# Set request timeout
/preferences performance.timeout=30
# Seconds
```

**Configuration File**:
```yaml
preferences:
  performance:
    caching: true
    cache_size_mb: 100
    parallel: true
    timeout: 30
    retry_attempts: 3
    lazy_loading: true
```

## Workspace Configuration

### Learning Materials Directory

```bash
# Set workspace directory
/preferences workspace.path=/path/to/learning/materials

# Set content analysis depth
/preferences workspace.analysis_depth=2
# 1: Headers only, 2: Summaries, 3: Full content

# Auto-scan workspace
/preferences workspace.auto_scan=true
```

**Configuration File**:
```yaml
workspace:
  path: "/home/user/learning_materials"
  analysis_depth: 2
  auto_scan: true
  ignore_patterns:
    - "*.tmp"
    - "node_modules/*"
    - ".git/*"
  file_types:
    - "*.md"
    - "*.txt"
    - "*.py"
    - "*.js"
    - "*.java"
```

### Content Processing

```bash
# Set content filters
/preferences content.filter_code=true
/preferences content.filter_comments=true

# Set concept extraction level
/preferences content.extraction_level=detailed
# Options: basic, detailed, comprehensive
```

## Advanced Configuration

### Environment Variables

Set these in your shell profile (`~/.bashrc`, `~/.zshrc`, etc.):

```bash
# AI Provider Configuration
export LEARNING_CATALYST_PROVIDER="openai"
export LEARNING_CATALYST_API_KEY="your-api-key"
export LEARNING_CATALYST_MODEL="gpt-4o"

# Workspace Configuration
export LEARNING_CATALYST_WORKSPACE="/path/to/materials"

# Performance Configuration
export LEARNING_CATALYST_CACHE_DIR="/tmp/learning-catalyst"
export LEARNING_CATALYST_LOG_LEVEL="INFO"

# Debug Configuration
export LEARNING_CATALYST_DEBUG="1"
export LEARNING_CATALYST_DEBUG_FILE="/tmp/lc_debug.log"
```

### Configuration Files

Learning Catalyst looks for configuration files in this order:

1. `~/.learning-catalyst/config.yaml` (user config)
2. `./.learning-catalyst/config.yaml` (workspace config)
3. Environment variables
4. Default values

**Sample Complete Configuration**:
```yaml
# ~/.learning-catalyst/config.yaml
providers:
  openai:
    api_key: "sk-your-api-key"
    base_url: "https://api.openai.com/v1"
    model: "gpt-4o"
    max_tokens: 4096
    temperature: 0.7

preferences:
  learning:
    difficulty: "intermediate"
    session_length: 30
    adaptive: true
    quiz_frequency: 3
    auto_save: true
    review_frequency: 7

  display:
    theme: "dark"
    progress: true
    verbosity: "normal"
    timestamps: true
    unicode_symbols: true

  performance:
    caching: true
    cache_size_mb: 100
    parallel: true
    timeout: 30
    retry_attempts: 3

workspace:
  path: "/home/user/learning_materials"
  analysis_depth: 2
  auto_scan: true
  ignore_patterns:
    - "*.tmp"
    - "node_modules/*"
  file_types:
    - "*.md"
    - "*.txt"
    - "*.py"

logging:
  level: "INFO"
  file: "~/.learning-catalyst/logs/app.log"
  max_size_mb: 10
  backup_count: 5
```

## Command-Line Options

### Startup Options

```bash
# Use specific configuration file
learning-catalyst --config /path/to/config.yaml

# Set workspace directory
learning-catalyst --workspace /path/to/materials

# Use specific AI provider
learning-catalyst --provider openai

# Set debug mode
learning-catalyst --debug

# Use offline mode
learning-catalyst --offline

# Disable colors
learning-catalyst --no-color

# Quiet mode
learning-catalyst --quiet
```

### Runtime Options

```bash
# Check configuration
learning-catalyst --check-config

# Show version
learning-catalyst --version

# Test AI connection
learning-catalyst --test-connection

# Validate workspace
learning-catalyst --validate-workspace
```

## Troubleshooting Configuration

### Common Issues

**API Key Not Working**:
```bash
# Check API key validity
learning-catalyst --test-connection

# Reconfigure provider
/config

# Check environment variables
echo $LEARNING_CATALYST_API_KEY
```

**Configuration Not Loading**:
```bash
# Check config file syntax
learning-catalyst --check-config

# Validate YAML
python -c "import yaml; yaml.safe_load(open('~/.learning-catalyst/config.yaml'))"

# Reset to defaults
learning-catalyst --reset-config
```

**Performance Issues**:
```bash
# Check cache usage
learning-catalyst --stats

# Clear cache
learning-catalyst --clear-cache

# Enable debug mode
learning-catalyst --debug
```

### Configuration Validation

```bash
# Validate complete setup
learning-catalyst --validate-all

# Check specific components
learning-catalyst --validate-provider
learning-catalyst --validate-workspace
learning-catalyst --validate-config
```

## Multiple Configurations

### Profile-Based Configuration

Create different configurations for different use cases:

```bash
# Work configuration
~/.learning-catalyst/config-work.yaml

# Personal configuration
~/.learning-catalyst/config-personal.yaml

# Learning configuration
~/.learning-catalyst/config-learning.yaml
```

**Usage**:
```bash
# Use work configuration
learning-catalyst --config ~/.learning-catalyst/config-work.yaml

# Use personal configuration
learning-catalyst --config ~/.learning-catalyst/config-personal.yaml
```

### Team Configuration

Share configuration across team members:

```yaml
# team-config.yaml
providers:
  openai:
    api_key: "${TEAM_API_KEY}"  # Use environment variable
    model: "gpt-4o"

workspace:
  path: "./team-materials"
  analysis_depth: 2

preferences:
  learning:
    difficulty: "intermediate"
  display:
    theme: "light"
```

## Security Considerations

### API Key Security

```bash
# Use environment variables (recommended)
export LEARNING_CATALYST_API_KEY="your-api-key"

# Restrict file permissions
chmod 600 ~/.learning-catalyst/config.yaml

# Use encrypted configuration
learning-catalyst --encrypt-config
```

### Data Privacy

```bash
# Disable analytics
/preferences analytics.enabled=false

# Clear sensitive data
learning-catalyst --clear-sensitive-data

# Use local models only
/config --provider local
```

## Migration and Backup

### Export Configuration

```bash
# Export current configuration
learning-catalyst --export-config > my-config.yaml

# Export preferences
learning-catalyst --export-preferences > my-preferences.yaml
```

### Import Configuration

```bash
# Import configuration
learning-catalyst --import-config my-config.yaml

# Merge configurations
learning-catalyst --merge-config additional-config.yaml
```

### Backup and Restore

```bash
# Backup all data
tar -czf learning-catalyst-backup.tar.gz ~/.learning-catalyst

# Restore from backup
tar -xzf learning-catalyst-backup.tar.gz -C ~/
```

## Performance Tuning

### Optimization Settings

```yaml
preferences:
  performance:
    # Enable aggressive caching
    caching: true
    cache_size_mb: 500

    # Parallel processing
    parallel: true
    max_workers: 4

    # Network settings
    timeout: 60
    retry_attempts: 5
    retry_delay: 2

    # Memory management
    memory_limit_mb: 1024
    gc_frequency: 100
```

### Resource Monitoring

```bash
# Monitor resource usage
learning-catalyst --monitor-resources

# Performance benchmark
learning-catalyst --benchmark

# Cache statistics
learning-catalyst --cache-stats
```

---

*See [Installation Guide](../installation/) for setup instructions and [Command Reference](../commands/) for usage information.*