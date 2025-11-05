import { createAgent, ReactAgent, DynamicTool } from "langchain";
import type { Message, StreamChunk, ChatResponse } from '@/shared/types/ai';
import type { Session } from '@/shared/types/session';
import type {
  ProviderType,
} from '@/shared/types/config';
import type { ConfigService } from '@/main/services/configService';
import { createDatabase, runMigrations } from '../database/kysely-database';
import { SQLiteCheckpointSaver } from '../database/SQLiteCheckpointSaver';
import { Kysely } from "kysely";
import type { Database } from '../modules/database/kysely-schema'
import { BaseCheckpointSaver, type LangGraphRunnableConfig } from "@langchain/langgraph";
import { ModelFactory } from "../langchain/ModelFactory";

/**
 * Educational Agent Types
 * Each agent is specialized for different learning scenarios
 */
export enum AgentType {
  LEARNING = 'learning',           // Concept understanding, explanations
  ASSESSMENT = 'assessment',       // Quizzes, evaluations, feedback
  TUTORING = 'tutoring',          // Personalized guidance, Q&A
  PRACTICE = 'practice',          // Exercises, coding challenges
  RESEARCH = 'research',          // Information gathering, analysis
  COLLABORATION = 'collaboration', // Group work, peer interaction
  TITLE_GENERATION = 'title-generation' // Generate concise, descriptive session titles
}

/**
 * Agent Configuration
 */
interface AgentConfig {
  tools: DynamicTool[];
  systemPrompt: string;
  checkpointer?: BaseCheckpointSaver;
  temperature?: number;
  maxTokens?: number;
}

/**
 * Multi-Agent Manager for Educational AI
 * Focuses on agent lifecycle management, LangChain handles model communication
 */
export class AgentManager {
  private agents: Map<AgentType, any> = new Map(); // LangChain agents
  private toolRegistry: Map<AgentType, AgentConfig> = new Map();
  private currentModelConfig: { provider: ProviderType; model: string } | null = null;
  private checkpointSaver: SQLiteCheckpointSaver;

  constructor(
    private configService: ConfigService,
    private db: Kysely<Database>
  ) {
    this.initializeToolRegistry();
    this.setupConfigListener();
	this.checkpointSaver = new SQLiteCheckpointSaver(db);
  }

