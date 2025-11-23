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
