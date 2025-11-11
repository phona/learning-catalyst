/**
 * Natural Prompt Generator
 *
 * Generates conversational, context-aware practice prompts that feel
 * natural and engaging, avoiding structured exercise formats entirely.
 */

import { ServiceDependencies } from '../agents/types';
import { LoggerFactory } from '../logger';
import type { UserLearningContext, VibeType } from '../../../../shared/types/electron-api/chat-api';
import type { ProjectChallenge } from './project-challenge-generator';

export interface NaturalPromptRequest {
  userContext: UserLearningContext;
  vibe: VibeType;
  currentTopic: string;
  challenge?: ProjectChallenge;
  conversationHistory?: Array<{ role: string; content: string; timestamp: number }>;
  preferences?: {
    style: 'conversational' | 'direct' | 'encouraging' | 'technical';
    length: 'short' | 'medium' | 'detailed';
    formality: 'casual' | 'semi-formal' | 'formal';
  };
}

export interface NaturalPromptResponse {
  id: string;
  type: 'suggestion' | 'challenge' | 'invitation' | 'collaboration';
  opening: string;
  challenge: string;
  context: string;
  options: {
    accept: string;
    decline: string;
    postpone: string;
  };
  metadata: {
    approach: 'gentle' | 'direct' | 'collaborative' | 'challenge';
    timing: 'immediate' | 'soon' | 'flexible';
    urgency: 'low' | 'medium' | 'high';
    naturalness: number; // 0-1 score
  };
  encouragement?: string;
  tips?: string[];
}

export interface PromptTemplate {
  id: string;
  vibe: VibeType;
  type: NaturalPromptResponse['type'];
  style: string;
  templates: {
    opening: string[];
    challenge: string[];
    context: string[];
    options: {
      accept: string[];
      decline: string[];
      postpone: string[];
    };
  };
  variables: string[];
}

export interface PromptGenerationConfig {
  enablePersonalization: boolean;
  useProjectContext: boolean;
  preferConversational: boolean;
  adaptiveComplexity: boolean;
  includeEncouragement: boolean;
  maxSuggestionsPerType: number;
  naturalnessThreshold: number;
}

export const DEFAULT_PROMPT_GENERATION_CONFIG: PromptGenerationConfig = {
  enablePersonalization: true,
  useProjectContext: true,
  preferConversational: true,
  adaptiveComplexity: true,
  includeEncouragement: true,
  maxSuggestionsPerType: 5,
  naturalnessThreshold: 0.7
};

/**
 * Natural Prompt Generator Service
 */
export class NaturalPromptGenerator {
  private logger: any;
  private config: PromptGenerationConfig;
  private templates: Map<string, PromptTemplate[]>;
  private usedPrompts = new Map<string, number>(); // Track used prompts to avoid repetition

  constructor(dependencies: ServiceDependencies, config: Partial<PromptGenerationConfig> = {}) {
    this.logger = dependencies.logger;
    this.config = { ...DEFAULT_PROMPT_GENERATION_CONFIG, ...config };
    this.templates = new Map();
    this.initializeTemplates();
    this.logger.info('NaturalPromptGenerator service initialized');
  }

  /**
   * Generate natural prompt for practice suggestion
   */
  async generateNaturalPrompt(request: NaturalPromptRequest): Promise<NaturalPromptResponse> {
    try {
      this.logger.info('Generating natural prompt', {
        userId: request.userContext.id,
        vibe: request.vibe,
        topic: request.currentTopic
      });

      // Select appropriate template
      const template = this.selectTemplate(request);

      // Generate prompt components
      const opening = this.generateOpening(template, request);
      const challenge = this.generateChallenge(template, request);
      const context = this.generateContext(template, request);
      const options = this.generateOptions(template, request);
      const metadata = this.generateMetadata(template, request);
      const encouragement = this.generateEncouragement(request);
      const tips = this.generateTips(request);

      const response: NaturalPromptResponse = {
        id: `prompt_${Date.now()}`,
        type: template.type,
        opening,
        challenge,
        context,
        options,
        metadata,
        encouragement,
        tips
      };

      // Track used template
      this.trackTemplateUsage(template.id);

      this.logger.info('Natural prompt generated successfully', {
        promptId: response.id,
        type: response.type,
        naturalness: metadata.naturalness
      });

      return response;

    } catch (error) {
      this.logger.error('Failed to generate natural prompt', error as Error);
      return this.createFallbackPrompt(request);
    }
  }