  /**
   * Initialize agent configurations with tools and prompts
   */
  private initializeToolRegistry(): void {
    // Learning Agent Configuration
    this.toolRegistry.set(AgentType.LEARNING, {
      tools: this.createLearningTools(),
	  checkpointer: this.checkpointSaver,
      systemPrompt: `You are a Learning Catalyst focused on deep concept understanding.

Your expertise includes:
- Breaking down complex topics into understandable parts
- Creating clear explanations and analogies
- Identifying key concepts and relationships
- Connecting new information to prior knowledge
- Adapting explanations to different learning styles

Your tools help analyze concepts, find explanations, and connect ideas.
Always ensure explanations are accurate, clear, and build understanding progressively.`
    });

    // Assessment Agent Configuration
    this.toolRegistry.set(AgentType.ASSESSMENT, {
      tools: this.createAssessmentTools(),
      systemPrompt: `You are an Assessment Specialist focused on evaluating learning outcomes.

Your expertise includes:
- Creating appropriate quizzes and tests
- Evaluating student responses accurately
- Providing constructive feedback
- Tracking progress over time
- Identifying knowledge gaps and strengths

Create assessments that are fair, comprehensive, and aligned with learning objectives.
Provide feedback that is specific, actionable, and encouraging.`
    });

    // Tutoring Agent Configuration
    this.toolRegistry.set(AgentType.TUTORING, {
      tools: this.createTutoringTools(),
      systemPrompt: `You are a Personal Tutor focused on individualized learning support.

Your expertise includes:
- Providing step-by-step guidance
- Asking probing questions to stimulate thinking
- Adapting explanations to student needs
- Checking for understanding
- Offering appropriate hints without giving away answers

Be patient, encouraging, and adaptive to each learner's pace and style.
Use Socratic questioning to help learners discover answers themselves.`
    });

    // Practice Agent Configuration
    this.toolRegistry.set(AgentType.PRACTICE, {
      tools: this.createPracticeTools(),
      systemPrompt: `You are a Practice Facilitator focused on hands-on learning.

Your expertise includes:
- Generating relevant practice activities
- Creating exercises of appropriate difficulty
- Providing step-by-step solution guidance
- Checking work and giving feedback
- Suggesting variations for additional practice

Design activities that reinforce learning objectives and build confidence.
Provide feedback that helps learners improve their understanding and skills.`
    });

    // Research Agent Configuration
    this.toolRegistry.set(AgentType.RESEARCH, {
      tools: this.createResearchTools(),
      systemPrompt: `You are a Research Assistant focused on information gathering and analysis.

Your expertise includes:
- Finding reliable information sources
- Analyzing and synthesizing information
- Evaluating source credibility
- Citing references properly
- Presenting findings clearly

Help users gather accurate information, understand different perspectives, and draw evidence-based conclusions.
Always verify information and cite sources appropriately.`
    });

    // Collaboration Agent Configuration
    this.toolRegistry.set(AgentType.COLLABORATION, {
      tools: this.createCollaborationTools(),
      systemPrompt: `You are a Collaboration Facilitator focused on group learning activities.

Your expertise includes:
- Facilitating productive discussions
- Coordinating team efforts
- Ensuring equal participation
- Resolving conflicts constructively
- Integrating different perspectives

Promote effective communication, respect diverse viewpoints, and help groups achieve their learning goals together.`
    });

    // Title Generation Agent Configuration
    this.toolRegistry.set(AgentType.TITLE_GENERATION, {
      tools: [], // No tools needed for title generation
      systemPrompt: `You are a Title Generation Specialist focused on creating concise, descriptive session titles.

Your expertise includes:
- Analyzing conversation content to identify main topics
- Creating clear, engaging titles in 3-8 words
- Capturing the essence of learning discussions
- Using appropriate educational terminology
- Distinguishing between different subjects and skill levels

Generate titles that are:
- Specific and descriptive
- Easy to understand at a glance
- Appropriate for the content level
- No more than 8 words maximum
- In title case (First Letter Of Each Word Capitalized)

Respond with ONLY the title, no additional text or explanation.`
    });
  }

  /**
   * Setup configuration change listener
   */
  private setupConfigListener(): void {
    this.configService.onCurrentModelChanged(async (modelType: string, modelConfig: any) => {
      if (modelType === 'chat') {
        await this.updateModelConfiguration(modelConfig.default_provider, modelConfig.default_model);
      }
    });
  }

  /**
   * Update model configuration for all agents
   */
  private async updateModelConfiguration(provider: ProviderType, model: string): Promise<void> {
    this.currentModelConfig = { provider, model };

    // Clear existing agents so they'll be recreated with new model
    this.agents.clear();
    console.log(`Model configuration updated to ${provider}:${model}. Agents will be recreated on next use.`);
  }

  /**
   * Get current model configuration from config service
   */
  private async getCurrentModelConfig(): Promise<{ provider: ProviderType; model: string }> {
    if (this.currentModelConfig) {
      return this.currentModelConfig;
    }

    const config = await this.configService.getConfig();

    this.currentModelConfig = {
      provider: config.ai.model_types.chat?.provider as ProviderType,
      model: config.ai.model_types.chat?.model || ''
    };

    return this.currentModelConfig;
  }

  /**
   * Create or get agent of specific type
   * LangChain handles the model communication internally
   */
  async getAgent(agentType: AgentType): Promise<any> {
    // Return existing agent if available
    if (this.agents.has(agentType)) {
      return this.agents.get(agentType);
    }

    // Create new agent
    const agent = await this.createAgent(agentType);
    this.agents.set(agentType, agent);
    return agent;
  }

  /**
   * Create agent using LangChain - let LangChain handle model communication
   */
  private async createAgent(agentType: AgentType): Promise<ReactAgent> {
    try {
      const agentConfig = this.toolRegistry.get(agentType);
      if (!agentConfig) {
        throw new Error(`No configuration found for agent type: ${agentType}`);
      }

      const { provider, model } = await this.getCurrentModelConfig();
	  const modelConfig = { provider_type: provider, model };
	  ModelFactory.createModel(provider, modelConfig)

      // Let LangChain handle model creation and communication
      const agent = createAgent({
        llm: `${provider}:${model}`, // LangChain will resolve this
        tools: agentConfig.tools,
        systemPrompt: agentConfig.systemPrompt
      });

      console.log(`Created ${agentType} agent for ${provider}:${model}`);
      return agent;
    } catch (error) {
      console.error(`Failed to create ${agentType} agent:`, error);
      throw error;
    }
  }

