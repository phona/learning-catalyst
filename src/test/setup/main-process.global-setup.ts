/**
 * Main Process Global Test Setup
 *
 * One-time setup for main process test environment including
 * resource monitoring and global configuration.
 */

export async function setup() {
  // Set global test environment variables
  process.env.NODE_ENV = 'test';
  process.env.VITEST = 'true';
  process.env.TEST_DATABASE_PATH = ':memory:';

  // Configure global error handling for tests
  process.on('unhandledRejection', (error) => {
    console.error('Unhandled rejection in tests:', error);
  });

  console.log('Main process test environment initialized');
}

export async function teardown() {
  // Global cleanup
  console.log('Main process test environment cleaned up');
}
