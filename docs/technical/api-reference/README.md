# API Reference

---
title: Learning Catalyst API Reference
description: Complete API documentation, command specifications, and interface definitions
version: 1.0.0
last_updated: 2025-10-10
difficulty: "Intermediate"
estimated_time: "45 minutes"
---

## Overview

This section contains comprehensive API documentation for Learning Catalyst, a command-line interactive learning application. The documentation covers CLI command architecture, configuration management systems, AI provider interfaces, and extension development guidelines. Each reference focuses on architectural patterns, design principles, and integration mechanisms for the interactive CLI environment.

### Integration with System Architecture

The API reference documentation is designed to complement the [System Architecture](../system-architecture/) documentation. While the system architecture documents describe the high-level design patterns and component relationships, this API reference provides the concrete interface specifications and implementation details needed to work with those architectural components.

### Architectural Alignment

This API documentation aligns with the following architectural principles defined in the system architecture:

- **5-Layer Architecture**: APIs map to the User Interface, Learning Intelligence, Knowledge Management, AI Integration, and Data Storage layers
- **Provider Abstraction**: Consistent interfaces across all AI providers with seamless switching capabilities
- **Local-First Design**: User data remains primarily on local machines with privacy by design
- **Multi-Agent Orchestration**: Support for Microsoft AutoGen-powered collaborative learning experiences
- **CLI-Centric Design**: All APIs designed to support interactive command-line workflows

## 📚 Available API References

### 🔌 [CLI Commands API](cli-commands.md)
**Complete command-line interface specification**

Perfect for: Developers extending CLI functionality and users understanding command usage
- Command architecture and syntax patterns
- Interactive workflow design and response formats
- Error handling and status reporting
- Command examples and real-world use cases
- Integration patterns for CLI automation

**Key Features:**
- Complete slash command reference with interactive examples
- Parameter validation and argument handling
- Response format specifications for CLI output
- Error handling patterns with user-friendly messages
- Best practice guidelines for CLI development

### ⚙️ [Configuration API](configuration-api.md)
**Configuration management and settings architecture**

Perfect for: Developers integrating with configuration system
- Configuration architecture and hierarchical organization
- Provider and model management patterns
- Settings validation and default management
- Real-time configuration updates for CLI sessions
- Security considerations for sensitive data storage

**Key Features:**
- JSON-based configuration schema aligned with CLI commands
- Interactive provider management workflows
- Real-time configuration propagation to active sessions
- Multi-level validation with graceful error handling
- Security architecture for API key management

### 🤖 [Provider Interface](provider-interfaces.md)
**AI provider integration and extension architecture**

Perfect for: Developers adding new AI providers or custom models
- Provider abstraction layer for CLI integration
- CLI-based provider configuration and management
- Authentication patterns for interactive setup
- Error handling and retry logic for CLI sessions
- Performance optimization guidelines for interactive use

**Key Features:**
- Interactive provider setup workflows via CLI commands
- Real-time provider switching during active sessions
- CLI-based provider testing and validation
- Provider-specific model discovery and selection

### 🔧 [AI Toolcalls API](toolcalls-api.md)
**Complete API specification for AI function calling tools**

Perfect for: Developers integrating with AI tool calling system
- Tool schema definitions and validation
- Function calling integration patterns
- Tool orchestration and execution workflows
- Error handling and response specifications
- Security and performance optimization patterns

**Key Features:**
- Comprehensive tool definitions for AI providers
- Structured response schemas and validation
- Tool orchestration patterns and workflows
- Security and performance best practices
- Integration examples and usage patterns

### 🗄️ [Data Models](data-models.md)
**Data structure specifications for CLI operations**

Perfect for: Developers working with data persistence and CLI integration
- Session state management for CLI interactions
- Learning progress tracking models
- Configuration data schemas for CLI commands
- Checkpoint and recovery data structures
- Performance optimization patterns for CLI workflows

**Key Features:**
- Session persistence for interactive CLI experiences
- Knowledge mapping data structures for learning visualization
- Token usage tracking models for CLI analytics
- Configuration schemas aligned with slash commands

## Getting Started with CLI APIs

### Prerequisites
- Understanding of command-line interface design patterns
- Familiarity with JSON data formats for configuration
- Basic knowledge of interactive CLI application development
- Experience with Python programming (for extensions and automation)

