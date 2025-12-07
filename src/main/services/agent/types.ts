export type AgentType =
  | 'learning'
  | 'learning_planner'
  | 'tutoring'
  | 'assessment'
  // 'practice' - REMOVED (migrated to workflow node)
  | 'supervisor';
