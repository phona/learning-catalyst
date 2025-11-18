import { tool } from "langchain";
import { z } from "zod";
import { ConceptProcessingPipeline } from "../concept-parsing";
import { ConfigService } from "../configService";
import { SessionService, type SessionSearchQuery } from "../session/session-service";

/**
 * Learning-specific tools for the agentic AgentManager
 * These tools enable the agent to perform learning-specific tasks
 */

export function createLearningTools(
  conceptParsingPipeline: ConceptProcessingPipeline,
  configService: ConfigService,
  sessionService: SessionService
) {
  // Tool for parsing and analyzing concepts from content
  const parseConcepts = tool(
    async ({ content, sessionId }: { content: string; sessionId?: string }) => {
      try {
        if (!sessionId) {
          return {
            success: false,
            error: "Session ID is required for concept parsing",
            concepts: [],
          };
        }

        const result = await conceptParsingPipeline.processContent({
          materialId: sessionId || `temp_${Date.now()}`,
          title: `Concept Analysis ${Date.now()}`,
          content,
          format: 'text'
        });

        return {
          success: true,
          concepts: result.concepts.map(concept => ({
            name: concept.name,
            definition: concept.description,
            category: concept.type,
            difficulty: concept.difficulty,
            relationships: [],
            examples: [],
          })),
          summary: result.material ? result.material.title : 'Concept analysis completed',
          keyTopics: result.concepts.map(c => c.name),
          relationships: result.relationships.map(rel => ({
            source: rel.sourceId,
            target: rel.targetId,
            type: rel.type,
            strength: rel.strength
          })),
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to parse concepts",
          concepts: [],
        };
      }
    },
    {
      name: "parseConcepts",
      description: "Parse and analyze educational concepts from text content. Extracts definitions, relationships, and key topics.",
      schema: z.object({
        content: z.string().describe("The text content to analyze for concepts"),
        sessionId: z.string().optional().describe("Optional session ID to associate the concepts with"),
      }),
    }
  );

  // Tool for searching learning sessions
  const searchSessions = tool(
    async ({ query, tags, limit }: { query?: string; tags?: string[]; limit?: number }) => {
      try {
        const searchQuery: SessionSearchQuery = {
          query,
          tags,
          limit: limit || 10,
        };

        const result = await sessionService.searchSessions(searchQuery);

        return {
          success: true,
          sessions: result.sessions.map(session => ({
            id: session.id,
            title: session.title,
            description: session.preview || session.title,
            tags: session.tags || [],
            category: session.agentType,
            difficulty: session.difficulty || 'medium',
            topicsCovered: session.tags || [],
            createdAt: session.lastActivity || 'recent',
            messageCount: session.messageCount || 0,
          })),
          total: result.total,
          hasMore: result.hasMore,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to search sessions",
          sessions: [],
        };
      }
    },
    {
      name: "searchSessions",
      description: "Search for learning sessions by query, tags, or other criteria. Useful for finding relevant past learning content.",
      schema: z.object({
        query: z.string().optional().describe("Search query to find relevant sessions"),
        tags: z.array(z.string()).optional().describe("Tags to filter sessions by"),
        limit: z.number().optional().describe("Maximum number of results to return (default: 10)"),
      }),
    }
  );

  // Tool for creating practice exercises
  const createExercise = tool(
    async ({
      sessionId,
      topic,
      difficulty,
      exerciseType,
      question
    }: {
      sessionId: string;
      topic: string;
      difficulty: 'easy' | 'medium' | 'hard';
      exerciseType: 'quiz' | 'coding' | 'discussion' | 'reflection';
      question: string;
    }) => {
      try {
        // Generate a unique ID for the exercise
        const exerciseId = `exercise_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const exercise = {
          id: exerciseId,
          type: exerciseType,
          question,
          difficulty,
          topic,
          createdAt: new Date(),
        };

        return {
          success: true,
          exercise,
          message: `Created ${difficulty} ${exerciseType} exercise for topic: ${topic}`,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to create exercise",
        };
      }
    },
    {
      name: "createExercise",
      description: "Create a practice exercise for learning reinforcement. Supports quiz, coding, discussion, and reflection types.",
      schema: z.object({
        sessionId: z.string().describe("The session ID to associate the exercise with"),
        topic: z.string().describe("The topic the exercise should cover"),
        difficulty: z.enum(['easy', 'medium', 'hard']).describe("Difficulty level of the exercise"),
        exerciseType: z.enum(['quiz', 'coding', 'discussion', 'reflection']).describe("Type of exercise to create"),
        question: z.string().describe("The exercise question or prompt"),
      }),
    }
  );

  // Tool for getting learning configuration
  const getLearningConfig = tool(
    async () => {
      try {
        const config = await configService.getConfig();

        return {
          success: true,
          config: {
            defaultProvider: config.ai.model_types.chat?.provider || 'openai',
            temperature: config.ai.model_types.chat?.temperature || 0.7,
            max_tokens: config.ai.model_types.chat?.max_tokens || 4096,
            thinking_enabled: config.ai.model_types.chat?.enable_thinking || false,
            auto_parsing: config.learning?.auto_save || false,
            workspace_path: config.learning?.auto_save ? './workspace' : undefined,
          },
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to get learning configuration",
        };
      }
    },
    {
      name: "getLearningConfig",
      description: "Get the current learning configuration and settings. Useful for understanding the current learning environment setup.",
      schema: z.object({}),
    }
  );

  // Tool for generating learning paths
  const generateLearningPath = tool(
    async ({
      topic,
      currentLevel,
      goals,
      sessionCount
    }: {
      topic: string;
      currentLevel: 'beginner' | 'intermediate' | 'advanced';
      goals: string[];
      sessionCount?: number;
    }) => {
      try {
        const sessions = sessionCount || 5;

        // Generate a structured learning path
        const learningPath = {
          topic,
          currentLevel,
          targetLevel: currentLevel === 'beginner' ? 'intermediate' :
            currentLevel === 'intermediate' ? 'advanced' : 'expert',
          goals,
          sessions: Array.from({ length: sessions }, (_, i) => ({
            sessionNumber: i + 1,
            title: `${topic} - Session ${i + 1}`,
            focusAreas: generateFocusAreas(topic, currentLevel, i + 1, sessions),
            difficulty: calculateSessionDifficulty(currentLevel, i + 1, sessions),
            estimatedDuration: Math.floor(Math.random() * 30) + 30, // 30-60 minutes
            prerequisites: i > 0 ? [`${topic} - Session ${i}`] : [],
          })),
          totalEstimatedDuration: sessions * 45, // Average 45 minutes per session
          completionCriteria: [
            `Complete all ${sessions} learning sessions`,
            `Score 80% or higher on practice exercises`,
            `Apply concepts in real-world scenarios`,
          ],
        };

        return {
          success: true,
          learningPath: learningPath,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to generate learning path",
        };
      }
    },
    {
      name: "generateLearningPath",
      description: "Generate a structured learning path for a given topic with progressive sessions and goals.",
      schema: z.object({
        topic: z.string().describe("The main topic to create a learning path for"),
        currentLevel: z.enum(['beginner', 'intermediate', 'advanced']).describe("User's current knowledge level"),
        goals: z.array(z.string()).describe("Learning goals the user wants to achieve"),
        sessionCount: z.number().optional().describe("Number of sessions to include in the learning path (default: 5)"),
      }),
    }
  );

  return {
    parseConcepts,
    searchSessions,
    createExercise,
    getLearningConfig,
    generateLearningPath,
  };
}

// Helper function to generate focus areas for learning path sessions
function generateFocusAreas(topic: string, level: string, sessionNum: number, totalSessions: number): string[] {
  const progress = sessionNum / totalSessions;

  if (level === 'beginner') {
    if (progress < 0.3) {
      return [`${topic} fundamentals`, `Basic terminology`, `Core concepts`];
    } else if (progress < 0.7) {
      return [`${topic} applications`, `Practical examples`, `Common patterns`];
    } else {
      return [`${topic} best practices`, `Advanced basics`, `Next steps`];
    }
  } else if (level === 'intermediate') {
    if (progress < 0.3) {
      return [`${topic} advanced concepts`, `Complex scenarios`];
    } else if (progress < 0.7) {
      return [`${topic} optimization`, `Performance tuning`];
    } else {
      return [`${topic} mastery`, `Expert techniques`];
    }
  } else {
    return [`${topic} expert topics`, `Cutting-edge developments`, `Industry applications`];
  }
}

// Helper function to calculate session difficulty progression
function calculateSessionDifficulty(currentLevel: string, sessionNum: number, totalSessions: number): string {
  const progress = sessionNum / totalSessions;

  if (currentLevel === 'beginner') {
    return progress < 0.6 ? 'beginner' : 'intermediate';
  } else if (currentLevel === 'intermediate') {
    return progress < 0.4 ? 'intermediate' : progress < 0.8 ? 'intermediate' : 'advanced';
  } else {
    return 'advanced';
  }
}