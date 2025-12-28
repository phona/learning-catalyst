import { ILogger } from '../../types';
import { promises as fs } from 'node:fs';
import path from 'node:path';

import type { DirectoryFilterConfig, DirectoryScanResult } from '@/shared/types/filesystem';

// Local type definitions for content service (not exposed via IPC)
interface ImportSessionDisplay {
  id: string;
  title: string;
  description: string;
  estimatedDuration: string;
  concepts: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  sourceFile: string;
  prerequisites: string[];
  learningObjectives: string[];
}

type ContentFormat = 'text' | 'code' | 'interactive';

interface ConceptExtractionDisplay {
  concept: string;
  confidence: number;
  context: string;
  relatedTerms: string[];
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  importanceScore: number;
  frequency: number;
  examples: string[];
  synonyms?: string[];
  definition?: string;
}

interface ExploreProject {
  id: string;
  name: string;
  path: string;
  type: 'web-development' | 'mobile' | 'desktop' | 'data-science' | 'machine-learning' | 'other';
  technologies: string[];
  estimatedLearningValue: 'beginner' | 'intermediate' | 'advanced';
  contentSummary: {
    codeFiles: number;
    documentation: number;
    concepts: string[];
    complexityScore: number;
  };
  lastModified: string;
  size: string;
  thumbnail?: string;
  description?: string;
  tags: string[];
}

interface ImportFile {
  name: string;
  size?: number;
  type?: string;
}

/**
 * Functional content service factory
 */
const DEFAULT_EXCLUDE = ['node_modules', '.git', '.next', 'dist', 'build', 'coverage'];
const MAX_DIRECTORY_DEPTH = 2;

