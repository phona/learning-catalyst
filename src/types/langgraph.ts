/**
 * LangGraph Type Definitions
 *
 * Additional type definitions for LangGraph integration with the existing application
 */

export interface CheckpointFilter {
  source?: string
  step?: number
  [key: string]: any
}