### Quick Start Path
1. **CLI Command Integration**: Start with [CLI Commands API](cli-commands.md) for understanding slash command patterns and interactive workflows
2. **Configuration Management**: Use [Configuration API](configuration-api.md) for system setup and real-time configuration updates
3. **Provider Development**: Refer to [Provider Interface](provider-interfaces.md) for AI provider integration with CLI workflows
4. **Data Integration**: Check [Data Models](data-models.md) for session persistence and learning progress tracking

## CLI API Design Principles

### Consistency Standards
- **Slash Command Conventions**: Consistent `/command [subcommand] [args]` patterns across all CLI interactions
- **Interactive Response Formats**: Standardized output formats for CLI display and user interaction
- **Configuration Integration**: Unified configuration management across all CLI commands
- **Error Handling**: User-friendly error messages with actionable suggestions
- **Session Management**: Consistent session state handling across CLI operations

### Security Considerations
- **Input Validation**: All command arguments validated and sanitized
- **Configuration Security**: Secure API key storage and configuration file protection
- **Provider Authentication**: Safe provider setup and credential management workflows
- **Data Encryption**: Secure storage of sensitive configuration data
- **Audit Logging**: Complete audit trail for configuration changes and provider operations

### Performance Optimization
- **Configuration Caching**: Intelligent caching for frequently accessed configuration data
- **Session Persistence**: Efficient session state management for seamless CLI experience
- **Interactive Response**: Fast command responses with progressive loading where appropriate
- **Resource Management**: Optimized memory and token usage for CLI sessions
- **Error Recovery**: Graceful handling of provider failures and network issues

## CLI Architecture Overview

### Interactive CLI Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│                Interactive CLI Layer                        │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐  │
│  │  Slash Commands │  │ Interactive UI  │  │ Session       │  │
│  │  Interface      │  │  Components     │  │  Management   │  │
│  └─────────────────┘  └─────────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                Configuration Layer                         │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐  │
│  │  Provider Mgmt  │  │  Settings       │  │ Validation    │  │
│  │  System         │  │  Management     │  │  Framework    │  │
│  └─────────────────┘  └─────────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                 Provider Abstraction Layer                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐  │
│  │  AI Providers   │  │  Session        │  │ Data          │  │
│  │  Interface      │  │  Persistence     │  │  Models       │  │
│  └─────────────────┘  └─────────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Common CLI Patterns

### Command Execution Format

CLI commands follow consistent execution and response patterns:

```bash
# Command Structure
/[command] [subcommand] [arguments] [options]

# Interactive Command Response
✅ Success: [Human-readable success message]
📊 [Command output in CLI-friendly format]
💡 [Suggestions or next steps]

# Error Response
❌ Error: [Human-readable error message]
💡 [Actionable suggestion]
🔧 [Available commands that might help]
```

### Configuration Change Format

```bash
# Configuration Update
Learning Catalyst > /config daily-limit 10000
✅ Configuration updated: ai.daily_limit = 10000
📊 New limit: 10,000 tokens per day
💡 Use /tokens to monitor usage
```

### Provider Management Format

```bash
# Provider Setup
Learning Catalyst > /config provider openai
🔧 OpenAI Provider Configuration:
  Enter your OpenAI API key: sk-...
✅ OpenAI provider configured successfully
📊 Available models: gpt-4, gpt-4o, gpt-4o-mini
💡 Use /config model to select a model
```

## CLI Integration Examples

### CLI Automation Integration

