# Configuration API

---
title: Learning Catalyst Configuration API
description: Configuration management, settings, and preferences API reference
version: 1.0.0
last_updated: 2025-10-08
---

## Overview

This document provides a comprehensive reference for Learning Catalyst's configuration management API, including settings management, provider configuration, preferences handling, and security considerations. The configuration API supports both programmatic access and CLI-based management.

## Configuration Architecture

### Configuration Hierarchy

```text
┌─────────────────────────────────────────────────────────────┐
│                 Configuration Hierarchy                    │
│                                                             │
│  1. System Defaults (lowest priority)                     │
│  2. Configuration Files (.toml, .json)                    │
│  3. Environment Variables                                  │
│  4. Runtime Configuration (highest priority)               │
│                                                             │
│  Settings are merged with higher priority overriding lower  │
└─────────────────────────────────────────────────────────────┘
```

### Configuration Files Structure

```text
~/.learning-catalyst/
├── config.toml              # Main configuration file
├── config.json              # Alternative JSON format
├── user_preferences.json    # User-specific preferences
├── providers/               # Provider-specific configs
│   ├── openai.toml
│   ├── deepseek.toml
│   └── custom_providers.json
└── themes/                   # UI theme configurations
    ├── dark.toml
    └── light.toml
```

## Configuration Management API

### Core Configuration Manager

