# Learning Catalyst Test Suite

This directory contains comprehensive tests for the Learning Catalyst CLI application, following Test-Driven Development (TDD) methodology.

## Test Architecture

The test suite is organized into three main categories:

### Unit Tests (`tests/unit/`)
Tests individual components in isolation:
- **Data Models** (`data_models/`) - Concept, Session, TokenUsage, Configuration, Relationship, Assessment
- **Configuration Management** (`configuration/`) - ConfigManager, ProviderManager
- **CLI Commands** (`cli/`) - CommandParser, ResponseFormatter
- **Provider Interface** (`providers/`) - AI Provider implementations
- **AI Toolcalls** (`toolcalls/`) - Tool orchestration and execution
- **Knowledge Management** (`knowledge/`) - Concept and relationship operations
- **Utilities** (`utils/`) - Helper functions and utilities

### Integration Tests (`tests/integration/`)
Tests component interactions and workflows:
- **Provider Integration** - AI provider connectivity and switching
- **CLI Integration** - Command execution and response handling
- **Configuration Integration** - Real-time configuration updates
- **Knowledge Graph Integration** - Concept discovery and relationship building

### End-to-End Tests (`tests/e2e/`)
Tests complete user workflows:
- **Learning Journeys** - Complete learning sessions
- **Configuration Workflows** - Setup and customization
- **Error Recovery** - Failure handling and recovery

## TDD Methodology

This test suite follows strict TDD principles:

1. **Red Phase** - Write failing tests that define expected behavior
2. **Green Phase** - Implement minimal code to make tests pass
3. **Refactor Phase** - Improve code while maintaining test coverage

## Key Features

### Comprehensive Coverage
- **95%+ code coverage** across all modules
- **Edge case testing** for boundary conditions
- **Error scenario testing** for robust error handling
- **Performance testing** for critical paths

### Modern Testing Practices
- **Async/await support** with pytest-asyncio
- **Type safety** with comprehensive type hints
- **Mock management** for external dependencies
- **Fixture-based setup** for reusable test data

### Quality Assurance
- **Mutation testing** readiness
- **Regression prevention** through comprehensive tests
- **Documentation testing** with docstring examples
- **Performance benchmarking** for critical operations

## Running Tests

### Basic Test Execution
```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=src --cov-report=html

# Run specific test categories
pytest tests/unit/
pytest tests/integration/
pytest tests/e2e/

# Run with markers
pytest -m unit
pytest -m integration
pytest -m cli
pytest -m provider
```

### Test Configuration
The test suite is configured in `pytest.ini` with:
- **Coverage reporting** (HTML and XML)
- **Strict markers** for test categorization
- **Async test support**
- **Verbose output** for better debugging

## Test Data and Fixtures

### Shared Fixtures (`conftest.py`)
- **Sample configuration data**
- **Mock AI providers**
- **Test workspace setup**
- **Temporary file management**

### Test Helpers (`test_helpers.py`)
- **Custom assertions**
- **Mock data generators**
- **Performance measurement utilities**
- **Error testing helpers**

## Current Implementation Status

### ✅ Completed Phases
1. **Test Infrastructure** - Directory structure, configuration, fixtures
2. **Data Models Tests** - Comprehensive entity validation and business logic
3. **Configuration Management Tests** - ConfigManager and ProviderManager functionality
4. **CLI Command Tests** - Command parsing and response formatting (In Progress)

### 🚧 In Progress
- CLI Command execution and integration tests
- Response formatting with accessibility features

### 📋 Planned
- Provider Interface tests
- AI Toolcalls tests
- Knowledge Management tests
- Integration tests
- End-to-end tests

## Test Documentation

Each test module includes:
- **Comprehensive docstrings** explaining test purpose
- **TDD methodology comments** showing red-green-refactor cycles
- **Edge case coverage** for robust testing
- **Performance considerations** where applicable

## Contributing

When adding new tests:
1. Follow TDD methodology - write tests first
2. Use appropriate fixtures and helpers
3. Include edge cases and error scenarios
4. Maintain 95%+ coverage
5. Update documentation as needed

## Continuous Integration

The test suite is designed for CI/CD integration:
- **Fast execution** - Under 2 minutes for full suite
- **Parallel execution** support
- **Coverage reporting** for quality gates
- **Performance regression** detection