```python
import subprocess
import json
from pathlib import Path

class LearningCatalystCLI:
    """Python wrapper for Learning Catalyst CLI automation"""

    def __init__(self, workspace_path: str = None):
        self.workspace_path = workspace_path or Path.cwd()

    def execute_command(self, command: str, timeout: int = 30):
        """Execute a CLI command and return structured response"""
        try:
            result = subprocess.run(
                ["learning-catalyst", command],
                cwd=self.workspace_path,
                capture_output=True,
                text=True,
                timeout=timeout
            )

            return {
                "success": result.returncode == 0,
                "stdout": result.stdout,
                "stderr": result.stderr,
                "returncode": result.returncode
            }
        except subprocess.TimeoutExpired:
            return {
                "success": False,
                "error": "Command timed out",
                "timeout": timeout
            }

    def get_configuration(self):
        """Get current configuration"""
        result = self.execute_command("/config")
        if result["success"]:
            # Parse CLI output into structured data
            return self._parse_config_output(result["stdout"])
        return None

    def switch_provider(self, provider_name: str, api_key: str = None):
        """Switch AI provider with optional API key"""
        if api_key:
            # Set up provider first
            setup_cmd = f"/config provider {provider_name}"
            # Note: Interactive API key input would need automation
            result = self.execute_command(setup_cmd)

        # Switch to provider
        switch_cmd = f"/config provider"
        result = self.execute_command(switch_cmd)
        return result["success"]

    def save_checkpoint(self, name: str = None):
        """Save learning checkpoint"""
        cmd = f"/checkpoint save {name}" if name else "/checkpoint save"
        result = self.execute_command(cmd)
        return result["success"]

    def _parse_config_output(self, output: str):
        """Parse CLI configuration output into structured data"""
        # Implementation would parse the CLI output format
        return {
            "provider": "deepseek",
            "model": "deepseek-chat",
            "status": "connected"
        }

# Usage example
cli = LearningCatalystCLI("./my-learning-project")

# Get current configuration
config = cli.get_configuration()
print(f"Current provider: {config['provider']}")

# Switch provider
success = cli.switch_provider("openai")
if success:
    print("Successfully switched to OpenAI")

# Save checkpoint
cli.save_checkpoint("python-basics-progress")
```

### Shell Script Integration

```bash
#!/bin/bash
# Learning Catalyst automation script

set -e

WORKSPACE_DIR="./learning-catalyst-workspace"
LOG_FILE="$WORKSPACE_DIR/automation.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Initialize Learning Catalyst session
log "Starting Learning Catalyst automation"

# Check current configuration
log "Checking current configuration..."
learning-catalyst /config > "$WORKSPACE_DIR/config-status.txt"

# Extract current provider and model
CURRENT_PROVIDER=$(grep "Current Provider:" "$WORKSPACE_DIR/config-status.txt" | awk '{print $3}')
CURRENT_MODEL=$(grep "Current Model:" "$WORKSPACE_DIR/config-status.txt" | awk '{print $3}')

log "Current configuration: $CURRENT_PROVIDER - $CURRENT_MODEL"

# Check token usage
log "Checking token usage..."
learning-catalyst /tokens > "$WORKSPACE_DIR/token-usage.txt"

DAILY_USAGE=$(grep "Daily Usage:" "$WORKSPACE_DIR/token-usage.txt" | awk '{print $3}')
log "Daily token usage: $DAILY_USAGE"

# Create checkpoint if usage is significant
if [ "${DAILY_USAGE//,}" -gt 1000 ]; then
    CHECKPOINT_NAME="high-usage-$(date +%Y%m%d_%H%M%S)"
    log "High usage detected, creating checkpoint: $CHECKPOINT_NAME"
    learning-catalyst "/checkpoint save $CHECKPOINT_NAME"

    if [ $? -eq 0 ]; then
        log "✅ Checkpoint created successfully"
    else
        log "❌ Failed to create checkpoint"
    fi
fi

# Show learning progress
log "Retrieving learning progress..."
learning-catalyst /knowledge-map > "$WORKSPACE_DIR/knowledge-map.txt"

# Extract learning statistics
MASTERY_COUNT=$(grep -c "mastery" "$WORKSPACE_DIR/knowledge-map.txt" || echo "0")
log "Current topics in progress: $MASTERY_COUNT"

log "Learning Catalyst automation completed"
```

### Configuration File Integration