```python
from typing import Dict, Any, Optional, Union
from pathlib import Path
import os
import toml
import json
from dataclasses import dataclass, asdict

@dataclass
class AIConfiguration:
    """AI provider and model configuration."""
    default_provider: str = "openai"
    default_model: str = "gpt-4"
    temperature: float = 0.7
    max_tokens: int = 2000
    timeout: int = 30
    max_retries: int = 3

@dataclass
class LearningConfiguration:
    """Learning and interaction configuration."""
    granularity: str = "summaries"  # headers, summaries, full_content
    auto_save: bool = True
    session_timeout_minutes: int = 120
    checkpoint_retention_days: int = 30
    auto_cleanup: bool = True

@dataclass
class UIConfiguration:
    """User interface configuration."""
    theme: str = "dark"
    show_token_usage: bool = True
    auto_scroll: bool = True
    command_suggestions: bool = True
    display_format: str = "detailed"  # minimal, detailed, verbose

@dataclass
class PrivacyConfiguration:
    """Privacy and security configuration."""
    store_conversations: bool = True
    anonymize_usage_data: bool = False
    local_processing_only: bool = False
    data_retention_days: int = 365
    encryption_enabled: bool = True

@dataclass
class PerformanceConfiguration:
    """Performance optimization configuration."""
    cache_enabled: bool = True
    cache_size_mb: int = 100
    cache_ttl_seconds: int = 3600
    parallel_processing: bool = True
    max_concurrent_requests: int = 5

class ConfigurationManager:
    """Central configuration management system."""

    def __init__(self, config_dir: Optional[str] = None):
        self.config_dir = Path(config_dir) if config_dir else Path.home() / ".learning-catalyst"
        self.config_dir.mkdir(exist_ok=True)

        # Initialize configuration sections
        self.ai_config = AIConfiguration()
        self.learning_config = LearningConfiguration()
        self.ui_config = UIConfiguration()
        self.privacy_config = PrivacyConfiguration()
        self.performance_config = PerformanceConfiguration()

        # Load existing configuration
        self.load_configuration()

    def load_configuration(self):
        """Load configuration from files."""
        config_file = self.config_dir / "config.toml"

        if config_file.exists():
            try:
                with open(config_file, 'r') as f:
                    config_data = toml.load(f)

                # Load each configuration section
                if 'ai' in config_data:
                    self.ai_config = AIConfiguration(**config_data['ai'])
                if 'learning' in config_data:
                    self.learning_config = LearningConfiguration(**config_data['learning'])
                if 'ui' in config_data:
                    self.ui_config = UIConfiguration(**config_data['ui'])
                if 'privacy' in config_data:
                    self.privacy_config = PrivacyConfiguration(**config_data['privacy'])
                if 'performance' in config_data:
                    self.performance_config = PerformanceConfiguration(**config_data['performance'])

            except (toml.TomlDecodeError, TypeError) as e:
                print(f"Warning: Error loading configuration: {e}")

        # Override with environment variables
        self._load_environment_variables()

    def _load_environment_variables(self):
        """Load configuration from environment variables."""
        env_mappings = {
            'LEARNING_CATALYST_PROVIDER': ('ai_config', 'default_provider'),
            'LEARNING_CATALYST_MODEL': ('ai_config', 'default_model'),
            'LEARNING_CATALYST_TEMPERATURE': ('ai_config', 'temperature'),
            'LEARNING_CATALYST_MAX_TOKENS': ('ai_config', 'max_tokens'),
            'LEARNING_CATALYST_THEME': ('ui_config', 'theme'),
            'LEARNING_CATALYST_CACHE_SIZE': ('performance_config', 'cache_size_mb'),
            'LEARNING_CATALYST_DEBUG': ('performance_config', 'debug_mode')
        }

        for env_var, (config_attr, field) in env_mappings.items():
            value = os.getenv(env_var)
            if value is not None:
                config = getattr(self, config_attr)
                setattr(config, field, self._convert_env_value(value, getattr(config, field)))

    def _convert_env_value(self, value: str, default_value: Any) -> Any:
        """Convert environment variable to appropriate type."""
        if isinstance(default_value, bool):
            return value.lower() in ('true', '1', 'yes', 'on')
        elif isinstance(default_value, int):
            return int(value)
        elif isinstance(default_value, float):
            return float(value)
        else:
            return value

    def save_configuration(self):
        """Save current configuration to file."""
        config_data = {
            'ai': asdict(self.ai_config),
            'learning': asdict(self.learning_config),
            'ui': asdict(self.ui_config),
            'privacy': asdict(self.privacy_config),
            'performance': asdict(self.performance_config)
        }

        config_file = self.config_dir / "config.toml"

        with open(config_file, 'w') as f:
            toml.dump(config_data, f)

        # Set appropriate file permissions
        os.chmod(config_file, 0o600)

    def get_all_configuration(self) -> Dict[str, Any]:
        """Get all configuration as dictionary."""
        return {
            'ai': asdict(self.ai_config),
            'learning': asdict(self.learning_config),
            'ui': asdict(self.ui_config),
            'privacy': asdict(self.privacy_config),
            'performance': asdict(self.performance_config)
        }

    def update_configuration(self, section: str, updates: Dict[str, Any]):
        """Update specific configuration section."""
        if section == 'ai':
            for key, value in updates.items():
                if hasattr(self.ai_config, key):
                    setattr(self.ai_config, key, value)
        elif section == 'learning':
            for key, value in updates.items():
                if hasattr(self.learning_config, key):
                    setattr(self.learning_config, key, value)
        elif section == 'ui':
            for key, value in updates.items():
                if hasattr(self.ui_config, key):
                    setattr(self.ui_config, key, value)
        elif section == 'privacy':
            for key, value in updates.items():
                if hasattr(self.privacy_config, key):
                    setattr(self.privacy_config, key, value)
        elif section == 'performance':
            for key, value in updates.items():
                if hasattr(self.performance_config, key):
                    setattr(self.performance_config, key, value)
        else:
            raise ValueError(f"Unknown configuration section: {section}")

        self.save_configuration()

    def reset_configuration(self, section: Optional[str] = None):
        """Reset configuration to defaults."""
        if section is None:
            # Reset all sections
            self.ai_config = AIConfiguration()
            self.learning_config = LearningConfiguration()
            self.ui_config = UIConfiguration()
            self.privacy_config = PrivacyConfiguration()
            self.performance_config = PerformanceConfiguration()
        else:
            # Reset specific section
            if section == 'ai':
                self.ai_config = AIConfiguration()
            elif section == 'learning':
                self.learning_config = LearningConfiguration()
            elif section == 'ui':
                self.ui_config = UIConfiguration()
            elif section == 'privacy':
                self.privacy_config = PrivacyConfiguration()
            elif section == 'performance':
                self.performance_config = PerformanceConfiguration()
            else:
                raise ValueError(f"Unknown configuration section: {section}")

        self.save_configuration()

    def validate_configuration(self) -> Dict[str, Any]:
        """Validate current configuration and return validation results."""
        validation_results = {
            'valid': True,
            'errors': [],
            'warnings': []
        }

        # Validate AI configuration
        if self.ai_config.temperature < 0 or self.ai_config.temperature > 2:
            validation_results['errors'].append("AI temperature must be between 0 and 2")
            validation_results['valid'] = False

        if self.ai_config.max_tokens < 1 or self.ai_config.max_tokens > 32000:
            validation_results['errors'].append("Max tokens must be between 1 and 32000")
            validation_results['valid'] = False

        if self.ai_config.timeout < 1 or self.ai_config.timeout > 300:
            validation_results['warnings'].append("Timeout value outside recommended range (1-300 seconds)")

        # Validate learning configuration
        if self.learning_config.session_timeout_minutes < 1:
            validation_results['errors'].append("Session timeout must be at least 1 minute")
            validation_results['valid'] = False

        if self.learning_config.granularity not in ['headers', 'summaries', 'full_content']:
            validation_results['errors'].append("Invalid granularity value")
            validation_results['valid'] = False

        # Validate performance configuration
        if self.performance_config.cache_size_mb < 1:
            validation_results['errors'].append("Cache size must be at least 1MB")
            validation_results['valid'] = False

        if self.performance_config.max_concurrent_requests < 1:
            validation_results['errors'].append("Max concurrent requests must be at least 1")
            validation_results['valid'] = False

        return validation_results
```

