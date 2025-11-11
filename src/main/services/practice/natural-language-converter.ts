/**
 * Natural Language Converter
 *
 * Converts structured exercise formats to pure natural language,
 * removing all JSON parsing and structured templates.
 */

import { ServiceDependencies } from '../agents/types';
import { LoggerFactory } from '../logger';
import type { Exercise } from '../agents/specialized/practice-agent';
import type { ProjectChallenge } from './project-challenge-generator';
import type { NaturalPromptResponse } from './natural-prompt-generator';

export interface ConversionRequest {
  exercise: Exercise | ProjectChallenge;
  targetFormat: 'conversational' | 'project-based' | 'story-based';
  context?: {
    userLevel: 'beginner' | 'intermediate' | 'advanced';
    vibe: string;
    topic: string;
    projectContext?: string;
  };
  preferences?: {
    style: 'gentle' | 'direct' | 'collaborative' | 'encouraging';
    length: 'short' | 'medium' | 'detailed';
    includeHints: boolean;
    includeSolution: boolean;
  };
}

export interface NaturalExercise {
  id: string;
  type: 'conversational' | 'project-based' | 'story-based';
  introduction: string;
  challenge: string;
  context: string;
  guidance: string[];
  hints?: string[];
  solution?: {
    description: string;
    approach: string;
    code?: string;
    explanation: string;
  };
  estimatedTime: number;
  difficulty: 'easy' | 'medium' | 'hard';
  learningObjectives: string[];
  encouragement: string;
  options: {
    accept: string;
    decline: string;
    postpone: string;
  };
}

export interface ConversionResult {
  success: boolean;
  naturalExercise?: NaturalExercise;
  error?: string;
  conversionDetails: {
    originalFormat: string;
    convertedFormat: string;
    elementsConverted: string[];
    elementsRemoved: string[];
    naturalnessScore: number;
  };
}

export interface ConversionTemplate {
  id: string;
  sourceType: 'exercise' | 'project-challenge';
  targetType: 'conversational' | 'project-based' | 'story-based';
  introductionTemplates: string[];
  challengeTemplates: string[];
  contextTemplates: string[];
  solutionTemplates: {
    description: string[];
    approach: string[];
    explanation: string[];
  };
  variables: string[];
}

export interface NaturalLanguageConverterConfig {
  enableProjectContext: boolean;
  useStoryBasedApproach: boolean;
  preserveLearningObjectives: boolean;
  includeEncouragement: boolean;
  naturalnessThreshold: number;
  maxHints: number;
  adaptiveComplexity: boolean;
}

export const DEFAULT_NATURAL_LANGUAGE_CONVERTER_CONFIG: NaturalLanguageConverterConfig = {
  enableProjectContext: true,
  useStoryBasedApproach: false,
  preserveLearningObjectives: true,
  includeEncouragement: true,
  naturalnessThreshold: 0.8,
  maxHints: 3,
  adaptiveComplexity: true
};

/**
 * Natural Language Converter Service
 */
export class NaturalLanguageConverter {
  private logger: any;
  private config: NaturalLanguageConverterConfig;
  private templates: Map<string, ConversionTemplate[]>;

  constructor(dependencies: ServiceDependencies, config: Partial<NaturalLanguageConverterConfig> = {}) {
    this.logger = dependencies.logger;
    this.config = { ...DEFAULT_NATURAL_LANGUAGE_CONVERTER_CONFIG, ...config };
    this.templates = new Map();
    this.initializeTemplates();
    this.logger.info('NaturalLanguageConverter service initialized');
  }