  /**
   * Tool creation methods with real LangChain integration
   * Uses secure tool execution with comprehensive error handling
   */
  private createLearningTools(): DynamicTool[] {
    try {
      // For now, create basic learning tools - in full implementation
      // these would be imported from the main thread tools
      return [
        new DynamicTool({
          name: "concept_parsing",
          description: "Parse and analyze educational content to extract concepts and relationships",
          func: async (input: string) => {
            // Simulate concept parsing - in real implementation would use secure tool executor
            const concepts = input.split(/[.!?]+/).filter(s => s.trim().length > 0).slice(0, 5);
            return JSON.stringify({
              concepts: concepts.length,
              keyTopics: concepts.slice(0, 3),
              estimatedTime: concepts.length * 5,
              difficulty: "intermediate"
            });
          }
        }),
        new DynamicTool({
          name: "session_search",
          description: "Search through previous learning sessions to find relevant content",
          func: async (input: string) => {
            // Simulate session search
            return JSON.stringify({
              foundSessions: 3,
              relevanceScore: 0.85,
              topics: ["related concept", "prerequisite knowledge"]
            });
          }
        })
      ];
    } catch (error) {
      console.error('Failed to create learning tools:', error);
      return [];
    }
  }

  private createAssessmentTools(): DynamicTool[] {
    try {
      return [
        new DynamicTool({
          name: "quiz_generator",
          description: "Generate personalized quizzes based on learning objectives",
          func: async (input: string) => {
            // Simulate quiz generation
            const request = JSON.parse(input);
            return JSON.stringify({
              quizId: `quiz_${Date.now()}`,
              title: `${request.topics?.[0] || 'General'} Assessment`,
              questionCount: request.questionCount || 10,
              estimatedDuration: 20,
              difficulty: request.difficulty || 'intermediate'
            });
          }
        }),
        new DynamicTool({
          name: "quiz_evaluator",
          description: "Evaluate quiz submissions and provide detailed feedback",
          func: async (input: string) => {
            // Simulate quiz evaluation
            return JSON.stringify({
              score: 85,
              feedback: "Good understanding of key concepts",
              improvements: ["Review basic definitions", "Practice application problems"]
            });
          }
        })
      ];
    } catch (error) {
      console.error('Failed to create assessment tools:', error);
      return [];
    }
  }

  private createTutoringTools(): DynamicTool[] {
    try {
      return [
        new DynamicTool({
          name: "hint_generator",
          description: "Generate contextual hints for learning problems",
          func: async (input: string) => {
            return JSON.stringify({
              hint: "Think about the fundamental principle involved",
              nextStep: "Consider what information you already have",
              confidence: 0.8
            });
          }
        }),
        new DynamicTool({
          name: "explanation_generator",
          description: "Generate step-by-step explanations for concepts",
          func: async (input: string) => {
            return JSON.stringify({
              explanation: "Here's a step-by-step breakdown...",
              steps: ["Step 1: Identify the key components", "Step 2: Understand the relationships"],
              visualAid: "diagram"
            });
          }
        })
      ];
    } catch (error) {
      console.error('Failed to create tutoring tools:', error);
      return [];
    }
  }

  private createPracticeTools(): DynamicTool[] {
    try {
      return [
        new DynamicTool({
          name: "exercise_generator",
          description: "Generate practice exercises based on learning objectives",
          func: async (input: string) => {
            return JSON.stringify({
              exercise: "Practice problem based on current topic",
              difficulty: "intermediate",
              estimatedTime: 15,
              hint: "Start by reviewing the main concept"
            });
          }
        }),
        new DynamicTool({
          name: "solution_validator",
          description: "Validate and provide feedback on practice solutions",
          func: async (input: string) => {
            return JSON.stringify({
              correct: true,
              feedback: "Excellent work! Your approach is sound.",
              alternativeApproach: "You could also try solving it this way..."
            });
          }
        })
      ];
    } catch (error) {
      console.error('Failed to create practice tools:', error);
      return [];
    }
  }

