
/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/prefer-nullish-coalescing, @typescript-eslint/no-unsafe-return, @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unused-vars, @typescript-eslint/explicit-function-return-type */
import React, { Suspense, lazy } from 'react';

interface SyntaxHighlighterWrapperProps {
  style?: any;
  language?: string;
  PreTag?: React.ElementType;
  className?: string;
  children?: React.ReactNode;
  [key: string]: any;
}

// Lazy load SyntaxHighlighter to reduce initial bundle size
const SyntaxHighlighter = lazy(() =>
  import('react-syntax-highlighter').then(module => ({
    default: (module as any).Prism || (module as any).default
  }))
);

const SyntaxHighlighterStyles = lazy(() =>
  import('react-syntax-highlighter/dist/esm/styles/prism').then(module => ({
    default: (module as any).oneDark || (module as any).default
  }))
);

/**
 * Loading fallback component for SyntaxHighlighter
 */
const SyntaxHighlighterFallback: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
    <code className="text-sm font-mono">
      {String(children).replace(/\n$/, '')}
    </code>
  </div>
);

/**
 * TypeScript-safe wrapper for react-syntax-highlighter with lazy loading
 * This component provides proper TypeScript typing and reduces initial bundle size
 */
export const SyntaxHighlighterWrapper: React.FC<SyntaxHighlighterWrapperProps> = ({
  style,
  language = 'text',
  PreTag = 'pre',
  className = '',
  children,
  ...props
}) => {
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [syntaxHighlighterModule, setSyntaxHighlighterModule] = React.useState<any>(null);
  const [stylesModule, setStylesModule] = React.useState<any>(null);

  // Preload components when first mounted
  React.useEffect(() => {
    const loadComponents = async () => {
      try {
        const [highlighterModule, stylesResult] = await Promise.all([
          import('react-syntax-highlighter'),
          import('react-syntax-highlighter/dist/esm/styles/prism')
        ]);

        setSyntaxHighlighterModule(highlighterModule.Prism);
        setStylesModule(stylesResult.oneDark);
        setIsLoaded(true);
      } catch (error) {
        console.error('Failed to load SyntaxHighlighter:', error);
      }
    };

    if (!isLoaded) {
      loadComponents();
    }
  }, [isLoaded]);

  // If not loaded yet, show fallback
  if (!isLoaded || !syntaxHighlighterModule || !stylesModule) {
    return <SyntaxHighlighterFallback>{children}</SyntaxHighlighterFallback>;
  }

  return React.createElement(
    syntaxHighlighterModule,
    {
      style: style || stylesModule,
      language,
      PreTag,
      className,
      ...props,
    },
    String(children).replace(/\n$/, '')
  );
};