  /**
   * Convert structured exercise to natural language format
   */
  async convertToNaturalLanguage(request: ConversionRequest): Promise<ConversionResult> {
    try {
      this.logger.info('Converting exercise to natural language', {
        exerciseId: request.exercise.id,
        targetFormat: request.targetFormat
      });

      // Determine source type and select appropriate template
      const sourceType = this.determineSourceType(request.exercise);
      const template = this.selectConversionTemplate(sourceType, request.targetFormat);

      // Convert exercise components
      const introduction = this.generateIntroduction(template, request);
      const challenge = this.generateChallenge(template, request);
      const context = this.generateContext(template, request);
      const guidance = this.generateGuidance(template, request);
      const hints = this.generateHints(template, request);
      const solution = this.generateSolution(template, request);
      const encouragement = this.generateEncouragement(request);
      const options = this.generateOptions(template, request);

      const naturalExercise: NaturalExercise = {
        id: `natural_${request.exercise.id}`,
        type: request.targetFormat,
        introduction,
        challenge,
        context,
        guidance,
        hints: request.preferences?.includeHints !== false ? hints : undefined,
        solution: request.preferences?.includeSolution !== false ? solution : undefined,
        estimatedTime: this.extractEstimatedTime(request.exercise),
        difficulty: this.extractDifficulty(request.exercise),
        learningObjectives: this.extractLearningObjectives(request.exercise),
        encouragement,
        options
      };

      const conversionDetails = {
        originalFormat: sourceType,
        convertedFormat: request.targetFormat,
        elementsConverted: ['introduction', 'challenge', 'context', 'guidance'],
        elementsRemoved: this.identifyRemovedElements(sourceType, request.targetFormat),
        naturalnessScore: this.calculateNaturalnessScore(naturalExercise)
      };

      this.logger.info('Exercise converted successfully', {
        naturalExerciseId: naturalExercise.id,
        naturalnessScore: conversionDetails.naturalnessScore
      });

      return {
        success: true,
        naturalExercise,
        conversionDetails
      };

    } catch (error) {
      this.logger.error('Failed to convert exercise to natural language', error as Error);
      return {
        success: false,
        error: (error as Error).message,
        conversionDetails: {
          originalFormat: 'unknown',
          convertedFormat: request.targetFormat,
          elementsConverted: [],
          elementsRemoved: [],
          naturalnessScore: 0
        }
      };
    }
  }

  /**
   * Determine source type of exercise
   */
  private determineSourceType(exercise: Exercise | ProjectChallenge): 'exercise' | 'project-challenge' {
    // Check if it's a ProjectChallenge
    if ('projectRelevance' in exercise && 'currentCode' in exercise) {
      return 'project-challenge';
    }

    return 'exercise';
  }

  /**
   * Select appropriate conversion template
   */
  private selectConversionTemplate(sourceType: string, targetType: string): ConversionTemplate {
    const key = `${sourceType}_${targetType}`;
    const templates = this.templates.get(key) || this.templates.get('exercise_conversational') || [];

    if (templates.length === 0) {
      throw new Error(`No conversion templates found for ${key}`);
    }

    return templates[Math.floor(Math.random() * templates.length)];
  }

  /**
   * Generate introduction in natural language
   */
  private generateIntroduction(template: ConversionTemplate, request: ConversionRequest): string {
    const templates = template.introductionTemplates;
    let introduction = templates[Math.floor(Math.random() * templates.length)];

    // Replace variables
    introduction = this.replaceTemplateVariables(introduction, template.variables, request);

    // Add personalization based on context
    if (request.context?.vibe) {
      introduction = this.addVibeContext(introduction, request.context.vibe);
    }

    return introduction;
  }

  /**
   * Generate challenge in natural language
   */
  private generateChallenge(template: ConversionTemplate, request: ConversionRequest): string {
    const templates = template.challengeTemplates;
    let challenge = templates[Math.floor(Math.random() * templates.length)];

    // Replace variables
    challenge = this.replaceTemplateVariables(challenge, template.variables, request);

    // Add project context if available
    if (this.config.enableProjectContext && request.context?.projectContext) {
      challenge = this.addProjectContext(challenge, request.context.projectContext);
    }

    return challenge;
  }

