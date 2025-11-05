/**
 * Specialized Learning Agent
 *
 * A comprehensive learning agent that provides concept explanations,
 * learning path generation, knowledge assessment, and personalized
 * educational guidance. This agent uses pedagogical principles
 * to optimize learning outcomes.
 */

import { BaseLanguageModel } from '@langchain/core/language_models/base';
import { HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';
import { AgentExecutionRequest, AgentExecutionContext, AgentExecutionChunk } from '../types';
import { ToolExecutorService } from '../tool-executor';
import { ServiceDependencies } from '../types';

export interface LearningObjective {
  id: string;
  title: string;
  description: string;
  currentLevel: 'beginner' | 'intermediate' | 'advanced';
  targetLevel: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: number; // minutes
  prerequisites: string[];
  concepts: string[];
}

export interface ConceptExplanation {
  concept: string;
  explanation: string;
  examples: string[];
  analogies: string[];
  commonMisconceptions: string[];
  relatedConcepts: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedTime: number;
}

export interface LearningPath {
  id: string;
  title: string;
  description: string;
  objectives: LearningObjective[];
  estimatedDuration: number; // minutes
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  prerequisites: string[];
  resources: Array<{
    type: 'article' | 'video' | 'exercise' | 'quiz' | 'project';
    title: string;
    description: string;
    estimatedTime: number;
    url?: string;
  }>;
}

export interface LearningAssessment {
  id: string;
  topic: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  questions: Array<{
    question: string;
    type: 'multiple-choice' | 'short-answer' | 'essay' | 'practical';
    options?: string[];
    correctAnswer: string | string[];
    explanation: string;
    difficulty: 'easy' | 'medium' | 'hard';
    concept: string;
  }>;
  estimatedTime: number;
}

export interface LearningAgentConfig {
  defaultDifficultyLevel: 'beginner' | 'intermediate' | 'advanced';
  preferredLearningStyle: 'visual' | 'auditory' | 'kinesthetic' | 'reading';
  maxExplanationLength: number;
  includeExamples: boolean;
  includeAnalogies: boolean;
  adaptiveMode: boolean;
}

/**
 * Specialized Learning Agent
 */
export class LearningAgent {
  private model: BaseLanguageModel;
  private toolExecutor: ToolExecutorService;
  private dependencies: ServiceDependencies;
  private config: LearningAgentConfig;

  constructor(
    model: BaseLanguageModel,
    toolExecutor: ToolExecutorService,
    dependencies: ServiceDependencies,
    config: LearningAgentConfig
  ) {
    this.model = model;
    this.toolExecutor = toolExecutor;
    this.dependencies = dependencies;
    this.config = config;
  }

  /**
   * Execute learning agent
   */
  async *execute(
    request: AgentExecutionRequest,
    executionContext: AgentExecutionContext
  ): AsyncIterable<AgentExecutionChunk> {
    this.dependencies.logger.info(`Starting Learning Agent execution`, {
      executionId: executionContext.id,
      inputType: typeof request.input
    });

    try {
      // Parse user intent and learning need
      const learningIntent = await this.analyzeLearningIntent(request.input);

      yield {
        type: 'progress',
        content: {
          phase: 'intent_analyzed',
          message: `Learning intent identified: ${learningIntent.intent}`,
          intent: learningIntent
        },
        timestamp: Date.now()
      };

      // Route to appropriate learning function based on intent
      switch (learningIntent.intent) {
        case 'explain_concept':
          yield* this.explainConcept(request.input, learningIntent, executionContext);
          break;

        case 'create_learning_path':
          yield* this.createLearningPath(request.input, learningIntent, executionContext);
          break;

        case 'assess_knowledge':
          yield* this.assessKnowledge(request.input, learningIntent, executionContext);
          break;

        case 'provide_guidance':
          yield* this.provideGuidance(request.input, learningIntent, executionContext);
          break;

        case 'recommend_resources':
          yield* this.recommendResources(request.input, learningIntent, executionContext);
          break;

        default:
          yield* this.provideGeneralLearningHelp(request.input, learningIntent, executionContext);
          break;
      }

    } catch (error) {
      this.dependencies.logger.error(`Learning Agent execution failed`, error as Error);
      throw error;
    }
  }

  /**
   * Analyze user's learning intent
   */
  private async analyzeLearningIntent(input: any): Promise<{
    intent: string;
    concepts: string[];
    level?: string;
    urgency: 'low' | 'medium' | 'high';
    context: string;
  }> {
    const currentInput = typeof input === 'string' ? input : JSON.stringify(input);

    const intentPrompt = `You are a learning intent analyzer. Analyze the user's request to determine what kind of learning help they need.

User request: ${currentInput}

Possible intents:
- explain_concept: User wants to understand a specific concept
- create_learning_path: User wants a structured learning path for a topic
- assess_knowledge: User wants to test their understanding
- provide_guidance: User wants help with how to learn something
- recommend_resources: User wants learning resource recommendations
- general_help: General learning assistance

Response format:
{
  "intent": "intent_name",
  "concepts": ["concept1", "concept2"],
  "level": "beginner|intermediate|advanced|null",
  "urgency": "low|medium|high",
  "context": "Brief context of the learning request"
}`;

    const messages = [
      new SystemMessage("You are an expert at analyzing learning intents."),
      new HumanMessage(intentPrompt)
    ];

    try {
      const response = await this.model.invoke(messages);
      const content = response.content as string;

      let parsed;
      try {
        parsed = JSON.parse(content);
      } catch (parseError) {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        } else {
          // Default to general help if parsing fails
          return {
            intent: 'general_help',
            concepts: [],
            urgency: 'medium',
            context: currentInput
          };
        }
      }

      return {
        intent: parsed.intent || 'general_help',
        concepts: parsed.concepts || [],
        level: parsed.level,
        urgency: parsed.urgency || 'medium',
        context: parsed.context || currentInput
      };

    } catch (error) {
      this.dependencies.logger.warn(`Intent analysis failed`, error as Error);
      return {
        intent: 'general_help',
        concepts: [],
        urgency: 'medium',
        context: currentInput
      };
    }
  }

  /**
   * Explain a concept with detailed educational content
   */
  private async *explainConcept(
    input: any,
    learningIntent: any,
    executionContext: AgentExecutionContext
  ): AsyncIterable<AgentExecutionChunk> {
    const concept = learningIntent.concepts[0] || 'the concept';
    const level = learningIntent.level || this.config.defaultDifficultyLevel;

    yield {
      type: 'progress',
      content: { phase: 'researching', message: `Researching ${concept} and preparing explanation...` },
      timestamp: Date.now()
    };

    // Use tools to gather information about the concept
    let conceptData = {};
    try {
      const searchResult = await this.toolExecutor.executeTool('searchSessions', {
        query: concept,
        limit: 5
      });

      if (searchResult.success) {
        conceptData = searchResult.data;
      }
    } catch (error) {
      this.dependencies.logger.warn(`Concept search failed`, error);
    }

    yield {
      type: 'progress',
      content: { phase: 'generating', message: `Generating comprehensive explanation for ${concept}...` },
      timestamp: Date.now()
    };

    const explanationPrompt = `You are an expert educational content creator. Create a comprehensive explanation of "${concept}" at ${level} level.

Learning context: ${learningIntent.context}
Available information: ${JSON.stringify(conceptData)}

Instructions:
1. Start with a clear, simple definition
2. Provide progressive detail (simple to complex)
3. Use relatable analogies if appropriate
4. Include practical examples
5. Address common misconceptions
6. Connect to related concepts
7. Use ${this.config.preferredLearningStyle} learning style approaches
8. Keep explanation under ${this.config.maxExplanationLength} words

Format your response as:
{
  "explanation": "Main explanation text",
  "examples": ["Example 1", "Example 2"],
  "analogies": ["Analogy 1", "Analogy 2"],
  "misconceptions": ["Misconception 1 and correction"],
  "relatedConcepts": ["Related concept 1", "Related concept 2"],
  "difficulty": "easy|medium|hard",
  "estimatedTime": 15,
  "furtherReading": ["Topic 1 to explore next", "Topic 2 to explore next"]
}`;

    const messages = [
      new SystemMessage("You are an expert educator specializing in making complex topics understandable."),
      new HumanMessage(explanationPrompt)
    ];

    try {
      const response = await this.model.invoke(messages);
      const content = response.content as string;

      let explanation: ConceptExplanation;
      try {
        const parsed = JSON.parse(content);
        explanation = {
          concept,
          explanation: parsed.explanation || 'Explanation not available',
          examples: parsed.examples || [],
          analogies: parsed.analogies || [],
          commonMisconceptions: parsed.misconceptions || [],
          relatedConcepts: parsed.relatedConcepts || [],
          difficulty: parsed.difficulty || 'medium',
          estimatedTime: parsed.estimatedTime || 15
        };
      } catch (parseError) {
        // Fallback explanation
        explanation = {
          concept,
          explanation: content,
          examples: [],
          analogies: [],
          commonMisconceptions: [],
          relatedConcepts: learningIntent.concepts,
          difficulty: 'medium' as const,
          estimatedTime: 10
        };
      }

      yield {
        type: 'data',
        content: {
          type: 'concept_explanation',
          explanation
        },
        timestamp: Date.now()
      };

    } catch (error) {
      yield {
        type: 'error',
        content: {
          error: `Failed to generate concept explanation: ${(error as Error).message}`
        },
        timestamp: Date.now()
      };
    }
  }

  /**
   * Create a personalized learning path
   */
  private async *createLearningPath(
    input: any,
    learningIntent: any,
    executionContext: AgentExecutionContext
  ): AsyncIterable<AgentExecutionChunk> {
    const topic = learningIntent.concepts.join(', ') || 'the topic';
    const level = learningIntent.level || this.config.defaultDifficultyLevel;

    yield {
      type: 'progress',
      content: { phase: 'planning', message: `Creating personalized learning path for ${topic}...` },
      timestamp: Date.now()
    };

    const pathPrompt = `You are an expert curriculum designer. Create a comprehensive learning path for "${topic}" at ${level} level.

Learning context: ${learningIntent.context}
User's preferred learning style: ${this.config.preferredLearningStyle}

Create a structured learning path with:
1. Clear learning objectives
2. Logical progression from basics to advanced topics
3. Estimated time for each objective
4. Prerequisites and dependencies
5. Recommended resources (articles, videos, exercises, quizzes, projects)
6. Assessment points to check understanding
7. Total estimated duration

Format your response as:
{
  "title": "Learning Path Title",
  "description": "Brief description of what will be learned",
  "objectives": [
    {
      "title": "Objective 1",
      "description": "What will be learned",
      "currentLevel": "beginner",
      "targetLevel": "intermediate",
      "estimatedTime": 30,
      "prerequisites": [],
      "concepts": ["concept1", "concept2"]
    }
  ],
  "estimatedDuration": 180,
  "difficulty": "beginner",
  "prerequisites": ["Prerequisite 1"],
  "resources": [
    {
      "type": "article",
      "title": "Resource Title",
      "description": "Description",
      "estimatedTime": 15,
      "url": "optional_url"
    }
  ]
}`;

    const messages = [
      new SystemMessage("You are an expert educational curriculum designer."),
      new HumanMessage(pathPrompt)
    ];

    try {
      const response = await this.model.invoke(messages);
      const content = response.content as string;

      let learningPath: LearningPath;
      try {
        const parsed = JSON.parse(content);
        learningPath = {
          id: `path_${executionContext.id}`,
          title: parsed.title || `Learning Path: ${topic}`,
          description: parsed.description || `Comprehensive learning path for ${topic}`,
          objectives: parsed.objectives || [],
          estimatedDuration: parsed.estimatedDuration || 120,
          difficulty: parsed.difficulty || level,
          prerequisites: parsed.prerequisites || [],
          resources: parsed.resources || []
        };
      } catch (parseError) {
        // Fallback learning path
        learningPath = {
          id: `path_${executionContext.id}`,
          title: `Learning Path: ${topic}`,
          description: content,
          objectives: [],
          estimatedDuration: 120,
          difficulty: level,
          prerequisites: [],
          resources: []
        };
      }

      yield {
        type: 'data',
        content: {
          type: 'learning_path',
          learningPath
        },
        timestamp: Date.now()
      };

    } catch (error) {
      yield {
        type: 'error',
        content: {
          error: `Failed to create learning path: ${(error as Error).message}`
        },
        timestamp: Date.now()
      };
    }
  }

  /**
   * Assess user's knowledge with targeted questions
   */
  private async *assessKnowledge(
    input: any,
    learningIntent: any,
    executionContext: AgentExecutionContext
  ): AsyncIterable<AgentExecutionChunk> {
    const topic = learningIntent.concepts.join(', ') || 'the topic';
    const level = learningIntent.level || this.config.defaultDifficultyLevel;

    yield {
      type: 'progress',
      content: { phase: 'creating_assessment', message: `Creating knowledge assessment for ${topic}...` },
      timestamp: Date.now()
    };

    const assessmentPrompt = `You are an expert educational assessor. Create a comprehensive knowledge assessment for "${topic}" at ${level} level.

Learning context: ${learningIntent.context}

Create assessment questions that:
1. Test different levels of understanding (recall, application, analysis)
2. Include various question types (multiple choice, short answer, practical)
3. Cover key concepts and their relationships
4. Include clear explanations for correct answers
5. Estimate completion time
6. Provide difficulty ratings

Format your response as:
{
  "id": "assessment_id",
  "topic": "${topic}",
  "level": "${level}",
  "questions": [
    {
      "question": "Question text",
      "type": "multiple-choice|short-answer|essay|practical",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": "Correct answer(s)",
      "explanation": "Explanation of why this is correct",
      "difficulty": "easy|medium|hard",
      "concept": "Concept being tested"
    }
  ],
  "estimatedTime": 20
}`;

    const messages = [
      new SystemMessage("You are an expert educational assessor."),
      new HumanMessage(assessmentPrompt)
    ];

    try {
      const response = await this.model.invoke(messages);
      const content = response.content as string;

      let assessment: LearningAssessment;
      try {
        const parsed = JSON.parse(content);
        assessment = {
          id: `assessment_${executionContext.id}`,
          topic,
          level,
          questions: parsed.questions || [],
          estimatedTime: parsed.estimatedTime || 20
        };
      } catch (parseError) {
        // Fallback assessment
        assessment = {
          id: `assessment_${executionContext.id}`,
          topic,
          level,
          questions: [{
            question: content,
            type: 'short-answer',
            correctAnswer: 'See explanation above',
            explanation: 'This is a fallback assessment question',
            difficulty: 'medium',
            concept: topic
          }],
          estimatedTime: 10
        };
      }

      yield {
        type: 'data',
        content: {
          type: 'knowledge_assessment',
          assessment
        },
        timestamp: Date.now()
      };

    } catch (error) {
      yield {
        type: 'error',
        content: {
          error: `Failed to create knowledge assessment: ${(error as Error).message}`
        },
        timestamp: Date.now()
      };
    }
  }

  /**
   * Provide personalized learning guidance
   */
  private async *provideGuidance(
    input: any,
    learningIntent: any,
    executionContext: AgentExecutionContext
  ): AsyncIterable<AgentExecutionChunk> {
    yield {
      type: 'progress',
      content: { phase: 'analyzing_guidance', message: 'Analyzing learning needs and providing guidance...' },
      timestamp: Date.now()
    };

    const guidancePrompt = `You are an expert learning coach. Provide personalized learning guidance based on the user's request.

Learning context: ${learningIntent.context}
Topics of interest: ${learningIntent.concepts.join(', ')}
User's preferred learning style: ${this.config.preferredLearningStyle}

Provide guidance on:
1. How to approach learning this topic effectively
2. Best learning strategies for their learning style
3. Common challenges and how to overcome them
4. Recommended sequence of activities
5. How to stay motivated and track progress
6. Specific tips and techniques for this topic

Format your response as a comprehensive, encouraging, and actionable guidance.`;

    const messages = [
      new SystemMessage("You are an expert learning coach and educational advisor."),
      new HumanMessage(guidancePrompt)
    ];

    try {
      const response = await this.model.invoke(messages);

      yield {
        type: 'data',
        content: {
          type: 'learning_guidance',
          guidance: response.content,
          tips: this.extractTips(response.content),
          strategies: this.extractStrategies(response.content)
        },
        timestamp: Date.now()
      };

    } catch (error) {
      yield {
        type: 'error',
        content: {
          error: `Failed to provide learning guidance: ${(error as Error).message}`
        },
        timestamp: Date.now()
      };
    }
  }

  /**
   * Recommend learning resources
   */
  private async *recommendResources(
    input: any,
    learningIntent: any,
    executionContext: AgentExecutionContext
  ): AsyncIterable<AgentExecutionChunk> {
    const topic = learningIntent.concepts.join(', ') || 'the topic';
    const level = learningIntent.level || this.config.defaultDifficultyLevel;

    yield {
      type: 'progress',
      content: { phase: 'finding_resources', message: `Finding learning resources for ${topic}...` },
      timestamp: Date.now()
    };

    // Search for existing resources
    let existingResources = [];
    try {
      const searchResult = await this.toolExecutor.executeTool('searchSessions', {
        query: `${topic} resources ${level}`,
        limit: 10
      });

      if (searchResult.success) {
        existingResources = searchResult.data;
      }
    } catch (error) {
      this.dependencies.logger.warn(`Resource search failed`, error);
    }

    yield {
      type: 'progress',
      content: { phase: 'generating_recommendations', message: 'Generating personalized resource recommendations...' },
      timestamp: Date.now()
    };

    const recommendationPrompt = `You are an expert learning resource curator. Recommend high-quality learning resources for "${topic}" at ${level} level.

Learning context: ${learningIntent.context}
User's preferred learning style: ${this.config.preferredLearningStyle}
Existing resources found: ${JSON.stringify(existingResources)}

Recommend:
1. Books and articles
2. Online courses and tutorials
3. Videos and podcasts
4. Interactive exercises and tools
5. Practice projects
6. Communities and forums
7. Tools and software

For each resource, provide:
- Title and brief description
- Why it's recommended for this topic/level
- Estimated time commitment
- Format/type
- Any prerequisites

Focus on free or low-cost resources when possible.`;

    const messages = [
      new SystemMessage("You are an expert learning resource curator."),
      new HumanMessage(recommendationPrompt)
    ];

    try {
      const response = await this.model.invoke(messages);

      yield {
        type: 'data',
        content: {
          type: 'resource_recommendations',
          topic,
          level,
          recommendations: response.content,
          learningStyle: this.config.preferredLearningStyle
        },
        timestamp: Date.now()
      };

    } catch (error) {
      yield {
        type: 'error',
        content: {
          error: `Failed to generate resource recommendations: ${(error as Error).message}`
        },
        timestamp: Date.now()
      };
    }
  }

  /**
   * Provide general learning help
   */
  private async *provideGeneralLearningHelp(
    input: any,
    learningIntent: any,
    executionContext: AgentExecutionContext
  ): AsyncIterable<AgentExecutionChunk> {
    yield {
      type: 'progress',
      content: { phase: 'general_help', message: 'Providing general learning assistance...' },
      timestamp: Date.now()
    };

    const helpPrompt = `You are a helpful learning assistant. The user needs general learning help.

Learning context: ${learningIntent.context}
Topics of interest: ${learningIntent.concepts.join(', ')}

Provide helpful, educational assistance that:
1. Addresses their specific needs
2. Is educational and informative
3. Is encouraging and supportive
4. Provides actionable advice
5. Is appropriate for ${this.config.defaultDifficultyLevel} level
6. Considers their ${this.config.preferredLearningStyle} learning style`;

    const messages = [
      new SystemMessage("You are a helpful AI learning assistant."),
      new HumanMessage(helpPrompt)
    ];

    try {
      const response = await this.model.invoke(messages);

      yield {
        type: 'data',
        content: {
          type: 'general_help',
          response: response.content,
          suggestions: this.extractSuggestions(response.content)
        },
        timestamp: Date.now()
      };

    } catch (error) {
      yield {
        type: 'error',
        content: {
          error: `Failed to provide general learning help: ${(error as Error).message}`
        },
        timestamp: Date.now()
      };
    }
  }

  /**
   * Extract tips from guidance text
   */
  private extractTips(text: string): string[] {
    const tipPattern = /(?:Tip|Advice|Recommendation):\s*([^\n]+)/gi;
    const tips = [];
    let match;
    while ((match = tipPattern.exec(text)) !== null) {
      tips.push(match[1].trim());
    }
    return tips;
  }

  /**
   * Extract strategies from guidance text
   */
  private extractStrategies(text: string): string[] {
    const strategyPattern = /(?:Strategy|Approach|Method):\s*([^\n]+)/gi;
    const strategies = [];
    let match;
    while ((match = strategyPattern.exec(text)) !== null) {
      strategies.push(match[1].trim());
    }
    return strategies;
  }

  /**
   * Extract suggestions from help text
   */
  private extractSuggestions(text: string): string[] {
    const suggestionPattern = /(?:Suggestion|Consider|Try):\s*([^\n]+)/gi;
    const suggestions = [];
    let match;
    while ((match = suggestionPattern.exec(text)) !== null) {
      suggestions.push(match[1].trim());
    }
    return suggestions;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<LearningAgentConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get learning statistics
   */
  getLearningStatistics(): {
    conceptsExplained: number;
    pathsCreated: number;
    assessmentsGenerated: number;
    guidanceProvided: number;
    resourcesRecommended: number;
  } {
    // In a real implementation, these would be tracked over time
    return {
      conceptsExplained: 0,
      pathsCreated: 0,
      assessmentsGenerated: 0,
      guidanceProvided: 0,
      resourcesRecommended: 0
    };
  }
}

/**
 * Default learning agent configuration
 */
export const DEFAULT_LEARNING_AGENT_CONFIG: LearningAgentConfig = {
  defaultDifficultyLevel: 'intermediate',
  preferredLearningStyle: 'reading',
  maxExplanationLength: 500,
  includeExamples: true,
  includeAnalogies: true,
  adaptiveMode: true
};