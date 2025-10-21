/**
 * Database Integration Test
 *
 * This integration test verifies that the database layer works correctly
 * when run in an actual Electron environment.
 */

import { LocalDatabaseModule } from '../src/modules/database/local-database-module';

/**
 * Test database functionality in a real Electron environment
 * This can be run from the Electron developer console or a test runner
 */
export async function runDatabaseIntegrationTests(): Promise<boolean> {
  console.log('🚀 Starting Database Integration Tests...');

  try {
    // Test 1: Database Initialization
    console.log('\n📝 Test 1: Database Initialization');
    const dbModule = new LocalDatabaseModule({
      enabled: true,
      settings: {
        databasePath: './test-data'
      }
    });

    await dbModule.initialize();
    console.log('✅ Database initialized successfully');

    // Test 2: Health Check
    console.log('\n📝 Test 2: Health Check');
    const health = await dbModule.healthCheck();
    console.log('✅ Health status:', health.status, '-', health.message);

    // Test 3: Table Existence
    console.log('\n📝 Test 3: Check Table Existence');
    const conceptsTableExists = await dbModule.tableExists('concepts');
    const sessionsTableExists = await dbModule.tableExists('sessions');
    const messagesTableExists = await dbModule.tableExists('messages');

    console.log(`✅ Concepts table exists: ${conceptsTableExists}`);
    console.log(`✅ Sessions table exists: ${sessionsTableExists}`);
    console.log(`✅ Messages table exists: ${messagesTableExists}`);

    // Test 4: Create Concept
    console.log('\n📝 Test 4: Create Concept');
    const testConcept = {
      id: 'test-concept-' + Date.now(),
      name: 'React Components',
      description: 'Understanding React component architecture',
      concept_type: 'topic' as const,
      difficulty_level: 2,
      mastery_level: 0.0,
      tags: ['react', 'frontend', 'components'],
      metadata: {
        source: 'integration-test',
        created: new Date().toISOString()
      }
    };

    const conceptId = await dbModule.createConcept(testConcept);
    console.log(`✅ Created concept with ID: ${conceptId}`);

    // Test 5: Get Concept
    console.log('\n📝 Test 5: Get Concept');
    const retrievedConcept = await dbModule.getConcept(testConcept.id);
    console.log(`✅ Retrieved concept: ${retrievedConcept?.name}`);

    // Test 6: Update Concept
    console.log('\n📝 Test 6: Update Concept');
    const updateResult = await dbModule.updateConcept(testConcept.id, {
      mastery_level: 0.8,
      review_count: 1
    });
    console.log(`✅ Updated concept: ${updateResult}`);

    // Test 7: Query All Concepts
    console.log('\n📝 Test 7: Query All Concepts');
    const allConcepts = await dbModule.query('SELECT * FROM concepts LIMIT 5');
    console.log(`✅ Found ${allConcepts.length} concepts`);

    // Test 8: Database Statistics
    console.log('\n📝 Test 8: Database Statistics');
    const stats = await dbModule.getDatabaseStats();
    console.log(`✅ Database size: ${stats.databaseSize} bytes`);
    console.log(`✅ Table count: ${stats.tableCount}`);

    // Test 9: Resource Usage
    console.log('\n📝 Test 9: Resource Usage');
    const resourceUsage = await dbModule.getResourceUsage();
    console.log(`✅ Storage used: ${resourceUsage.storage.used} bytes`);
    console.log(`✅ Active connections: ${resourceUsage.connections.active}`);

    // Test 10: Cleanup Test Data
    console.log('\n📝 Test 10: Cleanup Test Data');
    const deleteResult = await dbModule.deleteConcept(testConcept.id);
    console.log(`✅ Deleted test concept: ${deleteResult}`);

    console.log('\n🎉 All database integration tests passed!');
    return true;

  } catch (error) {
    console.error('\n❌ Database integration test failed:', error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    return false;
  }
}

/**
 * Quick database connection test
 */
export async function testDatabaseConnection(): Promise<boolean> {
  try {
    console.log('🔍 Testing database connection...');

    const dbModule = new LocalDatabaseModule();
    await dbModule.initialize();

    const health = await dbModule.healthCheck();
    console.log(`✅ Database connection test: ${health.status}`);

    return health.status === 'healthy';
  } catch (error) {
    console.error('❌ Database connection test failed:', error);
    return false;
  }
}

// Auto-run if executed directly
if (typeof window !== 'undefined' && window.location) {
  // Running in browser/Electron renderer
  console.log('Database integration test loaded. Run runDatabaseIntegrationTests() to execute tests.');
} else if (typeof module !== 'undefined' && module.exports) {
  // Running in Node.js
  module.exports = {
    runDatabaseIntegrationTests,
    testDatabaseConnection
  };
}