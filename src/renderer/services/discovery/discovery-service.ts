import type { ElectronAPI } from '@/shared/types/electron-api';
import type { LearningPath } from '@/shared/types/concept-parsing';
import type {
  ConceptParsingResult,
  KnowledgeSearchResultDisplay,
} from '@/shared/types/electron-api/knowledge-api';

/**
 * Functional implementation of discovery service using the unified electronAPI client
 */
export const createDiscoveryService = (apiClient: ElectronAPI) => {
  return {
    async parseConcepts(content: string, sessionId?: string): Promise<ConceptParsingResult> {
      const response = await apiClient.knowledge.parseConcepts({
        content,
        options: {
          confidenceThreshold: 0.6,
          maxConceptsPerFile: 50,
        },
      });

      if (!response.success || !response.data) {
        throw new Error('Failed to parse concepts');
      }

      return response.data;
    },

    async generateLearningPath(concepts: string[], sessionId?: string): Promise<LearningPath> {
      if (!sessionId) {
        throw new Error('Session ID is required for generating learning path');
      }

      // Use the learning API to get the learning path
      const learningPathResp = await apiClient.learning.getLearningPath(sessionId);
      if (!learningPathResp.success || !learningPathResp.data) {
        throw new Error(
          learningPathResp.error?.message ||
            `No learning path found for session ${sessionId}. Please start a learning session first.`,
        );
      }
      const learningPathResponse = learningPathResp.data;

      if (!learningPathResponse.path || learningPathResponse.path.length === 0) {
        throw new Error(
          `No learning path found for session ${sessionId}. Please start a learning session first.`,
        );
      }

      // Convert LearningPathDisplay to LearningPath format
      return {
        id: learningPathResponse.sessionId,
        title: `Learning Path for ${concepts.join(', ')}`,
        description: `Generated learning path covering: ${concepts.join(', ')}`,
        estimatedDuration: learningPathResponse.path.reduce((total, item) => {
          return total + (parseInt(item.duration?.replace('min', '') || '30') || 30);
        }, 0),
        difficulty:
          learningPathResponse.path[0]?.difficulty === 'easy'
            ? 1
            : learningPathResponse.path[0]?.difficulty === 'medium'
              ? 2
              : 3,
        modules: learningPathResponse.path.map((item, index) => ({
          id: item.id.toString(),
          title: item.title,
          description: item.description || `Learn about ${item.title}`,
          type: 'concept' as const,
          concepts: [item.title],
          order: index,
          isOptional: false,
          estimatedTime: parseInt(item.duration?.replace('min', '') || '30'),
          difficulty: item.difficulty === 'easy' ? 1 : item.difficulty === 'medium' ? 2 : 3,
          resources: [],
          assessments: [],
          completionCriteria: {
            type: 'assessment' as const,
            threshold: 80,
            assessments: [],
            required: true,
          },
        })),
        prerequisites: [],
        targetMastery: learningPathResponse.progress?.percentage / 100 || 0.8,
        adaptations: [],
        progress: {
          userId: 'current-user',
          currentModule:
            learningPathResponse.path[learningPathResponse.currentPosition]?.id.toString() || '',
          completedModules: learningPathResponse.path
            .slice(0, learningPathResponse.currentPosition)
            .map((item) => item.id.toString()),
          currentConcept:
            learningPathResponse.path[learningPathResponse.currentPosition]?.title || '',
          masteredConcepts: [],
          timeSpent: 0,
          assessmentScores: [],
          lastAccess: new Date(),
          completionRate: learningPathResponse.progress?.percentage || 0,
          masteryLevel: (learningPathResponse.progress?.percentage || 0) / 100,
        },
      };
    },

    async createPracticeExercises(
      topic: string,
      difficulty: 'easy' | 'medium' | 'hard',
      sessionId?: string,
    ): Promise<any[]> {
      const searchResp = await apiClient.knowledge.searchKnowledge(topic);
      if (!searchResp.success || !searchResp.data) {
        throw new Error(searchResp.error?.message ?? 'Search failed');
      }
      const searchResults = (searchResp.data as KnowledgeSearchResultDisplay).results ?? [];

      const exercises = searchResults
        .filter((result) => result.type === 'exercise')
        .filter((result) => {
          // Map difficulty levels
          const resultDifficulty = result.difficulty || 'basic';
          const requestedLevel =
            difficulty === 'easy' ? 'basic' : difficulty === 'medium' ? 'intermediate' : 'advanced';
          return resultDifficulty === requestedLevel;
        })
        .slice(0, 5); // Limit to 5 exercises

      return exercises.map((exercise) => ({
        id: exercise.id,
        title: exercise.title,
        type: 'practice',
        description: exercise.preview,
        difficulty: difficulty,
        concepts: [topic],
        estimatedTime: exercise.estimatedTime || '15min',
        instructions: `Complete this exercise about ${topic}`,
        hints: [],
        solution: null,
        feedback: `This exercise tests your understanding of ${topic}`,
      }));
    },

    async assessKnowledge(
      topic: string,
      currentUnderstanding: string,
      sessionId?: string,
    ): Promise<any> {
      // First, explore the concept to get detailed information
      const conceptResp = await apiClient.knowledge.exploreConcept({
        conceptName: topic,
        depth: 'intermediate',
      });
      if (!conceptResp.success || !conceptResp.data) {
        throw new Error(conceptResp.error?.message ?? 'Explore concept failed');
      }
      const conceptResponse = conceptResp.data;

      // Search for related content to assess understanding
      const searchResp = await apiClient.knowledge.searchKnowledge(currentUnderstanding);
      if (!searchResp.success || !searchResp.data) {
        throw new Error(searchResp.error?.message ?? 'Search failed');
      }
      const searchResponse = searchResp.data;

      // Calculate understanding level based on search relevance
      const relevantResults =
        searchResponse.results?.filter(
          (result) => result.type === 'concept' && result.relevanceScore > 0.5,
        ) ?? [];

      const understandingLevel = Math.min(relevantResults.length / 5, 1); // Normalize to 0-1

      // Identify strengths and gaps
      const strengths = (conceptResponse.keyPoints ?? []).filter((point) =>
        currentUnderstanding.toLowerCase().includes(point.toLowerCase()),
      );

      const gaps = (conceptResponse.keyPoints ?? []).filter(
        (point) => !currentUnderstanding.toLowerCase().includes(point.toLowerCase()),
      );

      // Generate recommendations based on gaps
      const recommendations = gaps.map((gap) => `Focus on understanding: ${gap}`);

      // Suggest next steps
      const nextSteps = (conceptResponse.relatedConcepts ?? [])
        .filter((related) => related.strength > 0.7)
        .slice(0, 3)
        .map((related) => `Learn about ${related.name}`);

      return {
        topic,
        understandingLevel,
        strengths,
        gaps,
        recommendations,
        nextSteps,
        estimatedTimeToMastery: conceptResponse.estimatedLearningTime
          ? parseInt(conceptResponse.estimatedLearningTime.replace('min', '') || '60')
          : 60,
      };
    },
  };
};

export type DiscoveryService = ReturnType<typeof createDiscoveryService>;
