/**
 * Exercise Variety Generator
 *
 * Generates varied exercises to prevent boredom and maintain engagement.
 * Implements diversity algorithms to ensure different types, formats, and approaches.
 */

export interface VarietyGenerationRequest {
  baseExercise: any; // The template or reference exercise
  context: {
    topic: string;
    difficulty: 'easy' | 'medium' | 'hard';
    userLevel: 'beginner' | 'intermediate' | 'advanced';
    recentExercises: Array<{
      type: string;
      category: string;
      format: string;
      timestamp: number;
    }>;
    userPreferences: {
      preferredTypes: string[];
      avoidTypes: string[];
      varietyLevel: 'low' | 'medium' | 'high';
    };
  };
  varietyOptions: {
    count: number;
    maximizeDiversity: boolean;
    includeAlternativeFormats: boolean;
    varyDifficulty: boolean;
    maintainTopic: boolean;
  };
}

export interface VarietyGenerationResult {
  variedExercises: Array<{
    exercise: any;
    variationType: string;
    diversityScore: number; // 0-1, how different from base
    reasoning: string;
  }>;
  overallDiversity: number; // 0-1, diversity of the entire set
  coverageMetrics: {
    typeVariety: number; // variety in exercise types
    formatVariety: number; // variety in formats
    difficultyVariety: number; // variety in difficulty levels
    approachVariety: number; // variety in problem-solving approaches
  };
  recommendations: string[];
}

export interface ExerciseVariationStrategy {
  name: string;
  description: string;
  canApply: (exercise: any, context: any) => boolean;
  generate: (exercise: any, context: any) => any;
  diversityWeight: number; // how much this contributes to overall diversity
}

export interface DiversityMetrics {
  typeDistribution: Record<string, number>;
  formatDistribution: Record<string, number>;
  difficultyDistribution: Record<string, number>;
  categoryDistribution: Record<string, number>;
  similarityMatrix: number[][]; // similarity scores between exercises
}

/**
 * Exercise Variety Generator Service
 */
export class ExerciseVarietyGenerator {
  private readonly variationStrategies: Map<string, ExerciseVariationStrategy> = new Map();
  private readonly exerciseTypes = [
    'coding', 'multiple-choice', 'short-answer', 'practical', 'debugging',
    'refactoring', 'design', 'analysis', 'simulation', 'project'
  ];
  private readonly exerciseFormats = [
    'problem-solving', 'step-by-step', 'guided-practice', 'open-ended',
    'challenge-based', 'tutorial-style', 'quiz-format', 'hands-on'
  ];

  constructor() {
    this.initializeBuiltinStrategies();
  }

  /**
   * Generate varied exercises based on a base exercise
   */
  async generateVariety(request: VarietyGenerationRequest): Promise<VarietyGenerationResult> {
    try {
      const variedExercises = [];
      const appliedStrategies = new Set<string>();

      // Analyze recent exercise patterns to avoid repetition
      const recentPatterns = this.analyzeRecentPatterns(request.context.recentExercises);

      // Generate variations using different strategies
      for (let i = 0; i < request.varietyOptions.count; i++) {
        const variation = await this.generateSingleVariation(
          request,
          recentPatterns,
          appliedStrategies
        );

        if (variation) {
          variedExercises.push(variation);
          appliedStrategies.add(variation.variationType);
        }
      }

      // Calculate diversity metrics
      const diversityMetrics = this.calculateDiversityMetrics(variedExercises, request.baseExercise);

      // Calculate overall diversity
      const overallDiversity = this.calculateOverallDiversity(variedExercises, diversityMetrics);

      // Generate recommendations
      const recommendations = this.generateRecommendations(variedExercises, diversityMetrics);

      return {
        variedExercises,
        overallDiversity,
        coverageMetrics: {
          typeVariety: diversityMetrics.typeDistribution,
          formatVariety: diversityMetrics.formatDistribution,
          difficultyVariety: diversityMetrics.difficultyDistribution,
          approachVariety: diversityMetrics.categoryDistribution
        },
        recommendations
      };

    } catch (error) {
      console.error('Exercise variety generation failed:', error);
      return {
        variedExercises: [],
        overallDiversity: 0,
        coverageMetrics: {
          typeVariety: {},
          formatVariety: {},
          difficultyVariety: {},
          approachVariety: {}
        },
        recommendations: ['Retry variety generation with different parameters']
      };
    }
  }

