# Integration Tests

This directory contains comprehensive integration tests for the Learning Catalyst CLI application, testing how different components work together in real-world scenarios.

## Integration Test Architecture

The integration test suite follows the same Test-Driven Development (TDD) methodology as the unit tests, focusing on end-to-end workflows and component interactions based on real usage patterns from the documentation examples.

## Test Categories

### 1. Provider Integration Tests (`test_provider_integration.py`)
**Focus**: AI provider setup, switching, and management workflows
- **Coverage**: OpenAI, DeepSeek, Anthropic provider integration
- **Scenarios**: Multi-provider switching, health monitoring, error recovery, load balancing
- **Examples Based on**: `docs/examples/integration.md`

**Key Test Scenarios**:
- Provider initialization and configuration
- Multi-provider switching and failover
- Health monitoring and automatic recovery
- Model management and compatibility checking
- Rate limiting and quota management
- Cost tracking across providers
- Concurrent request handling
- Performance monitoring and optimization

### 2. CLI Command Integration Tests (`test_cli_integration.py`)
**Focus**: Complete CLI command workflows and user interactions
- **Coverage**: All major CLI command categories and their interactions
- **Scenarios**: Configuration workflows, learning sessions, checkpoint management
- **Examples Based on**: `docs/examples/basic-workflows.md` and `docs/examples/advanced.md`

**Key Test Scenarios**:
- Complete provider configuration workflow
- Knowledge map navigation and exploration
- Checkpoint save and restore cycles
- Analytics and token usage tracking
- Context management and optimization
- Learning session flows
- Help system and command discovery
- Error handling and recovery
- Multi-command workflows
- Configuration persistence

### 3. Session Management Integration Tests (`test_session_integration.py`)
**Focus**: Session lifecycle, persistence, and state management
- **Coverage**: Session creation, progression, collaboration, and analytics
- **Scenarios**: Complete learning journeys with session management
- **Examples Based on**: `docs/examples/advanced.md`

**Key Test Scenarios**:
- Complete session lifecycle management
- Session persistence and recovery
- Checkpoint creation and restoration
- Multi-session management
- Session collaboration features
- Session analytics and progress tracking
- Context management within sessions
- Personalization and adaptation
- Error recovery and integrity
- Component integration with sessions

### 4. Configuration Integration Tests (`test_configuration_integration.py`)
**Focus**: Configuration management across system components
- **Coverage**: Real-time updates, validation, persistence, and security
- **Scenarios**: Configuration workflows with multiple components
- **Examples Based on**: `docs/examples/integration.md`

**Key Test Scenarios**:
- Configuration persistence and recovery
- Real-time configuration updates
- Provider configuration workflows
- Configuration validation and error handling
- Backup and restore mechanisms
- Environment-specific configurations
- User preference management
- Configuration migration between versions
- Template-based configuration
- Security and sensitive data handling

### 5. Learning Workflow Integration Tests (`test_learning_workflow_integration.py`)
**Focus**: Complete learning journeys and educational workflows
- **Coverage**: Adaptive learning, personalization, and knowledge progression
- **Scenarios**: End-to-end learning experiences
- **Examples Based on**: `docs/examples/basic-workflows.md` and `docs/examples/advanced.md`

**Key Test Scenarios**:
- Complete learning journey workflows
- Adaptive learning with performance tracking
- Knowledge progression and dependency management
- Personalized learning path creation
- Collaborative learning scenarios
- Mastery assessment and certification
- Learning analytics and insights
- Multi-modal learning approaches
- Integration with AI and assessment engines

### 6. AI Integration Tests (`test_ai_integration.py`)
**Focus**: AI service integration and interaction patterns
- **Coverage**: Conversations, tool execution, context management
- **Scenarios**: Real-world AI interaction patterns
- **Examples Based on**: Various usage patterns across documentation

**Key Test Scenarios**:
- AI conversation flows with context management
- Tool calling and execution workflows
- Context awareness and memory management
- AI personalization based on user patterns
- Multi-provider coordination
- Error handling and recovery mechanisms
- Performance optimization and caching
- Safety and content moderation
- Multilingual support
- Streaming response capabilities

### 7. Performance Integration Tests (`test_performance_integration.py`)
**Focus**: System performance under realistic loads
- **Coverage**: Scalability, resource utilization, and response times
- **Scenarios**: Performance testing under various load conditions

**Key Test Scenarios**:
- Concurrent user load performance
- Memory usage patterns and optimization
- Database performance under load
- AI response time optimization
- File I/O performance testing
- Cache performance and efficiency
- Network I/O and HTTP performance
- Resource cleanup and garbage collection
- Scalability limits and breaking points

### 8. Error Recovery Integration Tests (`test_error_recovery_integration.py`)
**Focus**: System resilience and error handling
- **Coverage**: Failure scenarios, recovery mechanisms, and stability
- **Scenarios**: Various failure and recovery patterns

**Key Test Scenarios**:
- AI service failure and recovery
- Database connection recovery
- File system error handling
- Memory exhaustion recovery
- Network error handling and recovery
- Configuration corruption recovery
- Session crash detection and recovery
- Cascading failure prevention
- Data corruption detection and recovery
- System-wide resilience testing

