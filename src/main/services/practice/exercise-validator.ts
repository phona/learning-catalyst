/**
 * Exercise Validation Service
 *
 * Comprehensive validation and feedback system for generated exercises.
 * Ensures exercise quality, correctness, and educational effectiveness.
 */

export interface ExerciseValidationRequest {
  exercise: any; // The exercise to validate
  context: {
    topic: string;
    difficulty: 'easy' | 'medium' | 'hard';
    exerciseType: string;
    userLevel: 'beginner' | 'intermediate' | 'advanced';
    learningObjectives: string[];
  };
  validationOptions: {
    checkSolution: boolean;
    validateDifficulty: boolean;
    checkClarity: boolean;
    verifyCompleteness: boolean;
    testSolvability: boolean;
  };
}

export interface ExerciseValidationResult {
  isValid: boolean;
  overallScore: number; // 0-100
  categories: {
    correctness: ValidationCategory;
    clarity: ValidationCategory;
    difficulty: ValidationCategory;
    completeness: ValidationCategory;
    educational: ValidationCategory;
  };
  issues: ValidationIssue[];
  suggestions: ValidationSuggestion[];
  feedback: string;
  requiresRevision: boolean;
  revisionActions: string[];
}

export interface ValidationCategory {
  score: number; // 0-100
  weight: number; // 0-1, importance in overall score
  passed: boolean;
  feedback: string;
}

export interface ValidationIssue {
  severity: 'error' | 'warning' | 'info';
  category: string;
  message: string;
  location?: string; // where in the exercise the issue occurs
  suggestion?: string;
}

export interface ValidationSuggestion {
  type: 'improvement' | 'enhancement' | 'alternative';
  category: string;
  message: string;
  priority: 'high' | 'medium' | 'low';
  actionable: boolean;
}

export interface ExerciseSolutionValidator {
  name: string;
  canValidate: (exercise: any) => boolean;
  validate: (exercise: any, solution: any) => Promise<{
    isCorrect: boolean;
    confidence: number;
    feedback: string;
    errors: string[];
    suggestions: string[];
  }>;
}

export interface NaturalLanguageResponse {
  userResponse: string;
  expectedConcepts: string[];
  expectedActions: string[];
  acceptablePhrasings: string[];
  concept: string;
  vibe: string;
}

export interface NaturalResponseValidationResult {
  isCorrect: boolean;
  confidence: number;
  feedback: string;
  conceptualUnderstanding: {
    correctConcepts: string[];
    missingConcepts: string[];
    misunderstoodConcepts: string[];
  };
  approachValidation: {
    correctApproach: boolean;
    approachQuality: 'excellent' | 'good' | 'partial' | 'incorrect';
    identifiedSteps: string[];
  };
  naturalnessScore: number;
  suggestions: string[];
  encouragement: string;
}

/**
 * Exercise Validator Service
 */
export class ExerciseValidator {
  private solutionValidators: Map<string, ExerciseSolutionValidator> = new Map();
  private validationHistory = new Map<string, {
    timestamp: number;
    exerciseId: string;
    result: ExerciseValidationResult;
    revisionCount: number;
  }>();

  constructor() {
    this.initializeBuiltinValidators();
  }