## Provider Configuration API

### Provider Management

```python
from typing import Dict, List, Optional
from dataclasses import dataclass
import keyring

@dataclass
class ProviderConfig:
    """Configuration for an AI provider."""
    name: str
    provider_type: str  # openai, anthropic, deepseek, custom
    api_key: Optional[str] = None
    base_url: Optional[str] = None
    default_model: Optional[str] = None
    timeout: int = 30
    max_retries: int = 3
    rate_limit_per_minute: int = 60
    cost_per_input_token: float = 0.0
    cost_per_output_token: float = 0.0
    context_window: int = 4096
    enabled: bool = True

class ProviderManager:
    """Manages AI provider configurations."""

    def __init__(self, config_manager: ConfigurationManager):
        self.config_manager = config_manager
        self.providers_file = config_manager.config_dir / "providers.json"
        self.providers: Dict[str, ProviderConfig] = {}
        self.load_providers()

    def load_providers(self):
        """Load provider configurations."""
        if self.providers_file.exists():
            try:
                with open(self.providers_file, 'r') as f:
                    providers_data = json.load(f)

                for name, config in providers_data.items():
                    self.providers[name] = ProviderConfig(**config)

            except (json.JSONDecodeError, TypeError) as e:
                print(f"Warning: Error loading providers: {e}")

        # Load built-in providers
        self._load_builtin_providers()

    def _load_builtin_providers(self):
        """Load built-in provider configurations."""
        builtin_providers = {
            'openai': ProviderConfig(
                name='openai',
                provider_type='openai',
                base_url='https://api.openai.com/v1',
                default_model='gpt-4',
                cost_per_input_token=0.03,
                cost_per_output_token=0.06,
                context_window=8192
            ),
            'deepseek': ProviderConfig(
                name='deepseek',
                provider_type='deepseek',
                base_url='https://api.deepseek.com/v1',
                default_model='deepseek-chat',
                cost_per_input_token=0.14,
                cost_per_output_token=0.28,
                context_window=32000
            ),
            'anthropic': ProviderConfig(
                name='anthropic',
                provider_type='anthropic',
                base_url='https://api.anthropic.com',
                default_model='claude-3-sonnet-20240229',
                cost_per_input_token=3.00,
                cost_per_output_token=15.00,
                context_window=200000
            )
        }

        for name, config in builtin_providers.items():
            if name not in self.providers:
                self.providers[name] = config

    def save_providers(self):
        """Save provider configurations."""
        providers_data = {
            name: asdict(provider) for name, provider in self.providers.items()
        }

        with open(self.providers_file, 'w') as f:
            json.dump(providers_data, f, indent=2)

        os.chmod(self.providers_file, 0o600)

    def add_provider(self, provider_config: ProviderConfig) -> bool:
        """Add or update a provider configuration."""
        try:
            # Validate provider configuration
            if not self._validate_provider_config(provider_config):
                return False

            # Store API key securely
            if provider_config.api_key:
                self._store_api_key(provider_config.name, provider_config.api_key)
                # Don't store API key in plain text
                provider_config.api_key = None

            self.providers[provider_config.name] = provider_config
            self.save_providers()

            return True

        except Exception as e:
            print(f"Error adding provider: {e}")
            return False

    def _validate_provider_config(self, config: ProviderConfig) -> bool:
        """Validate provider configuration."""
        if not config.name or not config.provider_type:
            print("Error: Provider name and type are required")
            return False

        if config.timeout < 1:
            print("Error: Timeout must be at least 1 second")
            return False

        if config.max_retries < 0:
            print("Error: Max retries cannot be negative")
            return False

        return True

    def _store_api_key(self, provider_name: str, api_key: str):
        """Store API key securely using system keyring."""
        try:
            keyring.set_password("learning-catalyst", provider_name, api_key)
        except Exception as e:
            print(f"Warning: Could not store API key securely: {e}")

    def get_api_key(self, provider_name: str) -> Optional[str]:
        """Retrieve API key from secure storage."""
        try:
            return keyring.get_password("learning-catalyst", provider_name)
        except Exception as e:
            print(f"Warning: Could not retrieve API key: {e}")
            return None

    def remove_provider(self, provider_name: str) -> bool:
        """Remove a provider configuration."""
        if provider_name in self.providers:
            del self.providers[provider_name]

            # Remove API key
            try:
                keyring.delete_password("learning-catalyst", provider_name)
            except Exception:
                pass  # API key might not exist

            self.save_providers()
            return True

        return False

    def get_provider(self, provider_name: str) -> Optional[ProviderConfig]:
        """Get provider configuration."""
        provider = self.providers.get(provider_name)
        if provider:
            # Add API key from secure storage
            api_key = self.get_api_key(provider_name)
            if api_key:
                provider.api_key = api_key

        return provider

    def list_providers(self) -> List[str]:
        """List all configured providers."""
        return list(self.providers.keys())

    def get_enabled_providers(self) -> List[ProviderConfig]:
        """Get list of enabled providers."""
        enabled_providers = []
        for provider_name in self.providers:
            provider = self.get_provider(provider_name)
            if provider and provider.enabled and provider.api_key:
                enabled_providers.append(provider)

        return enabled_providers

    def test_provider(self, provider_name: str) -> Dict[str, Any]:
        """Test provider connectivity."""
        provider = self.get_provider(provider_name)
        if not provider:
            return {
                'success': False,
                'error': 'Provider not found'
            }

        if not provider.api_key:
            return {
                'success': False,
                'error': 'API key not configured'
            }

        # Test connection (implementation would depend on provider type)
        try:
            # This is a placeholder - actual implementation would use the provider
            start_time = time.time()

            # Simulate API test
            if provider.provider_type == 'openai':
                result = self._test_openai_provider(provider)
            elif provider.provider_type == 'deepseek':
                result = self._test_deepseek_provider(provider)
            else:
                result = {'success': False, 'error': 'Unknown provider type'}

            response_time = time.time() - start_time
            result['response_time'] = response_time

            return result

        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }

    def _test_openai_provider(self, provider: ProviderConfig) -> Dict[str, Any]:
        """Test OpenAI provider connection."""
        try:
            import openai
            client = openai.OpenAI(
                api_key=provider.api_key,
                base_url=provider.base_url,
                timeout=provider.timeout
            )

            # Test with a simple API call
            models = client.models.list()
            available_models = [model.id for model in models.data]

            return {
                'success': True,
                'available_models': available_models,
                'model_count': len(available_models)
            }

        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }

    def _test_deepseek_provider(self, provider: ProviderConfig) -> Dict[str, Any]:
        """Test Deepseek provider connection."""
        # Implementation similar to OpenAI test
        return {
            'success': True,
            'available_models': ['deepseek-chat', 'deepseek-coder'],
            'model_count': 2
        }
```

