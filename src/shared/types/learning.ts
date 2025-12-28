/**
 * Learning-specific types
 */

export interface LearningObjective {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty_level: 'beginner' | 'intermediate' | 'advanced';
  estimated_time: number; // minutes
  prerequisites: string[];
  learning_materials: LearningMaterial[];
  assessment_criteria: AssessmentCriteria[];
}

export interface LearningMaterial {
  id: string;
  type: 'text' | 'video' | 'interactive' | 'exercise' | 'example';
  title: string;
  content: string;
  url?: string;
  duration?: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];
}

export interface AssessmentCriteria {
  id: string;
  description: string;
  type: 'quiz' | 'practical' | 'project' | 'discussion';
  passing_threshold: number; // percentage
  weight: number; // importance weighting
}

export interface LearningPath {
  id: string;
  title: string;
  description: string;
  objectives: LearningObjective[];
  estimated_duration: number;
  difficulty_progression: 'linear' | 'adaptive';
  prerequisites: string[];
  tags: string[];
  difficulty: number;
  modules: LearningModule[];
  targetMastery: number;
  adaptations: string[];
  progress: {
    currentModule: string;
    completedModules: string[];
    currentConcept: string;
    masteredConcepts: never[];
    timeSpent: number;
    assessmentScores: never[];
    lastAccess: Date;
    completionRate: number;
    masteryLevel: number;
  };
}

export interface LearningModule {
  id: string;
  title: string;
  description: string;
  type: 'concept' | 'module';
  concepts?: string[];
  order?: number;
  objectives?: LearningObjective[];
  content?: string[];
  isOptional: boolean;
  estimatedTime: number;
  difficulty: number;
  resources: string[];
  assessments: string[];
  completionCriteria: {
    type: 'assessment' | 'time';
    threshold: number;
    assessments?: string[];
    required: boolean;
  };
}

export interface LearningProgress {
  user_id: string;
  objective_id: string;
  completion_percentage: number;
  time_spent: number;
  last_accessed: Date;
  mastery_level: number;
  strengths: string[];
  weaknesses: string[];
  next_recommended_objectives: string[];
}