  /**
   * Validate a generated exercise
   */
  async validateExercise(request: ExerciseValidationRequest): Promise<ExerciseValidationResult> {
    const result: ExerciseValidationResult = {
      isValid: false,
      overallScore: 0,
      categories: {
        correctness: { score: 0, weight: 0.3, passed: false, feedback: '' },
        clarity: { score: 0, weight: 0.2, passed: false, feedback: '' },
        difficulty: { score: 0, weight: 0.2, passed: false, feedback: '' },
        completeness: { score: 0, weight: 0.15, passed: false, feedback: '' },
        educational: { score: 0, weight: 0.15, passed: false, feedback: '' }
      },
      issues: [],
      suggestions: [],
      feedback: '',
      requiresRevision: false,
      revisionActions: []
    };

    try {
      // Validate correctness
      if (request.validationOptions.checkSolution) {
        result.categories.correctness = await this.validateCorrectness(request);
      } else {
        result.categories.correctness = this.performBasicCorrectnessCheck(request);
      }

      // Validate clarity
      if (request.validationOptions.checkClarity) {
        result.categories.clarity = await this.validateClarity(request);
      }

      // Validate difficulty
      if (request.validationOptions.validateDifficulty) {
        result.categories.difficulty = await this.validateDifficulty(request);
      }

      // Validate completeness
      if (request.validationOptions.verifyCompleteness) {
        result.categories.completeness = await this.validateCompleteness(request);
      }

      // Validate educational value
      result.categories.educational = await this.validateEducationalValue(request);

      // Calculate overall score
      result.overallScore = this.calculateOverallScore(result.categories);

      // Determine if exercise is valid
      result.isValid = result.overallScore >= 70 && !result.categories.correctness.feedback.includes('error');

      // Generate comprehensive feedback
      result.feedback = this.generateFeedback(result);

      // Determine if revision is needed
      result.requiresRevision = !result.isValid || result.overallScore < 85;

      // Generate revision actions
      if (result.requiresRevision) {
        result.revisionActions = this.generateRevisionActions(result);
      }

      // Collect issues and suggestions
      result.issues = this.collectIssues(result.categories);
      result.suggestions = this.generateSuggestions(result.categories);

      return result;

    } catch (error) {
      console.error('Exercise validation failed:', error);
      return {
        ...result,
        categories: {
          ...result.categories,
          correctness: {
            ...result.categories.correctness,
            score: 0,
            passed: false,
            feedback: `Validation error: ${error.message}`
          }
        },
        isValid: false,
        overallScore: 0,
        feedback: `Exercise validation failed due to system error: ${error.message}`,
        requiresRevision: true,
        revisionActions: ['Fix validation system error', 'Retry validation']
      };
    }
  }

  /**
   * Validate exercise correctness and solution
   */
  private async validateCorrectness(request: ExerciseValidationRequest): Promise<ValidationCategory> {
    const { exercise } = request;

    // Find appropriate validator
    const validator = Array.from(this.solutionValidators.values())
      .find(v => v.canValidate(exercise));

    if (!validator) {
      return {
        score: 50,
        weight: 0.3,
        passed: false,
        feedback: 'No suitable validator found for this exercise type'
      };
    }

    try {
      const solution = exercise.solution || {};
      const validationResult = await validator.validate(exercise, solution);

      return {
        score: validationResult.isCorrect ? validationResult.confidence * 100 : 0,
        weight: 0.3,
        passed: validationResult.isCorrect,
        feedback: validationResult.feedback || 'Solution validation completed'
      };
    } catch (error) {
      return {
        score: 0,
        weight: 0.3,
        passed: false,
        feedback: `Solution validation failed: ${error.message}`
      };
    }
  }

  /**
   * Perform basic correctness check when solution validation is disabled
   */
  private performBasicCorrectnessCheck(request: ExerciseValidationRequest): ValidationCategory {
    const { exercise } = request;

    const checks = [
      {
        check: exercise.problem && exercise.problem.length > 10,
        message: 'Problem statement is present and substantial'
      },
      {
        check: exercise.solution && Object.keys(exercise.solution).length > 0,
        message: 'Solution is provided'
      },
      {
        check: exercise.instructions && exercise.instructions.length > 5,
        message: 'Instructions are provided'
      },
      {
        check: !exercise.problem.includes('TODO') && !exercise.problem.includes('placeholder'),
        message: 'No obvious placeholders in problem statement'
      }
    ];

    const passedChecks = checks.filter(c => c.check).length;
    const score = (passedChecks / checks.length) * 100;

    return {
      score,
      weight: 0.3,
      passed: score >= 75,
      feedback: `Basic correctness check: ${passedChecks}/${checks.length} checks passed`
    };
  }

  /**
   * Validate exercise clarity and readability
   */
  private async validateClarity(request: ExerciseValidationRequest): Promise<ValidationCategory> {
    const { exercise } = request;
    const checks = [];

    // Check problem statement clarity
    if (exercise.problem) {
      const wordCount = exercise.problem.split(/\s+/).length;
      checks.push({
        check: wordCount >= 10 && wordCount <= 200,
        message: 'Problem statement has appropriate length'
      });

      checks.push({
        check: !/^\s*$/.test(exercise.problem),
        message: 'Problem statement is not empty'
      });

      // Check for clear language
      const unclearPatterns = [
        /\b(something|anything|somehow|somewhere)\b/gi,
        /\b(stuff|things|stuff|whatever)\b/gi,
        /\b(etc|et cetera)\b/gi
      ];

      const unclearCount = unclearPatterns.reduce((sum, pattern) => {
        return sum + (exercise.problem.match(pattern) || []).length;
      }, 0);

      checks.push({
        check: unclearCount <= 2,
        message: `Problem uses clear language (${unclearCount} unclear phrases found)`
      });
    }

    // Check instructions clarity
    if (exercise.instructions) {
      checks.push({
        check: exercise.instructions.split(/[.!?]/).filter(s => s.trim()).length >= 1,
        message: 'Instructions contain complete sentences'
      });

      checks.push({
        check: exercise.instructions.includes('.') || exercise.instructions.includes('step'),
        message: 'Instructions are properly formatted'
      });
    }

    // Check solution explanation clarity
    if (exercise.solution?.explanation) {
      const explanationWords = exercise.solution.explanation.split(/\s+/).length;
      checks.push({
        check: explanationWords >= 5,
        message: 'Solution explanation is substantial'
      });
    }

    const passedChecks = checks.filter(c => c.check).length;
    const score = checks.length > 0 ? (passedChecks / checks.length) * 100 : 50;

    return {
      score,
      weight: 0.2,
      passed: score >= 70,
      feedback: `Clarity check: ${passedChecks}/${checks.length} checks passed`
    };
  }