  /**
   * Initialize prompt templates
   */
  private initializeTemplates(): void {
    // Understanding vibe templates
    this.templates.set('understanding_suggestion', [
      {
        id: 'understanding_gentle_1',
        vibe: 'understanding',
        type: 'suggestion',
        style: 'conversational',
        templates: {
          opening: [
            "Great! It sounds like you're getting comfortable with {topic}.",
            "Nice! Since you understand {topic} now,",
            "Awesome! You've got a good grasp of {topic}.",
            "Perfect! Now that you understand {topic},"
          ],
          challenge: [
            "how about we try applying it to make something work?",
            "would you like to try a quick {topic} exercise?",
            "let's try using {topic} in a practical way.",
            "want to try a {topic} challenge to solidify your understanding?"
          ],
          context: [
            "This will help make the concept stick and show you how it works in real code.",
            "Practice makes perfect, and this will help you remember {topic} better.",
            "Applying what you've learned is the best way to make it stick.",
            "This practical exercise will reinforce what you just learned about {topic}."
          ],
          options: {
            accept: ["Sure, let's try it!", "Yes, that sounds good.", "Okay, I'm ready.", "Let's do it!"],
            decline: ["Maybe in a bit.", "Thanks, but not right now.", "I'll pass for now.", "Maybe later."],
            postpone: ["In a few minutes?", "Let me finish this thought first.", "Can we practice later?", "Give me a minute."]
          }
        },
        variables: ['topic']
      },
      {
        id: 'understanding_direct_1',
        vibe: 'understanding',
        type: 'challenge',
        style: 'direct',
        templates: {
          opening: [
            "Since you understand {topic}, here's a practical challenge:",
            "You've got {topic} down. Time for a real application:",
            "Ready to put your {topic} knowledge to work?",
            "Let's test your {topic} understanding with something practical:"
          ],
          challenge: [
            "Try implementing {specific_task} using {concept}.",
            "Create a {implementation_type} that uses {topic} correctly.",
            "Build {feature_description} with proper {topic} usage.",
            "Implement {specific_functionality} following {topic} best practices."
          ],
          context: [
            "This challenge will help you apply {topic} in a realistic scenario.",
            "You'll get hands-on experience with {topic} through this exercise.",
            "This is exactly how {topic} is used in real projects.",
            "Practical application is key to mastering {topic}."
          ],
          options: {
            accept: ["I'm up for the challenge!", "Let's tackle this.", "Sounds interesting!", "Ready when you are."],
            decline: ["Maybe next time.", "I'd prefer something simpler.", "Not feeling this one.", "Let's skip it."],
            postpone: ["Can we try a different version?", "I need to prepare first.", "Later would be better.", "Give me some time."]
          }
        },
        variables: ['topic', 'specific_task', 'concept', 'implementation_type', 'feature_description', 'specific_functionality']
      }
    ]);

    // Confused vibe templates
    this.templates.set('confused_suggestion', [
      {
        id: 'confused_gentle_1',
        vibe: 'confused',
        type: 'suggestion',
        style: 'encouraging',
        templates: {
          opening: [
            "No worries about {topic} - sometimes hands-on practice helps clear things up.",
            "It's completely normal to find {topic} confusing at first. Let's work through it together.",
            "I understand {topic} can be tricky. A practical exercise might help clarify things.",
            "Don't worry about getting {topic} perfect yet. Practice will help it make sense."
          ],
          challenge: [
            "How about we try a simple {topic} exercise to see how it works?",
            "Let's work through a basic {topic} example together step by step.",
            "Would you like to try a hands-on {topic} activity to understand it better?",
            "I have a gentle {topic} exercise that might help clear up the confusion."
          ],
          context: [
            "Sometimes doing is better than reading when it comes to understanding {topic}.",
            "This exercise is designed to make {topic} click through practical application.",
            "We'll take it slow and focus on understanding {topic} one step at a time.",
            "Practice often reveals the 'aha!' moment for {topic}."
          ],
          options: {
            accept: ["Yes, that would help!", "I'd like to try that.", "Sure, let's work through it.", "That sounds helpful."],
            decline: ["Maybe I need more explanation first.", "Thanks, but I'm not ready yet.", "I think I need to review more.", "Not just yet."],
            postpone: ["Can you explain a bit more first?", "Let me review the basics.", "I need to prepare first.", "Give me a moment to think."]
          }
        },
        variables: ['topic']
      }
    ]);

    // Breakthrough vibe templates
    this.templates.set('breakthrough_collaboration', [
      {
        id: 'breakthrough_collaborative_1',
        vibe: 'breakthrough',
        type: 'collaboration',
        style: 'conversational',
        templates: {
          opening: [
            "Excellent breakthrough with {topic}! That's a huge insight you just had.",
            "Wow, that 'aha!' moment about {topic} is fantastic! Let's make it stick.",
            "Amazing! You just unlocked something important about {topic}.",
            "Brilliant insight on {topic}! Let's solidify that understanding."
          ],
          challenge: [
            "Want to celebrate by building something cool with {topic}?",
            "How about we use that {topic} insight to create something impressive?",
            "Let's turn your {topic} breakthrough into a practical achievement.",
            "Ready to apply that {topic} understanding to build something real?"
          ],
          context: [
            "This is the perfect time to apply your {topic} insight while it's fresh.",
            "Let's capitalize on that {topic} breakthrough with some hands-on work.",
            "Your new understanding of {topic} deserves to be put into practice.",
            "This exercise will help you remember that {topic} insight forever."
          ],
          options: {
            accept: ["Absolutely! Let's celebrate!", "Yes! Let's build something.", "Perfect timing!", "Let's do this!"],
            decline: ["I want to savor this moment first.", "Maybe in a bit, I'm still processing.", "Thanks, but let me enjoy this insight first.", "Let me think about this breakthrough first."],
            postpone: ["In a few minutes when the excitement settles?", "Let me write this down first.", "Can we practice after I document this insight?", "Give me a moment to appreciate this."]
          }
        },
        variables: ['topic']
      }
    ]);

    // Practicing vibe templates
    this.templates.set('practicing_challenge', [
      {
        id: 'practicing_challenge_1',
        vibe: 'practicing',
        type: 'challenge',
        style: 'technical',
        templates: {
          opening: [
            "Great work practicing {topic}! You're really building momentum.",
            "Nice progress with {topic}! Let's take it to the next level.",
            "You're doing great with {topic}. Ready for a bigger challenge?",
            "Excellent practice with {topic}! Time to level up your skills."
          ],
          challenge: [
            "Since you're comfortable with {topic}, let's try an advanced {topic} challenge.",
            "Ready for a {topic} challenge that builds on what you've been practicing?",
            "How about a complex {topic} exercise to test your skills?",
            "Let's push your {topic} knowledge with a challenging scenario."
          ],
          context: [
            "This challenge will help you master {topic} beyond the basics.",
            "Since you're already practicing {topic}, you're ready for this advanced exercise.",
            "This is the perfect next step in your {topic} learning journey.",
            "Building on your current {topic} practice will solidify your expertise."
          ],
          options: {
            accept: ["Bring it on!", "I'm ready for the challenge.", "Let's level up!", "Sounds exciting!"],
            decline: ["I'd prefer to stick with basics for now.", "Maybe something intermediate?", "Thanks, but I'm good with current level.", "Not ready for advanced yet."],
            postpone: ["Can I practice a bit more first?", "Let me solidify basics first.", "Maybe after more practice?", "I need to prepare for this level."]
          }
        },
        variables: ['topic']
      }
    ]);

    // Misunderstanding vibe templates
    this.templates.set('misunderstanding_correction', [
      {
        id: 'misunderstanding_gentle_1',
        vibe: 'misunderstanding',
        type: 'suggestion',
        style: 'encouraging',
        templates: {
          opening: [
            "I notice there might be a small misunderstanding about {topic}. That's completely okay!",
            "Let's gently clear up a common confusion about {topic}. It happens to everyone.",
            "No worries about {topic} - sometimes concepts get a bit mixed up. Let's clarify.",
            "I think we can clarify {topic} with a simple exercise. Shall we?"
          ],
          challenge: [
            "How about we try a practical {topic} exercise that will clear things up?",
            "Let's work through a {topic} example that will show you the correct way.",
            "Would you like to try a {topic} activity that will help clear up the confusion?",
            "I have a gentle {topic} exercise that will help clarify the concept."
          ],
          context: [
            "Sometimes hands-on experience is the best way to clear up misconceptions about {topic}.",
            "This exercise will help you see {topic} the right way through practice.",
            "Let's use this opportunity to build correct understanding of {topic}.",
            "Practical application often clears up confusion about {topic}."
          ],
          options: {
            accept: ["Yes, that would help clarify things.", "Sure, let's clear this up.", "I'd like to understand correctly.", "Thanks, let's work through it."],
            decline: ["I think I need more explanation first.", "Maybe after more study.", "Thanks, but I want to review more.", "Not ready yet."],
            postpone: ["Can you explain the correct way first?", "Let me review the concepts first.", "I need to prepare before practicing.", "Give me some time to think."]
          }
        },
        variables: ['topic']
      }
    ]);
  }