  /**
   * Generate context in natural language
   */
  private generateContext(template: ConversionTemplate, request: ConversionRequest): string {
    const templates = template.contextTemplates;
    let context = templates[Math.floor(Math.random() * templates.length)];

    // Replace variables
    context = this.replaceTemplateVariables(context, template.variables, request);

    // Add learning context
    if (request.context?.userLevel) {
      context = this.addLevelContext(context, request.context.userLevel);
    }

    return context;
  }

  /**
   * Generate guidance steps in natural language
   */
  private generateGuidance(template: ConversionTemplate, request: ConversionRequest): string[] {
    const exercise = request.exercise;

    // Extract guidance from original exercise
    const guidance: string[] = [];

    if ('steps' in exercise && Array.isArray(exercise.steps)) {
      guidance.push(...exercise.steps.map(step =>
        this.naturalizeInstruction(step, request.preferences?.style)
      ));
    } else if ('instructions' in exercise && exercise.instructions) {
      // Split instructions into natural steps
      const steps = this.parseInstructions(exercise.instructions);
      guidance.push(...steps.map(step =>
        this.naturalizeInstruction(step, request.preferences?.style)
      ));
    }

    // Add contextual guidance
    if (guidance.length === 0) {
      guidance.push(
        'Take your time to understand the challenge',
        'Focus on the learning objective',
        'Apply what you know about the topic'
      );
    }

    return guidance.slice(0, 5); // Limit to 5 steps
  }

  /**
   * Generate hints in natural language
   */
  private generateHints(template: ConversionTemplate, request: ConversionRequest): string[] {
    const exercise = request.exercise;
    const hints: string[] = [];

    // Extract hints from original exercise
    if ('hints' in exercise && Array.isArray(exercise.hints)) {
      hints.push(...exercise.hints.map(hint =>
        this.naturalizeHint(hint, request.preferences?.style)
      ));
    }

    // Add contextual hints
    const contextualHints = [
      'Think about what you learned in the conversation',
      'Break down the problem into smaller parts',
      'Consider similar examples we\'ve discussed',
      'Focus on the core concept rather than implementation details'
    ];

    hints.push(...contextualHints.slice(0, this.config.maxHints - hints.length));

    return hints.slice(0, this.config.maxHints);
  }

  /**
   * Generate solution in natural language
   */
  private generateSolution(template: ConversionTemplate, request: ConversionRequest): NaturalExercise['solution'] | undefined {
    const exercise = request.exercise;

    // Extract solution from original exercise
    if (!('solution' in exercise) || !exercise.solution) {
      return undefined;
    }

    const solution = exercise.solution;
    const templates = template.solutionTemplates;

    return {
      description: templates.description[Math.floor(Math.random() * templates.description.length)],
      approach: templates.approach[Math.floor(Math.random() * templates.approach.length)],
      code: 'code' in solution ? solution.code : solution.answer as string,
      explanation: typeof solution.explanation === 'string'
        ? this.naturalizeExplanation(solution.explanation, request.preferences?.style)
        : templates.explanation[Math.floor(Math.random() * templates.explanation.length)]
    };
  }

  /**
   * Generate encouragement message
   */
  private generateEncouragement(request: ConversionRequest): string {
    if (!this.config.includeEncouragement) {
      return '';
    }

    const encouragements = [
      "You're doing great by taking on this challenge!",
      "Learning happens best through practice, and you're on the right track.",
      "Every attempt helps you understand the concept better.",
      "Trust your learning process - you're making progress!",
      "This practice will help solidify your understanding."
    ];

    // Add vibe-specific encouragement
    const vibeEncouragements = {
      confused: "Confusion is part of learning - you're working through it beautifully!",
      understanding: "Your understanding is growing stronger with each step!",
      breakthrough: "That insight shows real progress - keep building on it!",
      practicing: "Consistent practice like this leads to mastery!",
      misunderstanding: "Clarifying misunderstandings is how we truly learn!"
    };

    const baseEncouragement = encouragements[Math.floor(Math.random() * encouragements.length)];
    const vibeEncouragement = request.context?.vibe
      ? vibeEncouragements[request.context.vibe as keyof typeof vibeEncouragements] || ''
      : '';

    return vibeEncouragement ? `${baseEncouragement} ${vibeEncouragement}` : baseEncouragement;
  }

