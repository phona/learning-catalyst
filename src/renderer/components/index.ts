/**
 * Component Index - Clean Architecture Component Export
 * Exports all components organized by their architectural layer
 */

// View Components (Full-page layouts) - REMOVED: All views were unused and deleted

// Feature Components (Reusable feature-specific components) - REMOVED: Empty folder with no actual components

// Shared Components (Pure UI components) - REMOVED: Folder was completely unused

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