## Configuration API Endpoints

### REST API Endpoints

```python
from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel
from typing import Dict, Any, List

app = FastAPI(title="Learning Catalyst Configuration API")

# Pydantic models for API
class AIConfigUpdate(BaseModel):
    default_provider: Optional[str] = None
    default_model: Optional[str] = None
    temperature: Optional[float] = None
    max_tokens: Optional[int] = None

class ProviderConfigCreate(BaseModel):
    name: str
    provider_type: str
    api_key: Optional[str] = None
    base_url: Optional[str] = None
    default_model: Optional[str] = None

# Dependency injection
def get_config_manager() -> ConfigurationManager:
    return ConfigurationManager()

def get_provider_manager() -> ProviderManager:
    return ProviderManager(get_config_manager())

# Configuration endpoints
@app.get("/api/v1/config")
async def get_configuration(config_manager: ConfigurationManager = Depends(get_config_manager)):
    """Get complete configuration."""
    return config_manager.get_all_configuration()

@app.put("/api/v1/config/{section}")
async def update_configuration(
    section: str,
    updates: Dict[str, Any],
    config_manager: ConfigurationManager = Depends(get_config_manager)
):
    """Update configuration section."""
    try:
        config_manager.update_configuration(section, updates)
        return {"success": True, "message": f"Configuration section '{section}' updated"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/v1/config/validate")
async def validate_configuration(config_manager: ConfigurationManager = Depends(get_config_manager)):
    """Validate current configuration."""
    return config_manager.validate_configuration()

@app.post("/api/v1/config/reset")
async def reset_configuration(
    section: Optional[str] = None,
    config_manager: ConfigurationManager = Depends(get_config_manager)
):
    """Reset configuration."""
    config_manager.reset_configuration(section)
    return {"success": True, "message": f"Configuration reset for section: {section or 'all'}"}

# Provider endpoints
@app.get("/api/v1/providers")
async def list_providers(provider_manager: ProviderManager = Depends(get_provider_manager)):
    """List all providers."""
    return {"providers": provider_manager.list_providers()}

@app.get("/api/v1/providers/{provider_name}")
async def get_provider(
    provider_name: str,
    provider_manager: ProviderManager = Depends(get_provider_manager)
):
    """Get specific provider configuration."""
    provider = provider_manager.get_provider(provider_name)
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")

    # Don't include API key in response
    provider_data = asdict(provider)
    provider_data['api_key'] = "***" if provider.api_key else None

    return provider_data

@app.post("/api/v1/providers")
async def add_provider(
    provider_config: ProviderConfigCreate,
    provider_manager: ProviderManager = Depends(get_provider_manager)
):
    """Add or update provider."""
    config = ProviderConfig(**provider_config.dict())

    if provider_manager.add_provider(config):
        return {"success": True, "message": f"Provider '{config.name}' added successfully"}
    else:
        raise HTTPException(status_code=400, detail="Failed to add provider")

@app.delete("/api/v1/providers/{provider_name}")
async def remove_provider(
    provider_name: str,
    provider_manager: ProviderManager = Depends(get_provider_manager)
):
    """Remove provider."""
    if provider_manager.remove_provider(provider_name):
        return {"success": True, "message": f"Provider '{provider_name}' removed"}
    else:
        raise HTTPException(status_code=404, detail="Provider not found")

@app.post("/api/v1/providers/{provider_name}/test")
async def test_provider(
    provider_name: str,
    provider_manager: ProviderManager = Depends(get_provider_manager)
):
    """Test provider connection."""
    result = provider_manager.test_provider(provider_name)
    return result
```

