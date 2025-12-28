# Design: Eliminate Test Isolation Issues Through DI

## Architectural Principles

### 1. Dependency Injection Over Monkey Patching

**Core Principle**: Dependencies should be **injected as parameters**, not imported or mocked.

#### Why DI?
- **Testability**: Code with injected dependencies is inherently testable
- **Clarity**: Dependencies are explicit in function/component signatures
- **Flexibility**: Different implementations can be injected in different contexts
- **Maintainability**: No need to update tests when internal code changes
- **Performance**: No module re-initialization or mocking overhead

#### Anti-Pattern: Module-Scope Mocking
```typescript
// ❌ BAD - Global state contamination
vi.mock('@/renderer/services/services-provider', () => ({
  useConfigurationService: vi.fn(),
}));

describe('tests', () => {
  test('test 1', () => { /* uses mock */ });
  test('test 2', () => { /* uses mock - might be polluted by test 1! */ });
});
```

**Problems**:
- Shared state between tests
- Order-dependent failures
- Hard to debug (mock state not visible in test)
- Requires maintaining mock alongside real code

#### Pattern: Parameter Injection
```typescript
// ✅ GOOD - Explicit dependencies
interface ChatServiceOptions {
  idGenerator?: () => string;
  timeService?: TimeService;
}

export const createChatService = (
  apiClient: ElectronAPI,
  options: ChatServiceOptions = {}
) => {
  const generateId = options.idGenerator ?? (() => `msg_${Date.now()}`);

  return {
    sendMessage: async (...) => {
      return {
        id: data.messageId ?? generateId(), // Injected, controllable
      };
    },
  };
};

// ✅ Test - Direct injection, no mocking
test('generates predictable ID', () => {
  const service = createChatService(mockAPI, {
    idGenerator: () => 'm1',
  });

  const result = await service.sendMessage('hi', { sessionId: 's1' });
  expect(result.id).toBe('m1'); // Deterministic!
});
```

**Benefits**:
- No shared state
- Order-independent
- Clear dependencies
- No mocking needed

### 2. Test Isolation Requirements

#### Mandatory Test Setup
Every test file MUST include:
```typescript
describe('test suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();        // Reset all mocks
    vi.resetModules();         // Clear module cache
    vi.useFakeTimers();        // Control time
    vi.setSystemTime(new Date('2020-01-01')); // Deterministic time
  });

  afterEach(() => {
    vi.useRealTimers();        // Restore real timers
  });

  // tests...
});
```

#### Why This Setup?
- **`vi.clearAllMocks()`**: Ensures no mock state leaks between tests
- **`vi.resetModules()`**: Clears module cache, prevents shared module state
- **`vi.useFakeTimers()` + `setSystemTime()`**: Makes time-dependent code deterministic
- **`vi.useRealTimers()`**: Cleanup to avoid affecting other test files

### 3. Time Control Strategy

#### Problem: Non-Deterministic Time
```typescript
// ❌ BAD - Changes every millisecond
const id = `msg_${Date.now()}`;
const timestamp = Date.now();
```

#### Solution: Injectable Time Service
```typescript
// ✅ GOOD - Controllable time
interface TimeService {
  now: () => number;
  format: (date: Date) => string;
}

const createTimeService = (): TimeService => ({
  now: () => Date.now(),
  format: (date) => date.toISOString(),
});

// Production: Use real time
const timeService = createTimeService();

// Test: Use controlled time
const timeService = {
  now: () => 0,
  format: () => '2020-01-01T00:00:00Z',
};
```

#### Benefits
- Tests can control time
- No race conditions
- Deterministic IDs
- Reproducible failures

### 4. ID Generation Strategy

#### Problem: Timestamp-Based IDs
```typescript
// ❌ BAD - Non-deterministic
const messageId = `msg_${Date.now()}`; // Different every time!
```

#### Solution: Injectable ID Generator
```typescript
// ✅ GOOD - Controllable ID generation
interface IDGenerator {
  generate: () => string;
}

const createIDGenerator = (): IDGenerator => ({
  generate: () => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    return `msg_${timestamp}_${random}`;
  },
});

// Production: Use generator
const idGenerator = createIDGenerator();
const messageId = idGenerator.generate(); // Unique but based on real time

// Test: Use fixed ID
const idGenerator = {
  generate: () => 'm1',
};
const messageId = idGenerator.generate(); // Always 'm1'!
```

#### Benefits
- Tests can use fixed IDs
- No mock needed
- Clear dependency
- Flexible generation strategies

### 5. Component Dependency Injection

