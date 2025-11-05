/**
 * Component Index - Clean Architecture Component Export
 * Exports all components organized by their architectural layer
 */

// View Components (Full-page layouts)
export * from './views';

// Feature Components (Reusable feature-specific components)
export * from './features';

// Shared Components (Pure UI components)
export * from './shared';

// Legacy Components (being migrated)
export * from './Analytics';
export * from './Chat';
export * from './Config';
export * from './Dashboard';
export * from './Discovery';
export * from './Knowledge';
export * from './Layout';
export * from './Session';
export * from './UI';

// Main Layout Component
export { default as MainLayout } from './Layout';