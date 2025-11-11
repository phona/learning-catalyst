/**
 * Exercise Parameter Generator
 *
 * Generates contextual parameters for exercise templates based on
 * conversation context, user preferences, and learning objectives.
 */

import {
  ExerciseTemplate,
  TemplateParameter,
  ParameterizedExercise,
  ParameterConstraint,
  GenerationRule
} from './exercise-templates';
import { VibeType, UserContext, ConversationContext } from '@/shared/types/practice';

export interface ParameterGenerationContext {
  userContext: UserContext;
  conversationContext: ConversationContext;
  currentTopic?: string;
  userLevel: 'beginner' | 'intermediate' | 'advanced';
  preferences: {
    difficultyPreference: 'easy' | 'medium' | 'hard';
    learningStyle: 'visual' | 'auditory' | 'kinesthetic' | 'reading';
    timeConstraint?: number; // minutes
    focusAreas: string[];
  };
  recentConcepts: Array<{
    concept: string;
    confidence: number;
    lastAccessed: number;
  }>;
  projectContext?: {
    name: string;
    type: string;
    technologies: string[];
    currentTask: string;
  };
}

export interface ParameterGenerationResult {
  parameters: Record<string, any>;
  confidence: number;
  reasoning: string;
  appliedRules: string[];
  warnings: string[];
  alternatives: Record<string, any>[];
}

export interface ParameterGenerationStrategy {
  name: string;
  description: string;
  generateParameters: (
    template: ExerciseTemplate,
    context: ParameterGenerationContext
  ) => Promise<ParameterGenerationResult>;
  isApplicable: (template: ExerciseTemplate, context: ParameterGenerationContext) => boolean;
  priority: number;
}

/**
 * Parameter Generator Service
 */
export class ParameterGenerator {
  private strategies: Map<string, ParameterGenerationStrategy> = new Map();
  private contextualDataSources: Map<string, () => Promise<any>> = new Map();

  constructor() {
    this.initializeBuiltinStrategies();
    this.initializeContextualDataSources();
  }

  /**
   * Generate parameters for a template based on context
   */
  async generateParameters(
    template: ExerciseTemplate,
    context: ParameterGenerationContext
  ): Promise<ParameterGenerationResult> {
    // Find applicable strategies
    const applicableStrategies = Array.from(this.strategies.values())
      .filter(strategy => strategy.isApplicable(template, context))
      .sort((a, b) => b.priority - a.priority);

    if (applicableStrategies.length === 0) {
      return this.generateFallbackParameters(template, context);
    }

    // Try strategies in order of priority
    for (const strategy of applicableStrategies) {
      try {
        const result = await strategy.generateParameters(template, context);
        if (this.validateParameters(template, result.parameters)) {
          return result;
        }
      } catch (error) {
        console.warn(`Parameter generation strategy ${strategy.name} failed:`, error);
      }
    }

    // Fallback to default generation
    return this.generateFallbackParameters(template, context);
  }

