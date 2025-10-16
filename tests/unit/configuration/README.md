# Configuration System Test Suite

This directory contains comprehensive tests for the Learning Catalyst configuration system, specifically testing the ConfigManager class and related functionality.

## Test Coverage Overview

The test suite is designed to prevent the configuration structure bug that was fixed and ensure comprehensive coverage of all configuration functionality.

### 🔧 **Configuration Structure Validation Tests**
- **File**: `test_config_structure_validation.py`
- **Purpose**: Detects the main bug where provider configurations were at the wrong level
- **Key Tests**:
  - ✅ Valid configurations load correctly
  - ❌ Misplaced provider configurations are detected with clear error messages
  - ✅ Custom providers are fully supported
  - ❌ Missing providers section is detected
  - ✅ Provider configurations are properly nested under `ai.providers`

### 📦 **Provider Management Tests**
- **File**: `test_provider_management.py`
- **Purpose**: Tests all provider management utility methods
- **Key Tests**:
  - `get_configured_providers()`: Lists all configured provider names
  - `has_provider_config()`: Checks if a specific provider has configuration
  - `add_provider_config()`: Adds new provider configuration
  - `remove_provider_config()`: Removes provider configuration
  - `get_provider_config()`: Retrieves provider configuration
  - Configuration persistence across manager instances

### 🚀 **Custom Provider Support Tests**
- **File**: `test_custom_provider_support.py`
- **Purpose**: Verifies unrestricted provider name support
- **Key Tests**:
  - Users can add any provider name without hardcoded restrictions
  - Custom provider configurations with arbitrary parameters are preserved
  - Both API key and base_url configurations work for custom providers
  - Unicode and special characters in provider names
  - Complex data types in provider configurations

### ⚠️ **Edge Case Tests**
- **File**: `test_edge_cases.py`
- **Purpose**: Tests unusual scenarios and boundary conditions
- **Key Tests**:
  - Empty providers section
  - Provider configurations missing API keys
  - Invalid configuration types (non-dict values)
  - Boundary values for numeric parameters
  - Malformed JSON files
  - File permission errors
  - Concurrent file access
  - Very large configuration files
  - Unicode and special characters
  - Deeply nested configurations

### 🛡️ **Error Handling and Rollback Tests**
- **File**: `test_error_handling_and_rollback.py`
- **Purpose**: Tests error recovery and rollback mechanisms
- **Key Tests**:
  - Configuration rollback on validation errors
  - Multiple changes rollback on first error
  - Provider addition rollback on validation error
  - Section update rollback on validation error
  - Misplaced provider detection rollback
  - File save error rollback
  - Partial file corruption handling
  - Concurrent modification detection

### 🔗 **Integration Tests**
- **File**: `../integration/test_config_file_system_integration.py`
- **Purpose**: Tests real file system operations and integration scenarios
- **Key Tests**:
  - Complete configuration lifecycle (create, read, update, delete)
  - Concurrent file access safety
  - Configuration file format preservation
  - File permissions handling
  - Configuration directory creation
  - Backup and recovery scenarios
  - Large configuration file handling
  - Configuration file corruption recovery
  - External modification handling
  - Atomic operations
  - Unicode handling in files
  - Multiple directory support
  - Environment variable integration

### 🔧 **Fixed ConfigManager Tests**
- **File**: `test_config_manager_fixed.py`
- **Purpose**: Tests the actual ConfigManager implementation with correct imports
- **Key Tests**:
  - All ConfigManager methods with correct signatures
  - Dot notation access (`get()`, `set()`)
  - Section operations (`get_section()`, `update_section()`)
  - Provider operations
  - Environment variable overrides
  - Validation on updates
  - File persistence

## Running the Tests

### Quick Start
```bash
# Run all configuration tests
python tests/run_config_tests.py

# Run with coverage report
python tests/run_config_tests.py --coverage

# Run with verbose output
python tests/run_config_tests.py --verbose

# Run only unit tests
python tests/run_config_tests.py --unit-only

# Run only integration tests
python tests/run_config_tests.py --integration-only

# Run specific test file
python tests/run_config_tests.py --specific test_config_structure_validation.py
```

### Using pytest directly
```bash
# Run all config tests
pytest tests/unit/configuration/ tests/integration/test_config_file_system_integration.py

# Run with coverage
pytest --cov=src.core.config --cov-report=term-missing tests/unit/configuration/

# Run specific test file
pytest tests/unit/configuration/test_config_structure_validation.py -v

# Run tests matching a pattern
pytest tests/unit/configuration/ -k "test_misplaced_provider" -v

# Run tests with markers
pytest tests/unit/configuration/ -m unit
pytest tests/integration/ -m integration
```

## Test Quality Standards

### 📊 **Coverage Requirements**
- **Target**: 95%+ code coverage of ConfigManager
- **All validation paths** tested
- **All error conditions** tested
- **All public methods** tested
- **Edge cases** covered

