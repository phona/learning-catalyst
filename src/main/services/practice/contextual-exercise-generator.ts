/**
 * Contextual Exercise Generator
 *
 * Generates parameterized exercises based on conversation context, user state,
 * and learning objectives. Integrates with the parameterized template system
 * to create adaptive, relevant practice exercises.
 */

import { exerciseTemplateRegistry, ParameterizedExercise } from './exercise-templates';
import { parameterGenerator, ParameterGenerationContext } from './parameter-generator';
import { VibeType, UserContext, ConversationContext } from '@/shared/types/practice';

export interface ExerciseGenerationRequest {
  // Context information
  conversationId: string;
  userMessage?: string;
  sessionId?: string;
  currentTopic?: string;

  // User state
  userContext: UserContext;
  conversationContext: ConversationContext;

  // Generation preferences
  preferences: {
    exerciseType?: string;
    difficulty?: 'easy' | 'medium' | 'hard';
    category?: string;
    maxTime?: number; // minutes
    focusAreas?: string[];
  };

  // Specific requirements
  requirements?: {
    practiceSpecificConcept?: string;
    avoidRepetition?: boolean;
    buildOnRecentWork?: boolean;
    incorporateProjectContext?: boolean;
  };
}

export interface ExerciseGenerationResult {
  exercise: ParameterizedExercise;
  confidence: number;
  reasoning: string;
  alternatives: ParameterizedExercise[];
  metadata: {
    templateId: string;
    generationTime: number;
    parameterCount: number;
    contextualRelevance: number;
    adaptations: string[];
  };
}

export interface ExerciseGenerationStrategy {
  name: string;
  description: string;
  canHandle: (request: ExerciseGenerationRequest) => boolean;
  generate: (request: ExerciseGenerationRequest) => Promise<ExerciseGenerationResult>;
  priority: number;
}

/**
 * Contextual Exercise Generator Service
 */
export class ContextualExerciseGenerator {
  private strategies: ExerciseGenerationStrategy[] = [];
  private exerciseHistory = new Map<string, {
    exercises: ParameterizedExercise[];
    lastGenerated: number;
    conceptFrequency: Record<string, number>;
  }>();

  constructor() {
    this.initializeBuiltinStrategies();
  }

  /**
   * Generate a contextual exercise based on the request
   */
  async generateExercise(request: ExerciseGenerationRequest): Promise<ExerciseGenerationResult> {
    const startTime = Date.now();

    try {
      // Find applicable strategies
      const applicableStrategies = this.strategies
        .filter(strategy => strategy.canHandle(request))
        .sort((a, b) => b.priority - a.priority);

      if (applicableStrategies.length === 0) {
        throw new Error('No applicable exercise generation strategy found');
      }

      // Try strategies in order of priority
      for (const strategy of applicableStrategies) {
        try {
          const result = await strategy.generate(request);

          // Validate the result
          if (this.validateExerciseResult(result, request)) {
            // Record the exercise in history
            await this.recordExercise(request.conversationId, result.exercise);

            // Add metadata
            result.metadata.generationTime = Date.now() - startTime;

            return result;
          }
        } catch (error) {
          console.warn(`Exercise generation strategy ${strategy.name} failed:`, error);
        }
      }

      // Fallback to basic generation
      return await this.generateFallbackExercise(request);

    } catch (error) {
      console.error('All exercise generation strategies failed:', error);
      throw error;
    }
  }

  /**
   * Generate multiple exercise options
   */
  async generateExerciseOptions(
    request: ExerciseGenerationRequest,
    count: number = 3
  ): Promise<ExerciseGenerationResult[]> {
    const results: ExerciseGenerationResult[] = [];

    // Generate primary exercise
    const primaryResult = await this.generateExercise(request);
    results.push(primaryResult);

    // Generate alternatives with variations
    for (let i = 1; i < count; i++) {
      try {
        const variedRequest = this.createVariationRequest(request, i);
        const alternativeResult = await this.generateExercise(variedRequest);
        results.push(alternativeResult);
      } catch (error) {
        console.warn(`Failed to generate alternative exercise ${i}:`, error);
      }
    }

    return results;
  }

  /**
   * Generate adaptive exercise based on user performance
   */
  async generateAdaptiveExercise(
    request: ExerciseGenerationRequest,
    previousPerformance?: {
      success: boolean;
      timeSpent: number;
      difficultyRating: number;
      concepts: string[];
    }
  ): Promise<ExerciseGenerationResult> {
    // Adapt the request based on previous performance
    const adaptedRequest = this.adaptRequestForPerformance(request, previousPerformance);

    return this.generateExercise(adaptedRequest);
  }

