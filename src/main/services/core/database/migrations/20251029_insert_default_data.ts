import { Kysely } from 'kysely'

export default {
  async up(db: Kysely<any>): Promise<void> {
    // Insert default categories
    await db
      .insertInto('categories')
      .values([
        {
          id: '1',
          name: 'Programming',
          description: 'Programming languages and concepts',
          color: '#3B82F6',
          icon: 'code',
        },
        {
          id: '2',
          name: 'Mathematics',
          description: 'Mathematical concepts and theories',
          color: '#10B981',
          icon: 'calculator',
        },
        {
          id: '3',
          name: 'Science',
          description: 'Scientific concepts and principles',
          color: '#8B5CF6',
          icon: 'flask',
        },
        {
          id: '4',
          name: 'Languages',
          description: 'Natural languages and linguistics',
          color: '#F59E0B',
          icon: 'language',
        },
        {
          id: '5',
          name: 'Arts',
          description: 'Artistic concepts and techniques',
          color: '#EF4444',
          icon: 'palette',
        },
        {
          id: '6',
          name: 'Business',
          description: 'Business and management concepts',
          color: '#6B7280',
          icon: 'briefcase',
        },
      ])
      .execute()

    // Initialize user stats
    await db
      .insertInto('user_stats')
      .values({
        id: 'user',
      })
      .execute()

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
        },
        {
          id: '2',
          key: 'language',
          value: 'en',
          data_type: 'string',
          description: 'Interface language',
        },
        {
          id: '3',
          key: 'auto_save',
          value: 'true',
          data_type: 'boolean',
          description: 'Auto-save sessions',
        },
        {
          id: '4',
          key: 'show_tips',
          value: 'true',
          data_type: 'boolean',
          description: 'Show learning tips',
        },
      ])
      .execute()
  },

  async down(db: Kysely<any>): Promise<void> {
    // Remove default data
    await db.deleteFrom('settings').where('id', 'in', ['1', '2', '3', '4']).execute()
    await db.deleteFrom('user_stats').where('id', '=', 'user').execute()
    await db.deleteFrom('categories').where('id', 'in', ['1', '2', '3', '4', '5', '6']).execute()
  }
}