### 🔬 **Test Quality**
- Each test is **independent and isolated**
- **Descriptive test names** that explain what is being tested
- **Proper setup and teardown** using fixtures
- **Both positive and negative scenarios** tested
- **Clear failure messages** in assertions

### 🔄 **Self-Healing Tests**
- Tests handle **different file system paths**
- Tests work with **different temp directory locations**
- Tests **clean up after themselves**
- **No hard-coded dependencies** on external services

### 🚀 **CI/CD Integration**
- Tests are **fast and reliable**
- Tests **don't depend on external services**
- Tests work in **headless environments**
- Tests are **deterministic** and repeatable

## Bug Prevention Focus

This test suite specifically prevents the **configuration structure bug** that was fixed:

### 🐛 **The Original Bug**
Provider configurations like `chatglm` and `openai` were directly under the `ai` section instead of being nested under `ai.providers`, causing the AI system to not find the provider configurations.

**❌ Invalid Structure:**
```json
{
  "ai": {
    "default_provider": "openai",
    "temperature": 0.7,
    "openai": {           // ❌ WRONG: Misplaced
      "api_key": "sk-key"
    },
    "chatglm": {          // ❌ WRONG: Misplaced
      "api_key": "sk-key"
    }
  }
}
```

**✅ Correct Structure:**
```json
{
  "ai": {
    "default_provider": "openai",
    "temperature": 0.7,
    "providers": {        // ✅ CORRECT: Proper nesting
      "openai": {
        "api_key": "sk-key"
      },
      "chatglm": {
        "api_key": "sk-key"
      }
    }
  }
}
```

### 🛡️ **Test Prevention**
- **Structure validation tests** detect misplaced providers with clear error messages
- **Provider management tests** ensure providers are only added to correct location
- **Error handling tests** verify rollback on validation failures
- **Integration tests** validate file operations preserve correct structure

## Test Architecture

### 📁 **File Organization**
```
tests/unit/configuration/
├── README.md                                    # This file
├── test_config_structure_validation.py         # Structure validation tests
├── test_provider_management.py                 # Provider management tests
├── test_custom_provider_support.py             # Custom provider tests
├── test_edge_cases.py                          # Edge case tests
├── test_error_handling_and_rollback.py         # Error handling tests
└── test_config_manager_fixed.py               # Fixed implementation tests

tests/integration/
└── test_config_file_system_integration.py     # File system integration tests
```

### 🏗️ **Test Fixtures**
- `temp_config_dir`: Temporary directory for config files
- `valid_config`: Valid configuration for testing
- `sample_config_data`: Sample configuration with providers
- `initial_config_file`: Pre-populated config file

### 🏷️ **Test Markers**
- `@pytest.mark.unit`: Unit tests
- `@pytest.mark.integration`: Integration tests
- `@pytest.mark.slow`: Slow-running tests
- `@pytest.mark.cli`: CLI-related tests

## Contributing

When adding new tests:

1. **Follow the existing patterns** and naming conventions
2. **Use descriptive test names** that explain what is being tested
3. **Include both positive and negative test cases**
4. **Test edge cases and error conditions**
5. **Ensure tests are isolated and clean up after themselves**
6. **Add appropriate test markers**
7. **Update this README** if adding new test categories

## Troubleshooting

### Common Issues

**Test fails with "module not found"**:
```bash
# Ensure you're in the project root
cd /mnt/d/Projects/learning_catalyst
python -m pytest tests/unit/configuration/
```

**Tests fail with permission errors**:
```bash
# Check file permissions
ls -la ~/.catalyst/
# Remove and recreate test directory
rm -rf ~/.catalyst/
```

**Tests are slow**:
```bash
# Run specific test files
python tests/run_config_tests.py --unit-only
python tests/run_config_tests.py --specific test_config_structure_validation.py
```

### Debugging Failed Tests

**Run with verbose output**:
```bash
pytest tests/unit/configuration/test_config_structure_validation.py -v -s
```

**Run with Python debugger**:
```bash
pytest tests/unit/configuration/test_config_structure_validation.py --pdb
```

**Run specific test method**:
```bash
pytest tests/unit/configuration/test_config_structure_validation.py::TestConfigurationStructureValidation::test_misplaced_provider_configuration_detected -v
```

## Continuous Integration

These tests are designed to run in CI/CD environments:

- **No external dependencies** required
- **Deterministic results** - same outcome every run
- **Fast execution** - most tests complete in seconds
- **Clear error reporting** for debugging
- **Coverage reporting** for quality metrics

### CI Configuration Example

```yaml
# GitHub Actions example
- name: Run Config Tests
  run: |
    python tests/run_config_tests.py --coverage --unit-only

- name: Run Integration Tests
  run: |
    python tests/run_config_tests.py --integration-only
```