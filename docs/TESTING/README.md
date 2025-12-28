# Testing Documentation

This directory contains documentation related to testing strategies, test status reports, and testing improvements for the Learning Catalyst application.

## 📁 Files

- **status.md** - Current test status and coverage reports (updated Dec 9, 2025)
- **improvements.md** - Documentation of testing improvements and best practices
- **complete-workflow-tests.md** - Comprehensive workflow testing documentation

## 🎯 Quick Navigation

### For Contributors
- Review [status.md](status.md) to understand current test health
- See [improvements.md](improvements.md) for testing best practices
- Follow the workflow test patterns in [complete-workflow-tests.md](complete-workflow-tests.md)

### Test Execution
```bash
# Run all tests
npm test

# Run main process tests
npm run test:main

# Run renderer tests
npm run test:renderer

# Run integration tests
npm run test:integration

# Run performance tests
npm run test:performance

# Run complete test suite
npm run test:complete

# Get coverage reports
npm run test:coverage
```

## Test Strategy

See [DEVELOPER-GUIDE/testing.md](../DEVELOPER-GUIDE/testing.md) for comprehensive testing guidelines.

## Current Status

- **Main Process**: >90% coverage target
- **Renderer**: >90% coverage target
- **Integration**: >80% coverage target
- **Overall**: >85% coverage target

For detailed current status, see [status.md](status.md).