  /**
   * Validate exercise generation result
   */
  private validateExerciseResult(
    result: ExerciseGenerationResult,
    request: ExerciseGenerationRequest
  ): boolean {
    const { exercise } = result;

    // Check basic structure
    if (!exercise || !exercise.generatedExercise) {
      return false;
    }

    // Check time constraints
    if (request.preferences.maxTime && exercise.estimatedTime > request.preferences.maxTime) {
      return false;
    }

    // Check difficulty preference
    if (request.preferences.difficulty && exercise.difficulty !== request.preferences.difficulty) {
      return false;
    }

    // Check concept relevance
    if (request.requirements?.practiceSpecificConcept) {
      const conceptRelevance = this.calculateConceptRelevance(
        exercise,
        request.requirements.practiceSpecificConcept
      );
      if (conceptRelevance < 0.5) {
        return false;
      }
    }

    return true;
  }

  /**
   * Adapt request based on previous performance
   */
  private adaptRequestForPerformance(
    request: ExerciseGenerationRequest,
    performance?: {
      success: boolean;
      timeSpent: number;
      difficultyRating: number;
      concepts: string[];
    }
  ): ExerciseGenerationRequest {
    if (!performance) {
      return request;
    }

    const adaptedRequest = { ...request };

    // Adjust difficulty based on performance
    if (performance.success && performance.difficultyRating > 0.7) {
      // User found it easy - increase difficulty
      if (request.preferences.difficulty === 'easy') {
        adaptedRequest.preferences.difficulty = 'medium';
      } else if (request.preferences.difficulty === 'medium') {
        adaptedRequest.preferences.difficulty = 'hard';
      }
    } else if (!performance.success || performance.difficultyRating < 0.4) {
      // User found it difficult - decrease difficulty
      if (request.preferences.difficulty === 'hard') {
        adaptedRequest.preferences.difficulty = 'medium';
      } else if (request.preferences.difficulty === 'medium') {
        adaptedRequest.preferences.difficulty = 'easy';
      }
    }

    // Adjust time based on performance
    if (performance.timeSpent > (request.preferences.maxTime || 30) * 0.9) {
      // User took too long - allow more time or choose simpler exercise
      adaptedRequest.preferences.maxTime = Math.min(60, (request.preferences.maxTime || 30) * 1.5);
    }

    // Build on concepts the user worked with
    if (performance.concepts.length > 0 && request.requirements?.buildOnRecentWork) {
      adaptedRequest.currentTopic = performance.concepts[0];
    }

    return adaptedRequest;
  }

  /**
   * Create variation request for alternative exercises
   */
  private createVariationRequest(request: ExerciseGenerationRequest, variationIndex: number): ExerciseGenerationRequest {
    const variedRequest = { ...request };

    // Vary difficulty
    const difficulties: ('easy' | 'medium' | 'hard')[] = ['easy', 'medium', 'hard'];
    const currentDifficultyIndex = difficulties.indexOf(request.preferences.difficulty || 'medium');
    const variedDifficultyIndex = (currentDifficultyIndex + variationIndex) % difficulties.length;
    variedRequest.preferences.difficulty = difficulties[variedDifficultyIndex];

    // Vary exercise type if available
    if (variationIndex > 0) {
      const exerciseTypes = exerciseTemplateRegistry.getAvailableTypes();
      const randomType = exerciseTypes[Math.floor(Math.random() * exerciseTypes.length)];
      variedRequest.preferences.exerciseType = randomType;
    }

    return variedRequest;
  }

  /**
   * Calculate concept relevance score
   */
  private calculateConceptRelevance(exercise: ParameterizedExercise, targetConcept: string): number {
    const concept = targetConcept.toLowerCase();

    // Check template relevance
    const template = exerciseTemplateRegistry.getTemplate(exercise.templateId);
    if (!template) return 0;

    let relevanceScore = 0;

    // Template name and description
    if (template.name.toLowerCase().includes(concept) ||
        template.description.toLowerCase().includes(concept)) {
      relevanceScore += 0.4;
    }

    // Template category
    if (template.category.toLowerCase().includes(concept)) {
      relevanceScore += 0.3;
    }

    // Generated exercise content
    const exerciseContent = JSON.stringify(exercise.generatedExercise).toLowerCase();
    if (exerciseContent.includes(concept)) {
      relevanceScore += 0.3;
    }

    return Math.min(1, relevanceScore);
  }

