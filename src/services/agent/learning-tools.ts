import { tool } from "langchain";
import { z } from "zod";
import type { ConceptParsingService } from "@/services/ConceptParsingService";
import type { ConfigService } from "@/services/configService";
import type { SessionService } from "@/services/sessionService";

/**
 * Learning-specific tools for the agentic AgentManager
 * These tools enable the agent to perform learning-specific tasks
 */

export function createLearningTools(
  conceptParsingService: ConceptParsingService,
  configService: ConfigService,
  sessionService: SessionService
) {
  // Tool for parsing and analyzing concepts from content
  const parseConcepts = tool(
    async ({ content, session_id }: { content: string; session_id?: string }) => {
      try {
        if (!session_id) {
          return {
            success: false,
            error: "Session ID is required for concept parsing",
            concepts: [],
          };
        }

        const result = await conceptParsingService.parseConcepts(content, {
          sessionId: session_id,
          extractRelationships: true,
          identifyKeyTopics: true,
          generateSummary: true,
        });

        return {
          success: true,
          concepts: result.concepts.map(concept => ({
            name: concept.name,
            definition: concept.definition,
            category: concept.category,
            difficulty: concept.difficulty,
            relationships: concept.relationships || [],
            examples: concept.examples || [],
          })),
          summary: result.summary,
          keyTopics: result.keyTopics || [],
          relationships: result.relationships || [],
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
      name: "parse_concepts",
      description: "Parse and analyze educational concepts from text content. Extracts definitions, relationships, and key topics.",
      schema: z.object({
        content: z.string().describe("The text content to analyze for concepts"),
        session_id: z.string().optional().describe("Optional session ID to associate the concepts with"),
      }),
    }
  );

  // Tool for searching learning sessions
  const searchSessions = tool(
    async ({ query, tags, limit }: { query?: string; tags?: string[]; limit?: number }) => {
      try {
        const searchQuery = {
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
            description: session.metadata.description,
            tags: session.metadata.tags,
            category: session.metadata.category,
            difficulty: session.metadata.difficulty,
            topics_covered: session.metadata.topics_covered,
            created_at: session.created_at,
            message_count: session.statistics.total_messages,
          })),
          total: result.total,
          has_more: result.has_more,
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
      name: "search_sessions",
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
      session_id,
      topic,
      difficulty,
      exercise_type,
      question
    }: {
      session_id: string;
      topic: string;
      difficulty: 'easy' | 'medium' | 'hard';
      exercise_type: 'quiz' | 'coding' | 'discussion' | 'reflection';
      question: string;
    }) => {
      try {
        // Generate a unique ID for the exercise
        const exercise_id = `exercise_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const exercise = {
          id: exercise_id,
          type: exercise_type,
          question,
          difficulty,
          topic,
          created_at: new Date(),
        };

        return {
          success: true,
          exercise,
          message: `Created ${difficulty} ${exercise_type} exercise for topic: ${topic}`,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to create exercise",
        };
      }
    },
    {
      name: "create_exercise",
      description: "Create a practice exercise for learning reinforcement. Supports quiz, coding, discussion, and reflection types.",
      schema: z.object({
        session_id: z.string().describe("The session ID to associate the exercise with"),
        topic: z.string().describe("The topic the exercise should cover"),
        difficulty: z.enum(['easy', 'medium', 'hard']).describe("Difficulty level of the exercise"),
        exercise_type: z.enum(['quiz', 'coding', 'discussion', 'reflection']).describe("Type of exercise to create"),
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
            default_provider: config.ai.model_types.chat.default_provider,
            temperature: config.ai.model_types.chat.settings.temperature,
            max_tokens: config.ai.model_types.chat.settings.max_tokens,
            thinking_enabled: config.ai.model_types.chat.capabilities.thinking,
            auto_parsing: config.ai.content_discovery?.auto_parse_concepts || false,
            workspace_path: config.file_explorer?.default_workspace_path,
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
      name: "get_learning_config",
      description: "Get the current learning configuration and settings. Useful for understanding the current learning environment setup.",
      schema: z.object({}),
    }
  );

  // Tool for generating learning paths
  const generateLearningPath = tool(
    async ({
      topic,
      current_level,
      goals,
      session_count
    }: {
      topic: string;
      current_level: 'beginner' | 'intermediate' | 'advanced';
      goals: string[];
      session_count?: number;
    }) => {
      try {
        const sessions = session_count || 5;

        // Generate a structured learning path
        const learningPath = {
          topic,
          current_level,
          target_level: current_level === 'beginner' ? 'intermediate' :
                        current_level === 'intermediate' ? 'advanced' : 'expert',
          goals,
          sessions: Array.from({ length: sessions }, (_, i) => ({
            session_number: i + 1,
            title: `${topic} - Session ${i + 1}`,
            focus_areas: generateFocusAreas(topic, current_level, i + 1, sessions),
            difficulty: calculateSessionDifficulty(current_level, i + 1, sessions),
            estimated_duration: Math.floor(Math.random() * 30) + 30, // 30-60 minutes
            prerequisites: i > 0 ? [`${topic} - Session ${i}`] : [],
          })),
          total_estimated_duration: sessions * 45, // Average 45 minutes per session
          completion_criteria: [
            `Complete all ${sessions} learning sessions`,
            `Score 80% or higher on practice exercises`,
            `Apply concepts in real-world scenarios`,
          ],
        };

        return {
          success: true,
          learning_path: learningPath,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to generate learning path",
        };
      }
    },
    {
      name: "generate_learning_path",
      description: "Generate a structured learning path for a given topic with progressive sessions and goals.",
      schema: z.object({
        topic: z.string().describe("The main topic to create a learning path for"),
        current_level: z.enum(['beginner', 'intermediate', 'advanced']).describe("User's current knowledge level"),
        goals: z.array(z.string()).describe("Learning goals the user wants to achieve"),
        session_count: z.number().optional().describe("Number of sessions to include in the learning path (default: 5)"),
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