#### Problem: Direct Service Imports
```typescript
// ❌ BAD - Can't inject different implementations
import { useConfigurationService } from '@/renderer/services/services-provider';

export const ProviderStatus = () => {
  const config = useConfigurationService(); // Hard-coded dependency
  return <div>{config.status}</div>;
};
```

#### Solution: Props-Based DI
```typescript
// ✅ GOOD - Injectable dependency
interface ProviderStatusProps {
  configurationService: () => ConfigurationService;
}

export const ProviderStatus = ({ configurationService }: ProviderStatusProps) => {
  const config = configurationService(); // Injected dependency
  return <div>{config.status}</div>;
};

// Production: Provide real service
render(
  <ProviderStatus configurationService={useConfigurationService} />
);

// Test: Inject mock service
render(
  <ProviderStatus
    configurationService={() => ({ status: 'ready' })}
  />
);
```

#### Alternative: React Context DI
```typescript
// ✅ Also good - Context-based DI
const ServicesContext = createContext<ServicesContextValue | null>(null);

export const ServicesProvider = ({ children, services }: PropsWithChildren<{ services: ServicesContextValue }>) => {
  return (
    <ServicesContext.Provider value={services}>
      {children}
    </ServicesContext.Provider>
  );
};

export const useConfigurationService = () => {
  const context = useContext(ServicesContext);
  if (!context) throw new Error('Must use within ServicesProvider');
  return context.configurationService;
};

// Test: Provide services via context
render(
  <ServicesProvider services={{ configurationService: () => mockConfig }}>
    <ProviderStatus />
  </ServicesProvider>
);
```

**When to Use Props vs Context**:
- **Props**: Simple, parent controls dependency
- **Context**: Deep component tree, multiple components need same dependency

### 6. Service Factory Pattern

#### Current State (Partially Good)
```typescript
// ✅ GOOD - Already using factory pattern
export const createChatService = (apiClient: ElectronAPI): ChatService => {
  // Implementation
};
```

#### Enhanced Pattern (This Proposal)
```typescript
// ✅ BETTER - Factory with optional dependencies
interface ChatServiceOptions {
  idGenerator?: () => string;
  timeService?: TimeService;
  logger?: Logger;
}

export const createChatService = (
  apiClient: ElectronAPI,
  options: ChatServiceOptions = {}
): ChatService => {
  const idGenerator = options.idGenerator ?? (() => `msg_${Date.now()}`);
  const timeService = options.timeService ?? createTimeService();
  const logger = options.logger ?? createLogger();

  return {
    sendMessage: async (...) => {
      logger.info('Sending message');
      const id = idGenerator();
      // Use injected dependencies
    },
  };
};

// Production: Minimal options
const service = createChatService(apiClient);

// Test: Full options
const service = createChatService(mockAPI, {
  idGenerator: () => 'm1',
  timeService: { now: () => 0 },
  logger: { info: vi.fn() },
});
```

#### Benefits
- Backward compatible (options parameter is optional)
- Clear dependencies
- Easy to test
- Flexible for production and test use

### 7. Testing Patterns

#### Pattern: Direct Mock Injection
```typescript
// ✅ GOOD - No vi.mock() needed
test('sends message', async () => {
  const mockAPI = {
    catalyst: {
      sendChat: vi.fn().mockResolvedValue({ success: true }),
    },
  };

  const service = createChatService(mockAPI);
  const result = await service.sendMessage('hi', { sessionId: 's1' });

  expect(mockAPI.catalyst.sendChat).toHaveBeenCalledWith({
    message: 'hi',
    sessionId: 's1',
  });
});
```

#### Pattern: Service Composition
```typescript
// ✅ GOOD - Compose services with injected deps
test('chat service with analytics', () => {
  const analytics = { track: vi.fn() };
  const chat = createChatService(mockAPI, {
    logger: analytics,
  });

  chat.sendMessage('hi', { sessionId: 's1' });

  expect(analytics.track).toHaveBeenCalledWith('message_sent');
});
```

#### Pattern: Component with Injected Services
```typescript
// ✅ GOOD - Component accepts services
test('ProviderStatus displays config', () => {
  const mockConfig = { status: 'ready' };

  render(<ProviderStatus configurationService={() => mockConfig} />);

  expect(screen.getByText('ready')).toBeInTheDocument();
});
```

### 8. Migration Strategy

#### Phase 1: Test Infrastructure (No Production Code Changes)
1. Add `beforeEach/afterEach` to test files
2. Use fake timers for time control
3. Move module-scope mocks inside tests
4. Result: Tests become deterministic

