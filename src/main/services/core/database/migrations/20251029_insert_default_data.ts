import { Kysely } from 'kysely';
import type { Database } from '../kysely-schema';

export default {
  async up(db: Kysely<Database>): Promise<void> {
    // Insert default categories
    await db
      .insertInto('categories')
      .values([
        {
          id: 1,
          name: 'Programming',
          description: 'Programming languages and concepts',
          color: '#3B82F6',
          icon: 'code',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 2,
          name: 'Mathematics',
          description: 'Mathematical concepts and theories',
          color: '#10B981',
          icon: 'calculator',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 3,
          name: 'Science',
          description: 'Scientific concepts and principles',
          color: '#8B5CF6',
          icon: 'flask',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 4,
          name: 'Languages',
          description: 'Natural languages and linguistics',
          color: '#F59E0B',
          icon: 'language',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 5,
          name: 'Arts',
          description: 'Artistic concepts and techniques',
          color: '#EF4444',
          icon: 'palette',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 6,
          name: 'Business',
          description: 'Business and management concepts',
          color: '#6B7280',
          icon: 'briefcase',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])
      .execute();

    // Initialize user stats
    await db
      .insertInto('user_stats')
      .values({
        id: 'user',
        total_sessions: 0,
        total_study_time_seconds: 0,
        total_concepts: 0,
        total_messages: 0,
        average_mastery_level: 0,
        current_streak_days: 0,
        longest_streak_days: 0,
        metadata: '{}',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .execute();

    // Insert default settings
    await db
      .insertInto('settings')
      .values([
        {
          id: '1',
          key: 'theme',
          value: 'dark',
          data_type: 'string',
          description: 'Application theme',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: '2',
          key: 'language',
          value: 'en',
          data_type: 'string',
          description: 'Interface language',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: '3',
          key: 'auto_save',
          value: 'true',
          data_type: 'boolean',
          description: 'Auto-save sessions',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: '4',
          key: 'show_tips',
          value: 'true',
          data_type: 'boolean',
          description: 'Show learning tips',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])
      .execute();
  },

  async down(db: Kysely<Database>): Promise<void> {
    // Remove default data
    await db.deleteFrom('settings').where('id', 'in', ['1', '2', '3', '4']).execute();
    await db.deleteFrom('user_stats').where('id', '=', 'user').execute();
    await db.deleteFrom('categories').where('id', 'in', [1, 2, 3, 4, 5, 6]).execute();
  },
};