  /**
   * Generate response options
   */
  private generateOptions(template: ConversionTemplate, request: ConversionRequest): NaturalExercise['options'] {
    const style = request.preferences?.style || 'gentle';

    const optionsByStyle = {
      gentle: {
        accept: ["Sure, I'd like to try this!", "Sounds interesting!", "Okay, let's give it a shot."],
        decline: ["Maybe later, thanks.", "I think I'll pass for now.", "Thanks, but not right now."],
        postpone: ["In a few minutes?", "Let me think about it first.", "Can I come back to this later?"]
      },
      direct: {
        accept: ["Yes, I'm ready.", "Let's do this.", "I accept the challenge."],
        decline: ["No, thanks.", "I'll skip this one.", "Not interested."],
        postpone: ["Later.", "Give me more time.", "I'll do it later."]
      },
      collaborative: {
        accept: ["Let's work on this together!", "Yes, I'd like to collaborate on this.", "Great, let's tackle this as a team!"],
        decline: ["Thanks, but I'd prefer to work alone.", "I'll try this on my own time.", "Maybe I can do this independently."],
        postpone: ["Can we plan when to work together?", "Let me prepare first.", "I'd like to schedule this for later."]
      },
      encouraging: {
        accept: ["Yes! I believe I can do this!", "Absolutely! Let's grow together!", "I'm excited to try this!"],
        decline: ["I appreciate the offer, but I need more preparation.", "Thanks, but I want to build more confidence first.", "I'll come back when I feel more ready."],
        postpone: ["Can you help me prepare first?", "I'd love to build up to this.", "Give me some time to get ready."]
      }
    };

    const styleOptions = optionsByStyle[style] || optionsByStyle.gentle;

    return {
      accept: this.selectRandom(styleOptions.accept),
      decline: this.selectRandom(styleOptions.decline),
      postpone: this.selectRandom(styleOptions.postpone)
    };
  }

  /**
   * Initialize conversion templates
   */
  private initializeTemplates(): void {
    // Exercise to Conversational templates
    this.templates.set('exercise_conversational', [
      {
        id: 'exercise_to_conversational_1',
        sourceType: 'exercise',
        targetType: 'conversational',
        introductionTemplates: [
          "Ready to practice {topic} in a conversational way?",
          "Let's work with {topic} through a natural exercise.",
          "How about we explore {topic} with a practical conversation?",
          "I have a {topic} challenge I think you'll find interesting."
        ],
        challengeTemplates: [
          "Try {task_description} using what you know about {topic}.",
          "Let's see how you'd approach {specific_task} with {topic}.",
          "I'm curious how you would handle {challenge_type} using {topic}.",
          "Could you walk me through implementing {feature} with {topic}?"
        ],
        contextTemplates: [
          "This will help you understand {topic} through hands-on experience.",
          "Practicing {topic} this way will make the concepts stick better.",
          "Through this exercise, you'll see {topic} in action.",
          "This practical approach to {topic} will build your confidence."
        ],
        solutionTemplates: {
          description: [
            "Here's how you could approach this {topic} challenge.",
            "Let me show you a way to solve this {topic} problem.",
            "This is one effective way to handle {topic} in this situation."
          ],
          approach: [
            "Start by thinking about the core {topic} concepts we discussed.",
            "Focus on applying {topic} principles to this specific case.",
            "Use your understanding of {topic} to guide your approach."
          ],
          explanation: [
            "This solution demonstrates key {topic} concepts in action.",
            "Notice how {topic} helps us solve this problem elegantly.",
            "The {topic} approach here shows why this technique is effective."
          ]
        },
        variables: ['topic', 'task_description', 'specific_task', 'challenge_type', 'feature']
      }
    ]);

    // Project Challenge to Project-Based templates
    this.templates.set('project-challenge_project-based', [
      {
        id: 'project_challenge_to_project_1',
        sourceType: 'project-challenge',
        targetType: 'project-based',
        introductionTemplates: [
          "Since you're working with your actual project, let's improve {file_name}.",
          "I found a great opportunity in your {file_name} file to practice {topic}.",
          "Let's make your {file_name} even better by applying {topic}.",
          "Your project has the perfect place to practice {topic} - in {file_name}."
        ],
        challengeTemplates: [
          "Try {task} in your actual {file_name} file.",
          "Let's enhance {file_name} by implementing {feature}.",
          "How would you improve {file_name} using {topic}?",
          "Let's work on {specific_improvement} in your {file_name} file."
        ],
        contextTemplates: [
          "This will directly improve your real project and help you master {topic}.",
          "Working with your actual code makes {topic} concepts more concrete.",
          "Your project will benefit from this {topic} enhancement.",
          "This practical change in your codebase will solidify your {topic} understanding."
        ],
        solutionTemplates: {
          description: [
            "Here's how you could enhance {file_name} with {topic}.",
            "Let me show you an improvement for {file_name} using {topic}.",
            "This approach will make {file_name} better while teaching you {topic}."
          ],
          approach: [
            "Look at your current {file_name} code and identify where {topic} can help.",
            "Focus on the {specific_area} in {file_name} that needs improvement.",
            "Use {topic} principles to guide your enhancement of {file_name}."
          ],
          explanation: [
            "This improvement to {file_name} demonstrates practical {topic} application.",
            "Notice how {topic} makes your {file_name} more effective.",
            "The {topic} techniques here show real-world usage in your project."
          ]
        },
        variables: ['topic', 'file_name', 'task', 'feature', 'specific_improvement', 'specific_area']
      }
    ]);
  }