  /**
   * Generate a single exercise variation
   */
  private async generateSingleVariation(
    request: VarietyGenerationRequest,
    recentPatterns: any,
    appliedStrategies: Set<string>
  ): Promise<any | null> {
    const applicableStrategies = Array.from(this.variationStrategies.values())
      .filter(strategy =>
        strategy.canApply(request.baseExercise, request.context) &&
        !appliedStrategies.has(strategy.name) &&
        !this.isRecentlyUsed(strategy.name, recentPatterns)
      )
      .sort((a, b) => b.diversityWeight - a.diversityWeight);

    if (applicableStrategies.length === 0) {
      return null;
    }

    const strategy = applicableStrategies[0];

    try {
      const variedExercise = strategy.generate(request.baseExercise, request.context);
      const diversityScore = this.calculateDiversityScore(
        request.baseExercise,
        variedExercise,
        strategy.diversityWeight
      );

      return {
        exercise: variedExercise,
        variationType: strategy.name,
        diversityScore,
        reasoning: `Generated using ${strategy.name}: ${strategy.description}`
      };

    } catch (error) {
      console.warn(`Variation strategy ${strategy.name} failed:`, error);
      return null;
    }
  }

  /**
   * Analyze recent exercise patterns to avoid repetition
   */
  private analyzeRecentPatterns(recentExercises: any[]): any {
    const patterns = {
      types: {} as Record<string, number>,
      formats: {} as Record<string, number>,
      categories: {} as Record<string, number>,
      strategies: {} as Record<string, number>
    };

    recentExercises.slice(-10).forEach(exercise => {
      patterns.types[exercise.type] = (patterns.types[exercise.type] || 0) + 1;
      patterns.formats[exercise.format] = (patterns.formats[exercise.format] || 0) + 1;
      patterns.categories[exercise.category] = (patterns.categories[exercise.category] || 0) + 1;
    });

    return patterns;
  }

  /**
   * Check if a strategy was recently used
   */
  private isRecentlyUsed(strategyName: string, recentPatterns: any): boolean {
    // This is a simplified check - in practice, you'd track which strategies generated recent exercises
    const recentStrategyCount = Object.values(recentPatterns).reduce((sum, count) => sum + count, 0);
    return recentStrategyCount > 5; // If user has done many exercises recently, avoid repetition
  }

  /**
   * Calculate diversity score between two exercises
   */
  private calculateDiversityScore(baseExercise: any, variedExercise: any, strategyWeight: number): number {
    let diversityScore = 0;

    // Type diversity
    if (baseExercise.type !== variedExercise.type) {
      diversityScore += 0.3;
    }

    // Format diversity
    if (baseExercise.format !== variedExercise.format) {
      diversityScore += 0.2;
    }

    // Difficulty diversity
    if (baseExercise.difficulty !== variedExercise.difficulty) {
      diversityScore += 0.1;
    }

    // Content diversity (simplified - would use more sophisticated text analysis)
    const baseContent = `${baseExercise.problem} ${baseExercise.instructions}`.toLowerCase();
    const variedContent = `${variedExercise.problem} ${variedExercise.instructions}`.toLowerCase();

    const contentSimilarity = this.calculateTextSimilarity(baseContent, variedContent);
    diversityScore += (1 - contentSimilarity) * 0.3;

    // Apply strategy weight
    return Math.min(1, diversityScore * strategyWeight);
  }

