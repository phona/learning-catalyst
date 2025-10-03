# Learning Catalyst Test Organization

This directory contains the test suite for the Learning Catalyst application, organized according to the project's core modules and testing levels.

## Directory Structure

```
tests/
├── unit/                 # Unit tests for individual components
│   ├── ai/              # Tests for AI-related components
│   ├── core/            # Tests for core modules (Knowledge Navigator, Challenge Engine, etc.)
│   ├── data/            # Tests for data models and database operations
│   ├── cli/             # Tests for command-line interface
│   └── utils/           # Tests for utility functions and classes
├── integration/          # Integration tests for multiple components working together
│   ├── ai/              # Tests for AI provider integrations
│   ├── core/            # Tests for core module integrations
│   └── data/            # Tests for data layer integrations
└── e2e/                # End-to-end tests for complete user workflows
    ├── ai/
    ├── core/
    └── data/
```

## Test Categories

### Unit Tests
- Test individual functions, methods, and classes in isolation
- Mock external dependencies
- Fast execution
- High code coverage

### Integration Tests
- Test how multiple units work together
- May include external dependencies (databases, API calls, etc.)
- Ensure compatibility between modules

### End-to-End Tests
- Test complete user workflows
- Simulate real user interactions
- Test the system as a whole

## Core Module Tests

### AI Module
- `abstraction.py` and `service.py`
- Provider implementations in `providers/`
- AI model interactions and responses

### Core Module
- Knowledge Navigator
- Challenge Engine
- Catalyst Agent
- Checkpoint Manager
- Analytics Dashboard
- Assessment Engine

### Data Module
- Database operations
- Data models
- Vector storage operations

### CLI Module
- Command-line interface functionality
- User interactions

### Utilities
- Workspace management
- Preferences management
- Helper functions