  /**
   * Replace template variables with actual values
   */
  private replaceTemplateVariables(text: string, variables: string[], request: ConversionRequest): string {
    let result = text;

    variables.forEach(variable => {
      const value = this.getVariableValue(variable, request);
      if (value) {
        result = result.replace(new RegExp(`{${variable}}`, 'g'), value);
      }
    });

    return result;
  }

  /**
   * Get value for a template variable
   */
  private getVariableValue(variable: string, request: ConversionRequest): string {
    const exercise = request.exercise;

    switch (variable) {
      case 'topic':
        return request.context?.topic || exercise.topic || 'this concept';
      case 'file_name':
        return 'currentCode' in exercise
          ? exercise.file.split('/').pop() || 'your file'
          : 'your code';
      case 'task_description':
        return exercise.description || exercise.problem || 'the exercise';
      case 'specific_task':
        return this.extractSpecificTask(exercise);
      case 'challenge_type':
        return this.extractChallengeType(exercise);
      case 'feature':
        return this.extractFeature(exercise);
      case 'specific_improvement':
        return this.extractSpecificImprovement(exercise);
      case 'specific_area':
        return this.extractSpecificArea(exercise);
      default:
        return '';
    }
  }

  /**
   * Extract specific task from exercise
   */
  private extractSpecificTask(exercise: Exercise | ProjectChallenge): string {
    if ('challenge' in exercise) {
      return exercise.challenge;
    }
    return exercise.instructions || exercise.problem || 'this task';
  }

  /**
   * Extract challenge type from exercise
   */
  private extractChallengeType(exercise: Exercise | ProjectChallenge): string {
    if ('type' in exercise && exercise.type) {
      return exercise.type.replace('-', ' ');
    }
    return 'exercise';
  }

  /**
   * Extract feature from exercise
   */
  private extractFeature(exercise: Exercise | ProjectChallenge): string {
    const topic = exercise.topic || 'this feature';
    const type = exercise.type || 'functionality';
    return `${topic} ${type}`;
  }

  /**
   * Extract specific improvement from exercise
   */
  private extractSpecificImprovement(exercise: Exercise | ProjectChallenge): string {
    if ('challenge' in exercise) {
      return exercise.challenge;
    }
    return exercise.description || 'this improvement';
  }