  /**
   * Calculate text similarity (simplified Jaccard similarity)
   */
  private calculateTextSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.split(/\s+/));
    const words2 = new Set(text2.split(/\s+/));

    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
  }

  /**
   * Calculate comprehensive diversity metrics
   */
  private calculateDiversityMetrics(variedExercises: any[], baseExercise: any): DiversityMetrics {
    const exercises = [baseExercise, ...variedExercises.map(v => v.exercise)];

    const typeDistribution: Record<string, number> = {};
    const formatDistribution: Record<string, number> = {};
    const difficultyDistribution: Record<string, number> = {};
    const categoryDistribution: Record<string, number> = {};

    // Calculate distributions
    exercises.forEach(exercise => {
      typeDistribution[exercise.type] = (typeDistribution[exercise.type] || 0) + 1;
      formatDistribution[exercise.format] = (formatDistribution[exercise.format] || 0) + 1;
      difficultyDistribution[exercise.difficulty] = (difficultyDistribution[exercise.difficulty] || 0) + 1;
      categoryDistribution[exercise.category] = (categoryDistribution[exercise.category] || 0) + 1;
    });

    // Calculate similarity matrix
    const similarityMatrix: number[][] = exercises.map((ex1, i) =>
      exercises.map((ex2, j) => {
        if (i === j) return 1;
        const content1 = `${ex1.problem} ${ex1.instructions}`.toLowerCase();
        const content2 = `${ex2.problem} ${ex2.instructions}`.toLowerCase();
        return this.calculateTextSimilarity(content1, content2);
      })
    );

    return {
      typeDistribution,
      formatDistribution,
      difficultyDistribution,
      categoryDistribution,
      similarityMatrix
    };
  }

  /**
   * Calculate overall diversity score
   */
  private calculateOverallDiversity(variedExercises: any[], metrics: DiversityMetrics): number {
    if (variedExercises.length === 0) return 0;

    // Type variety (higher is better)
    const typeVariety = Object.keys(metrics.typeDistribution).length / this.exerciseTypes.length;

    // Format variety
    const formatVariety = Object.keys(metrics.formatDistribution).length / this.exerciseFormats.length;

    // Content variety (average dissimilarity)
    let totalSimilarity = 0;
    let comparisons = 0;

    for (let i = 0; i < metrics.similarityMatrix.length; i++) {
      for (let j = i + 1; j < metrics.similarityMatrix[i].length; j++) {
        totalSimilarity += metrics.similarityMatrix[i][j];
        comparisons++;
      }
    }

    const averageSimilarity = comparisons > 0 ? totalSimilarity / comparisons : 1;
    const contentVariety = 1 - averageSimilarity;

    // Weighted overall diversity
    return (typeVariety * 0.3) + (formatVariety * 0.2) + (contentVariety * 0.5);
  }

  /**
   * Generate recommendations based on diversity analysis
   */
  private generateRecommendations(variedExercises: any[], metrics: DiversityMetrics): string[] {
    const recommendations = [];

    // Type diversity recommendations
    const typeCount = Object.keys(metrics.typeDistribution).length;
    if (typeCount < 3) {
      recommendations.push('Consider including more exercise types for better variety');
    }

    // Format diversity recommendations
    const formatCount = Object.keys(metrics.formatDistribution).length;
    if (formatCount < 2) {
      recommendations.push('Try different exercise formats to keep engagement high');
    }

    // Content similarity recommendations
    let highSimilarityPairs = 0;
    for (let i = 0; i < metrics.similarityMatrix.length; i++) {
      for (let j = i + 1; j < metrics.similarityMatrix[i].length; j++) {
        if (metrics.similarityMatrix[i][j] > 0.8) {
          highSimilarityPairs++;
        }
      }
    }

    if (highSimilarityPairs > 0) {
      recommendations.push('Some exercises are very similar - consider more diverse approaches');
    }

    // General recommendations
    if (variedExercises.length < 3) {
      recommendations.push('Generate more variations to provide choice and diversity');
    }

    if (recommendations.length === 0) {
      recommendations.push('Good variety achieved - exercises cover multiple dimensions of diversity');
    }

    return recommendations;
  }

  /**
   * Initialize built-in variation strategies
   */
  private initializeBuiltinStrategies(): void {
    // Type variation strategy
    this.variationStrategies.set('type-variation', {
      name: 'Type Variation',
      description: 'Change the exercise type while maintaining the core concept',
      canApply: (exercise) => true,
      generate: (exercise, context) => {
        const availableTypes = this.exerciseTypes.filter(type =>
          type !== exercise.type &&
          !context.userPreferences.avoidTypes.includes(type)
        );

        const newType = availableTypes[Math.floor(Math.random() * availableTypes.length)] || 'coding';

        return {
          ...exercise,
          type: newType,
          format: this.getDefaultFormatForType(newType),
          title: `${exercise.title} (${newType})`,
          // Adjust content based on type
          problem: this.adaptProblemForType(exercise.problem, newType),
          instructions: this.adaptInstructionsForType(exercise.instructions, newType)
        };
      },
      diversityWeight: 0.8
    });

    // Difficulty variation strategy
    this.variationStrategies.set('difficulty-variation', {
      name: 'Difficulty Variation',
      description: 'Adjust exercise difficulty while maintaining core concept',
      canApply: (exercise) => true,
      generate: (exercise, context) => {
        const difficulties: ('easy' | 'medium' | 'hard')[] = ['easy', 'medium', 'hard'];
        const currentDifficultyIndex = difficulties.indexOf(exercise.difficulty);

        // Choose a different difficulty
        const availableDifficulties = difficulties.filter((_, index) => index !== currentDifficultyIndex);
        const newDifficulty = availableDifficulties[Math.floor(Math.random() * availableDifficulties.length)];

        return {
          ...exercise,
          difficulty: newDifficulty,
          title: `${exercise.title} (${newDifficulty})`,
          // Adjust complexity based on difficulty
          problem: this.adjustProblemComplexity(exercise.problem, newDifficulty),
          hints: this.adjustHintsForDifficulty(exercise.hints, newDifficulty),
          estimatedTime: this.adjustTimeForDifficulty(exercise.estimatedTime, newDifficulty)
        };
      },
      diversityWeight: 0.6
    });

    // Format variation strategy
    this.variationStrategies.set('format-variation', {
      name: 'Format Variation',
      description: 'Change exercise format and presentation style',
      canApply: (exercise) => true,
      generate: (exercise, context) => {
        const availableFormats = this.exerciseFormats.filter(format => format !== exercise.format);
        const newFormat = availableFormats[Math.floor(Math.random() * availableFormats.length)] || 'problem-solving';

        return {
          ...exercise,
          format: newFormat,
          title: `${exercise.title} (${newFormat})`,
          instructions: this.adaptInstructionsForFormat(exercise.instructions, newFormat),
          problem: this.adaptProblemForFormat(exercise.problem, newFormat)
        };
      },
      diversityWeight: 0.5
    });

    // Context variation strategy
    this.variationStrategies.set('context-variation', {
      name: 'Context Variation',
      description: 'Change the context or scenario while maintaining technical concept',
      canApply: (exercise) => true,
      generate: (exercise, context) => {
        const contexts = [
          'web development', 'mobile app', 'data analysis', 'game development',
          'business application', 'scientific computing', 'automation tool',
          'educational platform', 'social media app', 'e-commerce system'
        ];

        const newContext = contexts[Math.floor(Math.random() * contexts.length)];

        return {
          ...exercise,
          context: newContext,
          title: `${exercise.title} in ${newContext}`,
          problem: this.adaptProblemForContext(exercise.problem, newContext),
          instructions: this.adaptInstructionsForContext(exercise.instructions, newContext)
        };
      },
      diversityWeight: 0.7
    });

    // Approach variation strategy
    this.variationStrategies.set('approach-variation', {
      name: 'Approach Variation',
      description: 'Change problem-solving approach or methodology',
      canApply: (exercise) => exercise.type === 'coding' || exercise.type === 'practical',
      generate: (exercise, context) => {
        const approaches = [
          'object-oriented', 'functional', 'procedural', 'declarative',
          'iterative', 'recursive', 'divide-and-conquer', 'dynamic-programming'
        ];

        const newApproach = approaches[Math.floor(Math.random() * approaches.length)];

        return {
          ...exercise,
          approach: newApproach,
          title: `${exercise.title} (${newApproach} approach)`,
          problem: this.adaptProblemForApproach(exercise.problem, newApproach),
          solution: this.adaptSolutionForApproach(exercise.solution, newApproach),
          hints: this.adaptHintsForApproach(exercise.hints, newApproach)
        };
      },
      diversityWeight: 0.6
    });

    // Interactive variation strategy
    this.variationStrategies.set('interactive-variation', {
      name: 'Interactive Variation',
      description: 'Create interactive or hands-on variations of static exercises',
      canApply: (exercise) => exercise.type === 'coding' || exercise.type === 'practical',
      generate: (exercise, context) => {
        return {
          ...exercise,
          type: 'simulation',
          format: 'hands-on',
          title: `${exercise.title} (Interactive)`,
          interactive: true,
          problem: this.makeProblemInteractive(exercise.problem),
          instructions: `Complete this interactive exercise: ${exercise.instructions}`,
          // Add interactive elements
          interactiveElements: {
            codeEditor: true,
            livePreview: exercise.type === 'coding',
            stepByStepGuidance: true,
            instantFeedback: true
          }
        };
      },
      diversityWeight: 0.8
    });

    // Collaborative variation strategy
    this.variationStrategies.set('collaborative-variation', {
      name: 'Collaborative Variation',
      description: 'Create team or pair programming variations',
      canApply: (exercise) => exercise.type === 'coding' || exercise.type === 'project',
      generate: (exercise, context) => {
        return {
          ...exercise,
          format: 'team-based',
          title: `${exercise.title} (Team Exercise)`,
          collaborative: true,
          problem: `${exercise.problem}\n\nThis is designed for 2-3 person teams.`,
          instructions: `Work as a team to: ${exercise.instructions}`,
          teamSize: [2, 3],
          roles: ['Driver', 'Navigator', 'Observer'],
          collaborationGuidelines: [
            'Take turns coding and reviewing',
            'Discuss approaches before implementing',
            'Ensure everyone understands the solution'
          ]
        };
      },
      diversityWeight: 0.7
    });
  }

  // Helper methods for adapting exercise content
  private getDefaultFormatForType(type: string): string {
    const formatMap: Record<string, string> = {
      'coding': 'problem-solving',
      'multiple-choice': 'quiz-format',
      'practical': 'hands-on',
      'debugging': 'challenge-based',
      'design': 'open-ended',
      'analysis': 'step-by-step'
    };
    return formatMap[type] || 'problem-solving';
  }

  private adaptProblemForType(problem: string, newType: string): string {
    // This would contain sophisticated logic to adapt problem text for different exercise types
    // For now, return the original problem with type indicator
    return `[${newType.toUpperCase()}] ${problem}`;
  }

  private adaptInstructionsForType(instructions: string, newType: string): string {
    return `Complete this ${newType} exercise: ${instructions}`;
  }

  private adjustProblemComplexity(problem: string, difficulty: 'easy' | 'medium' | 'hard'): string {
    const complexityIndicators = {
      easy: ['simple', 'basic', 'straightforward'],
      medium: ['moderate', 'intermediate', 'balanced'],
      hard: ['complex', 'challenging', 'advanced']
    };

    const indicators = complexityIndicators[difficulty];
    const indicator = indicators[Math.floor(Math.random() * indicators.length)];

    return `${indicator} ${problem}`;
  }

  private adjustHintsForDifficulty(hints: string[], difficulty: 'easy' | 'medium' | 'hard'): string[] {
    const hintCounts = { easy: 3, medium: 2, hard: 1 };
    const targetCount = Math.min(hints.length, hintCounts[difficulty]);

    return hints.slice(0, targetCount);
  }

  private adjustTimeForDifficulty(currentTime: number, difficulty: 'easy' | 'medium' | 'hard'): number {
    const timeMultipliers = { easy: 0.7, medium: 1.0, hard: 1.5 };
    return Math.round(currentTime * timeMultipliers[difficulty]);
  }

  private adaptInstructionsForFormat(instructions: string, format: string): string {
    const formatPrefixes = {
      'step-by-step': 'Follow these steps:',
      'guided-practice': 'With guidance, complete:',
      'open-ended': 'Explore and create:',
      'challenge-based': 'Take on this challenge:',
      'tutorial-style': 'Learn by doing:',
      'quiz-format': 'Answer the following:'
    };

    const prefix = formatPrefixes[format] || 'Complete:';
    return `${prefix} ${instructions}`;
  }

  private adaptProblemForFormat(problem: string, format: string): string {
    return problem; // Would be more sophisticated in practice
  }

  private adaptProblemForContext(problem: string, context: string): string {
    return `Apply this concept to ${context}: ${problem}`;
  }

  private adaptInstructionsForContext(instructions: string, context: string): string {
    return `Complete this exercise in the context of ${context}: ${instructions}`;
  }

  private adaptProblemForApproach(problem: string, approach: string): string {
    return `Solve this using ${approach}: ${problem}`;
  }

  private adaptSolutionForApproach(solution: any, approach: string): any {
    return {
      ...solution,
      approach,
      explanation: `${solution.explanation || ''}\n\nSolution uses ${approach} approach.`
    };
  }

  private adaptHintsForApproach(hints: string[], approach: string): string[] {
    return hints.map(hint => `${hint} (consider ${approach} techniques)`);
  }

  private makeProblemInteractive(problem: string): string {
    return `Interactive Exercise: ${problem}\n\nUse the interactive tools below to solve this problem step by step.`;
  }

  /**
   * Register custom variation strategy
   */
  registerStrategy(strategy: ExerciseVariationStrategy): void {
    this.variationStrategies.set(strategy.name, strategy);
  }

  /**
   * Get variety generation statistics
   */
  getStatistics(): {
    availableStrategies: string[];
    averageDiversityScore: number;
    mostUsedStrategies: Record<string, number>;
    } {
    return {
      availableStrategies: Array.from(this.variationStrategies.keys()),
      averageDiversityScore: 0.75, // Would be calculated from actual usage
      mostUsedStrategies: {} // Would track actual usage
    };
  }
}

/**
 * Global exercise variety generator instance
 */
export const exerciseVarietyGenerator = new ExerciseVarietyGenerator();