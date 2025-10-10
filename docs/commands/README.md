# CLI Command Reference

---
title: Learning Catalyst CLI Command Reference
description: Complete command-line interface reference for Learning Catalyst
version: 1.0.0
last_updated: 2025-10-07
---

## Overview

Learning Catalyst provides a comprehensive command-line interface with 12 primary commands organized into 4 categories. All commands use slash (`/`) prefix and support aliases for quick access.

## Command Categories

### 🔧 [System Commands](system.md)
Essential system operations and navigation
- `/help` - Show help and available commands
- `/quit` - Exit the Learning Catalyst application
- `/clear` - Clear the terminal screen

### ⚙️ [Configuration Commands](configuration.md)
Manage application configuration and settings
- `/models` - List and manage AI models
- `/preferences` - Set and manage user preferences
- `/config` - Configure application settings

### 📚 [Learning Commands](learning.md)
Core learning functionality and content interaction
- `/concepts` - Browse available learning concepts
- `/explain` - Get detailed explanations for concepts
- `/quiz` - Take quizzes and challenges
- `/knowledge-map` - Visualize knowledge structure

### 📊 [Analytics Commands](analytics.md)
Track progress and monitor usage
- `/tokens` - Monitor API token usage
- `/statistics` - View learning statistics and analytics

## Quick Reference

| Category | Command | Aliases | Description |
|----------|---------|---------|-------------|
| **System** | `/help` | `/h`, `/?` | Show help and available commands |
| **System** | `/quit` | `/exit`, `/q` | Exit the application |
| **System** | `/clear` | `/cls` | Clear terminal screen |
| **Config** | `/models` | `/m` | List available AI models |
| **Config** | `/preferences` | `/prefs`, `/pref` | Manage preferences |
| **Config** | `/config` | `/cfg`, `/conf` | Configure settings |
| **Learning** | `/concepts` | `/topics` | Browse learning concepts |
| **Learning** | `/explain` | `/exp` | Get explanations |
| **Learning** | `/quiz` | `/challenge` | Take quizzes |
| **Learning** | `/knowledge-map` | `/kmap` | Show knowledge map |
| **Analytics** | `/tokens` | `/usage` | Check token usage |
| **Analytics** | `/statistics` | `/stats`, `/analytics` | View statistics |

## Command Usage Patterns

### Basic Command Syntax
```bash
/COMMAND [ARGUMENTS] [OPTIONS]
```

### Help Commands
```bash
/help                    # Show general help
/help [category]         # Show help for a category
/help [command]          # Show help for specific command
/help /quiz              # Show help for quiz command
```

### Configuration Commands
```bash
/config                  # Interactive configuration
/models                  # List available models
/preferences key=value   # Set preference
```

### Learning Commands
```bash
/concepts                # List all concepts
/concepts [topic]        # Filter concepts by topic
/explain [concept]       # Explain a concept
/quiz [topic]            # Quiz on a topic
```

### Analytics Commands
```bash
/tokens                  # Show token usage
/statistics              # Show learning statistics
/statistics --days=7     # Stats for last 7 days
```

## Command Features

### Auto-completion
Most commands support tab completion for:
- Command names
- Concept names
- File paths
- Configuration options

### Command History
- Use arrow keys to navigate command history
- History persists across sessions
- Search history with Ctrl+R

### Interactive vs Non-interactive
- **Interactive**: `/config`, `/preferences` (with prompts)
- **Non-interactive**: `/help`, `/quit`, `/clear`
- **Mixed**: `/quiz`, `/explain` (can be used both ways)

### Output Formatting
Commands use rich terminal formatting:
- **Colors**: Different colors for different types of information
- **Tables**: Structured data in table format
- **Progress bars**: For long-running operations
- **Syntax highlighting**: For code examples

## Error Handling

### Common Error Messages
```
Unknown command: /invalid
Did you mean: /help?

Command requires an argument
Usage: /explain [concept]

AI provider not configured
Use /config to set up an AI provider
```

### Error Recovery
- Commands provide suggestions for similar commands
- Error messages include usage examples
- Graceful handling of missing configuration
- Automatic fallback to local functionality when possible

## Performance Tips

### Fast Commands (< 0.1s)
- `/help` - Instant help display
- `/quit` - Immediate exit
- `/clear` - Instant screen clear
- `/models` - Quick model listing

### Medium Commands (0.1-2s)
- `/concepts` - Concept listing (cached)
- `/tokens` - Usage statistics
- `/statistics` - Learning analytics

### Slow Commands (2-10s)
- `/explain` - AI-generated explanations
- `/quiz` - AI-generated questions
- `/knowledge-map` - Complex visualization

### Optimization Tips
1. **Use caching**: `/concepts` results are cached
2. **Be specific**: Use `/explain [concept]` instead of general queries
3. **Configure local models**: Faster than cloud APIs
4. **Use aliases**: Shorter commands are faster to type

## Advanced Usage

### Command Chaining
```bash
# Set up and start learning
/config && /concepts && /explain "machine learning"
```

### Command Aliases in Scripts
```bash
# Use short aliases for automation
echo -e "/h\n/concepts\n/q" | learning-catalyst
```

### Environment Variables
```bash
# Set default preferences
export LEARNING_CATALYST_MODEL="gpt-4"
export LEARNING_CATALYST_DIFFICULTY="intermediate"
learning-catalyst
```

## Integration Examples

### Shell Integration
```bash
# Add to bash completion
complete -W "help quit clear concepts explain quiz" learning-catalyst

# Create custom shortcuts
alias lc='learning-catalyst'
alias lc-concepts='echo "/concepts" | learning-catalyst'
```

### Script Integration
```bash
#!/bin/bash
# Daily learning routine
echo "Starting daily learning session..."
learning-catalyst << EOF
/statistics
/quiz python
/quit
EOF
```

### Cron Integration
```bash
# Daily learning reminder
0 9 * * * echo "/statistics" | learning-catalyst
```

## Troubleshooting

### Command Not Working
1. Check command spelling: `/help` for available commands
2. Verify AI configuration: `/config`
3. Check internet connection for AI commands
4. Review error messages for specific issues

### Performance Issues
1. Use `/statistics` to check token usage
2. Consider local models for faster responses
3. Clear cache if needed (removes `.catalyst/cache`)
4. Check system resources

### Configuration Problems
1. Use `/config` to verify setup
2. Check API key validity
3. Test with different providers
4. Reset configuration if needed

## Migration from Previous Versions

If you're upgrading from an older version:

### Changed Commands
- Old: `/list-concepts` → New: `/concepts`
- Old: `/ask` → New: `/explain`
- Old: `/test` → New: `/quiz`
- Old: `/analytics` → New: `/statistics`

### New Features
- Command aliases for faster access
- Better error messages and suggestions
- Improved performance with caching
- Rich terminal formatting

### Breaking Changes
- All commands now use `/` prefix
- Some command names have changed
- Configuration format has been updated

---

*For detailed information about each command, see the specific command category pages listed above.*