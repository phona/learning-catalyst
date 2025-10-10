# Development Environment Setup

---
title: Learning Catalyst Development Environment Setup
description: Complete guide for setting up local development environment
version: 1.0.0
last_updated: 2025-10-08
---

## Overview

This guide provides step-by-step instructions for setting up a complete development environment for Learning Catalyst. It covers system requirements, dependency installation, configuration, database setup, and development tools configuration.

## System Requirements

### Minimum Requirements
- **Operating System**: Linux (Ubuntu 18.04+), macOS (10.15+), or Windows 10/11
- **Python**: Version 3.9 or higher
- **Memory**: 4GB RAM minimum, 8GB recommended
- **Storage**: 2GB free disk space for development
- **Network**: Internet connection for AI provider testing and dependency installation

### Recommended Development Environment
- **Operating System**: Ubuntu 22.04 LTS or macOS 12+
- **Python**: Version 3.11 or higher
- **Memory**: 16GB RAM for optimal performance
- **Storage**: 10GB free disk space for development and testing
- **Processor**: Multi-core CPU for better performance
- **IDE**: VS Code with Python extensions or PyCharm Professional

## Prerequisites Installation

### Python Installation

#### Ubuntu/Debian
```bash
# Update package list
sudo apt update

# Install Python 3.11 and development tools
sudo apt install python3.11 python3.11-venv python3.11-dev python3-pip

# Verify installation
python3.11 --version
pip3 --version

# Set Python 3.11 as default (optional)
sudo update-alternatives --install /usr/bin/python python /usr/bin/python3.11 1
```

#### macOS
```bash
# Install Homebrew if not already installed
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Python 3.11
brew install python@3.11

# Verify installation
python3.11 --version
pip3.11 --version

# Add to PATH (add to ~/.zshrc or ~/.bash_profile)
export PATH="/opt/homebrew/bin:$PATH"
export PATH="/opt/homebrew/opt/python@3.11/bin:$PATH"
```

#### Windows
```powershell
# Download and install Python 3.11 from python.org
# Or use Chocolatey
choco install python311

# Verify installation
python --version
pip --version

# Ensure Python is in PATH
# Add C:\Python311 and C:\Python311\Scripts to PATH
```

### Git Installation

#### Ubuntu/Debian
```bash
sudo apt install git
git --version
```

#### macOS
```bash
# Usually pre-installed, or install via Homebrew
brew install git
git --version
```

#### Windows
```powershell
# Download and install from git-scm.com
# Or use Chocolatey
choco install git
git --version
```

### SQLite Installation

Most systems come with SQLite pre-installed. Verify and update if needed:

#### Ubuntu/Debian
```bash
sudo apt install sqlite3 libsqlite3-dev
sqlite3 --version
```

#### macOS
```bash
# Usually pre-installed
sqlite3 --version

# Update via Homebrew if needed
brew install sqlite
```

#### Windows
```powershell
# Download from sqlite.org or use Chocolatey
choco install sqlite
sqlite3 --version
```

## Project Setup

### 1. Clone Repository

```bash
# Clone the repository
git clone https://github.com/your-org/learning-catalyst.git
cd learning-catalyst

# Verify repository structure
ls -la
# Should see: src/, docs/, tests/, README.md, etc.
```

### 2. Create Virtual Environment

#### Using venv (Recommended)

```bash
# Create virtual environment
python3.11 -m venv venv

# Activate virtual environment
# On Linux/macOS:
source venv/bin/activate

# On Windows:
venv\Scripts\activate

# Verify activation
which python  # Should point to venv/bin/python
python --version  # Should show 3.11.x
```

#### Using conda (Alternative)

```bash
# Create conda environment
conda create -n learning-catalyst python=3.11

# Activate environment
conda activate learning-catalyst

# Verify
python --version
```

### 3. Install Dependencies

```bash
# Upgrade pip
pip install --upgrade pip

# Install development dependencies
pip install -e .

# Install development tools
pip install -r requirements-dev.txt

# Verify installation
pip list
```

### 4. Environment Configuration

```bash
# Create environment file
cp .env.example .env

# Edit environment file
nano .env  # or use your preferred editor
```

**Environment File (.env) Configuration:**

```bash
# AI Provider Configuration
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here
DEEPSEEK_API_KEY=your_deepseek_api_key_here

# Development Settings
DEBUG=true
LOG_LEVEL=DEBUG
DEVELOPMENT_MODE=true

# Database Configuration
DATABASE_URL=sqlite:///./learning_catalyst_dev.db

# Cache Configuration
CACHE_TTL_SECONDS=3600
CACHE_SIZE_MB=100

# Security Settings
SECRET_KEY=your_secret_key_here_for_development
ENCRYPTION_KEY=your_encryption_key_here

# API Configuration
API_RATE_LIMIT=60
API_TIMEOUT_SECONDS=30
```