  /**
   * Generate a complete parameterized exercise
   */
  async generateParameterizedExercise(
    template: ExerciseTemplate,
    context: ParameterGenerationContext
  ): Promise<ParameterizedExercise> {
    const parameterResult = await this.generateParameters(template, context);

    // Apply parameters to template
    const generatedExercise = this.applyParametersToTemplate(template, parameterResult.parameters);

    // Select appropriate variation if available
    const variation = this.selectVariation(template, context);
    const finalExercise = variation ?
      this.applyVariation(generatedExercise, variation) : generatedExercise;

    return {
      id: `exercise_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      templateId: template.id,
      parameters: parameterResult.parameters,
      generatedExercise: finalExercise,
      difficulty: this.calculateDifficulty(template, context, parameterResult.parameters),
      estimatedTime: this.estimateTime(template, context, parameterResult.parameters),
      prerequisites: this.filterPrerequisites(template, context),
      learningObjectives: this.customizeLearningObjectives(template, context)
    };
  }

  /**
   * Validate generated parameters against template constraints
   */
  private validateParameters(template: ExerciseTemplate, parameters: Record<string, any>): boolean {
    for (const param of template.parameters) {
      const value = parameters[param.name];

      if (param.required && (value === undefined || value === null)) {
        return false;
      }

      if (value !== undefined && !this.validateParameterValue(param, value)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Validate individual parameter value
   */
  private validateParameterValue(param: TemplateParameter, value: any): boolean {
    if (!param.constraints) return true;

    const { constraints } = param;

    switch (param.type) {
      case 'number':
        if (typeof value !== 'number') return false;
        if (constraints.min !== undefined && value < constraints.min) return false;
        if (constraints.max !== undefined && value > constraints.max) return false;
        break;

      case 'string':
        if (typeof value !== 'string') return false;
        if (constraints.min && value.length < constraints.min) return false;
        if (constraints.max && value.length > constraints.max) return false;
        if (constraints.pattern && !new RegExp(constraints.pattern).test(value)) return false;
        break;

      case 'array':
        if (!Array.isArray(value)) return false;
        if (constraints.min && value.length < constraints.min) return false;
        if (constraints.max && value.length > constraints.max) return false;
        if (constraints.options && !value.every(item => constraints.options!.includes(item))) return false;
        break;

      case 'enum':
        if (constraints.options && !constraints.options.includes(value)) return false;
        break;

      case 'boolean':
        if (typeof value !== 'boolean') return false;
        break;
    }

    return true;
  }

  /**
   * Apply parameters to template string
   */
  private applyParametersToTemplate(template: ExerciseTemplate, parameters: Record<string, any>): any {
    const interpolate = (text: string): string => {
      return text.replace(/\$\{([^}]+)\}/g, (match, path) => {
        const value = this.getNestedValue(parameters, path);
        return value !== undefined ? String(value) : match;
      });
    };

    return {
      title: interpolate(template.name),
      description: interpolate(template.description),
      instructions: interpolate(template.template),
      solution: interpolate(template.solutionTemplate),
      hints: template.hintTemplates.map(interpolate),
      type: template.type,
      category: template.category
    };
  }

  /**
   * Get nested value from parameters object
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  /**
   * Select appropriate template variation
   */
  private selectVariation(template: ExerciseTemplate, context: ParameterGenerationContext): any {
    return template.variations.find(variation => {
      const conditions = variation.conditions;

      if (conditions.difficulty && conditions.difficulty !== context.preferences.difficultyPreference) {
        return false;
      }

      if (conditions.userLevel && conditions.userLevel !== context.userLevel) {
        return false;
      }

      if (conditions.vibeType && conditions.vibeType !== context.conversationContext.detectedVibe) {
        return false;
      }

      if (conditions.topicContext && context.currentTopic) {
        const hasMatchingTopic = conditions.topicContext.includes(context.currentTopic);
        if (!hasMatchingTopic) return false;
      }

      return true;
    });
  }

  /**
   * Apply variation to exercise
   */
  private applyVariation(exercise: any, variation: any): any {
    return {
      ...exercise,
      ...variation.parameterOverrides,
      variationId: variation.id,
      variationName: variation.name
    };
  }

  /**
   * Calculate exercise difficulty based on context
   */
  private calculateDifficulty(
    template: ExerciseTemplate,
    context: ParameterGenerationContext,
    parameters: Record<string, any>
  ): 'easy' | 'medium' | 'hard' {
    let difficultyScore = template.difficulty === 'easy' ? 1 : template.difficulty === 'medium' ? 2 : 3;

    // Adjust based on user level
    if (context.userLevel === 'beginner') difficultyScore = Math.min(1, difficultyScore);
    else if (context.userLevel === 'advanced') difficultyScore = Math.min(3, difficultyScore + 1);

    // Adjust based on user confidence
    if (context.userContext.confidenceLevel < 0.4) difficultyScore = Math.max(1, difficultyScore - 1);
    else if (context.userContext.confidenceLevel > 0.8) difficultyScore = Math.min(3, difficultyScore + 1);

    // Adjust based on recent performance
    const recentSuccess = context.userContext.recentConcepts.filter(c => c.confidence > 0.7).length;
    if (recentSuccess > 3) difficultyScore = Math.min(3, difficultyScore + 1);
    else if (recentSuccess < 1) difficultyScore = Math.max(1, difficultyScore - 1);

    return difficultyScore <= 1 ? 'easy' : difficultyScore <= 2 ? 'medium' : 'hard';
  }

  /**
   * Estimate exercise completion time
   */
  private estimateTime(
    template: ExerciseTemplate,
    context: ParameterGenerationContext,
    parameters: Record<string, any>
  ): number {
    let baseTime = template.estimatedTime;

    // Adjust based on user level
    if (context.userLevel === 'beginner') baseTime *= 1.5;
    else if (context.userLevel === 'advanced') baseTime *= 0.8;

    // Adjust based on complexity of parameters
    const parameterComplexity = Object.values(parameters).reduce((sum, value) => {
      if (Array.isArray(value)) return sum + value.length * 0.5;
      if (typeof value === 'string') return sum + value.length * 0.1;
      return sum + 1;
    }, 0);

    baseTime += parameterComplexity * 2;

    // Apply time constraint if specified
    if (context.preferences.timeConstraint) {
      baseTime = Math.min(baseTime, context.preferences.timeConstraint);
    }

    return Math.round(baseTime);
  }

  /**
   * Filter prerequisites based on user context
   */
  private filterPrerequisites(template: ExerciseTemplate, context: ParameterGenerationContext): string[] {
    const userKnownConcepts = context.userContext.recentConcepts.map(c => c.concept);

    return template.prerequisites.filter(prereq => {
      // Remove prerequisites the user already knows well
      const knownWell = userKnownConcepts.some(concept =>
        concept.toLowerCase().includes(prereq.toLowerCase()) ||
        prereq.toLowerCase().includes(concept.toLowerCase())
      );

      return !knownWell;
    });
  }

  /**
   * Customize learning objectives based on context
   */
  private customizeLearningObjectives(template: ExerciseTemplate, context: ParameterGenerationContext): string[] {
    const objectives = [...template.learningObjectives];

    // Add user-specific objectives
    if (context.projectContext) {
      objectives.push(`Apply skills to ${context.projectContext.name} project`);
    }

    if (context.conversationContext.detectedVibe === 'breakthrough') {
      objectives.push('Solidify understanding through practical application');
    }

    if (context.userContext.confidenceLevel < 0.5) {
      objectives.push('Build confidence with guided practice');
    }

    return objectives;
  }

  /**
   * Generate fallback parameters
   */
  private generateFallbackParameters(
    template: ExerciseTemplate,
    context: ParameterGenerationContext
  ): ParameterGenerationResult {
    const parameters: Record<string, any> = {};

    for (const param of template.parameters) {
      if (param.defaultValue !== undefined) {
        parameters[param.name] = param.defaultValue;
      } else {
        parameters[param.name] = this.generateDefaultValue(param, context);
      }
    }

    return {
      parameters,
      confidence: 0.5,
      reasoning: 'Generated using fallback parameter generation',
      appliedRules: [],
      warnings: ['Used default parameter values due to generation failure'],
      alternatives: []
    };
  }

  /**
   * Generate default value for a parameter
   */
  private generateDefaultValue(param: TemplateParameter, context: ParameterGenerationContext): any {
    switch (param.type) {
      case 'string':
        if (param.name.toLowerCase().includes('name')) {
          return context.currentTopic || 'Example';
        }
        if (param.name.toLowerCase().includes('concept')) {
          return context.recentConcepts[0]?.concept || 'Programming concept';
        }
        return 'Example value';

      case 'number':
        return param.constraints?.min || 1;

      case 'array':
        return param.defaultValue || [];

      case 'boolean':
        return false;

      case 'enum':
        return param.constraints?.options?.[0] || 'default';

      case 'range':
        return [param.constraints?.min || 0, param.constraints?.max || 10];

      default:
        return null;
    }
  }

  /**
   * Initialize built-in parameter generation strategies
   */
  private initializeBuiltinStrategies(): void {
    // Context-aware strategy
    this.strategies.set('context-aware', {
      name: 'Context-Aware',
      description: 'Generate parameters based on conversation context and user history',
      priority: 100,
      isApplicable: (template, context) => {
        return context.currentTopic !== undefined || context.recentConcepts.length > 0;
      },
      generateParameters: async (template, context) => {
        return this.generateContextAwareParameters(template, context);
      }
    });

    // Project-based strategy
    this.strategies.set('project-based', {
      name: 'Project-Based',
      description: 'Generate parameters based on user\'s current project',
      priority: 90,
      isApplicable: (template, context) => {
        return context.projectContext !== undefined;
      },
      generateParameters: async (template, context) => {
        return this.generateProjectBasedParameters(template, context);
      }
    });

    // Vibe-based strategy
    this.strategies.set('vibe-based', {
      name: 'Vibe-Based',
      description: 'Generate parameters based on detected conversation vibe',
      priority: 80,
      isApplicable: (template, context) => {
        return context.conversationContext.detectedVibe !== undefined;
      },
      generateParameters: async (template, context) => {
        return this.generateVibeBasedParameters(template, context);
      }
    });

    // Difficulty-based strategy
    this.strategies.set('difficulty-based', {
      name: 'Difficulty-Based',
      description: 'Generate parameters adjusted for user skill level',
      priority: 70,
      isApplicable: () => true, // Always applicable
      generateParameters: async (template, context) => {
        return this.generateDifficultyBasedParameters(template, context);
      }
    });
  }

  /**
   * Initialize contextual data sources
   */
  private initializeContextualDataSources(): void {
    // Technology trends data source
    this.contextualDataSources.set('tech-trends', async () => {
      // In a real implementation, this would fetch current technology trends
      return {
        popularLanguages: ['JavaScript', 'Python', 'TypeScript', 'React', 'Node.js'],
        trendingTopics: ['AI/ML', 'Web3', 'Cloud computing', 'DevOps'],
        commonFrameworks: ['React', 'Vue', 'Angular', 'Express', 'Django']
      };
    });

    // Common programming problems data source
    this.contextualDataSources.set('common-problems', async () => {
      return {
        algorithms: ['sorting', 'searching', 'graph traversal', 'dynamic programming'],
        dataStructures: ['arrays', 'linked lists', 'trees', 'hash tables'],
        patterns: ['singleton', 'factory', 'observer', 'strategy']
      };
    });
  }

  /**
   * Generate context-aware parameters
   */
  private async generateContextAwareParameters(
    template: ExerciseTemplate,
    context: ParameterGenerationContext
  ): Promise<ParameterGenerationResult> {
    const parameters: Record<string, any> = {};
    const appliedRules: string[] = [];

    for (const param of template.parameters) {
      switch (param.name) {
        case 'functionality':
        case 'problemStatement':
        case 'queryPurpose':
          parameters[param.name] = this.generateContextualProblem(context, param.type);
          appliedRules.push(`Contextual problem generation based on ${context.currentTopic}`);
          break;

        case 'parameters':
          parameters[param.name] = this.generateContextualFunctionParams(context);
          appliedRules.push('Contextual function parameters');
          break;

        case 'entities':
        case 'concepts':
          parameters[param.name] = this.extractRelevantConcepts(context);
          appliedRules.push('Relevant concepts from conversation');
          break;

        default:
          if (context.currentTopic && param.name.toLowerCase().includes('concept')) {
            parameters[param.name] = context.currentTopic;
            appliedRules.push(`Topic-based parameter for ${param.name}`);
          } else {
            parameters[param.name] = param.defaultValue || this.generateDefaultValue(param, context);
          }
      }
    }

    return {
      parameters,
      confidence: 0.8,
      reasoning: 'Generated parameters based on conversation context and user learning history',
      appliedRules,
      warnings: [],
      alternatives: []
    };
  }

  /**
   * Generate project-based parameters
   */
  private async generateProjectBasedParameters(
    template: ExerciseTemplate,
    context: ParameterGenerationContext
  ): Promise<ParameterGenerationResult> {
    if (!context.projectContext) {
      throw new Error('Project context required for project-based parameter generation');
    }

    const parameters: Record<string, any> = {};
    const appliedRules: string[] = [];

    for (const param of template.parameters) {
      switch (param.name) {
        case 'functionality':
          parameters[param.name] = `Implement functionality for ${context.projectContext!.currentTask}`;
          appliedRules.push('Project-specific functionality');
          break;

        case 'applicationType':
          parameters[param.name] = context.projectContext.type;
          appliedRules.push('Project type-based application');
          break;

        default:
          if (param.type === 'array' && context.projectContext.technologies.length > 0) {
            parameters[param.name] = context.projectContext.technologies.slice(0, 3);
            appliedRules.push('Project technologies for array parameters');
          } else {
            parameters[param.name] = param.defaultValue || this.generateDefaultValue(param, context);
          }
      }
    }

    return {
      parameters,
      confidence: 0.9,
      reasoning: `Generated parameters based on ${context.projectContext.name} project context`,
      appliedRules,
      warnings: [],
      alternatives: []
    };
  }

  /**
   * Generate vibe-based parameters
   */
  private async generateVibeBasedParameters(
    template: ExerciseTemplate,
    context: ParameterGenerationContext
  ): Promise<ParameterGenerationResult> {
    const vibe = context.conversationContext.detectedVibe;
    const parameters: Record<string, any> = {};
    const appliedRules: string[] = [];

    for (const param of template.parameters) {
      switch (vibe) {
        case 'understanding':
          if (param.name === 'complexity') {
            parameters[param.name] = 'O(n)';
            appliedRules.push('Understanding vibe - moderate complexity');
          } else if (param.name === 'difficulty') {
            parameters[param.name] = 'medium';
            appliedRules.push('Understanding vibe - medium difficulty');
          }
          break;

        case 'confused':
          if (param.name === 'complexity') {
            parameters[param.name] = 'O(1)';
            appliedRules.push('Confused vibe - simple complexity');
          } else if (param.name === 'difficulty') {
            parameters[param.name] = 'easy';
            appliedRules.push('Confused vibe - easy difficulty');
          }
          break;

        case 'breakthrough':
          if (param.name === 'complexity') {
            parameters[param.name] = 'O(n log n)';
            appliedRules.push('Breakthrough vibe - challenging complexity');
          } else if (param.name === 'difficulty') {
            parameters[param.name] = 'hard';
            appliedRules.push('Breakthrough vibe - challenging difficulty');
          }
          break;

        default:
          parameters[param.name] = param.defaultValue || this.generateDefaultValue(param, context);
      }
    }

    return {
      parameters,
      confidence: 0.7,
      reasoning: `Parameters adjusted based on ${vibe} conversation vibe`,
      appliedRules,
      warnings: [],
      alternatives: []
    };
  }

  /**
   * Generate difficulty-based parameters
   */
  private async generateDifficultyBasedParameters(
    template: ExerciseTemplate,
    context: ParameterGenerationContext
  ): Promise<ParameterGenerationResult> {
    const parameters: Record<string, any> = {};
    const appliedRules: string[] = [];

    for (const param of template.parameters) {
      switch (context.userLevel) {
        case 'beginner':
          if (param.name === 'edgeCases') {
            parameters[param.name] = ['null input', 'empty input'];
            appliedRules.push('Beginner level - simplified edge cases');
          } else if (param.name === 'constraints') {
            parameters[param.name] = ['Basic constraints only'];
            appliedRules.push('Beginner level - basic constraints');
          }
          break;

        case 'advanced':
          if (param.name === 'edgeCases') {
            parameters[param.name] = ['null input', 'empty input', 'invalid types', 'large datasets', 'memory limits', 'concurrent access'];
            appliedRules.push('Advanced level - comprehensive edge cases');
          } else if (param.name === 'constraints') {
            parameters[param.name] = ['Optimal time complexity required', 'Memory efficiency critical', 'Handle edge cases'];
            appliedRules.push('Advanced level - challenging constraints');
          }
          break;

        default:
          parameters[param.name] = param.defaultValue || this.generateDefaultValue(param, context);
      }
    }

    return {
      parameters,
      confidence: 0.6,
      reasoning: `Parameters adjusted for ${context.userLevel} skill level`,
      appliedRules,
      warnings: [],
      alternatives: []
    };
  }

  /**
   * Generate contextual problem description
   */
  private generateContextualProblem(context: ParameterGenerationContext, paramType: string): string {
    const topic = context.currentTopic || 'programming';
    const concepts = context.recentConcepts.slice(0, 3).map(c => c.concept).join(', ');

    if (paramType === 'functionality') {
      return `Create a function that demonstrates understanding of ${topic}${concepts ? `, particularly focusing on ${concepts}` : ''}`;
    }

    if (paramType === 'problemStatement') {
      return `Solve a problem related to ${topic}${concepts ? ` using concepts like ${concepts}` : ''}`;
    }

    return `Exercise related to ${topic}`;
  }

  /**
   * Generate contextual function parameters
   */
  private generateContextualFunctionParams(context: ParameterGenerationContext): string[] {
    const params: string[] = [];

    if (context.currentTopic) {
      params.push(`${context.currentTopic.toLowerCase()}: object`);
    }

    if (context.projectContext) {
      context.projectContext.technologies.slice(0, 2).forEach(tech => {
        params.push(`${tech.toLowerCase()}Config: object`);
      });
    }

    if (params.length === 0) {
      params.push('data: any', 'options: object');
    }

    return params;
  }

  /**
   * Extract relevant concepts from context
   */
  private extractRelevantConcepts(context: ParameterGenerationContext): string[] {
    return context.recentConcepts
      .filter(c => c.confidence > 0.5)
      .slice(0, 5)
      .map(c => c.concept);
  }

  /**
   * Register a custom parameter generation strategy
   */
  registerStrategy(strategy: ParameterGenerationStrategy): void {
    this.strategies.set(strategy.name, strategy);
  }

  /**
   * Register a contextual data source
   */
  registerContextualDataSource(name: string, dataSource: () => Promise<any>): void {
    this.contextualDataSources.set(name, dataSource);
  }

  /**
   * Get parameter generation statistics
   */
  getStatistics(): {
    availableStrategies: string[];
    availableDataSources: string[];
    supportedParameterTypes: string[];
  } {
    return {
      availableStrategies: Array.from(this.strategies.keys()),
      availableDataSources: Array.from(this.contextualDataSources.keys()),
      supportedParameterTypes: ['string', 'number', 'array', 'boolean', 'enum', 'range']
    };
  }
}

/**
 * Global parameter generator instance
 */
export const parameterGenerator = new ParameterGenerator();