```python
import json
from pathlib import Path

class LearningCatalystConfig:
    """Manage Learning Catalyst configuration programmatically"""

    def __init__(self, workspace_path: str):
        self.workspace_path = Path(workspace_path)
        self.config_file = self.workspace_path / ".catalyst" / "config.json"

    def load_config(self):
        """Load configuration from file"""
        if self.config_file.exists():
            with open(self.config_file, 'r') as f:
                return json.load(f)
        return {}

    def save_config(self, config: dict):
        """Save configuration to file"""
        self.config_file.parent.mkdir(exist_ok=True)
        with open(self.config_file, 'w') as f:
            json.dump(config, f, indent=2)

    def update_provider(self, provider: str, model: str, api_key: str = None):
        """Update provider configuration"""
        config = self.load_config()

        if "ai" not in config:
            config["ai"] = {}

        config["ai"]["default_provider"] = provider
        config["ai"]["default_model"] = model

        if "providers" not in config:
            config["providers"] = {}

        if provider not in config["providers"]:
            config["providers"][provider] = {}

        config["providers"][provider]["default_model"] = model
        if api_key:
            config["providers"][provider]["api_key"] = api_key

        self.save_config(config)
        return True

    def set_daily_limit(self, limit: int):
        """Set daily token limit"""
        config = self.load_config()

        if "ai" not in config:
            config["ai"] = {}

        config["ai"]["daily_limit"] = limit
        self.save_config(config)
        return True

# Usage example
config_manager = LearningCatalystConfig("./my-learning-project")

# Configure OpenAI provider
config_manager.update_provider(
    provider="openai",
    model="gpt-4o",
    api_key="sk-your-api-key-here"
)

# Set daily limit
config_manager.set_daily_limit(5000)

print("Configuration updated successfully")
```

## CLI Versioning and Compatibility

### Version Strategy
- **Semantic Versioning**: MAJOR.MINOR.PATCH format for CLI releases
- **Backward Compatibility**: Slash command patterns maintained across minor versions
- **Deprecation Notices**: Clear warnings for command changes in CLI output
- **Migration Guides**: Documentation for configuration file format changes

### Current Version Information
- **CLI Version**: v1.0.0
- **Stability**: Stable
- **Command Compatibility**: All slash commands maintain backward compatibility
- **Configuration Format**: JSON configuration schema stable

## CLI Development and Testing

### CLI Testing Framework

```python
import unittest
import subprocess
from pathlib import Path

class TestCLIIntegration(unittest.TestCase):
    def setUp(self):
        self.test_workspace = Path("./test_workspace")
        self.test_workspace.mkdir(exist_ok=True)

    def test_help_command(self):
        """Test help command execution"""
        result = subprocess.run(
            ["learning-catalyst", "/help"],
            cwd=self.test_workspace,
            capture_output=True,
            text=True
        )
        self.assertEqual(result.returncode, 0)
        self.assertIn("Available commands", result.stdout)

    def test_configuration_command(self):
        """Test configuration command"""
        result = subprocess.run(
            ["learning-catalyst", "/config"],
            cwd=self.test_workspace,
            capture_output=True,
            text=True
        )
        self.assertEqual(result.returncode, 0)
        # Check for expected configuration output

    def test_invalid_command(self):
        """Test error handling for invalid commands"""
        result = subprocess.run(
            ["learning-catalyst", "/invalid-command"],
            cwd=self.test_workspace,
            capture_output=True,
            text=True
        )
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Unknown command", result.stderr)

if __name__ == "__main__":
    unittest.main()
```

### CLI Documentation Standards

Each CLI command includes:
1. **Purpose**: Clear description of functionality
2. **Syntax**: Complete command syntax with parameters
3. **Examples**: Real usage examples with expected output
4. **Error Handling**: Common errors and troubleshooting steps
5. **Related Commands**: Links to related CLI commands
6. **Configuration Impact**: How command affects configuration

## CLI Security and Authentication

### CLI Security Measures
- **Configuration Security**: Encrypted storage of API keys and sensitive data
- **Provider Authentication**: Secure provider setup workflows
- **Input Validation**: Comprehensive validation of command arguments
- **Audit Logging**: Complete logging of configuration changes
- **File Permissions**: Restricted access to configuration files

### Provider Authentication Patterns

```bash
# Interactive provider setup (secure)
Learning Catalyst > /config provider openai
🔧 OpenAI Provider Configuration:
  Enter your OpenAI API key: [hidden input]
✅ OpenAI provider configured successfully

# Environment variable authentication
export OPENAI_API_KEY="sk-your-api-key"
Learning Catalyst > /config provider openai
✅ OpenAI provider configured using environment variable

# Configuration file authentication (encrypted storage)
# API keys stored securely in .catalyst/config.json with restricted permissions
```

## CLI Performance and Optimization

### Performance Guidelines
- **Configuration Caching**: Fast loading of configuration for CLI startup
- **Session Management**: Efficient session state persistence
- **Interactive Response**: Fast command responses with progressive loading
- **Resource Management**: Optimized memory usage for long CLI sessions
- **Token Optimization**: Efficient token usage in AI interactions