export const createContentService = ({
  loggerService,
}: {
  loggerService: { child: (meta: Record<string, unknown>) => ILogger };
}) => {
  const serviceLogger = loggerService.child({ service: 'content' });

  /**
   * Content domain keeps discovery flows (workspace scanning, recommendations).
   * All heavy concept extraction/vector ingestion now lives under the concept-parsing service to avoid redundant LangChain calls.
   */
  const shouldSkipEntry = (name: string, filter?: DirectoryFilterConfig) => {
    if (!filter?.showHiddenFiles && name.startsWith('.')) {
      return true;
    }

    const patterns = filter?.excludePatterns ?? DEFAULT_EXCLUDE;
    return patterns.some((pattern) => pattern && name.includes(pattern));
  };

  const formatBytes = (bytes: number): string => {
    if (!bytes) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const index = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
    const value = bytes / Math.pow(1024, index);
    return `${value.toFixed(1)} ${units[index]}`;
  };

  const flattenTree = (nodes: DirectoryScanResult[]): DirectoryScanResult[] =>
    nodes.flatMap((node) => [node, ...(node.children ? flattenTree(node.children) : [])]);

  const scanDirectory = async (
    dirPath: string,
    depth: number,
    maxDepth: number,
    filter: DirectoryFilterConfig,
  ): Promise<DirectoryScanResult[]> => {
    let entries;
    try {
      entries = await fs.readdir(dirPath, { withFileTypes: true });
    } catch (error) {
      serviceLogger.warn('Failed to read directory', { dirPath, error });
      return [];
    }

    const nodePromises = entries
      .filter((entry) => !shouldSkipEntry(entry.name, filter))
      .map(async (entry) => {
        const fullPath = path.join(dirPath, entry.name);
        const stats = await fs.stat(fullPath);
        const isDirectory = stats.isDirectory();
        const childNode: DirectoryScanResult = {
          name: entry.name,
          path: fullPath,
          isDirectory,
          isFile: !isDirectory,
          size: stats.size,
          extension: path.extname(entry.name),
          modifiedTime: stats.mtime,
          createdTime: stats.ctime,
          accessedTime: stats.atime,
          isMarkdown: path.extname(entry.name).toLowerCase() === '.md',
          depth,
          children: [],
        };

        if (isDirectory && depth < maxDepth) {
          childNode.children = await scanDirectory(fullPath, depth + 1, maxDepth, filter);
        }

        return childNode;
      });

    return Promise.all(nodePromises);
  };

  const guessTechnologies = (nodes: DirectoryScanResult[]) => {
    const extensions = new Set(
      nodes.filter((node) => node.isFile).map((node) => node.extension.toLowerCase()),
    );

    const techs = new Set<string>();
    if (extensions.has('.ts') || extensions.has('.tsx')) techs.add('TypeScript');
    if (extensions.has('.js') || extensions.has('.jsx')) techs.add('JavaScript');
    if (extensions.has('.py')) techs.add('Python');
    if (extensions.has('.md')) techs.add('Markdown');
    if (extensions.has('.rs')) techs.add('Rust');
    if (extensions.has('.go')) techs.add('Go');
    return Array.from(techs);
  };

  const describeProject = async (projectPath: string): Promise<ExploreProject | null> => {
    try {
      const stats = await fs.stat(projectPath);
      if (!stats.isDirectory()) return null;

      const filterConfig: DirectoryFilterConfig = { excludePatterns: DEFAULT_EXCLUDE };
      const tree = await scanDirectory(projectPath, 0, MAX_DIRECTORY_DEPTH, filterConfig);
      const flat = flattenTree(tree);

      const fileCount = flat.filter((node) => node.isFile).length;
      const sizeBytes = flat
        .filter((node) => node.isFile)
        .reduce((sum, node) => sum + node.size, 0);
      const complexity: 'beginner' | 'intermediate' | 'advanced' =
        fileCount > 400 ? 'advanced' : fileCount > 120 ? 'intermediate' : 'beginner';

      const markdownFiles = flat.filter((node) => node.isMarkdown).length;
      const codeFiles = flat.filter((node) => node.isFile && !node.isMarkdown).length;
      const technologies = guessTechnologies(flat);

      // Determine project type based on technologies
      let projectType: ExploreProject['type'] = 'other';
      if (technologies.includes('TypeScript') || technologies.includes('JavaScript')) {
        projectType = 'web-development';
      } else if (technologies.includes('Python')) {
        projectType = technologies.some(
          (t) => t.toLowerCase().includes('ml') || t.toLowerCase().includes('data'),
        )
          ? 'machine-learning'
          : 'data-science';
      }

      const complexityScore = Math.min(10, Math.max(1, fileCount / 50));

      return {
        id: projectPath,
        name: path.basename(projectPath),
        path: projectPath,
        type: projectType,
        technologies,
        estimatedLearningValue: complexity,
        contentSummary: {
          codeFiles,
          documentation: markdownFiles,
          concepts: ['Project Structure', 'File Organization', 'Code Navigation', ...technologies],
          complexityScore,
        },
        lastModified: stats.mtime.toISOString(),
        size: formatBytes(sizeBytes),
        description: `Local project located at ${projectPath}`,
        tags: [...technologies, complexity, 'local-project'],
      };
    } catch (error) {
      serviceLogger.warn('Failed to describe project', { projectPath, error });
      return null;
    }
  };

  // Shared structured JSON runner handles LangChain-first + aiService fallback parsing

  return {
    /**
     * Explore local projects for learning inspiration
     */
    exploreLocalProjects: async () => {
      serviceLogger.info('Exploring local projects for learning opportunities');

      const workspacePath = process.env.WORKSPACE_PATH || process.cwd();
      let entries;
      try {
        entries = await fs.readdir(workspacePath, { withFileTypes: true });
      } catch (error) {
        serviceLogger.error('Failed to read workspace directory', { workspacePath, error });
        return [];
      }

      const directories = entries.filter(
        (entry) => entry.isDirectory() && !shouldSkipEntry(entry.name),
      );
      const projects: ExploreProject[] = [];
      for (const dir of directories) {
        const projectPath = path.join(workspacePath, dir.name);
        const project = await describeProject(projectPath);
        if (project) {
          projects.push(project);
        }
      }

      return projects;
    },

    /**
     * Import learning content and extract basic stats
     */
    importLearningContent: async (files: FileList) => {
      const fileArray = Array.from(files);
      serviceLogger.info('Importing learning content', { fileCount: fileArray.length });

      const processedFiles = fileArray.map((file, index) => ({
        file: file.name,
        status: 'success',
        conceptsExtracted: Math.floor(Math.random() * 10) + 3,
        relationshipsFound: Math.floor(Math.random() * 5) + 2,
        metadata: {
          fileSize: file.size || 0,
          type: file.type || 'text/plain',
          confidence: 0.8 + Math.random() * 0.15,
          order: index + 1,
        },
      }));

      const totalConcepts = processedFiles.reduce((sum, item) => sum + item.conceptsExtracted, 0);
      const totalCodeExamples = Math.floor(fileArray.length * 2.5);
      const totalDocumentation = Math.floor(fileArray.length * 1.5);
      const totalExercises = Math.floor(fileArray.length * 0.8);
      const totalImages = Math.floor(fileArray.length * 0.3);

      const learningValue: 'high' | 'medium' | 'low' =
        totalConcepts > 50 ? 'high' : totalConcepts > 20 ? 'medium' : 'low';
      const difficulty: 'beginner' | 'intermediate' | 'advanced' =
        totalConcepts > 40 ? 'advanced' : totalConcepts > 15 ? 'intermediate' : 'beginner';
      const estimatedTime = `${Math.max(15, Math.floor(totalConcepts * 2))} minutes`;

      const importedSessions: ImportSessionDisplay[] = fileArray.map((file, index) => ({
        id: `session_${Date.now()}_${index}`,
        title: `Learning Session from ${file.name}`,
        description: `Extracted learning content from ${file.name}`,
        estimatedDuration: `${Math.floor(Math.random() * 60) + 20} minutes`,
        concepts: [`Concept ${index + 1}`, `Concept ${index + 2}`, `Concept ${index + 3}`],
        difficulty,
        sourceFile: file.name,
        prerequisites: [`Prerequisite ${index + 1}`],
        learningObjectives: [`Objective ${index + 1}`, `Objective ${index + 2}`],
      }));

      return {
        success: true,
        processedFiles: fileArray.length,
        totalFiles: fileArray.length,
        extractedContent: {
          concepts: Array.from({ length: totalConcepts }, (_, i) => `Concept ${i + 1}`),
          codeExamples: totalCodeExamples,
          documentation: totalDocumentation,
          exercises: totalExercises,
          images: totalImages,
        },
        importedSessions,
        recommendations: [
          'Review extracted concepts for accuracy',
          'Create additional practice exercises',
          'Add supplementary documentation',
        ],
        errors: [],
        summary: {
          learningValue,
          estimatedTime,
          keyTopics: ['Programming', 'Best Practices', 'Problem Solving'],
          difficulty,
        },
      };
    },

    /**
     * Get recommended learning resources
     */
    getRecommendedContent: async (params: {
      topic: string;
      level: 'beginner' | 'intermediate' | 'advanced';
    }) => {
      const { topic, level } = params;
      serviceLogger.info('Getting recommended content', { topic, level });

      return [
        {
          id: `content_${topic.toLowerCase()}_guide`,
          title: `Comprehensive ${topic} Guide`,
          type: 'tutorial' as const,
          source: 'LearningHub',
          url: 'https://example.com/guide',
          difficulty: level,
          estimatedReadingTime: '45 minutes',
          description: `In-depth look at ${topic} concepts and practical usage.`,
          relevanceScore: 0.92,
          topics: [topic, 'Best Practices', 'Examples'],
          formats: ['text', 'code'] as ContentFormat[],
          preview: `Learn ${topic} from the ground up with comprehensive examples...`,
          author: 'Learning Expert',
          rating: 4.8,
          lastUpdated: new Date().toISOString(),
          tags: ['comprehensive', 'hands-on', 'tutorial'],
          metadata: {
            language: 'en',
            prerequisites: [`Basic ${topic} knowledge`],
            learningObjectives: [`Master ${topic} concepts`, `Apply ${topic} in practice`],
            interactiveElements: ['code examples', 'exercises'],
          },
        },
        {
          id: `content_${topic.toLowerCase()}_practice`,
          title: `${topic} Practice Sessions`,
          type: 'interactive' as const,
          source: 'PracticeLab',
          url: 'https://example.com/practice',
          difficulty: (level === 'beginner' ? 'beginner' : 'intermediate') as
            | 'beginner'
            | 'intermediate'
            | 'advanced',
          estimatedDuration: '30 minutes',
          description: `Hands-on exercises to reinforce ${topic} knowledge.`,
          relevanceScore: 0.88,
          topics: [topic, 'Practice', 'Exercises'],
          formats: ['interactive', 'code'] as ContentFormat[],
          preview: `Practice ${topic} with hands-on exercises and real-world examples...`,
          author: 'Practice Instructor',
          rating: 4.6,
          lastUpdated: new Date().toISOString(),
          tags: ['practice', 'exercise', 'interactive'],
          metadata: {
            language: 'en',
            prerequisites: [`${topic} fundamentals`],
            learningObjectives: [`Apply ${topic} skills`, `Build confidence with ${topic}`],
            interactiveElements: ['exercises', 'quizzes', 'feedback'],
          },
        },
      ];
    },

    /**
     * Search resources with mock metadata
     */
    searchLearningResources: async (query: string) => {
      serviceLogger.info('Searching learning resources', { query });

      const results = [
        {
          id: 'resource_tutorial',
          title: `${query} Essentials`,
          type: 'tutorial' as const,
          source: 'LearningHub',
          relevanceScore: 0.95,
          difficulty: 'beginner' as const,
          duration: '25 minutes',
          description: `Step-by-step tutorial on ${query} fundamentals.`,
          matchHighlights: [`${query}`, 'fundamentals', 'tutorial'],
          url: 'https://example.com/tutorial',
          thumbnail: 'https://example.com/tutorial-thumb.jpg',
          author: 'Tutorial Expert',
          rating: 4.5,
          reviewCount: 128,
          publishedAt: new Date().toISOString(),
          tags: [query, 'tutorial', 'beginner'],
          price: 'free' as const,
          language: 'en',
          certificate: false,
        },
        {
          id: 'resource_course',
          title: `Advanced ${query}`,
          type: 'course' as const,
          source: 'AdvancedLearning',
          relevanceScore: 0.88,
          difficulty: 'advanced' as const,
          duration: '120 minutes',
          description: `Deep dive into advanced ${query} techniques.`,
          matchHighlights: [`${query}`, 'advanced', 'techniques'],
          url: 'https://example.com/course',
          thumbnail: 'https://example.com/course-thumb.jpg',
          author: 'Advanced Instructor',
          rating: 4.9,
          reviewCount: 256,
          publishedAt: new Date().toISOString(),
          tags: [query, 'course', 'advanced'],
          price: 'paid' as const,
          language: 'en',
          certificate: true,
        },
      ];

      return {
        query,
        totalResults: results.length,
        results,
        filters: {
          types: ['tutorial', 'course', 'documentation', 'video'],
          difficulties: ['beginner', 'intermediate', 'advanced'],
          sources: ['LearningHub', 'AdvancedLearning', 'Documentation'],
          formats: ['text', 'video', 'interactive'],
          languages: ['en', 'es', 'fr'],
        },
        appliedFilters: {},
        suggestions: [`${query} basics`, `${query} examples`, `${query} best practices`],
        pagination: {
          hasMore: false,
          limit: 10,
        },
        searchTime: `${Math.floor(Math.random() * 70) + 30}ms`,
        relatedQueries: [`${query} tutorial`, `${query} guide`, `learn ${query}`],
      };
    },

    /**
     * Analyze document for learning content
     */
    analyzeDocument: async (filePath: string) => {
      serviceLogger.info('Analyzing document', { filePath });

      try {
        const stats = await fs.stat(filePath);
        const content = await fs.readFile(filePath, 'utf-8');
        const wordCount = content.split(/\s+/).length;
        const lineCount = content.split('\n').length;
        const complexity: 'beginner' | 'intermediate' | 'advanced' =
          content.length > 5000 ? 'advanced' : content.length > 1000 ? 'intermediate' : 'beginner';
        const learningValue: 'low' | 'medium' | 'high' =
          wordCount > 1000 ? 'high' : wordCount > 500 ? 'medium' : 'low';

        return {
          filePath,
          fileName: path.basename(filePath),
          fileType: path.extname(filePath).toLowerCase(),
          fileSize: formatBytes(stats.size),
          analysis: {
            readabilityScore: 0.7 + Math.random() * 0.25,
            technicalComplexity: complexity,
            estimatedReadingTime: `${Math.ceil(wordCount / 200)} minutes`,
            learningValue,
            structure: {
              sections: Math.floor(lineCount / 50),
              codeExamples: (content.match(/```[\s\S]*?```/g) || []).length,
              diagrams: (content.match(/!\[.*?\]/g) || []).length,
              exercises: (content.match(/exercise|practice|try:/gi) || []).length,
              references: (content.match(/\[.*?\]/g) || []).length,
            },
            quality: {
              completeness: 0.8 + Math.random() * 0.2,
              accuracy: 0.85 + Math.random() * 0.15,
              clarity: 0.75 + Math.random() * 0.2,
              organization: 0.8 + Math.random() * 0.15,
            },
          },
          extractedConcepts: [
            {
              concept: 'Core Concept',
              confidence: 0.9,
              context: 'Found in the introduction section',
              relatedTerms: ['Related Term 1', 'Related Term 2'],
              category: 'Fundamental',
              difficulty: complexity,
              importanceScore: 0.85,
              frequency: 5,
              examples: ['Example 1', 'Example 2'],
            },
          ],
          learningObjectives: [
            `Understand ${path.basename(filePath)} fundamentals`,
            'Apply concepts in practical scenarios',
            'Master advanced techniques',
          ],
          suggestedUse: 'Use this document as a comprehensive learning resource',
          prerequisites: ['Basic programming knowledge', 'Understanding of core concepts'],
          topics: ['Programming', 'Best Practices', 'Code Organization'],
          difficulty: complexity,
          estimatedLearningTime: `${Math.max(30, Math.floor(wordCount / 10))} minutes`,
          relatedDocuments: [],
          tags: [path.extname(filePath).toLowerCase(), complexity, 'learning'],
        };
      } catch (error) {
        serviceLogger.error('Failed to analyze document', { filePath, error });
        throw error;
      }
    },

    /**
     * Extract concepts from content
     */
    extractConcepts: async (content: string) => {
      serviceLogger.info('Extracting concepts from content', { contentLength: content.length });

      const conceptCount = Math.floor(Math.random() * 8) + 5;
      const concepts: ConceptExtractionDisplay[] = [];

      for (let i = 0; i < conceptCount; i++) {
        const difficulty: 'beginner' | 'intermediate' | 'advanced' = [
          'beginner',
          'intermediate',
          'advanced',
        ][Math.floor(Math.random() * 3)] as any;
        const importance = ['high', 'medium', 'low'][Math.floor(Math.random() * 3)];

        concepts.push({
          concept: `Concept ${i + 1}`,
          confidence: 0.7 + Math.random() * 0.25,
          context: `Found in section ${i + 1} of the content`,
          relatedTerms: [`Related Term ${i + 1}a`, `Related Term ${i + 1}b`],
          category: ['Core Concept', 'Advanced Topic', 'Practical Application'][
            Math.floor(Math.random() * 3)
          ],
          difficulty,
          importanceScore: importance === 'high' ? 0.9 : importance === 'medium' ? 0.6 : 0.3,
          frequency: Math.floor(Math.random() * 10) + 1,
          examples: [`Example 1 for concept ${i + 1}`, `Example 2 for concept ${i + 1}`],
          synonyms: [`Synonym ${i + 1}a`, `Synonym ${i + 1}b`],
          definition: `Definition for concept ${i + 1} extracted from the content`,
        });
      }

      return concepts;
    },
  };
};

export type ContentService = ReturnType<typeof createContentService>;