  /**
   * Select appropriate template based on request
   */
  private selectTemplate(request: NaturalPromptRequest): PromptTemplate {
    const vibe = request.vibe;
    const templates = this.templates.get(`${vibe}_suggestion`) ||
                    this.templates.get(`${vibe}_challenge`) ||
                    this.templates.get(`${vibe}_collaboration`) ||
                    this.templates.get(`${vibe}_correction`) ||
                    this.templates.get('understanding_suggestion') || [];

    // Filter available templates
    const availableTemplates = templates.filter(template => {
      // Avoid recently used templates
      const lastUsed = this.usedPrompts.get(template.id) || 0;
      const timeSinceUsed = Date.now() - lastUsed;
      return timeSinceUsed > 5 * 60 * 1000; // 5 minutes cooldown
    });

    // If no available templates, use any template
    const templatePool = availableTemplates.length > 0 ? availableTemplates : templates;

    // Select template based on user preferences
    if (request.preferences) {
      const styleFiltered = templatePool.filter(t => t.style === request.preferences.style);
      if (styleFiltered.length > 0) {
        return styleFiltered[Math.floor(Math.random() * styleFiltered.length)];
      }
    }

    return templatePool[Math.floor(Math.random() * templatePool.length)];
  }

  /**
   * Generate opening message
   */
  private generateOpening(template: PromptTemplate, request: NaturalPromptRequest): string {
    const openingTemplates = template.templates.opening;
    let opening = openingTemplates[Math.floor(Math.random() * openingTemplates.length)];

    // Replace variables
    opening = this.replaceVariables(opening, template.variables, request);

    // Add personalization if enabled
    if (this.config.enablePersonalization && request.userContext.confidenceLevel > 0.7) {
      opening = this.addPersonalization(opening, request);
    }

    return opening;
  }

