import React from 'react';
import { ErrorBoundary } from '@/renderer/components/UI/ErrorBoundary';
import { AppErrorHandler } from './AppErrorHandler';

/**
 * Main application entry point.
 *
 * This is the root component that wraps the entire application in an error boundary.
 * All error handling flows through this component, ensuring that any unhandled
 * errors in the application are caught and displayed appropriately.
 *
 * The component delegates all logic to AppErrorHandler, which manages:
 * - Initialization state management
 * - Error routing (setup, crash, ready)
 * - Configuration validation
 * - Main application rendering
 *
 * @returns JSX element with error boundary and app handler
 *
 * @example
 * ```tsx
 * // Entry point in main.tsx
 * import App from '@/renderer/components/App/App';
 *
 * ReactDOM.createRoot(document.getElementById('root')!).render(
 *   <React.StrictMode>
 *     <BrowserRouter>
 *       <App />
 *     </BrowserRouter>
 *   </React.StrictMode>
 * );
 * ```
 */
export default function App(): JSX.Element {
  return (
    <ErrorBoundary variant="full">
      <AppErrorHandler />
    </ErrorBoundary>
  );
}
