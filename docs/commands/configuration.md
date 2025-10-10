# Configuration Commands

---
title: Configuration Commands Reference
description: Manage application configuration and settings for Learning Catalyst CLI
version: 1.0.0
last_updated: 2025-10-07
---

## Overview

Configuration commands allow you to manage AI providers, set preferences, and customize the Learning Catalyst CLI experience to match your learning style and technical requirements.

## Available Commands

### `/models` - List and Manage AI Models

Display available AI models and manage model configurations.

**Aliases**: `/m`

**Syntax**:
```bash
/models                        # List all available models
/models --provider [name]      # Filter by provider
/models --refresh             # Refresh model list
/models --details             # Show detailed model information
```

**Examples**:
```bash
/models                       # Show all configured models
/models --provider openai      # Show OpenAI models only
/models --details             # Include model capabilities
/models --refresh            # Re-sync with provider APIs
```

**Output Features**:
- **Provider Information**: Shows which provider hosts each model
- **Model Capabilities**: Context length, speed, cost information
- **Current Selection**: Indicates active model
- **Status Indicators**: Online/offline status

**Sample Output**:
```
🤖 Available AI Models

OPENAI (Online)
├── ✅ gpt-4o (Current)        - Fast, highly capable
│   Context: 128k tokens • Speed: Fast • Cost: $$
├── gpt-4o-mini               - Fast, cost-effective
│   Context: 128k tokens • Speed: Very Fast • Cost: $
└── gpt-4-turbo               - Advanced reasoning
    Context: 128k tokens • Speed: Medium • Cost: $$$

ANTHROPIC (Online)
├── claude-3-sonnet           - Balanced performance
│   Context: 200k tokens • Speed: Fast • Cost: $$
└── claude-3-haiku            - Fast, efficient
    Context: 200k tokens • Speed: Very Fast • Cost: $

LOCAL (Offline)
└── llama3 (Available)        - Privacy-focused
    Context: 8k tokens • Speed: Medium • Cost: Free

Current model: gpt-4o (OpenAI)
Use /config to change model or provider.
```

### `/preferences` - Manage User Preferences

Set and manage user preferences using key-value syntax.

**Aliases**: `/prefs`, `/pref`

**Syntax**:
```bash
/preferences                                    # Show all preferences
/preferences [category]                         # Show category preferences
/preferences [key]=[value]                      # Set a preference
/preferences [key]                              # Show specific preference
/preferences --reset [key]                      # Reset preference to default
/preferences --export                          # Export preferences to file
```

**Examples**:
```bash
/preferences                                    # Show all preferences
/preferences learning                          # Show learning preferences
/preferences learning.difficulty=intermediate   # Set difficulty level
/preferences display.theme=dark                # Set theme
/preferences --reset learning.difficulty       # Reset to default
/preferences --export > my-prefs.yaml          # Export preferences
```

**Preference Categories**:

#### Learning Preferences
```bash
preferences.learning.difficulty=beginner|intermediate|advanced|expert
preferences.learning.session_length=30          # Session length in minutes
preferences.learning.adaptive=true|false        # Adaptive difficulty
preferences.learning.quiz_frequency=3           # Quiz every N concepts
preferences.learning.auto_save=true|false       # Auto-save session
```

#### Display Preferences
```bash
preferences.display.theme=dark|light|auto       # Color theme
preferences.display.progress=true|false         # Show progress indicators
preferences.display.verbosity=minimal|normal|detailed
preferences.display.timestamps=true|false       # Show timestamps
preferences.display.unicode_symbols=true|false # Use Unicode symbols
```

#### Performance Preferences
```bash
preferences.performance.caching=true|false      # Enable caching
preferences.performance.cache_size_mb=100       # Cache size limit
preferences.performance.parallel=true|false     # Parallel processing
preferences.performance.timeout=30              # Request timeout (seconds)
```

