# Kysely Migration Plan

## Overview
This document outlines the plan to migrate from raw SQL queries to Kysely for type-safe database operations in Learning Catalyst.

## Current Problem
The existing `sessionService.ts` uses raw SQL queries with manual parameter binding, which has led to SQL binding errors:
```
Error: Incorrect number of bindings supplied. The current statement uses 1, and there are 0 supplied.
```

## Migration Strategy

### Phase 1: Setup & Foundation

#### 1.1 Dependencies Research
- **kysely** - Core type-safe query builder
- **kysely-sqlite** - SQLite dialect for Kysely
- Check Electron compatibility with sqlite-electron
- Ensure TypeScript strict mode integration

#### 1.2 Database Schema Definition
Create TypeScript interfaces for existing database schema:

```typescript
// src/database/schema.ts
export interface Database {
  learning_sessions: {
    id: string;
    title: string;
    description: string | null;
    start_time: string;
    metadata: string; // JSON string
    created_at: string;
    updated_at: string;
    end_time?: string;
    total_messages: number;
  };

  messages: {
    id: string;
    session_id: string;
    role: 'user' | 'assistant' | 'system' | 'tool';
    content: string;
    thinking_content: string | null;
    provider: string | null;
    model: string | null;
    tokens_used: string | null; // JSON string
    timestamp: string;
    message_order: number;
    created_at: string;
    tool_calls?: string | null; // JSON string
  };

  // Add other tables as needed...
}
```

#### 1.3 Database Instance Setup
Configure Kysely to work with existing Electron sqlite-electron:

```typescript
// src/database/kysely-db.ts
import { Kysely, SqliteDialect } from 'kysely';
import { Database } from './schema';
import type { Database as ElectronDatabase } from 'sqlite-electron';

export class KyselyDatabase {
  private static instance: Kysely<Database>;

  static getInstance(): Kysely<Database> {
    if (!KyselyDatabase.instance) {
      KyselyDatabase.instance = new Kysely<Database>({
        dialect: new SqliteDialect({
          database: {
            // Integrate with existing Electron database
            execute: async (query) => {
              const result = await window.electronAPI.dbExecuteQuery(query.sql, query.parameters);
              return {
                rows: result?.rows || [],
                insertId: result?.insertId,
                changes: result?.changes
              };
            }
          }
        })
      });
    }
    return KyselyDatabase.instance;
  }
}
```

### Phase 2: Proof of Concept

#### 2.1 Migrate searchSessions Function
Convert the problematic `searchSessions` function to use Kysely:

```typescript
// Before (current problematic code):
async searchSessions(query: SessionSearchQuery): Promise<SessionSearchResult> {
  let sql = `SELECT s.*, COUNT(m.id) as message_count FROM learning_sessions s LEFT JOIN messages m ON s.id = m.session_id WHERE 1=1`;
  const params: any[] = [];

  // Manual condition building...
  if (query.query) {
    sql += ` AND (s.title LIKE ? OR s.description LIKE ?)`;
    params.push(`%${query.query}%`, `%${query.query}%`);
  }

  // Problematic parameter handling...
  const countParams = params.slice(0, -2); // FRAGILE!
  const countResult = await window.electronAPI.dbFetchOne(countSql, countParams);
}

// After (Kysely version):
async searchSessions(query: SessionSearchQuery): Promise<SessionSearchResult> {
  const db = KyselyDatabase.getInstance();

  // Build base query
  let dbQuery = db
    .selectFrom('learning_sessions as s')
    .selectAll('s')
    .select(db.fn.count('m.id').as('message_count'))
    .leftJoin('messages as m', 's.id', 'm.session_id');

  // Add conditions type-safely
  if (query.query) {
    const searchTerm = `%${query.query}%`;
    dbQuery = dbQuery.where((eb) => eb.or([
      eb('s.title', 'like', searchTerm),
      eb('s.description', 'like', searchTerm)
    ]));
  }

  if (query.tags?.length) {
    dbQuery = dbQuery.where((eb) =>
      eb.or(query.tags.map(tag =>
        eb('s.metadata', 'like', `%"${tag}"%`)
      ))
    );
  }

  if (query.archived !== undefined) {
    dbQuery = dbQuery.where('s.metadata', 'like', `%"archived":${query.archived}%`);
  }

  if (query.date_range) {
    dbQuery = dbQuery
      .where('s.start_time', '>=', query.date_range.start.toISOString())
      .where('s.start_time', '<=', query.date_range.end.toISOString());
  }

  // Get total count automatically
  const countQuery = dbQuery
    .clearSelect()
    .clearOrderBy()
    .select(db.fn.count('s.id').as('total'))
    .groupBy('s.id');

  const totalResult = await countQuery.executeTakeFirst();
  const total = Number(totalResult?.total) || 0;

  // Get paginated results
  const resultsQuery = dbQuery
    .groupBy('s.id')
    .orderBy('s.updated_at desc')
    .limit(query.limit || 50);

  if (query.offset) {
    resultsQuery = resultsQuery.offset(query.offset);
  }

  const rows = await resultsQuery.execute();

  // Process results...
}
```