  /**
   * Generate challenge message
   */
  private generateChallenge(template: PromptTemplate, request: NaturalPromptRequest): string {
    const challengeTemplates = template.templates.challenge;
    let challenge = challengeTemplates[Math.floor(Math.random() * challengeTemplates.length)];

    // Replace variables
    challenge = this.replaceVariables(challenge, template.variables, request);

    // Add project context if available
    if (this.config.useProjectContext && request.challenge) {
      challenge = this.addProjectContext(challenge, request.challenge);
    }

    return challenge;
  }

  /**
   * Generate context message
   */
  private generateContext(template: PromptTemplate, request: NaturalPromptRequest): string {
    const contextTemplates = template.templates.context;
    let context = contextTemplates[Math.floor(Math.random() * contextTemplates.length)];

    // Replace variables
    context = this.replaceVariables(context, template.variables, request);

    // Add learning context
    context = this.addLearningContext(context, request);

    return context;
  }

  /**
   * Generate response options
   */
  private generateOptions(template: PromptTemplate, request: NaturalPromptRequest): NaturalPromptResponse['options'] {
    const optionTemplates = template.templates.options;

    return {
      accept: this.selectRandomOption(optionTemplates.accept),
      decline: this.selectRandomOption(optionTemplates.decline),
      postpone: this.selectRandomOption(optionTemplates.postpone)
    };
  }

