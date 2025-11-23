// @ts-nocheck
/**
 * Component Architecture Standardization - Phase 2 Architecture Refactoring
 *
 * Provides standardized patterns for React components:
 * - Base component patterns
 * - Provider composition wrappers
 * - Consistent error handling and loading states
 * - Standardized prop interfaces and component composition
 */

import React, { ComponentType, ReactNode, createContext, useContext } from 'react';
import { createStructuredSelectorHook, TypedUseSelectorHook, useSelector } from 'zustand/vanilla';
import type { StoreApi } from 'zustand';

/**
 * Standard component props base interface
 */
export interface BaseComponentProps {
  className?: string;
  testId?: string;
  children?: ReactNode;
}

/**
 * Loading state interface
 */
export interface LoadingState {
  isLoading: boolean;
  loadingMessage?: string;
  progress?: number;
}

/**
 * Error state interface
 */
export interface ErrorState {
  hasError: boolean;
  error?: Error | string;
  errorCode?: string;
  retryAction?: () => void;
}

/**
 * Base component state interface
 */
export interface BaseComponentState {
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  retryCount: number;
  maxRetries: number;
}

/**
 * Component configuration options
 */
export interface ComponentOptions {
  enableErrorBoundary?: boolean;
  enableLoading?: boolean;
  enableRetry?: boolean;
  maxRetries?: number;
  loadingDelay?: number;
  errorRetryDelay?: number;
}

/**
 * Provider composition wrapper for clean provider hierarchy
 */
export interface ProviderConfig {
  providers: Array<{
    Provider: ComponentType<{ children: ReactNode }>;
    props?: Record<string, any>;
  }>;
}

/**
 * Create a provider composition wrapper
 */
export function createProviderComposition(providers: ProviderConfig['providers']) {
  return function ProviderComposition({ children }: { children: ReactNode }) {
    return providers.reduce((acc, { Provider, props }) => {
      return React.createElement(Provider, props, acc);
    }, children);
  };
}

/**
 * Higher-order component for error handling
 */
export function withErrorHandling<P extends BaseComponentProps>(
  Component: ComponentType<P>,
  options: ComponentOptions = {},
) {
  const {
    enableErrorBoundary = true,
    enableRetry = true,
    maxRetries = 3,
    errorRetryDelay = 1000,
  } = options;

  return function ErrorHandledComponent(props: P & ErrorState) {
    const [retryCount, setRetryCount] = React.useState(0);
    const [isRetrying, setIsRetrying] = React.useState(false);

    const handleRetry = React.useCallback(async () => {
      if (retryCount >= maxRetries) {
        return;
      }

      setIsRetrying(true);
      setRetryCount((prev) => prev + 1);

      // Delay before retry
      await new Promise((resolve) => setTimeout(resolve, errorRetryDelay));

      // Call retry action if provided
      if (props.retryAction) {
        await props.retryAction();
      }

      setIsRetrying(false);
    }, [retryCount, maxRetries, errorRetryDelay, props.retryAction]);

    const errorProps = {
      hasError: props.hasError,
      error: props.error,
      errorCode: props.errorCode,
      onRetry: enableRetry ? handleRetry : undefined,
      isRetrying,
      retryCount,
      maxRetries,
    };

    return <Component {...props} errorState={errorProps} />;
  };
}

/**
 * Higher-order component for loading states
 */
export function withLoadingHandling<P extends BaseComponentProps>(
  Component: ComponentType<P>,
  options: ComponentOptions = {},
) {
  const { enableLoading = true, loadingDelay = 300 } = options;

  return function LoadingHandledComponent(props: P & LoadingState) {
    const [isDelayedLoading, setIsDelayedLoading] = React.useState(false);

    React.useEffect(() => {
      let timeoutId: NodeJS.Timeout;

      if (props.isLoading) {
        timeoutId = setTimeout(() => {
          setIsDelayedLoading(true);
        }, loadingDelay);
      } else {
        setIsDelayedLoading(false);
      }

      return () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      };
    }, [props.isLoading, loadingDelay]);

    const loadingProps = {
      isLoading: enableLoading ? isDelayedLoading : props.isLoading,
      loadingMessage: props.loadingMessage,
      progress: props.progress,
    };

    return <Component {...props} loadingState={loadingProps} />;
  };
}

/**
 * Standardized component error boundary
 */
export class ComponentErrorBoundary extends React.Component<
  {
    children: ReactNode;
    fallback?: ComponentType<any>;
    onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  },
  { hasError: boolean; error?: Error }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Component Error Boundary caught an error:', error, errorInfo);

    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      return (
        <FallbackComponent
          error={this.state.error}
          onReset={() => this.setState({ hasError: false, error: undefined })}
        />
      );
    }

    return this.props.children;
  }
}

/**
 * Default error fallback component
 */
export function DefaultErrorFallback({ error, onReset }: { error?: Error; onReset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <div className="text-red-500 text-6xl mb-4">⚠️</div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Something went wrong</h3>
      {error && <p className="text-sm text-gray-600 mb-4 max-w-md">{error.message}</p>}
      <button
        onClick={onReset}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
      >
        Try Again
      </button>
    </div>
  );
}

/**
 * Standard loading component
 */
