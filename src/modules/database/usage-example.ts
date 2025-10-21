/**
 * Database Module Usage Example
 *
 * This file demonstrates how to use the LocalDatabaseModule
 * for various database operations.
 */

import { LocalDatabaseModule } from './local-database-module';

/**
 * Example: Initialize and use the database module
 */
export async function exampleDatabaseUsage() {
  // 1. Create and initialize the database module
  const database = new LocalDatabaseModule();

  try {
    // 2. Initialize the database (creates schema and default data)
    await database.initialize();
    console.log('Database initialized successfully!');

    // 3. Check database health
    const health = await database.healthCheck();
    console.log('Database health:', health.status, '-', health.message);

    // 4. Create a new learning concept
    const conceptId = 'concept-react-hooks-' + Date.now();
    const newConcept = {
      id: conceptId,
      name: 'React Hooks',
      description: 'Understanding React Hooks for state management and side effects',
      concept_type: 'topic' as const,
      difficulty_level: 3,
      mastery_level: 0.0,
      tags: ['react', 'hooks', 'state-management'],
      metadata: {
        category: 'frontend',
        estimatedHours: 8,
        prerequisites: ['react-components', 'javascript-async']
      }
    };

    await database.createConcept(newConcept);
    console.log('Created concept:', newConcept.name);

    // 5. Retrieve the concept
    const retrievedConcept = await database.getConcept(conceptId);
    console.log('Retrieved concept:', retrievedConcept?.name);

    // 6. Update concept mastery
    await database.updateConcept(conceptId, {
      mastery_level: 0.6,
      review_count: 2,
      last_reviewed: new Date().toISOString()
    });
    console.log('Updated concept mastery level');

    // 7. Query multiple concepts
    const allConcepts = await database.query(
      'SELECT id, name, difficulty_level, mastery_level FROM concepts WHERE concept_type = ? ORDER BY name',
      ['topic']
    );
    console.log(`Found ${allConcepts.length} topic concepts`);

    // 8. Get database statistics
    const stats = await database.getDatabaseStats();
    console.log('Database statistics:', {
      tableCount: stats.tableCount,
      databaseSize: `${(stats.databaseSize / 1024).toFixed(2)} KB`
    });

    // 9. Get resource usage
    const resourceUsage = await database.getResourceUsage();
    console.log('Resource usage:', {
      storageUsed: `${(resourceUsage.storage.used / 1024).toFixed(2)} KB`,
      activeConnections: resourceUsage.connections.active
    });

    // 10. Check if specific tables exist
    const conceptsExist = await database.tableExists('concepts');
    const sessionsExist = await database.tableExists('learning_sessions');
    console.log('Table existence:', { concepts: conceptsExist, sessions: sessionsExist });

    // 11. Get table schema
    if (conceptsExist) {
      const conceptSchema = await database.getTableSchema('concepts');
      console.log('Concepts table schema:', conceptSchema.map(col => ({
        name: col.name,
        type: col.type,
        primaryKey: col.pk === 1
      })));
    }

    return {
      success: true,
      message: 'Database operations completed successfully',
      stats: {
        conceptsCount: allConcepts.length,
        databaseSize: stats.databaseSize,
        healthStatus: health.status
      }
    };

  } catch (error) {
    console.error('Database operation failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Example: Create learning relationships between concepts
 */
export async function exampleCreateRelationships() {
  const database = new LocalDatabaseModule();
  await database.initialize();

  try {
    // Create prerequisite relationship
    const prerequisiteRelation = await database.runCommand(`
      INSERT INTO relationships (id, source_concept_id, target_concept_id, relationship_type, strength, description)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      'rel-' + Date.now(),
      'concept-js-basics',
      'concept-react-hooks',
      'prerequisite',
      0.9,
      'JavaScript basics are required before learning React Hooks'
    ]);

    console.log('Created prerequisite relationship:', prerequisiteRelation);

    // Get all relationships for a concept
    const relationships = await database.query(`
      SELECT r.*, s.name as source_name, t.name as target_name
      FROM relationships r
      JOIN concepts s ON r.source_concept_id = s.id
      JOIN concepts t ON r.target_concept_id = t.id
      WHERE r.source_concept_id = ? OR r.target_concept_id = ?
    `, ['concept-react-hooks', 'concept-react-hooks']);

    console.log(`Found ${relationships.length} relationships for React Hooks concept`);
    relationships.forEach(rel => {
      console.log(`- ${rel.relationship_type}: ${rel.source_name} → ${rel.target_name} (${rel.strength})`);
    });

  } catch (error) {
    console.error('Failed to create relationships:', error);
  }
}

/**
 * Example: Session management
 */
export async function exampleSessionManagement() {
  const database = new LocalDatabaseModule();
  await database.initialize();

  try {
    const sessionId = 'session-' + Date.now();

    // Create a new learning session
    await database.runCommand(`
      INSERT INTO learning_sessions (id, title, description, session_type, difficulty_level)
      VALUES (?, ?, ?, ?, ?)
    `, [
      sessionId,
      'React Hooks Study Session',
      'Learning useState and useEffect hooks',
      'practice',
      3
    ]);

    console.log('Created session:', sessionId);

    // Add a message to the session
    await database.runCommand(`
      INSERT INTO messages (id, session_id, role, content, provider, model, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      'msg-' + Date.now(),
      sessionId,
      'user',
      'What are React Hooks and how do they work?',
      'openai',
      'gpt-3.5-turbo',
      new Date().toISOString()
    ]);

    console.log('Added message to session');

    // Get session with message count
    const sessionWithMessages = await database.query(`
      SELECT s.*, COUNT(m.id) as message_count
      FROM learning_sessions s
      LEFT JOIN messages m ON s.id = m.session_id
      WHERE s.id = ?
      GROUP BY s.id
    `, [sessionId]);

    console.log('Session details:', sessionWithMessages[0]);

  } catch (error) {
    console.error('Session management failed:', error);
  }
}

// Export all examples for easy testing
export const examples = {
  exampleDatabaseUsage,
  exampleCreateRelationships,
  exampleSessionManagement
};

// Auto-run example if executed directly
if (typeof window !== 'undefined') {
  console.log('Database usage examples loaded. Available functions:');
  console.log('- exampleDatabaseUsage()');
  console.log('- exampleCreateRelationships()');
  console.log('- exampleSessionManagement()');
}