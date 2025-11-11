/**
 * Database Module Exports
 */

export { createDatabase, runMigrations, Database } from './kysely-database';
export { ISqliteOperations } from './sqlite-interface';
export { SqliteAdapter } from './sqlite-adapter';
export { VectorDatabaseModule } from './vector-database';
export type { 
  VectorDocument, 
  SearchResult, 
  VectorSearchOptions 
} from './vector-database';