#### 2.2 Testing Integration
- Verify the binding error is resolved
- Test all query conditions and edge cases
- Performance comparison with raw SQL
- Validate type safety benefits

### Phase 3: Service Integration

#### 3.1 SessionService Migration
Gradually replace raw SQL in SessionService:

```typescript
export class SessionService {
  private db = KyselyDatabase.getInstance();

  async createSession(options: SessionCreateOptions): Promise<Session> {
    const sessionId = this.generateId();
    const now = new Date();

    const result = await this.db
      .insertInto('learning_sessions')
      .values({
        id: sessionId,
        title: options.title,
        description: options.description || null,
        start_time: now.toISOString(),
        metadata: JSON.stringify({
          tags: options.tags || [],
          category: options.category || 'general',
          provider: options.provider || 'openai',
          model: options.model || 'gpt-3.5-turbo',
          archived: false,
          pinned: false,
        }),
        created_at: now.toISOString(),
        updated_at: now.toISOString()
      })
      .executeTakeFirst();

    return this.getSessionById(sessionId);
  }

  async getSessionById(sessionId: string): Promise<Session> {
    const sessionRow = await this.db
      .selectFrom('learning_sessions')
      .selectAll()
      .where('id', '=', sessionId)
      .executeTakeFirst();

    if (!sessionRow) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const messageRows = await this.db
      .selectFrom('messages')
      .selectAll()
      .where('session_id', '=', sessionId)
      .orderBy(['message_order asc', 'timestamp asc'])
      .execute();

    // Build session object...
  }
}
```

### Phase 4: Documentation & Guidelines

#### 4.1 Development Guidelines
Create patterns for team to follow:

```typescript
// ✅ Good: Type-safe queries
const users = await db
  .selectFrom('users')
  .select(['id', 'name', 'email'])
  .where('active', '=', true)
  .execute();

// ❌ Bad: Raw SQL (avoid)
const users = await window.electronAPI.dbFetchMany(
  'SELECT id, name, email FROM users WHERE active = ?',
  50,
  [true]
);

// ✅ Good: Complex conditions with type safety
const sessions = await db
  .selectFrom('learning_sessions')
  .selectAll()
  .where((eb) => eb.and([
    eb('archived', '=', false),
    eb('updated_at', '>', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
    eb.or([
      eb('title', 'like', '%learning%'),
      eb('metadata', 'like', '%category:"tutorial"%')
    ])
  ]))
  .execute();
```

## Expected Benefits

### Immediate Benefits
- ✅ **Eliminates SQL Binding Errors** - Automatic parameter handling
- ✅ **Type Safety** - Compile-time error detection
- ✅ **IDE Support** - Autocomplete, refactoring, error checking
- ✅ **Better Maintainability** - More readable complex queries

### Long-term Benefits
- 🔄 **Easier Refactoring** - TypeScript tracks all database operations
- 📈 **Better Performance** - Query optimization opportunities
- 🛡️ **Security** - Automatic SQL injection prevention
- 🧪 **Testability** - Easier to mock and test database operations

## Migration Timeline

### Week 1: Foundation
- [ ] Install Kysely dependencies
- [ ] Create database schema interfaces
- [ ] Set up Kysely database instance
- [ ] Basic integration tests

### Week 2: Proof of Concept
- [ ] Migrate `searchSessions` function
- [ ] Test and validate functionality
- [ ] Performance benchmarking
- [ ] Fix any integration issues

### Week 3: Service Migration
- [ ] Migrate remaining SessionService methods
- [ ] Update error handling
- [ ] Comprehensive testing
- [ ] Documentation updates

### Week 4: Finalization
- [ ] Code review and optimization
- [ ] Team training and guidelines
- [ ] Monitor production performance
- [ ] Plan migration of other services

## Risk Mitigation

### Technical Risks
- **Breaking Changes**: Maintain public API compatibility
- **Performance**: Minimal overhead expected, but will benchmark
- **Learning Curve**: Provide examples and documentation

### Rollback Plan
- Keep raw SQL implementation as fallback
- Gradual migration allows selective rollback
- Feature flags for switching between implementations

## Success Criteria
- [ ] Current binding error resolved
- [ ] All SessionService tests pass
- [ ] Type safety benefits realized (compile-time error detection)
- [ ] No performance regression
- [ ] Team can effectively use Kysely patterns

## Planned Kysely Integration Structure

### New Database Layer
```
src/database/                   # Kysely-based database layer
├── schema.ts                   # Kysely database schema interface
├── kysely-db.ts               # Kysely database instance
├── migrations/                # Database migrations
│   └── 001-initial-schema.ts
└── utils.ts                   # Database utilities
```

### Migration Path
1. **Phase 1**: Add Kysely alongside existing raw SQL
2. **Phase 2**: Migrate problematic functions (starting with `sessionService.ts`)
3. **Phase 3**: Gradual migration of all database operations
4. **Phase 4**: Remove raw SQL implementations

---

*This migration will significantly improve the reliability and maintainability of our database operations while solving the current SQL binding issues.*