## Running Integration Tests

### Prerequisites
- All dependencies installed (`poetry install`)
- Test environment configured
- Mock services and data available

### Basic Test Execution

```bash
# Run all integration tests
pytest tests/integration/ -v

# Run specific integration test category
pytest tests/integration/test_provider_integration.py -v
pytest tests/integration/test_cli_integration.py -v
pytest tests/integration/test_session_integration.py -v

# Run with markers
pytest tests/integration/ -m integration -v
pytest tests/integration/ -m "integration and provider" -v
pytest tests/integration/ -m "integration and performance" -v

# Run with coverage
pytest tests/integration/ --cov=src --cov-report=html
```

### Performance Testing

```bash
# Run performance-focused integration tests
pytest tests/integration/test_performance_integration.py -v -s

# Run with performance profiling
pytest tests/integration/test_performance_integration.py --profile
```

### Error Recovery Testing

```bash
# Run error recovery scenarios
pytest tests/integration/test_error_recovery_integration.py -v -s

# Run with detailed error logging
pytest tests/integration/test_error_recovery_integration.py --log-level=DEBUG
```

## Test Data and Fixtures

### Shared Integration Fixtures
Integration tests use specialized fixtures for complex scenarios:

- `integration_test_context`: Provides complete test environment
- `multi_provider_setup`: Sets up multiple AI providers
- `learning_journey_data`: Sample learning progression data
- `performance_load_data`: Load testing data and scenarios

### Mock Services
Integration tests use sophisticated mocking to simulate real-world scenarios:

- **AI Service Mocks**: Simulate provider responses, failures, and performance
- **Database Mocks**: Simulate various database states and failure scenarios
- **Network Mocks**: Simulate network conditions, timeouts, and partitions
- **File System Mocks**: Simulate file operations, permissions, and corruption

## Test Environment Configuration

### Integration Test Configuration
Integration tests require specific configuration:

```ini
# pytest.ini additions for integration tests
markers =
    integration: Integration tests
    provider: Provider integration tests
    performance: Performance integration tests
    error_recovery: Error recovery integration tests
```

### Environment Variables
```bash
# Required for integration tests
INTEGRATION_TEST_MODE=true
MOCK_AI_SERVICES=true
TEST_DATABASE_URL=sqlite:///test_integration.db
LOG_LEVEL=DEBUG
```

## Integration Test Best Practices

### 1. Real-World Scenarios
- Test actual user workflows from documentation examples
- Include realistic data volumes and interaction patterns
- Simulate real network conditions and latencies

### 2. Component Interaction
- Test how multiple components work together
- Verify data flow and transformation across boundaries
- Ensure proper error propagation and handling

### 3. Performance Considerations
- Include performance assertions in integration tests
- Test under realistic load conditions
- Monitor resource usage during tests

### 4. Error Scenarios
- Test failure modes and recovery mechanisms
- Verify graceful degradation under stress
- Test system resilience and stability

### 5. Data Integrity
- Verify data consistency across component interactions
- Test data transformation and validation
- Ensure proper cleanup and resource management

## Continuous Integration

### CI/CD Integration
Integration tests are designed for CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Run Integration Tests
  run: |
    poetry run pytest tests/integration/ -v --cov=src
    poetry run pytest tests/integration/test_performance_integration.py -m "not slow"
```

### Test Reporting
- Integration tests generate detailed reports
- Performance metrics are collected and analyzed
- Error scenarios are logged and tracked

## Troubleshooting

### Common Issues

1. **Flaky Tests**: Integration tests may be sensitive to timing and resource availability
2. **Mock Limitations**: Complex integration scenarios may require sophisticated mocking
3. **Resource Cleanup**: Ensure proper cleanup of resources between tests
4. **Test Isolation**: Maintain proper test isolation to avoid cross-contamination

### Debugging Tips

```bash
# Run with verbose output and debugging
pytest tests/integration/ -v -s --tb=short

# Run specific test with debugging
pytest tests/integration/test_provider_integration.py::TestProviderIntegration::test_multi_provider_switching -v -s

# Run with logging
pytest tests/integration/ --log-cli-level=DEBUG
```

## Contributing to Integration Tests

### Adding New Integration Tests

1. **Identify Real-World Scenarios**: Base tests on actual usage patterns
2. **Use Appropriate Fixtures**: Leverage existing integration fixtures
3. **Include Performance Assertions**: Add reasonable performance expectations
4. **Test Error Paths**: Include failure scenarios and recovery mechanisms
5. **Document Complex Scenarios**: Provide clear documentation for complex workflows

### Integration Test Standards

- Follow TDD methodology: Red-Green-Refactor
- Include comprehensive documentation
- Use realistic test data and scenarios
- Ensure proper cleanup and resource management
- Add appropriate markers and categorization

## Integration Test Coverage Goals

- **Workflow Coverage**: 90%+ of documented user workflows
- **Component Integration**: 95%+ of component interaction points
- **Error Scenarios**: 100% of critical error recovery paths
- **Performance Baselines**: All critical operations within defined limits