### 5. Database Setup

```bash
# Initialize database
python -m src.cli.db init

# Run database migrations
python -m src.cli.db migrate

# Verify database setup
sqlite3 learning_catalyst_dev.db ".tables"
```

**Database Initialization Script (db_init.py):**

```python
#!/usr/bin/env python3
"""Database initialization script."""

import sqlite3
import os
from pathlib import Path

def create_database_schema(db_path: str):
    """Create database schema."""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Create tables
    cursor.executescript("""
        CREATE TABLE IF NOT EXISTS user_profiles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT UNIQUE NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            selected_provider TEXT,
            selected_model TEXT,
            preferences TEXT,
            settings TEXT
        );

        CREATE TABLE IF NOT EXISTS qa_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            session_id TEXT NOT NULL,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            interaction_type TEXT NOT NULL,
            input_text TEXT NOT NULL,
            response_text TEXT NOT NULL,
            context_data TEXT,
            model_used TEXT,
            provider_used TEXT,
            tokens_used INTEGER,
            metadata TEXT
        );

        CREATE TABLE IF NOT EXISTS concepts (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            summary TEXT,
            content TEXT,
            source_files TEXT,
            difficulty_level INTEGER DEFAULT 1,
            estimated_time_minutes INTEGER,
            prerequisites TEXT,
            related_concepts TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            metadata TEXT
        );

        -- Add more tables as needed
    """)

    conn.commit()
    conn.close()
    print(f"Database created at: {db_path}")

def main():
    """Main initialization function."""
    db_path = os.getenv('DATABASE_URL', 'sqlite:///./learning_catalyst_dev.db')

    # Extract path from database URL
    if db_path.startswith('sqlite:///'):
        db_path = db_path[10:]  # Remove 'sqlite:///' prefix

    # Ensure directory exists
    Path(db_path).parent.mkdir(parents=True, exist_ok=True)

    # Create database
    create_database_schema(db_path)
    print("Database initialization completed successfully!")

if __name__ == "__main__":
    main()
```

## Development Tools Configuration

### VS Code Setup

#### Extensions to Install
```json
{
  "recommendations": [
    "ms-python.python",
    "ms-python.flake8",
    "ms-python.black-formatter",
    "ms-python.mypy-type-checker",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-json",
    "redhat.vscode-yaml",
    "ms-python.debugpy",
    "ms-python.python-docstring-generator"
  ]
}
```

#### VS Code Settings (.vscode/settings.json)

```json
{
  "python.defaultInterpreterPath": "./venv/bin/python",
  "python.linting.enabled": true,
  "python.linting.flake8Enabled": true,
  "python.linting.mypyEnabled": true,
  "python.formatting.provider": "black",
  "python.testing.pytestEnabled": true,
  "python.testing.pytestArgs": [
    "tests"
  ],
  "python.testing.unittestEnabled": false,
  "files.exclude": {
    "**/__pycache__": true,
    "**/*.pyc": true,
    ".pytest_cache": true,
    ".mypy_cache": true,
    "*.egg-info": true
  },
  "editor.formatOnSave": true,
  "editor.rulers": [88],
  "editor.tabSize": 4,
  "editor.insertSpaces": true
}
```