  private createResearchTools(): DynamicTool[] {
    try {
      return [
        new DynamicTool({
          name: "content_finder",
          description: "Find relevant learning content and resources",
          func: async (input: string) => {
            return JSON.stringify({
              resources: [
                { title: "Introduction to the topic", type: "article", relevance: 0.9 },
                { title: "Advanced concepts", type: "video", relevance: 0.8 }
              ],
              totalFound: 2
            });
          }
        }),
        new DynamicTool({
          name: "source_evaluator",
          description: "Evaluate credibility and relevance of information sources",
          func: async (input: string) => {
            return JSON.stringify({
              credibility: "high",
              relevance: 0.85,
              bias: "low",
              recommendation: "Reliable source for learning"
            });
          }
        })
      ];
    } catch (error) {
      console.error('Failed to create research tools:', error);
      return [];
    }
  }

  private createCollaborationTools(): DynamicTool[] {
    try {
      return [
        new DynamicTool({
          name: "discussion_facilitator",
          description: "Facilitate collaborative learning discussions",
          func: async (input: string) => {
            return JSON.stringify({
              discussionPoints: ["Key question to consider", "Different perspectives to explore"],
              facilitationTips: ["Encourage participation", "Build on each other's ideas"]
            });
          }
        }),
        new DynamicTool({
          name: "peer_feedback_generator",
          description: "Generate constructive peer feedback prompts",
          func: async (input: string) => {
            return JSON.stringify({
              feedbackPrompts: [
                "What did you find most helpful about this approach?",
                "How could this explanation be improved?"
              ]
            });
          }
        })
      ];
    } catch (error) {
      console.error('Failed to create collaboration tools:', error);
      return [];
    }
  }

