/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable no-undef */
/* eslint-disable react/prop-types */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-non-null-asserted-optional-chain */
/* eslint-disable @typescript-eslint/no-non-null-asserted-access */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable @typescript-eslint/require-await */




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