#### VS Code Launch Configuration (.vscode/launch.json)

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Learning Catalyst CLI",
      "type": "python",
      "request": "launch",
      "program": "${workspaceFolder}/src/cli/main.py",
      "console": "integratedTerminal",
      "cwd": "${workspaceFolder}",
      "env": {
        "PYTHONPATH": "${workspaceFolder}/src",
        "DEVELOPMENT_MODE": "true"
      },
      "args": ["--debug"]
    },
    {
      "name": "Run Tests",
      "type": "python",
      "request": "launch",
      "program": "${workspaceFolder}/venv/bin/pytest",
      "console": "integratedTerminal",
      "cwd": "${workspaceFolder}",
      "args": ["tests/", "-v", "--tb=short"]
    }
  ]
}
```

### PyCharm Setup

#### Project Configuration
1. **Open Project**: File → Open → Select learning-catalyst directory
2. **Python Interpreter**:
   - Settings → Project → Python Interpreter
   - Add → Existing Environment → Select venv/bin/python
3. **Mark Source Root**: Right-click `src/` directory → Mark Directory as → Sources Root

#### Code Style Configuration
- **Settings → Editor → Code Style → Python**
- Set line length to 88 characters
- Enable Black formatter integration
- Configure imports sorting (isort)

#### Testing Configuration
- **Settings → Tools → Python Integrated Tools**
- Set default test runner to pytest
- Configure test discovery pattern: `tests/*test*.py`

### Git Configuration

#### Basic Git Setup
```bash
# Configure git user
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# Set default branch name
git config --global init.defaultBranch main

# Configure line endings (Windows)
git config --global core.autocrlf true

# Configure line endings (Linux/macOS)
git config --global core.autocrlf input

# Set up git hooks (optional)
cp scripts/pre-commit .git/hooks/
chmod +x .git/hooks/pre-commit
```

#### Git Hooks Setup

**Pre-commit Hook (.git/hooks/pre-commit):**

```bash
#!/bin/bash
# Pre-commit hook for code quality checks

echo "Running pre-commit checks..."

# Check code formatting with black
echo "Checking code formatting..."
if ! black --check src/ tests/; then
    echo "Code formatting issues found. Run 'black src/ tests/' to fix."
    exit 1
fi

# Run linting with flake8
echo "Running linting..."
if ! flake8 src/ tests/; then
    echo "Linting issues found."
    exit 1
fi

# Run type checking with mypy
echo "Running type checking..."
if ! mypy src/; then
    echo "Type checking issues found."
    exit 1
fi

# Run tests
echo "Running tests..."
if ! python -m pytest tests/ --tb=short; then
    echo "Tests failed."
    exit 1
fi

echo "All checks passed!"
```

## AI Provider Setup

### OpenAI Setup

```bash
# Test OpenAI configuration
python -c "
import os
from src.ai.providers.openai import OpenAIProvider

config = {
    'api_key': os.getenv('OPENAI_API_KEY'),
    'timeout': 30
}

provider = OpenAIProvider(config)
print('API Key valid:', provider.validate_api_key())
print('Available models:', provider.get_available_models())
"
```

### Deepseek Setup

```bash
# Test Deepseek configuration
python -c "
import os
from src.ai.providers.deepseek import DeepseekProvider

config = {
    'api_key': os.getenv('DEEPSEEK_API_KEY'),
    'timeout': 30
}

provider = DeepseekProvider(config)
print('API Key valid:', provider.validate_api_key())
print('Available models:', provider.get_available_models())
"
```

### Provider Testing Script

**test_providers.py:**

```python
#!/usr/bin/env python3
"""Test AI provider configurations."""

import os
import asyncio
from src.ai.providers.openai import OpenAIProvider
from src.ai.providers.deepseek import DeepseekProvider

async def test_providers():
    """Test all configured providers."""
    providers = {}

    # Test OpenAI
    if os.getenv('OPENAI_API_KEY'):
        providers['openai'] = OpenAIProvider({
            'api_key': os.getenv('OPENAI_API_KEY')
        })

    # Test Deepseek
    if os.getenv('DEEPSEEK_API_KEY'):
        providers['deepseek'] = DeepseekProvider({
            'api_key': os.getenv('DEEPSEEK_API_KEY')
        })

    # Test each provider
    for name, provider in providers.items():
        print(f"\nTesting {name} provider...")

        # Test API key validation
        is_valid = provider.validate_api_key()
        print(f"  API Key Valid: {is_valid}")

        if is_valid:
            # Test model availability
            models = provider.get_available_models()
            print(f"  Available Models: {models}")

            # Test simple request
            try:
                response = await provider.generate_response(
                    prompt="Hello, respond with just 'OK'",
                    model=models[0] if models else "default"
                )
                print(f"  Test Response: {response.content}")
                print(f"  Response Time: {response.response_time:.2f}s")
                print(f"  Tokens Used: {response.tokens_used}")
            except Exception as e:
                print(f"  Request Failed: {e}")
        else:
            print(f"  Skipping request test due to invalid API key")

if __name__ == "__main__":
    asyncio.run(test_providers())
```

## Testing Setup

### Install Testing Dependencies

```bash
# Install testing framework
pip install pytest pytest-asyncio pytest-cov pytest-mock

# Install additional testing tools
pip install factory-boy faker httpx
```

### Run Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=src --cov-report=html

# Run specific test file
pytest tests/test_ai_providers.py

# Run with verbose output
pytest -v

# Run only failed tests
pytest --lf

# Run tests with specific markers
pytest -m "unit"
pytest -m "integration"
pytest -m "slow"
```

### Test Configuration

**pytest.ini:**

```ini
[tool:pytest]
testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
addopts =
    -v
    --tb=short
    --strict-markers
    --disable-warnings
markers =
    unit: Unit tests
    integration: Integration tests
    slow: Slow running tests
    external: Tests that require external services
asyncio_mode = auto
```

## Development Server

### Run Development Mode

```bash
# Activate virtual environment
source venv/bin/activate

# Set development environment variables
export DEBUG=true
export DEVELOPMENT_MODE=true

# Run development server
python -m src.cli.main --dev

# Or with specific configuration
python -m src.cli.main --dev --config dev.toml
```

### Development Configuration

**dev.toml:**

```toml
[development]
debug = true
log_level = "DEBUG"
auto_reload = true
profiling = true

[ai]
default_provider = "openai"
default_model = "gpt-3.5-turbo"  # Use cheaper model for development
temperature = 0.7
max_tokens = 1000

[cache]
enabled = true
ttl_seconds = 300  # Shorter cache for development
size_mb = 50

[logging]
level = "DEBUG"
format = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
file = "dev.log"
```

## Troubleshooting

### Common Setup Issues

#### Issue: Python Version Conflicts
```bash
# Check Python versions
which python
python --version
which python3
python3 --version

# Update alternatives (Ubuntu/Debian)
sudo update-alternatives --config python3

# Use specific version
python3.11 -m venv venv
```

#### Issue: Permission Denied
```bash
# Fix directory permissions
chmod +x scripts/*.py
chmod -R 755 .

# Fix file permissions
chmod 644 .env
chmod 600 .env.secrets
```

#### Issue: Database Connection Failed
```bash
# Check database file
ls -la *.db
sqlite3 learning_catalyst_dev.db ".tables"

# Recreate database
rm learning_catalyst_dev.db
python -m src.cli.db init
```

#### Issue: Import Errors
```bash
# Check PYTHONPATH
echo $PYTHONPATH
export PYTHONPATH="${PYTHONPATH}:$(pwd)/src"

# Install in development mode
pip install -e .

# Check package installation
pip show learning-catalyst
```

#### Issue: AI Provider Connection Failed
```bash
# Test API key
python -c "
import os
import openai
client = openai.OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
models = client.models.list()
print('API key is valid')
"

# Check network connectivity
curl -I https://api.openai.com/v1/models

# Test with proxy (if needed)
export HTTP_PROXY=http://proxy.company.com:8080
export HTTPS_PROXY=http://proxy.company.com:8080
```

### Debug Mode

Enable debug mode for detailed error information:

```bash
# Set debug environment
export DEBUG=true
export LOG_LEVEL=DEBUG

# Run with debug flags
python -m src.cli.main --debug --verbose

# Enable Python debug mode
python -u -m src.cli.main --debug  # -u for unbuffered output
```

### Performance Monitoring

```bash
# Install profiling tools
pip install py-spy memory-profiler

# CPU profiling
py-spy top -- python -m src.cli.main

# Memory profiling
mprof run python -m src.cli.main
mprof plot
```

## IDE-Specific Setup

### Vim/Neovim Configuration

**.vimrc additions:**

```vim
" Python development
Plugin 'davidhalter/jedi-vim'
Plugin 'psf/black'
Plugin 'myint/python-syntax'

" Configuration
let g:jedi#use_splits_not_buffers = "right"
let g:black_linelength = 88
let g:black_skip_string_normalization = 1

" Auto-format on save
autocmd BufWritePre *.py Black
```

### Emacs Configuration

**init.el additions:**

```elisp
;; Python development
(use-package elpy
  :ensure t
  :init
  (elpy-enable))

(use-package blacken
  :ensure t
  :hook (python-mode . blacken-mode))

;; Configuration
(setq elpy-rpc-virtualenv-path 'system)
(setq python-shell-interpreter "python3")
(setq blacken-line-length 88)
```

## Next Steps

After completing the setup:

1. **Run Tests**: `pytest` to verify everything works
2. **Test CLI**: `python -m src.cli.main` to start the application
3. **Configure AI Provider**: Set up at least one AI provider
4. **Review Documentation**: Read through the implementation guides
5. **Join Development**: Check out the contributing guidelines

## Related Documentation

- **[Adding New Commands](adding-new-commands.md)**: Command development
- **[Testing Strategies](testing-strategies.md)**: Testing approaches
- **[Provider Integration](provider-integration.md)**: AI provider setup
- **[API Reference](../api-reference/)**: Complete API documentation

---

*Last updated: October 8, 2025*
*Version: 1.0.0*
*Category: Implementation Guides*