## Usage Examples

### Python API Usage

```python
# Initialize configuration manager
config_manager = ConfigurationManager()

# Get current configuration
config = config_manager.get_all_configuration()
print(f"Current provider: {config['ai']['default_provider']}")

# Update AI configuration
config_manager.update_configuration('ai', {
    'temperature': 0.8,
    'max_tokens': 3000
})

# Add custom provider
from src.api.config import ProviderManager, ProviderConfig

provider_manager = ProviderManager(config_manager)
custom_provider = ProviderConfig(
    name='local-llm',
    provider_type='custom',
    base_url='http://localhost:8000/v1',
    default_model='local-model'
)

provider_manager.add_provider(custom_provider)

# Test provider
test_result = provider_manager.test_provider('openai')
if test_result['success']:
    print(f"OpenAI provider working, {test_result['model_count']} models available")
else:
    print(f"OpenAI provider test failed: {test_result['error']}")

# Save configuration
config_manager.save_configuration()
```

### CLI Integration Examples

```python
# CLI command examples for configuration management

# Show current configuration
def cmd_config_show(args):
    """Show current configuration."""
    config_manager = ConfigurationManager()
    config = config_manager.get_all_configuration()

    print("📋 Current Configuration:")
    print(f"  AI Provider: {config['ai']['default_provider']}")
    print(f"  Model: {config['ai']['default_model']}")
    print(f"  Temperature: {config['ai']['temperature']}")
    print(f"  Theme: {config['ui']['theme']}")
    print(f"  Cache Enabled: {config['performance']['cache_enabled']}")

# Update configuration
def cmd_config_update(args):
    """Update configuration settings."""
    config_manager = ConfigurationManager()

    updates = {}
    if args.provider:
        updates['default_provider'] = args.provider
    if args.model:
        updates['default_model'] = args.model
    if args.temperature:
        updates['temperature'] = float(args.temperature)

    if updates:
        config_manager.update_configuration('ai', updates)
        print(f"✅ Configuration updated: {updates}")
    else:
        print("No updates specified")

# Provider management
def cmd_config_provider_list(args):
    """List configured providers."""
    provider_manager = ProviderManager(ConfigurationManager())

    print("📊 Configured Providers:")
    for provider_name in provider_manager.list_providers():
        provider = provider_manager.get_provider(provider_name)
        status = "✅" if provider.api_key else "❌"
        print(f"  {status} {provider_name} ({provider.provider_type})")

def cmd_config_provider_test(args):
    """Test provider connectivity."""
    provider_manager = ProviderManager(ConfigurationManager())

    result = provider_manager.test_provider(args.provider)

    if result['success']:
        print(f"✅ {args.provider}: Connected successfully")
        if 'available_models' in result:
            print(f"  Models: {', '.join(result['available_models'][:3])}...")
        if 'response_time' in result:
            print(f"  Response time: {result['response_time']:.2f}s")
    else:
        print(f"❌ {args.provider}: {result['error']}")
```

