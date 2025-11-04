/**
 * Database Operations API
 *
 * Provides database operations through Electron IPC
 */

export interface DatabaseAPI {
  /**
   * Set database connection path
   * @param path - Database file path
   * @param isuri - Whether path is a URI
   * @param autocommit - Whether to use autocommit mode
   */
  dbSetPath: (path: string, isuri?: boolean, autocommit?: boolean) => Promise<any>;

  /**
   * Execute a database query
   * @param query - SQL query string
   * @param params - Query parameters
   */
  dbExecuteQuery: (query: string, params?: any[]) => Promise<any>;

  /**
   * Fetch a single row from database
   * @param query - SQL query string
   * @param params - Query parameters
   */
  dbFetchOne: (query: string, params?: any[]) => Promise<any>;

  /**
   * Fetch multiple rows from database
   * @param query - SQL query string
   * @param size - Maximum number of rows to fetch
   * @param params - Query parameters
   */
  dbFetchMany: (query: string, size: number, params?: any[]) => Promise<any>;

  /**
   * Fetch all rows from database
   * @param query - SQL query string
   * @param params - Query parameters
   */
  dbFetchAll: (query: string, params?: any[]) => Promise<any>;

  /**
   * Execute multiple queries
   * @param query - SQL query template
   * @param values - Array of parameter arrays for each query execution
   */
  dbExecuteMany: (query: string, values: any[]) => Promise<any>;

  /**
   * Execute a SQL script file
   * @param scriptPath - Path to SQL script file
   */
  dbExecuteScript: (scriptPath: string) => Promise<any>;
}