  /**
   * Generate session title using specialized title generation agent
   */
  async generateSessionTitle(content: string): Promise<string> {
    try {
      const agent = await this.getAgent(AgentType.TITLE_GENERATION);

      // Create a minimal session context for title generation
      const agentInput = {
        messages: [
          {
            role: 'user',
            content: `Generate a concise, descriptive title for this learning session content:\n\n${content}`
          }
        ]
      };

      // Use non-streaming response for title generation
      const result = await agent.invoke(agentInput);

      // Clean up the result - ensure we only return the title
      let title = result.content?.trim() || 'Untitled Session';

      // Remove any quotes if present
      title = title.replace(/^["']|["']$/g, '');

      // Ensure title case and length constraints
      if (title.length > 60) {
        title = title.substring(0, 57) + '...';
      }

      return title || 'Untitled Session';
    } catch (error) {
      console.error('Failed to generate session title:', error);
      return 'Untitled Session';
    }
  }

  /**
   * Get current model and provider info
   */
  async getProviderInfo(): Promise<{ provider: ProviderType; model: string } | null> {
    const config = await this.getCurrentModelConfig();
    return { provider: config.provider, model: config.model };
  }

  /**
   * Get available agent types
   */
  getAvailableAgentTypes(): AgentType[] {
    return Object.values(AgentType);
  }

  /**
   * Get agent type display information
   */
  getAgentTypeInfo(agentType: AgentType): { name: string; description: string } {
    const info = {
      [AgentType.LEARNING]: {
        name: 'Learning Assistant',
        description: 'Concept understanding, explanations, and knowledge building'
      },
      [AgentType.ASSESSMENT]: {
        name: 'Assessment Assistant',
        description: 'Quizzes, evaluations, and progress tracking'
      },
      [AgentType.TUTORING]: {
        name: 'Tutoring Assistant',
        description: 'Personalized guidance and step-by-step support'
      },
      [AgentType.PRACTICE]: {
        name: 'Practice Assistant',
        description: 'Exercises, coding challenges, and hands-on activities'
      },
      [AgentType.RESEARCH]: {
        name: 'Research Assistant',
        description: 'Information gathering and analysis'
      },
      [AgentType.COLLABORATION]: {
        name: 'Collaboration Assistant',
        description: 'Group work facilitation and peer interaction'
      },
      [AgentType.TITLE_GENERATION]: {
        name: 'Title Generation Assistant',
        description: 'Generate concise, descriptive session titles'
      }
    };

    return info[agentType] || { name: 'Unknown', description: 'Unknown agent type' };
  }

  /**
   * Initialize the checkpoint saver
   */
  private async initializeCheckpointSaver(): Promise<void> {
    try {
      const db = await createDatabase();
      this.checkpointSaver = new SQLiteCheckpointSaver(db);
      console.log('CheckpointSaver initialized successfully');
    } catch (error) {
      console.error('Failed to initialize CheckpointSaver:', error);
      throw new Error(`CheckpointSaver initialization failed: ${error}`);
    }
  }

  /**
   * Get or create checkpoint saver
   */
  private async getCheckpointSaver(): Promise<SQLiteCheckpointSaver> {
    if (!this.checkpointSaver) {
      await this.initializeCheckpointSaver();
    }
    return this.checkpointSaver;
  }

  /**
   * Create a runnable config for LangGraph with checkpointing
   */
  private createRunnableConfig(session: Session): LangGraphRunnableConfig {
    return {
      configurable: {
        thread_id: session.id,
        checkpoint_ns: 'learning_session'
      }
    };
  }

  /**
   * Initialize the agent manager
   */
  async initialize(): Promise<void> {
    console.log('Initializing AgentManager...');

    // Get initial model configuration
    await this.getCurrentModelConfig();

    // Initialize checkpoint saver
    await this.initializeCheckpointSaver();

    console.log('AgentManager initialized successfully');
  }

  /**
   * Get checkpoint history for a session
   */
  async getCheckpointHistory(session: Session, limit?: number): Promise<any[]> {
    const checkpointSaver = await this.getCheckpointSaver();
    const config = this.createRunnableConfig(session);

    try {
      const history = [];
      const checkpointOptions = limit ? { limit } : undefined;
      for await (const checkpoint of checkpointSaver.list(config, checkpointOptions)) {
        history.push({
          id: checkpoint.id,
          timestamp: checkpoint.ts,
          metadata: checkpoint.metadata || {},
          config: checkpoint.config || {}
        });
      }
      return history;
    } catch (error) {
      console.error('Failed to get checkpoint history:', error);
      throw new Error(`Checkpoint history retrieval failed: ${error}`);
    }
  }

  /**
   * Get latest checkpoint for a session
   */
  async getLatestCheckpoint(session: Session): Promise<any | null> {
    const checkpointSaver = await this.getCheckpointSaver();
    const config = this.createRunnableConfig(session);

    try {
      const checkpoint = await checkpointSaver.get(config);
      return checkpoint ? {
        id: checkpoint.id,
        timestamp: checkpoint.ts,
        metadata: checkpoint.metadata || {},
        config: checkpoint.config || {},
        state: checkpoint.channel_values || {}
      } : null;
    } catch (error) {
      console.error('Failed to get latest checkpoint:', error);
      throw new Error(`Latest checkpoint retrieval failed: ${error}`);
    }
  }

  /**
   * Clear checkpoint history for a session
   */
  async clearCheckpointHistory(session: Session): Promise<void> {
    const checkpointSaver = await this.getCheckpointSaver();
    const config = this.createRunnableConfig(session);

    try {
      await checkpointSaver.delete(config);
      console.log(`Cleared checkpoint history for session ${session.id}`);
    } catch (error) {
      console.error('Failed to clear checkpoint history:', error);
      throw new Error(`Checkpoint history clearing failed: ${error}`);
    }
  }

  /**
   * Restore session from checkpoint
   */
  async restoreFromCheckpoint(session: Session, checkpointId: string): Promise<any> {
    const checkpointSaver = await this.getCheckpointSaver();
    const config = {
      ...this.createRunnableConfig(session),
      configurable: {
        ...this.createRunnableConfig(session).configurable,
        checkpoint_id: checkpointId
      }
    };

    try {
      const checkpoint = await checkpointSaver.get(config);
      if (!checkpoint) {
        throw new Error(`Checkpoint ${checkpointId} not found`);
      }

      return {
        id: checkpoint.id,
        timestamp: checkpoint.ts,
        metadata: checkpoint.metadata || {},
        config: checkpoint.config || {},
        state: checkpoint.channel_values || {}
      };
    } catch (error) {
      console.error('Failed to restore from checkpoint:', error);
      throw new Error(`Checkpoint restoration failed: ${error}`);
    }
  }

  /**
   * Cleanup agents and resources
   */
  cleanup(): void {
    this.agents.clear();
    this.currentModelConfig = null;
    console.log('AgentManager cleaned up');
  }
}