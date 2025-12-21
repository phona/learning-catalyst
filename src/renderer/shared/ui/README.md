# 🎨 Learning Catalyst UI Component Library

## 📋 Overview

A comprehensive, type-safe UI component library built for the Learning Catalyst desktop application.
Provides consistent user experiences, proper error handling, and excellent loading states.

## 🏗️ Architecture

### Core Principles

- **Consistency**: Single source of truth for UI components
- **Accessibility**: WCAG compliant with keyboard navigation
- **Performance**: Optimized rendering with proper memoization
- **Type Safety**: Full TypeScript coverage with strict interfaces
- **User Experience**: Context-aware error handling and loading states

### Component Categories

#### 🎯 Core Primitives

- **Button**: Versatile button with variants, sizes, and loading states
- **Input**: Form inputs with validation, icons, and helper text
- **Card**: Flexible content containers with multiple variants
- **Accordion**: Expandable content sections
- **Container**: Responsive layout utilities

#### 🚨 Error Handling System

- **ErrorBoundary**: Configurable error boundary with 3 display variants
- **ChatErrorBoundary**: Chat-specific error recovery
- **ComponentErrorBoundary**: Generic component error handling
- **SettingsErrorBoundary**: Settings configuration error handling

#### ⏳ Loading State System

- **LoadingScreen**: Full-screen application loading
- **Skeleton**: Content-aware loading placeholders
- **MessageSkeleton**: Chat message loading state
- **ChatListSkeleton**: Chat list loading state
- **SettingsSkeleton**: Settings panel loading state

## 📚 Usage Examples

### Basic Components

```typescript
import { Button, Input, Card, Container } from '@/renderer/shared/ui';

// Form with validation
export const LoginForm = () => {
  return (
    <Container maxWidth="md" className="p-6">
      <Card variant="outlined" padding="lg">
        <CardHeader>
          <CardTitle>Login</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            label="Email"
            type="email"
            placeholder="Enter your email"
            leftIcon={<EnvelopeIcon />}
            error={emailError}
          />
          <Button
            variant="primary"
            size="md"
            loading={isLoading}
            onClick={handleSubmit}
          >
            Login
          </Button>
        </CardContent>
      </Card>
    </Container>
  );
};
```

### Error Boundaries

```typescript
import {
  ErrorBoundary,
  ChatErrorBoundary,
  SettingsErrorBoundary
} from '@/renderer/shared/ui';

// Application-level error handling
export const App = () => {
  return (
    <ErrorBoundary variant="full">
      <Router>
        <Routes>
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </Router>
    </ErrorBoundary>
  );
};

// Feature-specific error handling
export const ChatPage = () => {
  return (
    <ChatErrorBoundary onRetry={handleChatRetry}>
      <ChatInterface />
    </ChatErrorBoundary>
  );
};

// Settings error handling with configuration recovery
export const SettingsPage = () => {
  return (
    <SettingsErrorBoundary onSaveError={handleConfigError}>
      <SettingsPanel />
    </SettingsErrorBoundary>
  );
};
```

### Loading States

```typescript
import {
  LoadingScreen,
  Skeleton,
  MessageSkeleton,
  ChatListSkeleton
} from '@/renderer/shared/ui';

// Application loading
export const AppLoader = () => {
  return (
    <LoadingScreen
      state="services"
      message="Initializing AI services..."
    />
  );
};

// Chat loading states
export const ChatLoader = () => {
  return (
    <div className="space-y-4">
      <MessageSkeleton isUser={false} />
      <MessageSkeleton isUser={true} />
      <MessageSkeleton isUser={false} />
    </div>
  );
};

// Sidebar loading
export const ChatListLoader = () => {
  return <ChatListSkeleton count={5} />;
};

// Generic skeleton loading
export const ProfileLoader = () => {
  return (
    <div className="flex items-center space-x-4">
      <Skeleton variant="circular" width={64} height={64} />
      <div className="space-y-2">
        <Skeleton width={120} height={16} />
        <Skeleton width={80} height={14} />
      </div>
    </div>
  );
};
```