**Why Start Here**:
- No production code changes
- Immediate improvement in test reliability
- Establishes baseline
- Safe to rollback

#### Phase 2: Service Refactoring (Minimal Production Changes)
1. Add optional dependencies to service factories
2. Update tests to use DI pattern
3. Result: Services testable without mocking

**Why This Order**:
- Services are the foundation
- Changes are minimal (optional parameters)
- Components depend on services
- Clear dependency chain

#### Phase 3: Component Refactoring (More Extensive Changes)
1. Accept services via props/context
2. Remove direct imports
3. Result: Components testable without mocking

**Why Last**:
- Components depend on services
- More extensive changes
- Build on service foundation
- Highest impact on testability

### 9. Validation Strategy

#### Determinism Testing
```bash
#!/bin/bash
# run-tests-3x.sh
echo "=== Run 1 ===" && npm run test:complete > results-1.txt
echo "=== Run 2 ===" && npm run test:complete > results-2.txt
echo "=== Run 3 ===" && npm run test:complete > results-3.txt

# Compare results
diff results-1.txt results-2.txt
diff results-2.txt results-3.txt

# Should show NO differences
```

#### Success Criteria
- All 3 runs identical
- Same test count passing/failing
- Same failure messages
- No flaky tests

#### Coverage Validation
```bash
npm run test:coverage

# Overall: >85%
# Main process: >90%
# Renderer: >85%
# Critical modules: >90%
```

### 10. Trade-offs and Decisions

#### Decision: Props vs Context for Components
**Chosen**: Props first, Context when needed

**Rationale**:
- Props are simpler and more explicit
- Context adds complexity (provider wrapping)
- Can always refactor to Context later
- Start simple, add complexity only when needed

#### Decision: Optional vs Required Dependencies
**Chosen**: Optional parameters with defaults

**Rationale**:
- Backward compatible
- No breaking changes to existing code
- Tests can inject what they need
- Production can use defaults

#### Decision: Factory Pattern vs Classes
**Chosen**: Factory pattern (existing)

**Rationale**:
- Already in use in codebase
- Aligns with functional programming style
- Easy to inject dependencies
- No class overhead

#### Decision: Time Control Strategy
**Chosen**: Injectable TimeService

**Rationale**:
- Most flexible
- Works with existing code
- Can mock just the time, not Date
- Clear dependency

#### Decision: ID Generation Strategy
**Chosen**: Injectable IDGenerator

**Rationale**:
- Tests need fixed IDs
- Production needs unique IDs
- Can inject different strategies
- Clear dependency

### 11. Success Metrics

#### Quantitative
- Test pass rate: 100% (was 88.6% renderer)
- Failed test files: 0 (was 25)
- Failed tests: 0 (was 99 main + 2)
- Test coverage: >85% overall (was ~39%)
- Determinism: 3/3 runs identical (was 0/3)

#### Qualitative
- No "No export defined" errors
- No mock configuration errors
- No async timeout errors
- Clear dependency injection patterns
- Maintainable test code

### 12. Anti-Patterns to Avoid

#### ❌ Module-Scope Mocks
```typescript
// DON'T
vi.mock('@/some/module');
describe('tests', () => {
  // All tests share this mock
});
```

#### ❌ Time-Dependent Tests
```typescript
// DON'T
test('generates ID', () => {
  const id = generateId();
  expect(id).toBe('msg_1577836800000'); // Breaks on different date!
});
```

#### ❌ Shared Mock State
```typescript
// DON'T
const mockAPI = { sendMessage: vi.fn() };

test('test 1', () => {
  mockAPI.sendMessage.mockResolvedValue('response1');
});

test('test 2', () => {
  mockAPI.sendMessage.mockResolvedValue('response2');
  // Might see 'response1' if test 1 ran first!
});
```

#### ❌ Direct Imports in Testable Code
```typescript
// DON'T
import { useConfigurationService } from '@/renderer/services/services-provider';
```

#### ✅ Correct Patterns (Use These)
```typescript
// DO - Inject dependencies
interface Props {
  configurationService: () => ConfigurationService;
}

// DO - Use fake timers
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2020-01-01'));
});

// DO - Clear state
beforeEach(() => {
  vi.clearAllMocks();
});

// DO - Factory with options
createService(apiClient, {
  idGenerator: () => 'fixed-id',
});
```

## Summary

This design establishes **dependency injection as the primary pattern** for making code testable, replacing monkey-patching with explicit, injectable dependencies. The phased approach starts with test infrastructure (safe, no production changes) and progresses to production code refactoring (services, then components), ensuring each phase builds on the previous and provides immediate value.
