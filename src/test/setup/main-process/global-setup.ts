/**
 * Main Process Global Test Setup
 *
 * Global setup for all main process tests. This runs once before all tests
 * and is responsible for initializing the test environment.
 */

import { defineConfig } from 'vitest/config';

export default async function setup() {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.VITEST = 'true';

  console.log('🧪 Main process global test setup completed');
}

export async function teardown() {
  console.log('✅ Main process global test teardown completed');
}