  /**
   * Extract specific area from exercise
   */
  private extractSpecificArea(exercise: Exercise | ProjectChallenge): string {
    if ('currentCode' in exercise) {
      return 'current implementation';
    }
    return 'this part';
  }

  /**
   * Add vibe context to text
   */
  private addVibeContext(text: string, vibe: string): string {
    const vibeContexts = {
      confused: "I know {topic} can feel confusing, so let's work through it together step by step.",
      understanding: "Since you're comfortable with {topic}, let's try applying it in a practical way.",
      breakthrough: "That insight about {topic} is fantastic! Let's build on it immediately.",
      practicing: "Great work practicing {topic}! Let's take your skills to the next level.",
      misunderstanding: "Let's clarify {topic} through this exercise - it will help clear things up."
    };

    const context = vibeContexts[vibe as keyof typeof vibeContexts];
    return context ? `${text} ${context}` : text;
  }

  /**
   * Add project context to text
   */
  private addProjectContext(text: string, projectContext: string): string {
    return `${text} ${projectContext}`;
  }

  /**
   * Add level context to text
   */
  private addLevelContext(text: string, level: string): string {
    const levelContexts = {
      beginner: "Since you're just starting, we'll take this step by step.",
      intermediate: "Perfect! This will build on what you already know.",
      advanced: "Since you're experienced, this should be a good challenge."
    };

    const context = levelContexts[level as keyof typeof levelContexts];
    return context ? `${text} ${context}` : text;
  }

  /**
   * Naturalize instruction text
   */
  private naturalizeInstruction(instruction: string, style?: string): string {
    let naturalized = instruction;

    // Remove formal language
    naturalized = naturalized.replace(/Please/g, 'Let\'s');
    naturalized = naturalized.replace(/You should/g, 'Try');
    naturalized = naturalized.replace(/It is recommended/g, 'I\'d suggest');
    naturalized = naturalized.replace(/The user must/g, 'You\'ll want to');

    // Add conversational elements
    if (style === 'collaborative') {
      naturalized = naturalized.replace(/^(\w+)/, 'Let\'s $1');
    } else if (style === 'encouraging') {
      naturalized = `You can ${naturalized.toLowerCase()}`;
    }

    return naturalized;
  }

  /**
   * Naturalize hint text
   */
  private naturalizeHint(hint: string, style?: string): string {
    let naturalized = hint;

    // Make hints more encouraging
    naturalized = naturalized.replace(/Consider/g, 'Think about');
    naturalized = naturalized.replace(/Remember/g, 'Keep in mind');
    naturalized = naturalized.replace(/Note that/g, 'It might help to know');

    return naturalized;
  }

  /**
   * Naturalize explanation text
   */
  private naturalizeExplanation(explanation: string, style?: string): string {
    let naturalized = explanation;

    // Remove formal academic language
    naturalized = naturalized.replace(/Therefore/g, 'So');
    naturalized = naturalized.replace(/Additionally/g, 'Also');
    naturalized = naturalized.replace(/Consequently/g, 'As a result');
    naturalized = naturalized.replace(/This demonstrates/g, 'This shows');

    return naturalized;
  }

  /**
   * Parse instructions into steps
   */
  private parseInstructions(instructions: string): string[] {
    // Split on numbered lists, bullet points, or periods with new lines
    const stepPatterns = [
      /(\d+\.\s+.*?)(?=\d+\.|$)/gs,
      /([•\-*]\s+.*?)(?=[•\-*]|$)/gs,
      /([^.\n]+\.\s*)(?=[A-Z]|$)/gs
    ];

    for (const pattern of stepPatterns) {
      const matches = instructions.match(pattern);
      if (matches && matches.length > 1) {
        return matches.map(step => step.trim()).filter(step => step.length > 0);
      }
    }

    // If no clear steps, split by sentences
    return instructions.split('.').map(s => s.trim()).filter(s => s.length > 0);
  }

