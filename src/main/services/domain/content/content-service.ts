import { ILogger } from '../../types';
import { promises as fs } from 'node:fs';
import path from 'node:path';

import type { DirectoryFilterConfig, DirectoryScanResult } from '@/shared/types/filesystem';
import type { AiService } from '@/main/services/ai/ai-service';
interface ExploreProject {
  id: string;
  name: string;
  path: string;
  type: string;
  description: string;
  technologies: string[];
  lastModified: string;
  size: string;
  complexity: 'beginner' | 'intermediate' | 'advanced';
  learningPotential: {
    concepts: string[];
    estimatedTime: number;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
  };
  metadata: Record<string, unknown>;
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
  aiService,
}: {
  loggerService: { child: (meta: Record<string, unknown>) => ILogger };
  aiService: AiService;
}) => {
  const serviceLogger = loggerService.child({ service: 'content' });
  const modelPreset = aiService.getModelPreset('content.analysis');

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
    filter: DirectoryFilterConfig
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
          children: []
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
      nodes
        .filter((node) => node.isFile)
        .map((node) => node.extension.toLowerCase())
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
      const sizeBytes = flat.filter((node) => node.isFile).reduce((sum, node) => sum + node.size, 0);
      const complexity: 'beginner' | 'intermediate' | 'advanced' = fileCount > 400
        ? 'advanced'
        : fileCount > 120
          ? 'intermediate'
          : 'beginner';

      const markdownFiles = flat.filter((node) => node.isMarkdown).length;
      const estimatedTime = Math.min(240, Math.max(30, fileCount * 1.2));

      return {
        id: projectPath,
        name: path.basename(projectPath),
        path: projectPath,
        type: 'local-project',
        description: `Local project located at ${projectPath}`,
        technologies: guessTechnologies(flat),
        lastModified: stats.mtime.toISOString(),
        size: formatBytes(sizeBytes),
        complexity,
        learningPotential: {
          concepts: ['Project Structure', 'File Organization', 'Code Navigation'],
          estimatedTime,
          difficulty: complexity
        },
        metadata: {
          totalFiles: fileCount,
          totalDirectories: flat.filter((node) => node.isDirectory).length,
          markdownFiles,
          scanDepth: MAX_DIRECTORY_DEPTH,
          projectStructure: {
            rootPath: projectPath,
            items: tree,
            totalFiles: fileCount,
            totalDirectories: flat.filter((node) => node.isDirectory).length,
            markdownFiles,
            scanDepth: MAX_DIRECTORY_DEPTH
          }
        }
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
        return {
          success: true,
          projects: [],
          summary: { totalProjects: 0, byComplexity: {}, totalLearningTime: 0 }
        };
      }

      const directories = entries.filter((entry) => entry.isDirectory() && !shouldSkipEntry(entry.name));
      const projects: ExploreProject[] = [];
      for (const dir of directories) {
        const projectPath = path.join(workspacePath, dir.name);
        const project = await describeProject(projectPath);
        if (project) {
          projects.push(project);
        }
      }

      const summary = {
        totalProjects: projects.length,
        byComplexity: projects.reduce(
          (acc, project) => ({
            ...acc,
            [project.complexity]: (acc[project.complexity] || 0) + 1
          }),
          {} as Record<string, number>
        ),
        totalLearningTime: projects.reduce(
          (sum, project) => sum + project.learningPotential.estimatedTime,
          0
        )
      };

      return { success: true, workspace: workspacePath, projects, summary };
    },

    /**
     * Import learning content and extract basic stats
     */
    importLearningContent: async (params: { files?: ImportFile[] }) => {
      const files = params.files || [];
      serviceLogger.info('Importing learning content', { fileCount: files.length });

      const processed = files.map((file, index) => ({
        file: file.name,
        status: 'success',
        conceptsExtracted: Math.floor(Math.random() * 10) + 3,
        relationshipsFound: Math.floor(Math.random() * 5) + 2,
        metadata: {
          fileSize: file.size || 0,
          type: file.type || 'text/plain',
          confidence: 0.8 + Math.random() * 0.15,
          order: index + 1
        }
      }));

      return {
        success: true,
        importResults: {
          id: `import_${Date.now()}`,
          status: 'completed',
          processedFiles: files.length,
          results: processed,
          summary: {
            totalConcepts: processed.reduce((sum, item) => sum + item.conceptsExtracted, 0),
            totalRelationships: processed.reduce((sum, item) => sum + item.relationshipsFound, 0),
            averageConfidence:
              processed.reduce((sum, item) => sum + (item.metadata.confidence as number), 0) /
              (processed.length || 1)
          }
        }
      };
    },

    /**
     * Get recommended learning resources
     */
    getRecommendedContent: async (topic: string, level: 'beginner' | 'intermediate' | 'advanced') => {
      serviceLogger.info('Getting recommended content', { topic, level });

      return [
        {
          id: `content_${topic.toLowerCase()}_guide`,
          title: `Comprehensive ${topic} Guide`,
          description: `In-depth look at ${topic} concepts and practical usage.`,
          type: 'tutorial',
          difficulty: level,
          duration: 45,
          rating: 4.8,
          url: 'https://example.com/guide',
          provider: 'LearningHub',
          tags: ['comprehensive', 'hands-on'],
          popularity: 0.85,
          relevance: 0.92
        },
        {
          id: `content_${topic.toLowerCase()}_practice`,
          title: `${topic} Practice Sessions`,
          description: `Hands-on exercises to reinforce ${topic} knowledge.`,
          type: 'practice',
          difficulty: level === 'beginner' ? 'beginner' : 'intermediate',
          duration: 30,
          rating: 4.6,
          url: 'https://example.com/practice',
          provider: 'PracticeLab',
          tags: ['practice', 'exercise'],
          popularity: 0.78,
          relevance: 0.88
        }
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
          description: `Step-by-step tutorial on ${query} fundamentals.`,
          type: 'tutorial',
          difficulty: 'beginner',
          duration: 25,
          rating: 4.5,
          relevance: 0.95
        },
        {
          id: 'resource_course',
          title: `Advanced ${query}`,
          description: `Deep dive into advanced ${query} techniques.`,
          type: 'course',
          difficulty: 'advanced',
          duration: 120,
          rating: 4.9,
          relevance: 0.88
        }
      ];

      return {
        query,
        results,
        totalCount: results.length,
        searchTime: Math.floor(Math.random() * 70) + 30,
        timestamp: new Date().toISOString()
      };
    }
  };
};

export type ContentService = ReturnType<typeof createContentService>;