**Sample Output**:
```
⚙️ User Preferences

LEARNING SETTINGS:
├── Difficulty: intermediate
├── Session Length: 30 minutes
├── Adaptive Learning: enabled
├── Quiz Frequency: every 3 concepts
└── Auto-Save: enabled

DISPLAY SETTINGS:
├── Theme: dark (auto-detect)
├── Progress Indicators: enabled
├── Verbosity: normal
├── Timestamps: enabled
└── Unicode Symbols: enabled

PERFORMANCE SETTINGS:
├── Caching: enabled
├── Cache Size: 100 MB
├── Parallel Processing: enabled
└── Timeout: 30 seconds

Use /preferences [key]=[value] to change settings.
Examples:
  /preferences learning.difficulty=advanced
  /preferences display.theme=light
  /preferences performance.cache_size_mb=200
```

### `/config` - Configure Application Settings

Manage application configuration, AI providers, and system settings.

**Aliases**: `/cfg`, `/conf`

**Syntax**:
```bash
/config                        # Interactive configuration menu
/config --show                 # Show current configuration
/config --provider [name]      # Switch AI provider
/config --model [name]         # Switch model
/config --reset                # Reset all configuration
/config --wizard               # Run configuration wizard
/config --validate             # Validate configuration
```

**Examples**:
```bash
/config                        # Interactive menu
/config --show                 # Show current config
/config --provider openai      # Switch to OpenAI
/config --model gpt-4o         # Switch to gpt-4o
/config --wizard               # Re-run setup wizard
/config --validate             # Check configuration
```

**Interactive Configuration Menu**:
```
🔧 Configuration Menu

1) AI Provider Setup
2) Model Selection
3) Workspace Settings
4) Learning Preferences
5) Display Settings
6) Performance Settings
7) Advanced Options
8) Export/Import Configuration
9) Reset Configuration
0) Exit

Select option (0-9): _
```

**Configuration Areas**:

#### AI Provider Setup
- Add/remove AI providers
- Configure API keys
- Set provider-specific settings
- Test provider connections

#### Model Selection
- Choose primary model
- Set fallback models
- Configure model parameters
- Test model performance

#### Workspace Settings
- Set workspace directory
- Configure content analysis
- Set file type preferences
- Configure ignore patterns

## Usage Patterns

### Initial Setup
```bash
# First-time configuration
/config

# Follow the wizard prompts:
# 1. Choose AI provider
# 2. Enter API credentials
# 3. Select preferred model
# 4. Set workspace location
# 5. Configure basic preferences
```

### Daily Configuration
```bash
# Check current setup
/config --show

# Quick preference changes
/preferences learning.difficulty=advanced
/preferences display.theme=light

# Switch providers if needed
/config --provider anthropic
```

### Performance Tuning
```bash
# Check available models
/models --details

# Optimize for speed
/preferences performance.caching=true
/preferences performance.parallel=true
/config --model gpt-4o-mini

# Optimize for quality
/config --model gpt-4o
/preferences learning.difficulty=expert
```

## Advanced Configuration

### Multiple AI Providers

Set up primary and backup providers:

```bash
# Configure primary provider
/config --provider openai
/config --model gpt-4o

# Add backup provider
/config
# Choose "Add new provider"
# Select: anthropic
# Enter: claude-3-sonnet
# Set as: backup
```

### Custom Model Parameters

Fine-tune model behavior:

```bash
# Adjust creativity (temperature)
/preferences openai.temperature=0.7

# Set response length
/preferences openai.max_tokens=2000

# Configure retry behavior
/preferences performance.retry_attempts=3
```

### Workspace Profiles

Create different configurations for different workspaces:

```bash
# Create learning profile
/preferences workspace.profile=learning
/preferences learning.difficulty=intermediate

# Create work profile
/preferences workspace.profile=work
/preferences learning.difficulty=advanced
/preferences session.length=15
```

## Error Handling

### Common Issues

**API Key Invalid**:
```
❌ API key validation failed for OpenAI
Please check your API key or provider setup.

Solutions:
1. Verify API key: /config --provider openai
2. Test connection: /config --validate
3. Use backup provider: /config --provider anthropic
```