  /**
   * Extract estimated time from exercise
   */
  private extractEstimatedTime(exercise: Exercise | ProjectChallenge): number {
    return exercise.estimatedTime || 15;
  }

  /**
   * Extract difficulty from exercise
   */
  private extractDifficulty(exercise: Exercise | ProjectChallenge): 'easy' | 'medium' | 'hard' {
    return exercise.difficulty || 'medium';
  }

  /**
   * Extract learning objectives from exercise
   */
  private extractLearningObjectives(exercise: Exercise | ProjectChallenge): string[] {
    if ('learningObjectives' in exercise && Array.isArray(exercise.learningObjectives)) {
      return exercise.learningObjectives;
    }
    return [exercise.topic || 'concept understanding'];
  }

  /**
   * Identify elements removed during conversion
   */
  private identifyRemovedElements(sourceType: string, targetType: string): string[] {
    const removed: string[] = [];

    if (targetType === 'conversational') {
      removed.push('structured format', 'JSON schema', 'formal exercise template');
    }

    if (targetType === 'project-based' && sourceType === 'exercise') {
      removed.push('abstract scenario', 'generic examples');
    }

    return removed;
  }

  /**
   * Calculate naturalness score
   */
  private calculateNaturalnessScore(exercise: NaturalExercise): number {
    let score = 0.5; // Base score

    // Check for conversational elements
    if (exercise.introduction.includes('?') || exercise.introduction.includes('you')) score += 0.1;
    if (exercise.challenge.includes('you') || exercise.challenge.includes('try')) score += 0.1;
    if (exercise.context.includes('this will') || exercise.context.includes('helps')) score += 0.1;

    // Check for encouraging elements
    if (exercise.encouragement && exercise.encouragement.length > 0) score += 0.1;

    // Check against formal language
    const formalWords = ['therefore', 'additionally', 'consequently', 'it is recommended'];
    const hasFormalWords = formalWords.some(word =>
      exercise.introduction.includes(word) ||
      exercise.challenge.includes(word) ||
      exercise.context.includes(word)
    );
    if (!hasFormalWords) score += 0.1;

    return Math.min(1, score);
  }

  /**
   * Select random item from array
   */
  private selectRandom(items: string[]): string {
    return items[Math.floor(Math.random() * items.length)];
  }

  /**
   * Add custom conversion template
   */
  addCustomTemplate(template: ConversionTemplate): void {
    const key = `${template.sourceType}_${template.targetType}`;
    if (!this.templates.has(key)) {
      this.templates.set(key, []);
    }
    this.templates.get(key)!.push(template);
    this.logger.info('Added custom conversion template', {
      templateId: template.id,
      sourceType: template.sourceType,
      targetType: template.targetType
    });
  }

  /**
   * Get conversion statistics
   */
  getConversionStats(): {
    totalTemplates: number;
    templatesBySource: Record<string, number>;
    templatesByTarget: Record<string, number>;
  } {
    const totalTemplates = Array.from(this.templates.values())
      .reduce((sum, templates) => sum + templates.length, 0);

    const templatesBySource: Record<string, number> = {};
    const templatesByTarget: Record<string, number> = {};

    for (const templates of this.templates.values()) {
      templates.forEach(template => {
        templatesBySource[template.sourceType] = (templatesBySource[template.sourceType] || 0) + 1;
        templatesByTarget[template.targetType] = (templatesByTarget[template.targetType] || 0) + 1;
      });
    }

    return {
      totalTemplates,
      templatesBySource,
      templatesByTarget
    };
  }

  /**
   * Dispose of the service
   */
  dispose(): void {
    this.templates.clear();
    this.logger.info('NaturalLanguageConverter service disposed');
  }
}

/**
 * Global natural language converter instance
 */
export const naturalLanguageConverter = new NaturalLanguageConverter({
  logger: LoggerFactory.getLogger('NaturalLanguageConverter')
});