/**
 * Sample Data Seeder for Knowledge Map Testing
 * This script adds sample concepts and relationships to the database
 * so you can see the knowledge map visualization in action.
 */

import { createDatabase, createSqliteDriverFactory } from '@/main/services/core/database/kysely-database';
import type { Database } from '@/main/services/core/database/kysely-schema';
import { randomUUID } from 'node:crypto';

async function seedSampleData() {
  const dbPath = process.argv[2] || './.catalyst/learning_catalyst.db';

  console.log(`Seeding sample data at: ${dbPath}`);

  const driverFactory = await createSqliteDriverFactory(dbPath);
  const db = createDatabase(driverFactory);

  // Sample concepts
  const concepts = [
    {
      id: randomUUID(),
      name: 'JavaScript',
      description: 'A high-level, dynamic programming language',
      concept_type: 'topic' as const,
      difficulty_level: 2,
      mastery_level: 0.7,
      tags: JSON.stringify(['programming', 'web', 'language']),
      metadata: JSON.stringify({ category: 'programming', examples: ['React', 'Node.js'] }),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: randomUUID(),
      name: 'React',
      description: 'A JavaScript library for building user interfaces',
      concept_type: 'skill' as const,
      difficulty_level: 3,
      mastery_level: 0.6,
      tags: JSON.stringify(['framework', 'ui', 'frontend']),
      metadata: JSON.stringify({ category: 'frontend', examples: ['Components', 'Hooks'] }),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: randomUUID(),
      name: 'TypeScript',
      description: 'A strongly typed programming language that builds on JavaScript',
      concept_type: 'skill' as const,
      difficulty_level: 3,
      mastery_level: 0.5,
      tags: JSON.stringify(['typing', 'programming', 'superset']),
      metadata: JSON.stringify({ category: 'programming', examples: ['Interfaces', 'Generics'] }),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: randomUUID(),
      name: 'HTML',
      description: 'HyperText Markup Language for creating web pages',
      concept_type: 'topic' as const,
      difficulty_level: 1,
      mastery_level: 0.9,
      tags: JSON.stringify(['markup', 'web', 'structure']),
      metadata: JSON.stringify({ category: 'frontend', examples: ['Tags', 'Elements'] }),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: randomUUID(),
      name: 'CSS',
      description: 'Cascading Style Sheets for styling web pages',
      concept_type: 'skill' as const,
      difficulty_level: 2,
      mastery_level: 0.8,
      tags: JSON.stringify(['styling', 'web', 'design']),
      metadata: JSON.stringify({ category: 'frontend', examples: ['Flexbox', 'Grid'] }),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: randomUUID(),
      name: 'Node.js',
      description: 'JavaScript runtime built on Chrome\'s V8 JavaScript engine',
      concept_type: 'skill' as const,
      difficulty_level: 4,
      mastery_level: 0.4,
      tags: JSON.stringify(['runtime', 'backend', 'server']),
      metadata: JSON.stringify({ category: 'backend', examples: ['Express', 'APIs'] }),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  // Insert concepts
  for (const concept of concepts) {
    await db.insertInto('concepts').values(concept).execute();
    console.log(`✓ Inserted concept: ${concept.name}`);
  }

  // Create relationships
  const relationships = [
    {
      id: randomUUID(),
      source_concept_id: concepts[0].id, // JavaScript
      target_concept_id: concepts[1].id, // React
      relationship_type: 'prerequisite' as const,
      strength: 0.9,
      description: 'JavaScript is required to learn React',
      metadata: JSON.stringify({}),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: randomUUID(),
      source_concept_id: concepts[0].id, // JavaScript
      target_concept_id: concepts[2].id, // TypeScript
      relationship_type: 'prerequisite' as const,
      strength: 0.95,
      description: 'TypeScript is a superset of JavaScript',
      metadata: JSON.stringify({}),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: randomUUID(),
      source_concept_id: concepts[3].id, // HTML
      target_concept_id: concepts[4].id, // CSS
      relationship_type: 'related' as const,
      strength: 0.8,
      description: 'HTML and CSS work together to create web pages',
      metadata: JSON.stringify({}),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: randomUUID(),
      source_concept_id: concepts[0].id, // JavaScript
      target_concept_id: concepts[5].id, // Node.js
      relationship_type: 'prerequisite' as const,
      strength: 0.85,
      description: 'JavaScript knowledge is needed for Node.js',
      metadata: JSON.stringify({}),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: randomUUID(),
      source_concept_id: concepts[1].id, // React
      target_concept_id: concepts[2].id, // TypeScript
      relationship_type: 'related' as const,
      strength: 0.7,
      description: 'React commonly uses TypeScript',
      metadata: JSON.stringify({}),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: randomUUID(),
      source_concept_id: concepts[4].id, // CSS
      target_concept_id: concepts[1].id, // React
      relationship_type: 'related' as const,
      strength: 0.6,
      description: 'CSS is used with React for styling',
      metadata: JSON.stringify({}),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  // Insert relationships
  for (const rel of relationships) {
    await db.insertInto('relationships').values(rel).execute();
    console.log(`✓ Inserted relationship: ${rel.description}`);
  }

  console.log('\n✅ Sample data seeding complete!');
  console.log(`   - ${concepts.length} concepts inserted`);
  console.log(`   - ${relationships.length} relationships inserted`);
  console.log('\nYou can now view the knowledge map with visible relationship lines!');
}

// Run seeder
seedSampleData().catch((error) => {
  console.error('Error seeding sample data:', error);
  process.exit(1);
});