## 🎛️ Configuration Options

### Button Component

```typescript
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}
```

### Error Boundary Component

```typescript
interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  variant?: 'full' | 'inline' | 'minimal';
  title?: string;
  description?: string;
  showRetry?: boolean;
  onRetry?: () => void;
  customActions?: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}
```

### Skeleton Component

```typescript
interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave' | 'none';
}
```

## 🎯 Best Practices

### Component Usage

1. **Consistency**: Always import from `@/renderer/shared/ui`
2. **Type Safety**: Use TypeScript interfaces for all props
3. **Accessibility**: Include proper ARIA labels and keyboard navigation
4. **Performance**: Use React.memo for expensive components
5. **Error Handling**: Wrap components in appropriate error boundaries

### Error Boundaries

1. **Application Level**: Use `variant="full"` for app-wide errors
2. **Feature Level**: Use `variant="inline"` for feature sections
3. **Component Level**: Use `variant="minimal"` for individual components
4. **Context**: Use specialized boundaries (Chat, Settings) when appropriate

### Loading States

1. **Skeletons**: Prefer skeleton loading over spinners for content
2. **Dimensions**: Match skeleton dimensions to actual content
3. **Context**: Use specialized skeletons (Message, ChatList) when available
4. **Animations**: Use appropriate animation types (pulse vs wave)

### Performance

1. **Memoization**: Use React.memo for components with expensive renders
2. **Code Splitting**: Lazy load components when appropriate
3. **Bundle Size**: Import only the components you need
4. **State Management**: Keep component state local when possible

## 🔧 Development Guidelines

### Adding New Components

1. Create component file in `src/renderer/shared/ui/`
2. Follow the existing documentation pattern
3. Include TypeScript interfaces
4. Add comprehensive JSDoc comments
5. Update the barrel export in `index.ts`
6. Add tests in `__tests__/` directory

### Component Structure

```typescript
/**
 * Component description with purpose and usage
 */
interface ComponentProps {
  prop: Type;
}

export const Component: React.FC<ComponentProps> = ({ prop }) => {
  return <div>{prop}</div>;
};
```

### Testing

1. Unit tests for component behavior
2. Integration tests for user interactions
3. Accessibility tests for keyboard navigation
4. Error boundary tests for error scenarios

## 🚨 Migration Guide

### From Duplicate Components

1. Replace `shared/forms/Button` with `UI/Button`
2. Replace `shared/forms/Input` with `UI/Input`
3. Replace `shared/layout/Card` with `UI/Card`
4. Replace `shared/feedback/LoadingScreen` with `UI/LoadingScreen`

### Error Boundary Updates

1. Replace basic `ErrorBoundary` with configurable `ErrorBoundary`
2. Add appropriate `variant` prop based on usage context
3. Implement `onRetry` handlers where appropriate
4. Use specialized boundaries for specific contexts

### Loading State Improvements

1. Replace spinners with skeleton components
2. Use context-specific skeletons when available
3. Match skeleton dimensions to actual content
4. Consider animation type for context

## 🐛 Troubleshooting

### Common Issues

**Problem**: TypeScript errors for missing props **Solution**: Check the component interfaces and
ensure all required props are provided

**Problem**: Error boundaries not catching errors **Solution**: Ensure error boundaries wrap
components properly and aren't in development mode

**Problem**: Skeleton components not matching content **Solution**: Adjust width and height props to
match actual content dimensions

**Problem**: Performance issues with re-renders **Solution**: Add React.memo and useCallback hooks
where appropriate

### Getting Help

1. Check component documentation and examples
2. Review TypeScript interfaces for proper prop usage
3. Test components in isolation to identify issues
4. Check browser console for additional error details

## 📈 Performance Metrics

- **Bundle Size**: Optimized component imports
- **Render Performance**: Memoized expensive components
- **Accessibility**: WCAG AA compliance
- **Type Coverage**: 100% TypeScript coverage
- **Test Coverage**: Comprehensive test suite

---

Built with ❤️ for the Learning Catalyst desktop application
