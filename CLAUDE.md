# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Environment Setup
```bash
# Install development dependencies
make install-dev
# or
poetry install

# Run the application
python -m src.cli.main
```

### Code Quality & Linting
```bash
# Run all linting and formatting (default paths: src tests)
make lint

# Format code only
make format

# Run specific linters
make check-flake8
make check-pyright
make check-black
make check-isort

# Target specific files/directories
make lint src/file.py
make format src tests
```

### Testing
```bash
# Note: Test directory currently under reorganization (git status shows many deletions)
# When tests are restored, use standard pytest commands:
poetry run pytest
poetry run pytest tests/unit/test_specific.py
poetry run pytest -v
poetry run pytest --cov=src
```

## Architecture Overview

Learning Catalyst follows a **5-layer modular architecture** with clear separation of concerns:

### Core Architecture Layers
1. **User Interface Layer** - CLI module with rich terminal interface
2. **Learning Intelligence Layer** - Personalized learning orchestration and analytics
3. **Knowledge Management Layer** - Knowledge graphs and semantic relationships
4. **AI Integration Layer** - Multi-provider AI abstraction and tool orchestration
5. **Data Storage Layer** - Local-first storage with privacy by design

### Key Architectural Principles
- **Module-First Design**: Each component is a well-defined architectural module
- **Provider Abstraction**: Unified interface for multiple AI providers (OpenAI, ChatGLM, DeepSeek, SiliconFlow, local models)
- **Local-First Approach**: User data remains primarily on local machines
- **CLI-Centric Design**: All functionality accessible through interactive command-line interface

### Module Documentation Framework
Every module follows the **What-How-Relationship Framework**:
- **🎯 What It Is**: Clear module definition, purpose, and scope
- **⚙️ How It Works**: Internal architecture and operational logic
- **🔗 Relationships**: Dependencies and integration patterns

## Project Structure (Current State)

**IMPORTANT**: The repository is currently undergoing major reorganization. Git status shows many files marked for deletion in the `src/` and `tests/` directories.

### Active Components
- **Documentation**: Comprehensive docs in `docs/` directory with CLI commands, API references, and technical architecture
- **Configuration**: Poetry-based setup with extensive linting configuration
- **Makefile**: Well-defined development commands for linting and formatting

### Documentation Structure
```
docs/
├── commands/           # Complete CLI command reference
├── examples/           # Usage examples and integration guides
├── installation/       # Setup and quick start guides
└── technical/          # Architecture and API documentation
    ├── api-reference/  # Complete API specifications
    ├── system-architecture/  # 5-layer architecture docs
    └── testing/        # Testing procedures
```

## CLI Interface Design

### Core Command Categories
- **System Commands**: `/help`, `/quit`, `/clear`
- **Configuration**: `/config`, `/config provider`, `/config model`
- **Learning**: `/knowledge-map`, natural language queries
- **Session Management**: `/checkpoint save [name]`, `/checkpoint load [name]`
- **Analytics**: `/tokens`, `/statistics`
- **Context Management**: `/context`, `/compress`, `/verbose`, `/wait`

### Response Format Standards
All CLI responses follow structured patterns:
```bash
✅ Success: [Human-readable message]
📊 [Output in CLI-friendly format]
💡 [Suggestions or next steps]
🔗 [Related commands or resources]
```

## AI Provider Integration

### Supported Providers
- OpenAI (GPT models)
- ChatGLM (Zhipu AI)
- DeepSeek
- SiliconFlow
- Local models (Ollama, Llama.cpp)

### Provider Architecture
- **Abstraction Layer**: Unified `ModelAbstractionLayer` interface
- **Configuration Management**: Interactive provider setup and switching
- **Authentication**: Secure API key storage and management
- **Error Handling**: Comprehensive retry logic and graceful failures

## Development Guidelines

### Code Style
- **Line Length**: 130 characters
- **Python Version**: 3.8+ (configured for 3.10)
- **Formatting**: Black, isort, autoflake
- **Linting**: flake8, pylint, pyright (strict mode)
- **Type Checking**: Strict type checking enabled

### Module Development
When creating new modules:
1. Define clear boundaries and responsibilities
2. Follow the What-How-Relationship documentation framework
3. Implement standardized interfaces
4. Document dependencies and evolution paths
5. Ensure compatibility with provider abstraction

### Configuration Management
- Uses JSON schema validation for configuration files
- Hierarchical configuration with precedence rules
- Real-time configuration updates for active sessions
- Secure storage of API keys and sensitive data

## Testing Environment

### Test Configuration
- **Framework**: pytest with asyncio support
- **Coverage**: pytest-cov for coverage reporting
- **Test Environment**: `.testenv` file for environment variables
- **Current Status**: Test suite under reorganization

### Test Structure (When Restored)
```
tests/
├── unit/           # Unit tests for individual modules
├── integration/    # Integration tests across modules
└── e2e/           # End-to-end workflow tests
```

## Key Files to Understand

- **`pyproject.toml`**: Complete project configuration with development tools
- **`Makefile`**: All development commands and linting workflows
- **`docs/technical/system-architecture/README.md`**: Complete 5-layer architecture documentation
- **`docs/technical/api-reference/README.md`**: API reference with maintaining philosophy
- **`docs/README.md`**: Comprehensive CLI documentation and usage guide

## Working with This Codebase

1. **Start with Documentation**: The `docs/` directory contains the most comprehensive and current information about the system
2. **Use Make Commands**: All development workflows are standardized through the Makefile
3. **Follow Module Architecture**: Understand the 5-layer architecture before making changes
4. **CLI-First Development**: All functionality should be accessible through the CLI interface
5. **Provider Abstraction**: Maintain compatibility with multiple AI providers when extending AI functionality

Note: This codebase is in active reorganization. Always check git status before assuming the existence of files in `src/` or `tests/` directories.