/**
 * Barrel export for App components.
 *
 * This file provides a clean import interface for all App-related components.
 * Instead of importing from individual files, consumers can import from this
 * central location.
 * 
 * ```
 * App.tsx (Entry)
 *     ↓
 * ErrorBoundary (Catch-all)
 *     ↓
 * AppContent (Single Gate)
 *             ├─ loading → LoadingScreen
 *             ├─ setup → SetupScreen
 *             └─ ready → ReadyApp
 *                     ↓
 *                 ReadyApp (Runtime)
 *                     ↓
 *                 AppRoutes (Navigation)
 * ```
 *
 * @example
 * ```typescript
 * // Before
 * import App from '@/renderer/components/App/App';
 * import { AppRoutes } from '@/renderer/components/App/AppRoutes';
 *
 * // After
 * import App, { AppRoutes, AppContent, ReadyApp } from '@/renderer/components/App';
 * ```
 */

// Core components
export { AppContent } from './AppContent';
export { ReadyApp } from './ReadyApp';
export { AppRoutes } from './AppRoutes';

// Main entry point
import App from './App';

export default App;