  /**
   * Generate metadata
   */
  private generateMetadata(template: PromptTemplate, request: NaturalPromptRequest): NaturalPromptResponse['metadata'] {
    return {
      approach: this.determineApproach(template, request),
      timing: this.determineTiming(template, request),
      urgency: this.determineUrgency(request),
      naturalness: this.calculateNaturalness(template, request)
    };
  }

  /**
   * Generate encouragement message
   */
  private generateEncouragement(request: NaturalPromptRequest): string | undefined {
    if (!this.config.includeEncouragement) {
      return undefined;
    }

    const encouragements = {
      confused: "Learning takes time, and confusion is part of the process. You're doing great!",
      understanding: "You're building a strong foundation. Keep up the excellent work!",
      breakthrough: "That insight shows real progress. Celebrate this moment!",
      practicing: "Consistent practice is the key to mastery. You're on the right track!",
      misunderstanding: "Clarifying misunderstandings is how we grow. You're learning effectively!"
    };

    return encouragements[request.vibe] || "You're doing great! Keep learning and growing.";
  }

  /**
   * Generate helpful tips
   */
  private generateTips(request: NaturalPromptRequest): string[] | undefined {
    if (!this.config.includeEncouragement) {
      return undefined;
    }

    const tips = [
      "Take your time and focus on understanding, not speed.",
      "Don't worry about making mistakes - they're learning opportunities.",
      "If you get stuck, try breaking the problem into smaller steps.",
      "Remember that practice helps concepts sink in better than just reading."
    ];

    // Select 1-2 random tips
    const selectedTips: string[] = [];
    const numTips = Math.floor(Math.random() * 2) + 1;

    for (let i = 0; i < numTips; i++) {
      const tip = tips[Math.floor(Math.random() * tips.length)];
      if (!selectedTips.includes(tip)) {
        selectedTips.push(tip);
      }
    }

    return selectedTips.length > 0 ? selectedTips : undefined;
  }