export function DefaultLoading({
  message = 'Loading...',
  progress,
}: {
  message?: string;
  progress?: number;
}) {
  return (
    <div className="flex flex-col items-center justify-center p-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4"></div>
      <p className="text-gray-600 mb-2">{message}</p>
      {progress !== undefined && (
        <div className="w-48 bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Component composition utilities
 */
export class ComponentComposition {
  /**
   * Compose multiple components vertically
   */
  static stack(components: Array<ComponentType<any>>, gap: string = '4') {
    return function StackedComponents(props: any) {
      return (
        <div className={`flex flex-col gap-${gap}`}>
          {components.map((Component, index) => (
            <Component key={index} {...props} />
          ))}
        </div>
      );
    };
  }

  /**
   * Compose multiple components horizontally
   */
  static inline(components: Array<ComponentType<any>>, gap: string = '4') {
    return function InlineComponents(props: any) {
      return (
        <div className={`flex items-center gap-${gap}`}>
          {components.map((Component, index) => (
            <Component key={index} {...props} />
          ))}
        </div>
      );
    };
  }

  /**
   * Create a responsive layout component
   */
  static responsive(
    mobile: ComponentType<any>,
    tablet?: ComponentType<any>,
    desktop?: ComponentType<any>,
  ) {
    return function ResponsiveComponent(props: any) {
      const [isMobile, setIsMobile] = React.useState(false);
      const [isTablet, setIsTablet] = React.useState(false);

      React.useEffect(() => {
        const checkScreenSize = () => {
          const width = window.innerWidth;
          setIsMobile(width < 768);
          setIsTablet(width >= 768 && width < 1024);
        };

        checkScreenSize();
        window.addEventListener('resize', checkScreenSize);

        return () => window.removeEventListener('resize', checkScreenSize);
      }, []);

      if (desktop && !isMobile && !isTablet) {
        return <desktop {...props} />;
      }

      if (tablet && isTablet) {
        return <tablet {...props} />;
      }

      return <mobile {...props} />;
    };
  }
}

/**
 * Component state management utilities
 */
export class ComponentStateManager<T> {
  private state: T;
  private readonly listeners = new Set<(state: T) => void>();

  constructor(initialState: T) {
    this.state = initialState;
  }

  getState(): T {
    return this.state;
  }

  setState(newState: T | ((prev: T) => T)) {
    const prevState = this.state;
    this.state =
      typeof newState === 'function' ? (newState as (prev: T) => T)(prevState) : newState;

    this.listeners.forEach((listener) => {
      try {
        listener(this.state);
      } catch (error) {
        console.error('Error in state listener:', error);
      }
    });
  }

  subscribe(listener: (state: T) => void) {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }

  reset(initialState: T) {
    this.state = initialState;
    this.listeners.forEach((listener) => listener(this.state));
  }

  dispose() {
    this.listeners.clear();
  }
}

/**
 * Component performance monitoring
 */
export class ComponentPerformanceMonitor {
  private static readonly componentTimings = new Map<string, number[]>();

  static startTiming(componentName: string): () => void {
    const start = performance.now();

    return () => {
      const duration = performance.now() - start;

      if (!this.componentTimings.has(componentName)) {
        this.componentTimings.set(componentName, []);
      }

      this.componentTimings.get(componentName)!.push(duration);
    };
  }

  static getAverageTiming(componentName: string): number {
    const timings = this.componentTimings.get(componentName) || [];
    return timings.length > 0 ? timings.reduce((a, b) => a + b, 0) / timings.length : 0;
  }

  static getPerformanceReport(): Record<string, { average: number; count: number; total: number }> {
    const report: Record<string, { average: number; count: number; total: number }> = {};

    for (const [componentName, timings] of this.componentTimings.entries()) {
      const total = timings.reduce((a, b) => a + b, 0);
      report[componentName] = {
        average: total / timings.length,
        count: timings.length,
        total,
      };
    }

    return report;
  }
}

/**
 * Hook for component error handling
 */
export function useComponentErrorHandling() {
  const [error, setError] = React.useState<Error | null>(null);
  const [isRetrying, setIsRetrying] = React.useState(false);

  const handleError = React.useCallback((error: Error | string, retryAction?: () => void) => {
    const errorObj = typeof error === 'string' ? new Error(error) : error;
    setError(errorObj);

    // Auto-clear error after 5 seconds
    setTimeout(() => setError(null), 5000);

    return {
      retry: retryAction
        ? async () => {
            setIsRetrying(true);
            try {
              await retryAction();
              setError(null);
            } catch (retryError) {
              setError(retryError as Error);
            } finally {
              setIsRetrying(false);
            }
          }
        : undefined,
    };
  }, []);

  const clearError = React.useCallback(() => {
    setError(null);
  }, []);

  return {
    error,
    isRetrying,
    handleError,
    clearError,
  };
}

/**
 * Default export
 */
export default {
  createProviderComposition,
  withErrorHandling,
  withLoadingHandling,
  ComponentErrorBoundary,
  ComponentComposition,
  ComponentStateManager,
  ComponentPerformanceMonitor,
  useComponentErrorHandling,
  DefaultErrorFallback,
  DefaultLoading,
};
