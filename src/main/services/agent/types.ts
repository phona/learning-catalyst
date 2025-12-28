export type AgentType =
  | 'learning'
  | 'tutoring'
  // 'practice' - REMOVED (migrated to workflow node)
  // 'learning_planner' - REMOVED (migrated to workflow plan node)
  // 'assessment' - REMOVED (migrated to workflow assess node)
  | 'supervisor';