  /**
   * Replace template variables with actual values
   */
  private replaceVariables(text: string, variables: string[], request: NaturalPromptRequest): string {
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
  private getVariableValue(variable: string, request: NaturalPromptRequest): string {
    switch (variable) {
      case 'topic':
        return request.currentTopic;
      case 'specific_task':
        return this.getSpecificTask(request);
      case 'concept':
        return this.getConcept(request);
      case 'implementation_type':
        return this.getImplementationType(request);
      case 'feature_description':
        return this.getFeatureDescription(request);
      case 'specific_functionality':
        return this.getSpecificFunctionality(request);
      default:
        return '';
    }
  }

  /**
   * Get specific task based on context
   */
  private getSpecificTask(request: NaturalPromptRequest): string {
    const tasks = {
      'React hooks': 'adding state management to a component',
      'useState': 'toggling a todo item',
      'useEffect': 'handling side effects in a component',
      'components': 'creating a reusable UI element',
      'functions': 'optimizing a utility function',
      'arrays': 'filtering and mapping data',
      'objects': 'structuring data properly'
    };

    return tasks[request.currentTopic] || 'applying the concept practically';
  }

  /**
   * Get concept based on context
   */
  private getConcept(request: NaturalPromptRequest): string {
    return request.currentTopic;
  }

  /**
   * Get implementation type based on context
   */
  private getImplementationType(request: NaturalPromptRequest): string {
    const types = {
      'React hooks': 'React component',
      'useState': 'interactive component',
      'useEffect': 'lifecycle-aware component',
      'components': 'React component',
      'functions': 'utility function',
      'arrays': 'data processing function',
      'objects': 'data structure'
    };

    return types[request.currentTopic] || 'practical implementation';
  }

  /**
   * Get feature description based on context
   */
  private getFeatureDescription(request: NaturalPromptRequest): string {
    const features = {
      'React hooks': 'an interactive feature that responds to user actions',
      'useState': 'a dynamic interface that updates based on state',
      'useEffect': 'a component that handles external data or events',
      'components': 'a reusable UI element with its own state',
      'functions': 'a reusable piece of logic',
      'arrays': 'a data transformation feature',
      'objects': 'a well-structured data model'
    };

    return features[request.currentTopic] || 'a useful feature';
  }

  /**
   * Get specific functionality based on context
   */
  private getSpecificFunctionality(request: NaturalPromptRequest): string {
    const functionalities = {
      'React hooks': 'state management and side effects',
      'useState': 'component state updates',
      'useEffect': 'component lifecycle management',
      'components': 'props and state handling',
      'functions': 'parameter processing and return values',
      'arrays': 'data filtering and transformation',
      'objects': 'property management and methods'
    };

    return functionalities[request.currentTopic] || 'core functionality';
  }

  /**
   * Add personalization to message
   */
  private addPersonalization(text: string, request: NaturalPromptRequest): string {
    if (request.userContext.confidenceLevel > 0.8) {
      return `${text} Given how quickly you're learning, you'll probably find this quite straightforward.`;
    }
    return text;
  }

  /**
   * Add project context to message
   */
  private addProjectContext(text: string, challenge: ProjectChallenge): string {
    const fileName = challenge.file.split('/').pop() || 'your code';
    return `${text} You'll be working directly with your \`${fileName}\` file, which is perfect for applying this concept in your real project.`;
  }

  /**
   * Add learning context to message
   */
  private addLearningContext(text: string, request: NaturalPromptRequest): string {
    if (request.userContext.recentConcepts.length > 0) {
      const recentConcept = request.userContext.recentConcepts[0].concept;
      if (recentConcept !== request.currentTopic) {
        return `${text} This builds on your recent work with ${recentConcept}.`;
      }
    }
    return text;
  }

  /**
   * Select random option from array
   */
  private selectRandomOption(options: string[]): string {
    return options[Math.floor(Math.random() * options.length)];
  }

  /**
   * Determine approach type
   */
  private determineApproach(template: PromptTemplate, request: NaturalPromptRequest): NaturalPromptResponse['metadata']['approach'] {
    const approachMap: Record<string, NaturalPromptResponse['metadata']['approach']> = {
      'conversational': 'gentle',
      'direct': 'direct',
      'encouraging': 'gentle',
      'technical': 'direct',
      'collaborative': 'collaborative'
    };

    return approachMap[template.style] || 'gentle';
  }

  /**
   * Determine timing
   */
  private determineTiming(template: PromptTemplate, request: NaturalPromptRequest): NaturalPromptResponse['metadata']['timing'] {
    const vibeTimingMap: Record<VibeType, NaturalPromptResponse['metadata']['timing']> = {
      understanding: 'immediate',
      confused: 'flexible',
      breakthrough: 'immediate',
      practicing: 'soon',
      misunderstanding: 'flexible'
    };

    return vibeTimingMap[request.vibe] || 'flexible';
  }

  /**
   * Determine urgency
   */
  private determineUrgency(request: NaturalPromptRequest): NaturalPromptResponse['metadata']['urgency'] {
    const urgencyMap: Record<VibeType, NaturalPromptResponse['metadata']['urgency']> = {
      understanding: 'low',
      confused: 'low',
      breakthrough: 'medium',
      practicing: 'medium',
      misunderstanding: 'low'
    };

    return urgencyMap[request.vibe] || 'low';
  }

  /**
   * Calculate naturalness score
   */
  private calculateNaturalness(template: PromptTemplate, request: NaturalPromptRequest): number {
    let score = 0.7; // Base score

    // Prefer conversational styles
    if (template.style === 'conversational' || template.style === 'encouraging') {
      score += 0.2;
    }

    // Bonus for collaboration type
    if (template.type === 'collaboration' || template.type === 'invitation') {
      score += 0.1;
    }

    // Adjust based on user preferences
    if (request.preferences?.style === 'conversational') {
      score += 0.1;
    }

    return Math.min(1, score);
  }

  /**
   * Track template usage to avoid repetition
   */
  private trackTemplateUsage(templateId: string): void {
    this.usedPrompts.set(templateId, Date.now());

    // Clean old entries
    const now = Date.now();
    for (const [id, timestamp] of this.usedPrompts.entries()) {
      if (now - timestamp > 60 * 60 * 1000) { // 1 hour
        this.usedPrompts.delete(id);
      }
    }
  }

  /**
   * Create fallback prompt when generation fails
   */
  private createFallbackPrompt(request: NaturalPromptRequest): NaturalPromptResponse {
    return {
      id: `fallback_${Date.now()}`,
      type: 'suggestion',
      opening: `Since you're learning about ${request.currentTopic},`,
      challenge: 'how about we try a simple practice exercise to help you understand it better?',
      context: 'Practice is the best way to solidify your understanding of new concepts.',
      options: {
        accept: "Sure, let's try it!",
        decline: "Maybe later",
        postpone: "In a few minutes?"
      },
      metadata: {
        approach: 'gentle',
        timing: 'flexible',
        urgency: 'low',
        naturalness: 0.6
      },
      encouragement: "You're doing great by practicing! Every attempt helps you learn better."
    };
  }

  /**
   * Add custom template
   */
  addCustomTemplate(template: PromptTemplate): void {
    const key = `${template.vibe}_${template.type}`;
    if (!this.templates.has(key)) {
      this.templates.set(key, []);
    }
    this.templates.get(key)!.push(template);
    this.logger.info('Added custom template', { templateId: template.id, vibe: template.vibe, type: template.type });
  }

  /**
   * Get template statistics
   */
  getTemplateStats(): {
    totalTemplates: number;
    templatesByVibe: Record<string, number>;
    templatesByType: Record<string, number>;
    recentlyUsed: Array<{ id: string; lastUsed: number }>;
  } {
    const templatesByVibe: Record<string, number> = {};
    const templatesByType: Record<string, number> = {};
    let totalTemplates = 0;

    for (const [key, templates] of this.templates.entries()) {
      totalTemplates += templates.length;
      const [vibe] = key.split('_');
      templatesByVibe[vibe] = (templatesByVibe[vibe] || 0) + templates.length;

      templates.forEach(template => {
        templatesByType[template.type] = (templatesByType[template.type] || 0) + 1;
      });
    }

    const recentlyUsed = Array.from(this.usedPrompts.entries())
      .map(([id, timestamp]) => ({ id, lastUsed: timestamp }))
      .sort((a, b) => b.lastUsed - a.lastUsed)
      .slice(0, 10);

    return {
      totalTemplates,
      templatesByVibe,
      templatesByType,
      recentlyUsed
    };
  }

  /**
   * Clear used prompts tracking
   */
  clearUsageTracking(): void {
    this.usedPrompts.clear();
    this.logger.info('Cleared prompt usage tracking');
  }

  /**
   * Dispose of the service
   */
  dispose(): void {
    this.templates.clear();
    this.usedPrompts.clear();
    this.logger.info('NaturalPromptGenerator service disposed');
  }
}

/**
 * Global natural prompt generator instance
 */
export const naturalPromptGenerator = new NaturalPromptGenerator({
  logger: LoggerFactory.getLogger('NaturalPromptGenerator')
});