### CLI Performance Monitoring

```bash
# Check CLI performance with built-in commands
Learning Catalyst > /statistics
📊 CLI Performance:
  Startup Time: 0.23s
  Average Command Response: 1.2s
  Session Memory Usage: 45MB
  Cache Hit Rate: 87%

# Monitor token usage efficiency
Learning Catalyst > /tokens
📊 Token Efficiency:
  Average tokens per interaction: 234
  Compression ratio: 29%
  Cost per learning session: $0.45
```

## Troubleshooting CLI Issues

### Common CLI Problems

#### Issue: Command Not Recognized
```bash
# Symptom: Unknown command error
Learning Catalyst > /invalid-command
❌ Error: Unknown command: /invalid-command
💡 Try: /help to see available commands

# Solution: Check available commands
Learning Catalyst > /help
✅ Available commands listed

# Use tab completion
Learning Catalyst > /conf[Tab]
= Suggestions: /config, /context
```

#### Issue: Provider Configuration Failed
```bash
# Symptom: Provider setup failure
Learning Catalyst > /config provider openai
❌ Error: Invalid API key format
💡 Check API key format and try again

# Solution: Verify API key and retry
Learning Catalyst > /config provider openai
🔧 Enter your OpenAI API key: sk-correct-format-key-here
✅ OpenAI provider configured successfully
```

#### Issue: Configuration File Corruption
```bash
# Symptom: Configuration errors on startup
Learning Catalyst > /config
❌ Error: Invalid configuration format
💡 Configuration reset to defaults

# Solution: Reset configuration
Learning Catalyst > /config reset
✅ Configuration reset to defaults
💡 Reconfigure your providers using /config provider
```

#### Issue: Session Persistence Problems
```bash
# Symptom: Checkpoint save/load failures
Learning Catalyst > /checkpoint save
❌ Error: Unable to save checkpoint - permission denied

# Solution: Check workspace permissions
Learning Catalyst > /context
📋 Current Context:
  Workspace: /path/to/workspace
  Permissions: read-write
💡 Check file permissions for .catalyst directory
```

## Related Documentation

### System Architecture Integration
- **[System Architecture Overview](../system-architecture/)**: Complete system architecture and 5-layer design
- **[CLI Architecture](../system-architecture/cli-architecture.md)**: Command-line interface design and interaction patterns
- **[AI Integration Architecture](../system-architecture/ai-integration.md)**: Multi-agent orchestration with Microsoft AutoGen
- **[Data Layer Architecture](../system-architecture/data-layer.md)**: Data storage and management patterns
- **[Knowledge Management System](../system-architecture/knowledge-management-system.md)**: Knowledge graph and learning systems

### Implementation and Usage
- **[Implementation Guides](../implementation-guides/)**: CLI development and setup instructions
- **[Configuration Commands](../../commands/configuration.md)**: Complete CLI command reference
- **[Examples](../../examples/)**: Practical CLI usage examples and workflows

### API Reference Alignment
This API reference directly implements the architectural patterns described in the system architecture documentation. For detailed understanding of:
- **CLI Design Patterns**: See [CLI Architecture](../system-architecture/cli-architecture.md)
- **Multi-Agent Integration**: See [AI Integration Architecture](../system-architecture/ai-integration.md)
- **Data Persistence**: See [Data Layer Architecture](../system-architecture/data-layer.md)
- **Configuration Management**: See [Configuration API](configuration-api.md) with entity validation

## Contributing to CLI APIs

### CLI Development Guidelines
1. **Follow CLI Standards**: Adhere to established slash command patterns
2. **Document Commands**: Complete documentation for all CLI commands
3. **Test Interactively**: Comprehensive CLI testing coverage required
4. **Version Carefully**: Maintain backward compatibility for CLI commands
5. **User Experience First**: Prioritize intuitive CLI interactions

### Quality Standards
- **Command Review**: All CLI command changes require review
- **Interactive Testing**: CLI integration tests required
- **Documentation**: Updated command documentation for all changes
- **Performance**: CLI responsiveness testing for new features
- **Security**: Security review for configuration and authentication operations

---

*Last updated: October 8, 2025*
*Version: 1.0.0*
*Category: CLI API Reference*