**Model Not Available**:
```
⚠️ Model 'gpt-4' not available with current provider
Available models: gpt-4o, gpt-4o-mini, gpt-3.5-turbo

Solutions:
1. Switch model: /config --model gpt-4o
2. Change provider: /config --provider anthropic
3. Update model list: /models --refresh
```

**Configuration Corrupted**:
```
❌ Configuration file contains errors
Line 15: Invalid YAML syntax

Solutions:
1. Auto-fix: /config --validate --auto-fix
2. Reset to defaults: /config --reset
3. Restore from backup: /config --import backup-config.yaml
```

### Recovery Strategies

1. **Validate Configuration**: Use `/config --validate` to check for issues
2. **Use Backup Models**: Configure multiple providers for redundancy
3. **Reset Preferences**: Use `/preferences --reset-all` for clean state
4. **Export Before Changes**: Always export configuration before major changes

## Performance Considerations

### Command Response Times
- `/models`: < 1s (cached), 2-5s (refresh)
- `/preferences`: < 0.5s (instant)
- `/config`: 1-2s (show), 5-10s (interactive)

### Resource Usage
- **Configuration**: Minimal memory usage
- **Model List**: Cached for faster access
- **Validation**: Quick unless testing provider connections

### Optimization Tips
1. **Cache Model Lists**: Models are cached to avoid repeated API calls
2. **Validate Offline**: Use `/config --validate --offline` for quick checks
3. **Export Settings**: Backup configuration to avoid reconfiguration

## Integration Examples

### Script Configuration
```bash
#!/bin/bash
# setup-learning-env.sh

echo "Setting up learning environment..."

# Configure for learning session
learning-catalyst << EOF
/config --provider openai
/config --model gpt-4o
/preferences learning.difficulty=intermediate
/preferences display.theme=dark
/preferences learning.session_length=45
/quit
EOF

echo "Learning environment configured!"
```

### Provider Switching
```bash
# Switch to fast model for quick questions
learning-catalyst << EOF
/config --model gpt-4o-mini
/explain "quick concept"
/quit
EOF

# Switch to powerful model for deep learning
learning-catalyst << EOF
/config --model gpt-4o
/explain --detailed "complex topic"
/quit
EOF
```

### Configuration Backup
```bash
# Backup current configuration
learning-catalyst << EOF > backup-$(date +%Y%m%d).yaml
/config --export
/quit
EOF

# Restore configuration
learning-catalyst --config backup-20241007.yaml
```

## Best Practices

### Security
1. **Use Environment Variables**: Store API keys in environment variables
2. **Limit File Permissions**: Restrict access to configuration files
3. **Regular Key Rotation**: Update API keys regularly
4. **Use HTTPS**: Ensure all API communications use HTTPS

### Performance
1. **Choose Appropriate Models**: Balance speed and quality
2. **Enable Caching**: Improve response times with caching
3. **Set Timeouts**: Prevent hanging on slow providers
4. **Monitor Usage**: Track token usage and costs

### Usability
1. **Document Customization**: Keep notes on custom configurations
2. **Test Changes**: Validate configuration after changes
3. **Backup Regularly**: Export configuration before major changes
4. **Use Profiles**: Create configurations for different use cases

## Troubleshooting

### Configuration Issues
```bash
# Check syntax
/config --validate

# Reset specific area
/preferences --reset learning

# Full reset
/config --reset

# Import backup
/config --import backup.yaml
```

### Provider Problems
```bash
# Test connection
/config --test-connection

# Refresh model list
/models --refresh

# Switch provider
/config --provider backup

# Use offline mode
/config --provider local
```

### Performance Issues
```bash
# Check cache status
/preferences performance.caching

# Clear cache
/config --clear-cache

# Optimize settings
/preferences performance.parallel=true
/preferences performance.timeout=60
```

---

*See [Command Reference Overview](README.md) for complete command listing and [Configuration Guide](../configuration/) for detailed setup instructions.*