
import { ServiceDependencies } from '../types';
import { PracticeVibeResult, UserContext } from '@/shared/types/practice';

export class NaturalPromptGenerator {
  private readonly dependencies: ServiceDependencies;

  constructor(dependencies: ServiceDependencies) {
    this.dependencies = dependencies;
  }

  generatePracticePrompt(
    vibe: PracticeVibeResult,
    userContext: UserContext
  ): string {
    this.dependencies.logger.info('Generating natural practice prompt...', {
      vibe: vibe.vibe,
      confidence: vibe.confidence,
      project: userContext.currentProject?.name
    });

    // Generate natural language prompts based on detected vibe
    const naturalPrompt = this.createVibeBasedPrompt(vibe, userContext);

    return naturalPrompt;
  }

  private createVibeBasedPrompt(vibe: PracticeVibeResult, userContext: UserContext): string {
    const topic = vibe.suggestedTopics[0] || 'current topic';
    const projectContext = userContext.currentProject?.name || 'your project';

    switch (vibe.vibe) {
    case 'understanding':
      return this.createUnderstandingPrompt(topic, projectContext);
      
    case 'confused':
      return this.createConfusedPrompt(topic, projectContext);
      
    case 'breakthrough':
      return this.createBreakthroughPrompt(topic, projectContext);
      
    case 'practicing':
      return this.createPracticingPrompt(topic, projectContext);
      
    case 'misunderstanding':
      return this.createMisunderstandingPrompt(topic, projectContext);
      
    default:
      return this.createGenericPrompt(topic, projectContext);
    }
  }

  private createUnderstandingPrompt(topic: string, project: string): string {
    const prompts = [
      `Now that you understand ${topic}, want to try implementing something in your ${project}?`,
      `Since you seem to get ${topic}, why don't we try a small challenge with it in your ${project}?`,
      `Perfect! You've got ${topic} down. Ready to apply it in your ${project}?`,
      `Nice! Since you're working on that ${project}, how about making one of your ${topic} items actually toggle?`,
      `I can tell you're getting ${topic}. Want to solidify that by trying it in your ${project}?`
    ];
    return prompts[Math.floor(Math.random() * prompts.length)];
  }

  private createConfusedPrompt(topic: string, project: string): string {
    const prompts = [
      `I see what might be tripping you up with ${topic}. Let's try a hands-on example in your ${project}.`,
      `Don't worry about feeling confused with ${topic} - let's work through it together in your ${project}.`,
      `It looks like ${topic} is giving you trouble. Why not try a practical exercise in your ${project} to clear things up?`,
      `Sometimes the best way to clear up confusion about ${topic} is through practice. Want to try something in your ${project}?`,
      `No worries - ${topic} can be tricky. How about a gentle exercise in your ${project} to help clarify?`
    ];
    return prompts[Math.floor(Math.random() * prompts.length)];
  }

  private createBreakthroughPrompt(topic: string, project: string): string {
    const prompts = [
      `Excellent breakthrough with ${topic}! Let's solidify that understanding with some practice in your ${project}.`,
      `That "aha" moment for ${topic} is perfect! Want to build on it with a quick challenge in your ${project}?`,
      `Brilliant! Since you've cracked ${topic}, let's make sure it sticks with some hands-on work in your ${project}.`,
      `Great insight on ${topic}! Time to put that fresh understanding to work in your ${project}.`,
      `Wonderful breakthrough with ${topic}! Ready to turn that insight into practical skill in your ${project}?`
    ];
    return prompts[Math.floor(Math.random() * prompts.length)];
  }

  private createPracticingPrompt(topic: string, project: string): string {
    const prompts = [
      `Keep going with ${topic} practice in your ${project}! What else can you tackle?`,
      `Great work practicing ${topic}! How about trying something a bit more challenging in your ${project}?`,
      `You're doing well with ${topic} practice. Want to explore another aspect in your ${project}?`,
      `Solid progress with ${topic}! Ready for the next level challenge in your ${project}?`,
      `Excellent persistence with ${topic} practice! What's the next thing you'd like to try in your ${project}?`
    ];
    return prompts[Math.floor(Math.random() * prompts.length)];
  }

  private createMisunderstandingPrompt(topic: string, project: string): string {
    const prompts = [
      `I see some confusion around ${topic}. Let's clear that up with a practical example in your ${project}.`,
      `You might have misunderstood ${topic}. Want to work through it with a hands-on approach in your ${project}?`,
      `Let's address that ${topic} confusion with some guided practice in your ${project}.`,
      `Sometimes we misunderstand concepts initially. Want to explore ${topic} through practice in your ${project}?`,
      `No problem - ${topic} can be misunderstood. Let's try a different approach with practice in your ${project}.`
    ];
    return prompts[Math.floor(Math.random() * prompts.length)];
  }

  private createGenericPrompt(topic: string, project: string): string {
    const prompts = [
      `Ready for some practice with ${topic} in your ${project}?`,
      `How about we work on ${topic} together in your ${project}?`,
      `Want to try applying ${topic} in your ${project}?`,
      `What do you think about practicing ${topic} with a hands-on approach in your ${project}?`,
      `Ready to dive deeper into ${topic} in your ${project}?`
    ];
    return prompts[Math.floor(Math.random() * prompts.length)];
  }
}

export interface NaturalPromptRequest {
  vibe: PracticeVibeResult;
  userContext: UserContext;
}

export interface NaturalPromptResponse {
  prompt: string;
  suggestions: string[];
  nextSteps: string[];
}

export interface PromptTemplate {
  id: string;
  name: string;
  template: string;
  conditions: Record<string, any>;
  metadata: Record<string, any>;
}

export interface PromptGenerationConfig {
  maxLength: number;
  format: 'natural' | 'structured' | 'hybrid';
  tone: 'casual' | 'professional' | 'academic' | 'encouraging';
  difficultyAdaptation: boolean;
}

export const DEFAULT_PROMPT_GENERATION_CONFIG: PromptGenerationConfig = {
  maxLength: 200,
  format: 'natural',
  tone: 'encouraging',
  difficultyAdaptation: true
};

export const naturalPromptGenerator = new NaturalPromptGenerator({} as ServiceDependencies); // Will be injected properly