  /**
   * Validate exercise difficulty appropriateness
   */
  private async validateDifficulty(request: ExerciseValidationRequest): Promise<ValidationCategory> {
    const { exercise, context } = request;

    let score = 50; // Base score
    const factors = [];

    // Check problem complexity
    if (exercise.problem) {
      const problemLength = exercise.problem.length;
      const technicalTerms = (exercise.problem.match(/\b(algorithm|function|class|method|variable|loop|condition|recursion|API|database|framework)\b/gi) || []).length;
      const codeBlocks = (exercise.problem.match(/```/g) || []).length / 2;

      // More complex content should map to higher difficulty
      if (context.difficulty === 'easy') {
        if (problemLength < 200 && technicalTerms <= 2 && codeBlocks === 0) {
          score += 30;
          factors.push('Appropriate complexity for easy level');
        } else {
          score -= 20;
          factors.push('Too complex for easy level');
        }
      } else if (context.difficulty === 'medium') {
        if (problemLength >= 100 && problemLength <= 500 && technicalTerms >= 1 && technicalTerms <= 5) {
          score += 30;
          factors.push('Appropriate complexity for medium level');
        } else {
          score -= 10;
          factors.push('Complexity may not match medium level');
        }
      } else if (context.difficulty === 'hard') {
        if (problemLength > 200 && technicalTerms >= 3) {
          score += 30;
          factors.push('Appropriate complexity for hard level');
        } else {
          score -= 20;
          factors.push('May be too simple for hard level');
        }
      }
    }

    // Check estimated time vs difficulty
    if (exercise.estimatedTime) {
      if (context.difficulty === 'easy' && exercise.estimatedTime <= 20) {
        score += 10;
        factors.push('Time estimate matches easy difficulty');
      } else if (context.difficulty === 'medium' && exercise.estimatedTime >= 10 && exercise.estimatedTime <= 45) {
        score += 10;
        factors.push('Time estimate matches medium difficulty');
      } else if (context.difficulty === 'hard' && exercise.estimatedTime >= 30) {
        score += 10;
        factors.push('Time estimate matches hard difficulty');
      }
    }

    // Check hint availability
    if (exercise.hints && exercise.hints.length > 0) {
      if (context.difficulty === 'easy' && exercise.hints.length <= 2) {
        score += 5;
        factors.push('Appropriate hint count for easy level');
      } else if (context.difficulty === 'medium' && exercise.hints.length >= 2) {
        score += 5;
        factors.push('Appropriate hint count for medium level');
      } else if (context.difficulty === 'hard' && exercise.hints.length >= 3) {
        score += 5;
        factors.push('Appropriate hint count for hard level');
      }
    }

    score = Math.max(0, Math.min(100, score));

    return {
      score,
      weight: 0.2,
      passed: score >= 60,
      feedback: `Difficulty validation: ${score.toFixed(0)}/100. ${factors.join(', ')}`
    };
  }

  /**
   * Validate exercise completeness
   */
  private async validateCompleteness(request: ExerciseValidationRequest): Promise<ValidationCategory> {
    const { exercise } = request;

    const requiredFields = [
      { field: 'problem', message: 'Problem statement' },
      { field: 'instructions', message: 'Instructions' },
      { field: 'solution', message: 'Solution' }
    ];

    const optionalFields = [
      { field: 'hints', message: 'Hints' },
      { field: 'prerequisites', message: 'Prerequisites' },
      { field: 'learningObjectives', message: 'Learning objectives' },
      { field: 'estimatedTime', message: 'Time estimate' }
    ];

    const presentRequired = requiredFields.filter(f => exercise[f.field] && exercise[f.field].toString().trim()).length;
    const presentOptional = optionalFields.filter(f => exercise[f.field]).length;

    // Base score from required fields
    let score = (presentRequired / requiredFields.length) * 70;

    // Bonus points for optional fields
    score += (presentOptional / optionalFields.length) * 30;

    score = Math.min(100, score);

    return {
      score: Math.round(score),
      weight: 0.15,
      passed: presentRequired === requiredFields.length,
      feedback: `Completeness: ${presentRequired}/${requiredFields.length} required fields, ${presentOptional}/${optionalFields.length} optional fields`
    };
  }

  /**
   * Validate educational value
   */
  private async validateEducationalValue(request: ExerciseValidationRequest): Promise<ValidationCategory> {
    const { exercise, context } = request;

    let score = 50;
    const factors = [];

    // Check alignment with learning objectives
    if (context.learningObjectives && context.learningObjectives.length > 0) {
      const exerciseContent = `${exercise.problem} ${exercise.instructions} ${exercise.solution?.explanation || ''}`.toLowerCase();
      const alignedObjectives = context.learningObjectives.filter(obj =>
        exerciseContent.includes(obj.toLowerCase())
      );

      if (alignedObjectives.length > 0) {
        score += 20;
        factors.push(`${alignedObjectives.length}/${context.learningObjectives.length} learning objectives aligned`);
      }
    }

    // Check for educational elements in solution
    if (exercise.solution) {
      if (exercise.solution.explanation && exercise.solution.explanation.length > 50) {
        score += 15;
        factors.push('Detailed solution explanation provided');
      }

      if (exercise.solution.steps && exercise.solution.steps.length > 0) {
        score += 10;
        factors.push('Step-by-step solution provided');
      }

      if (exercise.solution.code || exercise.solution.codeExample) {
        score += 10;
        factors.push('Code examples included');
      }
    }

    // Check for prerequisites
    if (exercise.prerequisites && exercise.prerequisites.length > 0) {
      score += 5;
      factors.push('Prerequisites specified for learning progression');
    }

    // Check for practical application
    const practicalKeywords = ['implement', 'build', 'create', 'solve', 'apply', 'practice', 'example'];
    const exerciseText = `${exercise.problem} ${exercise.instructions}`.toLowerCase();
    const practicalKeywordCount = practicalKeywords.filter(keyword => exerciseText.includes(keyword)).length;

    if (practicalKeywordCount > 0) {
      score += 10;
      factors.push('Practical application emphasis');
    }

    score = Math.max(0, Math.min(100, score));

    return {
      score,
      weight: 0.15,
      passed: score >= 60,
      feedback: `Educational value: ${score.toFixed(0)}/100. ${factors.join(', ')}`
    };
  }

  /**
   * Calculate overall validation score
   */
  private calculateOverallScore(categories: any): number {
    return Math.round(
      Object.entries(categories).reduce((sum, [, category]: [string, any]) => {
        return sum + (category.score * category.weight);
      }, 0)
    );
  }

  /**
   * Generate comprehensive feedback
   */
  private generateFeedback(result: ExerciseValidationResult): string {
    if (result.isValid) {
      return `Exercise validation passed with an overall score of ${result.overallScore}/100. All major criteria met successfully.`;
    } else {
      const failedCategories = Object.entries(result.categories)
        .filter(([, category]: [string, any]) => !category.passed)
        .map(([name]) => name);

      const issues = result.issues.filter(issue => issue.severity === 'error').length;

      return `Exercise validation requires revision (Score: ${result.overallScore}/100). Issues found in: ${failedCategories.join(', ')}. ${issues} critical issues need attention.`;
    }
  }

  /**
   * Generate revision actions
   */
  private generateRevisionActions(result: ExerciseValidationResult): string[] {
    const actions = [];

    if (result.categories.correctness.score < 70) {
      actions.push('Review and fix solution correctness');
    }

    if (result.categories.clarity.score < 70) {
      actions.push('Improve problem statement and instructions clarity');
    }

    if (result.categories.difficulty.score < 60) {
      actions.push('Adjust exercise complexity to match target difficulty');
    }

    if (result.categories.completeness.score < 80) {
      actions.push('Add missing required fields (problem, instructions, solution)');
    }

    if (result.categories.educational.score < 60) {
      actions.push('Enhance educational value with better explanations and examples');
    }

    const criticalIssues = result.issues.filter(issue => issue.severity === 'error');
    criticalIssues.forEach(issue => {
      if (issue.suggestion) {
        actions.push(issue.suggestion);
      }
    });

    return actions.length > 0 ? actions : ['Review and improve overall exercise quality'];
  }

  /**
   * Collect issues from all categories
   */
  private collectIssues(categories: any): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    Object.entries(categories).forEach(([categoryName, category]: [string, any]) => {
      if (!category.passed) {
        issues.push({
          severity: category.score < 50 ? 'error' : 'warning',
          category: categoryName,
          message: `${categoryName} validation failed (Score: ${category.score})`,
          suggestion: `Focus on improving ${categoryName} aspects`
        });
      }
    });

    return issues;
  }

  /**
   * Generate improvement suggestions
   */
  private generateSuggestions(categories: any): ValidationSuggestion[] {
    const suggestions: ValidationSuggestion[] = [];

    Object.entries(categories).forEach(([categoryName, category]: [string, any]) => {
      if (category.score > 50 && category.score < 80) {
        suggestions.push({
          type: 'improvement',
          category: categoryName,
          message: `Consider enhancing ${categoryName} for better quality`,
          priority: 'medium',
          actionable: true
        });
      }
    });

    return suggestions;
  }

  /**
   * Initialize built-in solution validators
   */
  private initializeBuiltinValidators(): void {
    // Coding exercise validator
    this.solutionValidators.set('coding', {
      name: 'Coding Exercise Validator',
      canValidate: (exercise) => {
        return exercise.type === 'coding' || exercise.type === 'programming';
      },
      validate: async (exercise, solution) => {
        // Basic code validation
        const hasCode = solution.code || solution.answer;
        const hasExplanation = solution.explanation && solution.explanation.length > 20;

        return {
          isCorrect: hasCode && hasExplanation,
          confidence: hasCode && hasExplanation ? 0.8 : 0.4,
          feedback: hasCode && hasExplanation ? 'Code solution provided with explanation' : 'Missing code or explanation',
          errors: hasCode ? [] : ['No code solution provided'],
          suggestions: hasExplanation ? [] : ['Add detailed explanation for the solution']
        };
      }
    });

    // Multiple choice validator
    this.solutionValidators.set('multiple-choice', {
      name: 'Multiple Choice Validator',
      canValidate: (exercise) => {
        return exercise.type === 'multiple-choice';
      },
      validate: async (exercise, solution) => {
        const hasOptions = Array.isArray(solution.answer) && solution.answer.length > 1;
        const hasCorrectAnswer = solution.correctAnswer !== undefined;

        return {
          isCorrect: hasOptions && hasCorrectAnswer,
          confidence: hasOptions && hasCorrectAnswer ? 0.9 : 0.5,
          feedback: hasOptions && hasCorrectAnswer ? 'Multiple choice structure is valid' : 'Invalid multiple choice format',
          errors: hasOptions ? [] : ['No answer options provided'],
          suggestions: hasCorrectAnswer ? [] : ['Specify the correct answer']
        };
      }
    });

    // General exercise validator
    this.solutionValidators.set('general', {
      name: 'General Exercise Validator',
      canValidate: () => true,
      validate: async (exercise, solution) => {
        const hasAnswer = solution.answer || solution.explanation;
        const isSubstantive = solution.explanation && solution.explanation.length > 10;

        return {
          isCorrect: hasAnswer,
          confidence: hasAnswer && isSubstantive ? 0.7 : 0.4,
          feedback: hasAnswer ? 'Solution provided' : 'No solution found',
          errors: hasAnswer ? [] : ['No answer or solution provided'],
          suggestions: isSubstantive ? [] : ['Add more detailed explanation']
        };
      }
    });
  }

  /**
   * Register custom solution validator
   */
  registerValidator(validator: ExerciseSolutionValidator): void {
    this.solutionValidators.set(validator.name, validator);
  }

  /**
   * Validate natural language response to practice challenges
   */
  async validateNaturalResponse(response: NaturalLanguageResponse): Promise<NaturalResponseValidationResult> {
    try {
      // Analyze conceptual understanding
      const conceptualUnderstanding = this.analyzeConceptualUnderstanding(response);

      // Validate approach
      const approachValidation = this.validateApproach(response);

      // Score naturalness
      const naturalnessScore = this.scoreNaturalness(response.userResponse);

      // Determine overall correctness and confidence
      const conceptScore = conceptualUnderstanding.correctConcepts.length / Math.max(1, response.expectedConcepts.length);
      const approachScore = approachValidation.correctApproach ? (approachValidation.approachQuality === 'excellent' ? 1 : approachValidation.approachQuality === 'good' ? 0.8 : approachValidation.approachQuality === 'partial' ? 0.6 : 0.2) : 0;
      const overallConfidence = (conceptScore * 0.4 + approachScore * 0.4 + naturalnessScore * 0.2);

      const isCorrect = overallConfidence >= 0.6;

      // Generate feedback
      const feedback = this.generateNaturalResponseFeedback(
        conceptualUnderstanding,
        approachValidation,
        naturalnessScore,
        response.vibe
      );

      // Generate suggestions
      const suggestions = this.generateNaturalResponseSuggestions(
        conceptualUnderstanding,
        approachValidation,
        isCorrect
      );

      // Generate encouragement
      const encouragement = this.generateEncouragement(isCorrect, approachValidation.approachQuality, response.vibe);

      return {
        isCorrect,
        confidence: overallConfidence,
        feedback,
        conceptualUnderstanding,
        approachValidation,
        naturalnessScore,
        suggestions,
        encouragement
      };

    } catch (error) {
      console.error('Natural response validation failed:', error);
      return {
        isCorrect: false,
        confidence: 0,
        feedback: 'Unable to validate response due to system error. Please try again.',
        conceptualUnderstanding: {
          correctConcepts: [],
          missingConcepts: response.expectedConcepts,
          misunderstoodConcepts: []
        },
        approachValidation: {
          correctApproach: false,
          approachQuality: 'incorrect',
          identifiedSteps: []
        },
        naturalnessScore: 0,
        suggestions: ['Please rephrase your response and try again'],
        encouragement: 'Keep practicing - learning takes time!'
      };
    }
  }

  /**
   * Analyze conceptual understanding in natural language response
   */
  private analyzeConceptualUnderstanding(response: NaturalLanguageResponse): {
    correctConcepts: string[];
    missingConcepts: string[];
    misunderstoodConcepts: string[];
  } {
    const userResponseLower = response.userResponse.toLowerCase();
    const correctConcepts: string[] = [];
    const missingConcepts: string[] = [];
    const misunderstoodConcepts: string[] = [];

    // Check each expected concept
    response.expectedConcepts.forEach(concept => {
      const conceptLower = concept.toLowerCase();

      // Check if concept is mentioned correctly
      const conceptMentioned = this.isConceptMentioned(userResponseLower, conceptLower);
      const conceptUsedCorrectly = this.isConceptUsedCorrectly(userResponseLower, conceptLower, response.vibe);

      if (conceptMentioned && conceptUsedCorrectly) {
        correctConcepts.push(concept);
      } else if (conceptMentioned && !conceptUsedCorrectly) {
        misunderstoodConcepts.push(concept);
      } else {
        missingConcepts.push(concept);
      }
    });

    return { correctConcepts, missingConcepts, misunderstoodConcepts };
  }

  /**
   * Validate the approach taken in the response
   */
  private validateApproach(response: NaturalLanguageResponse): {
    correctApproach: boolean;
    approachQuality: 'excellent' | 'good' | 'partial' | 'incorrect';
    identifiedSteps: string[];
  } {
    const userResponseLower = response.userResponse.toLowerCase();
    const identifiedSteps: string[] = [];

    // Look for action words and implementation indicators
    const actionPatterns = [
      /\b(i added|i created|i implemented|i built|i wrote|i used|i applied)\b/gi,
      /\b(i modified|i updated|i changed|i refactored)\b/gi,
      /\b(i made|i set|i configured|i connected)\b/gi,
      /\b(function|method|class|component|element|button|input)\b/gi,
      /\b(toggle|switch|change|update|handle|manage)\b/gi,
      /\b(state|useState|useEffect|event|handler)\b/gi
    ];

    let actionCount = 0;
    actionPatterns.forEach(pattern => {
      const matches = userResponseLower.match(pattern);
      if (matches) {
        actionCount += matches.length;
        matches.forEach(match => identifiedSteps.push(match.trim()));
      }
    });

    // Check for expected actions
    const foundActions = response.expectedActions.filter(action =>
      userResponseLower.includes(action.toLowerCase())
    );

    // Determine approach quality
    const approachScore = this.calculateApproachScore(
      actionCount,
      foundActions.length,
      response.expectedActions.length,
      userResponseLower.length
    );

    let approachQuality: 'excellent' | 'good' | 'partial' | 'incorrect';
    let correctApproach: boolean;

    if (approachScore >= 0.8) {
      approachQuality = 'excellent';
      correctApproach = true;
    } else if (approachScore >= 0.6) {
      approachQuality = 'good';
      correctApproach = true;
    } else if (approachScore >= 0.3) {
      approachQuality = 'partial';
      correctApproach = false;
    } else {
      approachQuality = 'incorrect';
      correctApproach = false;
    }

    return {
      correctApproach,
      approachQuality,
      identifiedSteps: [...new Set(identifiedSteps)] // Remove duplicates
    };
  }

  /**
   * Score the naturalness of the response
   */
  private scoreNaturalness(response: string): number {
    let score = 0.5; // Base score

    // Check for conversational elements
    const conversationalIndicators = [
      /\b(i|I)\b/g, // First person
      /[.!?]$/g,   // Proper punctuation
      /\b(so|then|next|after|finally|also)\b/gi, // Transition words
      /\b(working|trying|managed|succeeded|figured|learned)\b/gi // Action verbs
    ];

    conversationalIndicators.forEach(pattern => {
      const matches = response.match(pattern);
      if (matches && matches.length > 0) {
        score += Math.min(0.1, matches.length * 0.02);
      }
    });

    // Penalize overly technical or robotic language
    const roboticPatterns = [
      /\b(the following|hereby|therefore|thus|henceforth)\b/gi,
      /\b(implementation|utilization|execution|provision)\b/gi
    ];

    roboticPatterns.forEach(pattern => {
      const matches = response.match(pattern);
      if (matches && matches.length > 0) {
        score -= matches.length * 0.05;
      }
    });

    // Check length appropriateness (not too short, not too long)
    const wordCount = response.split(/\s+/).length;
    if (wordCount >= 5 && wordCount <= 50) {
      score += 0.1;
    } else if (wordCount < 5) {
      score -= 0.2;
    } else if (wordCount > 50) {
      score -= 0.1;
    }

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Check if a concept is mentioned in the response
   */
  private isConceptMentioned(response: string, concept: string): boolean {
    // Direct mention
    if (response.includes(concept)) {
      return true;
    }

    // Check for synonyms or related terms
    const conceptMappings: Record<string, string[]> = {
      'toggle': ['switch', 'flip', 'change state', 'alternate'],
      'state': ['data', 'information', 'status', 'condition'],
      'usestate': ['state hook', 'react state', 'component state'],
      'useeffect': ['effect hook', 'side effect', 'react effect'],
      'component': ['element', 'part', 'section'],
      'function': ['method', 'procedure', 'operation'],
      'event': ['action', 'interaction', 'handler'],
      'button': ['click element', 'interactive element'],
      'handler': ['listener', 'callback', 'response function']
    };

    const synonyms = conceptMappings[concept] || [];
    return synonyms.some(synonym => response.includes(synonym));
  }

  /**
   * Check if a concept is used correctly in context
   */
  private isConceptUsedCorrectly(response: string, concept: string, vibe: string): boolean {
    // For now, assume correct usage if mentioned in positive context
    // This could be enhanced with more sophisticated NLP
    const positiveIndicators = ['success', 'worked', 'correct', 'right', 'good', 'perfect'];
    const negativeIndicators = ['error', 'failed', 'wrong', 'problem', 'issue', 'bug'];

    const hasPositiveContext = positiveIndicators.some(indicator => response.includes(indicator));
    const hasNegativeContext = negativeIndicators.some(indicator => response.includes(indicator));

    if (vibe === 'confused' || vibe === 'misunderstanding') {
      // For confused users, be more lenient
      return true;
    }

    return hasPositiveContext || !hasNegativeContext;
  }

  /**
   * Calculate approach quality score
   */
  private calculateApproachScore(
    actionCount: number,
    foundActions: number,
    expectedActions: number,
    responseLength: number
  ): number {
    let score = 0;

    // Score for having actions
    if (actionCount > 0) {
      score += Math.min(0.4, actionCount * 0.1);
    }

    // Score for finding expected actions
    if (expectedActions > 0) {
      score += (foundActions / expectedActions) * 0.4;
    }

    // Score for appropriate response length
    if (responseLength >= 20 && responseLength <= 300) {
      score += 0.2;
    }

    return Math.min(1, score);
  }

  /**
   * Generate feedback for natural language response
   */
  private generateNaturalResponseFeedback(
    conceptual: { correctConcepts: string[]; missingConcepts: string[]; misunderstoodConcepts: string[] },
    approach: { correctApproach: boolean; approachQuality: string },
    naturalnessScore: number,
    vibe: string
  ): string {
    const feedbackParts: string[] = [];

    // Conceptual understanding feedback
    if (conceptual.correctConcepts.length > 0) {
      feedbackParts.push(`Great job identifying: ${conceptual.correctConcepts.join(', ')}`);
    }

    if (conceptual.missingConcepts.length > 0) {
      feedbackParts.push(`Consider also: ${conceptual.missingConcepts.join(', ')}`);
    }

    if (conceptual.misunderstoodConcepts.length > 0) {
      feedbackParts.push(`Let's clarify: ${conceptual.misunderstoodConcepts.join(', ')}`);
    }

    // Approach feedback
    if (approach.correctApproach) {
      feedbackParts.push(`Your approach is ${approach.approachQuality}!`);
    } else {
      feedbackParts.push(`Let's work on improving your approach.`);
    }

    // Naturalness feedback
    if (naturalnessScore >= 0.8) {
      feedbackParts.push('Very natural response!');
    } else if (naturalnessScore >= 0.6) {
      feedbackParts.push('Good natural expression.');
    }

    return feedbackParts.join(' ');
  }

  /**
   * Generate suggestions for improvement
   */
  private generateNaturalResponseSuggestions(
    conceptual: { correctConcepts: string[]; missingConcepts: string[]; misunderstoodConcepts: string[] },
    approach: { correctApproach: boolean; approachQuality: string },
    isCorrect: boolean
  ): string[] {
    const suggestions: string[] = [];

    if (conceptual.missingConcepts.length > 0) {
      suggestions.push(`Try incorporating: ${conceptual.missingConcepts.join(', ')}`);
    }

    if (conceptual.misunderstoodConcepts.length > 0) {
      suggestions.push(`Review how ${conceptual.misunderstoodConcepts.join(', ')} work`);
    }

    if (!approach.correctApproach) {
      suggestions.push('Focus on the specific steps you took to implement the solution');
      suggestions.push('Describe what you actually did in your code');
    }

    if (approach.approachQuality === 'partial') {
      suggestions.push('Add more details about your implementation approach');
    }

    return suggestions;
  }

  /**
   * Generate encouragement based on performance
   */
  private generateEncouragement(isCorrect: boolean, approachQuality: string, vibe: string): string {
    if (isCorrect && approachQuality === 'excellent') {
      return 'Excellent work! You\'ve got a solid understanding of this concept.';
    } else if (isCorrect) {
      return 'Good job! You\'re on the right track. Keep practicing!';
    } else if (approachQuality === 'partial') {
      return 'You\'re getting there! With a bit more practice, this will click.';
    } else {
      return 'Learning takes time! Let\'s break this down and work through it together.';
    }
  }

  /**
   * Get validation statistics
   */
  getStatistics(): {
    totalValidations: number;
    averageScore: number;
    passRate: number;
    categoryBreakdown: Record<string, { average: number; passRate: number }>;
  } {
    const validations = Array.from(this.validationHistory.values());
    const passCount = validations.filter(v => v.result.isValid).length;

    const categoryStats: Record<string, { average: number; passRate: number }> = {
      correctness: { average: 0, passRate: 0 },
      clarity: { average: 0, passRate: 0 },
      difficulty: { average: 0, passRate: 0 },
      completeness: { average: 0, passRate: 0 },
      educational: { average: 0, passRate: 0 }
    };

    // Calculate category statistics
    Object.entries(categoryStats).forEach(([category, stats]) => {
      const categoryScores = validations.map(v => v.result.categories[category].score);
      const categoryPasses = validations.map(v => v.result.categories[category].passed);

      stats.average = categoryScores.length > 0 ?
        categoryScores.reduce((sum, score) => sum + score, 0) / categoryScores.length : 0;
      stats.passRate = categoryPasses.length > 0 ?
        categoryPasses.filter(passed => passed).length / categoryPasses.length : 0;
    });

    return {
      totalValidations: validations.length,
      averageScore: validations.length > 0 ?
        validations.reduce((sum, v) => sum + v.result.overallScore, 0) / validations.length : 0,
      passRate: validations.length > 0 ? passCount / validations.length : 0,
      categoryBreakdown: categoryStats
    };
  }
}

/**
 * Global exercise validator instance
 */
export const exerciseValidator = new ExerciseValidator();