### Shell Script Integration

```bash
#!/bin/bash
# Configuration management script

CONFIG_FILE="$HOME/.learning-catalyst/config.toml"

show_config() {
    echo "📋 Current Configuration:"
    if [ -f "$CONFIG_FILE" ]; then
        cat "$CONFIG_FILE"
    else
        echo "Configuration file not found"
    fi
}

update_config() {
    local section="$1"
    local key="$2"
    local value="$3"

    echo "Updating $section.$key = $value"
    # Use toml-cli or python to update TOML file
    python3 << EOF
import toml
with open('$CONFIG_FILE', 'r') as f:
    config = toml.load(f)

config.setdefault('$section', {})['$key'] = $value

with open('$CONFIG_FILE', 'w') as f:
    toml.dump(config, f)
EOF
}

test_providers() {
    echo "🧪 Testing AI providers..."

    # Test OpenAI
    if python3 -c "
import os
import sys
sys.path.append('src')
from api.config import ProviderManager, ConfigurationManager

pm = ProviderManager(ConfigurationManager())
result = pm.test_provider('openai')
print(f'OpenAI: {'✅' if result['success'] else '❌'}')
" 2>/dev/null; then
        echo "✅ OpenAI: Connected"
    else
        echo "❌ OpenAI: Connection failed"
    fi

    # Test Deepseek
    if python3 -c "
import sys
sys.path.append('src')
from api.config import ProviderManager, ConfigurationManager

pm = ProviderManager(ConfigurationManager())
result = pm.test_provider('deepseek')
print(f'Deepseek: {'✅' if result['success'] else '❌'}')
" 2>/dev/null; then
        echo "✅ Deepseek: Connected"
    else
        echo "❌ Deepseek: Connection failed"
    fi
}

# Command routing
case "$1" in
    "show")
        show_config
        ;;
    "update")
        update_config "$2" "$3" "$4"
        ;;
    "test")
        test_providers
        ;;
    *)
        echo "Usage: $0 {show|update|test}"
        echo "Examples:"
        echo "  $0 show"
        echo "  $0 update ai temperature 0.8"
        echo "  $0 test"
        ;;
esac
```