  /**
   * Record exercise in history
   */
  private async recordExercise(conversationId: string, exercise: ParameterizedExercise): Promise<void> {
    if (!this.exerciseHistory.has(conversationId)) {
      this.exerciseHistory.set(conversationId, {
        exercises: [],
        lastGenerated: Date.now(),
        conceptFrequency: {}
      });
    }

    const history = this.exerciseHistory.get(conversationId)!;
    history.exercises.push(exercise);
    history.lastGenerated = Date.now();

    // Update concept frequency
    const template = exerciseTemplateRegistry.getTemplate(exercise.templateId);
    if (template) {
      const concepts = [
        template.category,
        template.name,
        ...template.learningObjectives
      ].map(c => c.toLowerCase());

      concepts.forEach(concept => {
        history.conceptFrequency[concept] = (history.conceptFrequency[concept] || 0) + 1;
      });
    }

    // Keep only last 20 exercises
    if (history.exercises.length > 20) {
      history.exercises = history.exercises.slice(-20);
    }
  }

  /**
   * Generate fallback exercise
   */
  private async generateFallbackExercise(request: ExerciseGenerationRequest): Promise<ExerciseGenerationResult> {
    // Get a basic template that should always work
    const templates = exerciseTemplateRegistry.getFilteredTemplates({
      difficulty: request.preferences.difficulty || 'medium'
    });

    if (templates.length === 0) {
      throw new Error('No suitable templates found for fallback exercise generation');
    }

    const template = templates[0];

    // Create basic context
    const context: ParameterGenerationContext = {
      userContext: request.userContext,
      conversationContext: request.conversationContext,
      currentTopic: request.currentTopic,
      userLevel: this.determineUserLevel(request.userContext),
      preferences: {
        difficultyPreference: request.preferences.difficulty || 'medium',
        learningStyle: request.userContext.preferences?.feedbackStyle as any || 'reading',
        focusAreas: request.preferences.focusAreas || []
      },
      recentConcepts: request.userContext.recentConcepts,
      projectContext: request.requirements?.incorporateProjectContext ?
        request.userContext.currentProject : undefined
    };

    try {
      const parameterizedExercise = await parameterGenerator.generateParameterizedExercise(template, context);

      return {
        exercise: parameterizedExercise,
        confidence: 0.6,
        reasoning: 'Generated using fallback template and basic parameter generation',
        alternatives: [],
        metadata: {
          templateId: template.id,
          generationTime: 0,
          parameterCount: Object.keys(parameterizedExercise.parameters).length,
          contextualRelevance: 0.5,
          adaptations: ['fallback_generation']
        }
      };
    } catch (error) {
      throw new Error(`Fallback exercise generation failed: ${error.message}`);
    }
  }

  /**
   * Determine user level from context
   */
  private determineUserLevel(userContext: UserContext): 'beginner' | 'intermediate' | 'advanced' {
    const confidence = userContext.confidenceLevel;
    const velocity = userContext.learningVelocity || 1.0;
    const recentSuccess = userContext.recentConcepts.filter(c => c.confidence > 0.7).length;

    if (confidence < 0.4 || velocity < 0.8 || recentSuccess < 2) {
      return 'beginner';
    } else if (confidence > 0.8 && velocity > 1.2 && recentSuccess > 5) {
      return 'advanced';
    } else {
      return 'intermediate';
    }
  }

  /**
   * Initialize built-in generation strategies
   */
  private initializeBuiltinStrategies(): void {
    // Vibe-based strategy
    this.strategies.push({
      name: 'vibe-based',
      description: 'Generate exercises based on detected conversation vibe',
      priority: 100,
      canHandle: (request) => {
        return request.conversationContext.detectedVibe !== undefined;
      },
      generate: async (request) => {
        return this.generateVibeBasedExercise(request);
      }
    });

    // Concept-specific strategy
    this.strategies.push({
      name: 'concept-specific',
      description: 'Generate exercises for specific concepts',
      priority: 90,
      canHandle: (request) => {
        return request.requirements?.practiceSpecificConcept !== undefined ||
               request.currentTopic !== undefined;
      },
      generate: async (request) => {
        return this.generateConceptSpecificExercise(request);
      }
    });

    // Project-based strategy
    this.strategies.push({
      name: 'project-based',
      description: 'Generate exercises based on user project context',
      priority: 80,
      canHandle: (request) => {
        return request.requirements?.incorporateProjectContext === true &&
               request.userContext.currentProject !== undefined;
      },
      generate: async (request) => {
        return this.generateProjectBasedExercise(request);
      }
    });

    // Adaptive strategy
    this.strategies.push({
      name: 'adaptive',
      description: 'Generate exercises based on user performance and history',
      priority: 70,
      canHandle: (request) => {
        return request.userContext.recentConcepts.length > 0;
      },
      generate: async (request) => {
        return this.generateAdaptiveExercise(request);
      }
    });

    // General strategy (always applicable)
    this.strategies.push({
      name: 'general',
      description: 'General purpose exercise generation',
      priority: 10,
      canHandle: () => true,
      generate: async (request) => {
        return this.generateGeneralExercise(request);
      }
    });
  }

