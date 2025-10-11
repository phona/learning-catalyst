# System Commands

---
title: System Commands Reference
description: Essential system operations and navigation commands for Learning Catalyst CLI
version: 1.0.0
last_updated: 2025-10-07
---

## Overview

System commands provide essential functionality for navigating and controlling the Learning Catalyst CLI application. These commands are fundamental to everyday usage and are available immediately upon starting the application.

## Available Commands

### `/help` - Show Help and Available Commands

Display help information about available commands, categories, or specific command usage.

**Aliases**: `/h`, `/?`

**Syntax**:
```bash
/help                    # Show general help
/help [category]         # Show help for command category
/help [command]          # Show detailed help for specific command
/help --all              # Show all available commands
```

**Examples**:
```bash
/help                    # General help and overview
/help learning           # Help for learning commands
/help /concepts          # Detailed help for concepts command
/help --all              # List all commands with brief descriptions
```

**Output Features**:
- Command categories organized by functionality
- Command aliases and brief descriptions
- Usage examples and syntax
- Color-coded output for better readability

**Sample Output**:
```
🚀 Learning Catalyst - AI-Powered Learning Assistant

SYSTEM COMMANDS:
  /help, /h, /?          Show this help message
  /quit, /exit, /q       Exit the application
  /clear, /cls           Clear the terminal screen

LEARNING COMMANDS:
  /concepts, /topics     Browse available learning concepts
  /suggest, /recommend   Get AI-driven learning suggestions
  /knowledge-map, /kmap  Show knowledge structure visualization

For explanations and practice questions, simply ask naturally:
  "Can you explain neural networks?"
  "Can you test me on Python concepts?"

Use '/help [command]' for detailed command help.
```

### `/quit` - Exit the Application

Gracefully exit the Learning Catalyst CLI application.

**Aliases**: `/exit`, `/q`

**Syntax**:
```bash
/quit                    # Exit immediately
/quit --save             # Save session before exiting
/quit --force            # Force exit without confirmation
```

**Examples**:
```bash
/quit                    # Normal exit with confirmation
/quit --save             # Save current session state
/quit --force            # Exit without prompts
```

**Features**:
- **Session Persistence**: Automatically saves session progress
- **Graceful Shutdown**: Cleans up resources and connections
- **Confirmation Prompt**: Asks for confirmation unless forced
- **State Saving**: Preserves learning progress and preferences

**Exit Process**:
1. Save current session state
2. Update learning statistics
3. Clean up temporary files
4. Close AI provider connections
5. Display exit message

### `/clear` - Clear Terminal Screen

Clear the terminal screen to provide a clean workspace.

**Aliases**: `/cls`

**Syntax**:
```bash
/clear                   # Clear the entire screen
/clear --preserve        # Clear but keep recent history
/clear --reset           # Reset terminal state
```

**Examples**:
```bash
/clear                   # Standard screen clear
/clear --preserve        # Clear but keep last few commands
/clear --reset           # Full terminal reset
```

**Features**:
- **Clean Workspace**: Removes all previous output
- **History Preservation**: Command history remains accessible
- **Terminal Reset**: Can reset terminal state if needed
- **Cross-Platform**: Works on Windows, macOS, and Linux

## Usage Patterns

### Getting Help
```bash
# New to Learning Catalyst?
/help                    # Get started with overview

# Looking for specific functionality?
/help learning           # Browse learning commands
/help analytics          # Check analytics commands

# Need detailed command help?
/help /concepts          # Get concepts command details
/help /config            # Configuration help
```

### Session Management
```bash
# End of learning session
/quit --save             # Save progress and exit

# Quick exit
/quit --force            # Exit without prompts

# Clean workspace
/clear                   # Clear screen for new topic
```

### Productivity Tips
```bash
# Quick help check
/h                       # Using alias for help

# Clean start
/cls && /concepts        # Clear screen then show concepts

# Exit workflow
/q                       # Quick exit using alias
```

## Error Handling

### Common Issues

**Command Not Found**:
```
Unknown command: /helo
Did you mean: /help?
Available similar commands: /help, /quit, /clear
```

**Exit Confirmation**:
```
Are you sure you want to exit? (y/N)
Session will be saved automatically.
```

**Permission Issues**:
```
Cannot clear terminal: Insufficient permissions
Try using: /clear --preserve
```

### Recovery Strategies

1. **Command Not Found**: Use `/help` to see available commands
2. **Exit Issues**: Use `/quit --force` for immediate exit
3. **Terminal Issues**: Try `/clear --reset` for terminal problems

## Performance Characteristics

### Command Response Times
- `/help`: < 0.05s (instant)
- `/quit`: < 0.1s (immediate)
- `/clear`: < 0.01s (instant)

### Resource Usage
- **Memory**: Minimal system commands
- **CPU**: Negligible impact
- **Disk**: Only for session saving

## Integration Examples

### Shell Scripts
```bash
#!/bin/bash
# Learning session script
learning-catalyst << EOF
/help learning
/concepts
/quit --save
EOF
```

### Aliases and Functions
```bash
# Add to .bashrc or .zshrc
alias lc-help='echo "/help" | learning-catalyst'
alias lc-quit='echo "/quit --save" | learning-catalyst'
lc-concepts() {
    echo "/clear && /concepts" | learning-catalyst
}
```

### Automation
```bash
# Daily learning reminder
echo "/help && /statistics" | learning-catalyst

# Weekly progress check
echo "/statistics --days=7" | learning-catalyst
```

## Best Practices

### For New Users
1. **Start with `/help`**: Get familiar with available commands
2. **Use aliases**: Learn `/h`, `/q`, `/cls` for efficiency
3. **Save sessions**: Always use `/quit --save` to preserve progress

### For Power Users
1. **Command chaining**: Combine commands for efficiency
2. **Script integration**: Use commands in shell scripts
3. **Custom aliases**: Create personal command shortcuts

### For Developers
1. **Error handling**: Account for command variations in scripts
2. **Session management**: Handle save/restore scenarios
3. **Terminal compatibility**: Test across different terminals

## Advanced Features

### Command History Integration
- System commands are included in command history
- Use arrow keys to navigate previous commands
- History persists across application sessions

### Context Awareness
- `/help` shows relevant commands based on current context
- Error messages suggest related commands
- Help content adapts to user's current activity

### Accessibility Features
- High contrast mode support
- Screen reader compatible output
- Keyboard navigation friendly

## Troubleshooting

### Help Command Issues
```bash
# Help not displaying
/help --verbose          # Detailed help output
/help --refresh          # Refresh help cache
```

### Exit Problems
```bash
# Application not exiting
/quit --force            # Force immediate exit
# Or use Ctrl+C in terminal
```

### Terminal Display Issues
```bash
# Screen not clearing properly
/clear --reset           # Full terminal reset
# Or use external clear command
clear && /help           # System clear then help
```

## Version History

### Version 1.0.0
- Added command aliases (`/h`, `/?`, `/q`, `/exit`, `/cls`)
- Improved help formatting and categorization
- Enhanced exit confirmation and session saving
- Added terminal compatibility improvements

### Previous Versions
- Basic system commands functionality
- Limited help capabilities
- Simple exit mechanism

---

*See [Command Reference Overview](README.md) for complete command listing and [CLI Main Documentation](../README.md) for general usage information.*