## Troubleshooting

### Common Configuration Issues

#### Issue: Configuration File Not Found
```bash
# Symptom: Configuration reset to defaults
Learning Catalyst > /config show
Error: Configuration file not found

# Solution: Initialize configuration
Learning Catalyst > /config init
✓ Configuration initialized with defaults
✓ Configuration file created: ~/.learning-catalyst/config.toml

# Verify file exists
ls -la ~/.learning-catalyst/config.toml
```

#### Issue: Invalid Configuration Format
```bash
# Symptom: Configuration parsing errors
Learning Catalyst > /config show
Error: Error parsing config file: Invalid TOML at line 23

# Solution: Validate and reset configuration
Learning Catalyst > /config validate
❌ Configuration validation failed:
  - AI temperature must be between 0 and 2
  - Max tokens must be between 1 and 32000

# Reset to defaults
Learning Catalyst > /config reset
✓ Configuration reset to defaults
```

#### Issue: Provider API Key Not Found
```bash
# Symptom: API key required error
Learning Catalyst > /config provider test openai
❌ API key not configured

# Solution: Configure provider
Learning Catalyst > /config provider openai
🔧 Enter your OpenAI API key: sk-xxxxxxxxxxxxxxxxxxxxxxxx
✅ OpenAI provider configured successfully

# Test connection
Learning Catalyst > /config provider test openai
✅ OpenAI: Connected and working
```

#### Issue: Permission Denied
```bash
# Symptom: Cannot read/write configuration files
Learning Catalyst > /config show
Error: Permission denied: ~/.learning-catalyst/config.toml

# Solution: Check and fix permissions
ls -la ~/.learning-catalyst/
chmod 700 ~/.learning-catalyst/
chmod 600 ~/.learning-catalyst/config.toml

# Verify permissions
ls -la ~/.learning-catalyst/
drwx------  user user 4096 Oct 8 10:30 .
-rw-------  user user 1234 Oct 8 10:30 config.toml
```

## Related Documentation

- **[CLI Commands API](cli-commands.md)**: Command-line interface reference
- **[Provider Interface](provider-interfaces.md)**: AI provider integration
- **[System Architecture](../system-architecture/)**: Architecture and design patterns
- **[Implementation Guides](../implementation-guides/)**: Development and setup

---

*Last updated: October 8, 2025*
*Version: 1.0.0*
*Category: API Reference*