  /**
   * Generate vibe-based exercise
   */
  private async generateVibeBasedExercise(request: ExerciseGenerationRequest): Promise<ExerciseGenerationResult> {
    const vibe = request.conversationContext.detectedVibe!;

    // Filter templates by vibe compatibility
    const templates = exerciseTemplateRegistry.getFilteredTemplates({
      difficulty: request.preferences.difficulty,
      vibeType: vibe,
      topicContext: request.currentTopic ? [request.currentTopic] : undefined
    });

    if (templates.length === 0) {
      throw new Error(`No templates found for vibe: ${vibe}`);
    }

    // Select template based on vibe
    const template = this.selectTemplateForVibe(templates, vibe);

    // Generate parameters with vibe context
    const context = this.createParameterGenerationContext(request);
    const exercise = await parameterGenerator.generateParameterizedExercise(template, context);

    return {
      exercise,
      confidence: 0.85,
      reasoning: `Generated exercise based on ${vibe} conversation vibe`,
      alternatives: [],
      metadata: {
        templateId: template.id,
        generationTime: 0,
        parameterCount: Object.keys(exercise.parameters).length,
        contextualRelevance: 0.9,
        adaptations: ['vibe_based_selection']
      }
    };
  }

  /**
   * Generate concept-specific exercise
   */
  private async generateConceptSpecificExercise(request: ExerciseGenerationRequest): Promise<ExerciseGenerationResult> {
    const concept = request.requirements?.practiceSpecificConcept || request.currentTopic!;

    // Find templates related to the concept
    const templates = exerciseTemplateRegistry.getFilteredTemplates({
      topicContext: [concept]
    });

    if (templates.length === 0) {
      throw new Error(`No templates found for concept: ${concept}`);
    }

    // Select best matching template
    const template = this.selectBestConceptTemplate(templates, concept);

    // Generate parameters with concept focus
    const context = this.createParameterGenerationContext(request);
    context.currentTopic = concept;

    const exercise = await parameterGenerator.generateParameterizedExercise(template, context);

    return {
      exercise,
      confidence: 0.9,
      reasoning: `Generated exercise specifically for ${concept} concept`,
      alternatives: [],
      metadata: {
        templateId: template.id,
        generationTime: 0,
        parameterCount: Object.keys(exercise.parameters).length,
        contextualRelevance: 1.0,
        adaptations: ['concept_focused']
      }
    };
  }

  /**
   * Generate project-based exercise
   */
  private async generateProjectBasedExercise(request: ExerciseGenerationRequest): Promise<ExerciseGenerationResult> {
    const project = request.userContext.currentProject!;

    // Find templates suitable for project context
    const templates = exerciseTemplateRegistry.getFilteredTemplates({
      category: this.mapProjectToCategory(project.type)
    });

    if (templates.length === 0) {
      throw new Error(`No templates found for project type: ${project.type}`);
    }

    const template = templates[0];

    // Generate parameters with project context
    const context = this.createParameterGenerationContext(request);
    context.projectContext = {
      name: project.name,
      type: project.type,
      technologies: project.technologies,
      currentTask: project.currentTask
    };

    const exercise = await parameterGenerator.generateParameterizedExercise(template, context);

    return {
      exercise,
      confidence: 0.95,
      reasoning: `Generated exercise based on ${project.name} project context`,
      alternatives: [],
      metadata: {
        templateId: template.id,
        generationTime: 0,
        parameterCount: Object.keys(exercise.parameters).length,
        contextualRelevance: 1.0,
        adaptations: ['project_contextualized']
      }
    };
  }

  
  /**
   * Generate general exercise
   */
  private async generateGeneralExercise(request: ExerciseGenerationRequest): Promise<ExerciseGenerationResult> {
    // Get appropriate templates
    const templates = exerciseTemplateRegistry.getFilteredTemplates({
      difficulty: request.preferences.difficulty,
      type: request.preferences.exerciseType as any,
      category: request.preferences.category as any
    });

    if (templates.length === 0) {
      throw new Error('No suitable templates found for general exercise generation');
    }

    const template = templates[Math.floor(Math.random() * templates.length)];
    const context = this.createParameterGenerationContext(request);
    const exercise = await parameterGenerator.generateParameterizedExercise(template, context);

    return {
      exercise,
      confidence: 0.7,
      reasoning: 'Generated general exercise based on user preferences',
      alternatives: [],
      metadata: {
        templateId: template.id,
        generationTime: 0,
        parameterCount: Object.keys(exercise.parameters).length,
        contextualRelevance: 0.6,
        adaptations: ['general_selection']
      }
    };
  }

