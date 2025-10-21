# Testing Guide for Learning Catalyst

This directory contains the comprehensive test suite for the Learning Catalyst React application.

## Test Structure

```
src/test/
├── components/          # Component unit tests
│   ├── UI/              # UI component tests
│   │   ├── LoadingScreen.test.tsx
│   │   └── ErrorBoundary.test.tsx
│   ├── Layout.test.tsx
│   └── Chat/            # Chat component tests
│       ├── MessageBubble.test.tsx
│       └── ChatInput.test.tsx
├── stores/              # Zustand store tests
│   ├── useAppStore.test.ts
│   └── useChatStore.test.ts
├── services/            # Service layer tests
│   ├── ai/
│   │   └── factory.test.ts
│   └── configService.test.ts
├── integration/         # Integration tests
│   ├── App.integration.test.tsx
│   └── ChatFlow.integration.test.tsx
├── test-utils.tsx       # Testing utilities and helpers
├── setup.ts            # Test setup and global mocks
└── README.md           # This file
```

## Testing Technologies Used

- **Vitest**: Test runner (configured in `vitest.config.ts`)
- **React Testing Library**: Component testing utilities
- **Jest**: Matching utilities and mocking framework
- **jsdom**: DOM environment for testing
- **Testing Library User Event**: Advanced user interaction simulation

## Running Tests

### Basic Commands

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with UI interface
npm run test:ui

# Run tests once (CI mode)
npm run test:run

# Run tests with coverage
npm run test:coverage
```

### Running Specific Tests

```bash
# Run component tests
npm run test components/

# Run store tests
npm run test stores/

# Run service tests
npm run test services/

# Run integration tests
npm run test integration/

# Run specific test file
npm run test src/test/components/UI/LoadingScreen.test.tsx

# Run tests matching a pattern
npm run test -- --grep "LoadingScreen"
```

## Test Categories

### 1. Unit Tests
- **Components**: Individual component testing in isolation
- **Stores**: Zustand store state management testing
- **Services**: Business logic and API service testing

### 2. Integration Tests
- **App Integration**: Full application flow testing
- **Chat Flow**: End-to-end chat functionality testing

## Testing Patterns

### Component Testing
```typescript
// Example component test structure
describe('ComponentName', () => {
  // Setup mocks and test data
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
  });

  // Render tests
  it('renders correctly', () => {
    render(<ComponentName />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });

  // Interaction tests
  it('handles user interactions', () => {
    const mockHandler = jest.fn();
    render(<ComponentName onClick={mockHandler} />);

    fireEvent.click(screen.getByRole('button'));
    expect(mockHandler).toHaveBeenCalled();
  });

  // State tests
  it('updates state correctly', () => {
    render(<ComponentName />);

    // Test state changes
  });
});
```

### Store Testing
```typescript
// Example store test structure
describe('useStore', () => {
  beforeEach(() => {
    // Reset store state
    useStore.getState().reset();
  });

  it('has correct initial state', () => {
    const { result } = renderHook(() => useStore());
    expect(result.current.value).toBe(expectedValue);
  });

  it('updates state correctly', () => {
    const { result } = renderHook(() => useStore());

    act(() => {
      result.current.action('payload');
    });

    expect(result.current.value).toBe(updatedValue);
  });
});
```

### Service Testing
```typescript
// Example service test structure
describe('ServiceName', () => {
  beforeEach(() => {
    // Setup service mocks
  });

  it('performs expected operations', async () => {
    const result = await service.method();
    expect(result).toEqual(expectedResult);
  });

  it('handles errors gracefully', async () => {
    // Mock error conditions
    await expect(service.method()).rejects.toThrow('Expected error');
  });
});
```

## Mocking Strategies

### Component Mocks
```typescript
// Mock child components
jest.mock('@/components/ChildComponent', () => ({
  ChildComponent: ({ prop }) => <div data-testid="child">{prop}</div>,
}));

// Mock external libraries
jest.mock('react-markdown', () => {
  return function MockReactMarkdown({ children }) {
    return <div data-testid="markdown">{children}</div>;
  };
});
```

### API Mocks
```typescript
// Mock Electron API
Object.defineProperty(window, 'electronAPI', {
  value: {
    getConfig: jest.fn().mockResolvedValue(mockConfig),
    setConfig: jest.fn().mockResolvedValue(undefined),
  },
  writable: true,
});

// Mock fetch/network requests
global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve(mockData),
});
```

### Store Mocks
```typescript
// Mock Zustand stores
jest.mock('@/stores/useStore');
const mockUseStore = useStore as jest.MockedFunction<typeof useStore>;

mockUseStore.mockReturnValue({
  value: 'mock-value',
  action: jest.fn(),
});
```

## Test Data

### Creating Mock Data
```typescript
// Use utility functions for consistent test data
import { createMockSession, createMockMessage } from '@/test/test-utils';

const mockSession = createMockSession({
  title: 'Custom Title',
  provider: 'custom-provider',
});

const mockMessage = createMockMessage({
  role: 'assistant',
  content: 'Custom response',
});
```

## Accessibility Testing

### Basic Accessibility Checks
```typescript
it('has proper accessibility attributes', () => {
  render(<Component />);

  // Check for ARIA labels
  expect(screen.getByLabelText('Button description')).toBeInTheDocument();

  // Check for semantic HTML
  expect(screen.getByRole('main')).toBeInTheDocument();

  // Check for keyboard navigation
  expect(screen.getByRole('button')).toHaveFocus();
});
```

## Best Practices

### 1. Test Behavior, Not Implementation
- ✅ Test what users see and interact with
- ❌ Test internal component state or implementation details

### 2. Use Meaningful Assertions
- ✅ Use `getByRole`, `getByLabelText`, `getByPlaceholderText`
- ❌ Avoid `getByTestId` when possible

### 3. Mock External Dependencies
- Mock API calls, browser APIs, and external libraries
- Keep mocks close to the real implementation

### 4. Keep Tests Isolated
- Each test should be independent
- Use `beforeEach` to clean up state
- Avoid sharing test data between tests

### 5. Use Descriptive Test Names
- Test names should describe the behavior being tested
- Use "should" or appropriate language

### 6. Test Edge Cases
- Error states
- Loading states
- Empty states
- Boundary conditions

## Coverage

The test suite aims for high coverage across:
- ✅ Component rendering and interactions
- ✅ State management (stores)
- ✅ Service layer functionality
- ✅ Integration flows
- ✅ Error handling
- ✅ Accessibility

Run coverage reports with:
```bash
npm run test:coverage
```

## Debugging Tests

### Common Issues
1. **Mock not working**: Check mock setup and import order
2. **Async test timing**: Use `waitFor` for async operations
3. **Act warnings**: Wrap state updates in `act()`
4. **Missing mocks**: Ensure all external dependencies are mocked

### Debugging Tools
```typescript
// Debug component rendering
screen.debug(); // Prints current DOM

// Debug with log statements
console.log(screen.getByRole('button'));

// Use testing playground
screen.logTestingPlaygroundURL();
```

## Continuous Integration

The test suite is designed to run in CI/CD environments:
- Tests run in headless mode
- No user interaction required
- Fast execution with proper mocking
- Clear output for debugging

## Contributing

When adding new tests:
1. Follow existing patterns and conventions
2. Add tests for new features and bug fixes
3. Maintain high test coverage
4. Update this documentation as needed
5. Run tests locally before submitting

## Resources

- [React Testing Library Documentation](https://testing-library.com/docs/react-testing-library/intro)
- [Vitest Documentation](https://vitest.dev/)
- [Jest Mock Functions](https://jestjs.io/docs/mock-functions)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)