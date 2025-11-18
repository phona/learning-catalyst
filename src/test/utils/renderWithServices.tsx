// Re-export providers from the new dedicated file to avoid Fast Refresh warning
export {
  renderWithServices,
  renderWithSettings,
  Providers,
  QueryLayer
} from './test-providers';

// Re-export testing utilities for convenience
export { screen, fireEvent, waitFor } from '@testing-library/react';