  /**
   * Create parameter generation context from request
   */
  private createParameterGenerationContext(request: ExerciseGenerationRequest): ParameterGenerationContext {
    return {
      userContext: request.userContext,
      conversationContext: request.conversationContext,
      currentTopic: request.currentTopic,
      userLevel: this.determineUserLevel(request.userContext),
      preferences: {
        difficultyPreference: request.preferences.difficulty || 'medium',
        learningStyle: request.userContext.preferences?.feedbackStyle as any || 'reading',
        timeConstraint: request.preferences.maxTime,
        focusAreas: request.preferences.focusAreas || []
      },
      recentConcepts: request.userContext.recentConcepts,
      projectContext: request.userContext.currentProject
    };
  }

  /**
   * Select template based on vibe
   */
  private selectTemplateForVibe(templates: any[], vibe: VibeType): any {
    const vibePreferences = {
      understanding: 'coding',
      confused: 'practical',
      breakthrough: 'design',
      practicing: 'debugging',
      misunderstanding: 'analysis'
    };

    const preferredType = vibePreferences[vibe];
    const matchingTemplates = templates.filter(t => t.type === preferredType);

    return matchingTemplates.length > 0 ?
      matchingTemplates[Math.floor(Math.random() * matchingTemplates.length)] :
      templates[Math.floor(Math.random() * templates.length)];
  }

  /**
   * Select best template for concept
   */
  private selectBestConceptTemplate(templates: any[], concept: string): any {
    // Score templates based on concept relevance
    const scoredTemplates = templates.map(template => {
      const content = `${template.name} ${template.description} ${template.category}`.toLowerCase();
      const conceptLower = concept.toLowerCase();

      let score = 0;
      if (content.includes(conceptLower)) score += 3;
      if (template.learningObjectives.some(obj => obj.toLowerCase().includes(conceptLower))) score += 2;
      if (template.prerequisites.some(pre => pre.toLowerCase().includes(conceptLower))) score += 1;

      return { template, score };
    });

    scoredTemplates.sort((a, b) => b.score - a.score);
    return scoredTemplates[0]?.template || templates[0];
  }

  /**
   * Map project type to template category
   */
  private mapProjectToCategory(projectType: string): string {
    const mapping: Record<string, string> = {
      'web': 'web-development',
      'mobile': 'programming',
      'desktop': 'programming',
      'api': 'web-development',
      'database': 'database',
      'ml': 'programming',
      'game': 'programming'
    };

    return mapping[projectType.toLowerCase()] || 'programming';
  }

  /**
   * Get exercise generation statistics
   */
  getStatistics(): {
    availableStrategies: string[];
    exerciseHistory: Record<string, number>;
    templateUsage: Record<string, number>;
  } {
    const exerciseHistory: Record<string, number> = {};
    const templateUsage: Record<string, number> = {};

    for (const [conversationId, history] of this.exerciseHistory.entries()) {
      exerciseHistory[conversationId] = history.exercises.length;

      history.exercises.forEach(exercise => {
        templateUsage[exercise.templateId] = (templateUsage[exercise.templateId] || 0) + 1;
      });
    }

    return {
      availableStrategies: this.strategies.map(s => s.name),
      exerciseHistory,
      templateUsage
    };
  }

  /**
   * Register custom generation strategy
   */
  registerStrategy(strategy: ExerciseGenerationStrategy): void {
    this.strategies.push(strategy);
    this.strategies.sort((a, b) => b.priority - a.priority);
  }
}

/**
 * Global exercise generator instance
 */
export const contextualExerciseGenerator = new ContextualExerciseGenerator();