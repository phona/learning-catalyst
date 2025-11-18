/**
 * Project Challenge Generator
 *
 * Analyzes user's actual codebase and generates relevant practice challenges
 * based on their real projects, files, and code patterns.
 */

import { ServiceDependencies } from '../agents/types';
import { LoggerFactory } from '../logger';
import type { UserLearningContext, PracticeOpportunity } from '../../../../shared/types/electron-api/chat-api';
import type { VibeType } from '../../../../shared/types/practice/vibe-types';

export interface ProjectFile {
  path: string;
  name: string;
  extension: string;
  content: string;
  size: number;
  lastModified: number;
  type: 'component' | 'utility' | 'config' | 'test' | 'documentation' | 'other';
  language: string;
  framework?: string;
}

export interface ProjectStructure {
  name: string;
  type: 'react' | 'vue' | 'angular' | 'express' | 'fastapi' | 'django' | 'flask' | 'python' | 'node' | 'general';
  rootPath: string;
  files: ProjectFile[];
  dependencies: Record<string, string>;
  frameworks: string[];
  patterns: CodePattern[];
  complexity: 'simple' | 'moderate' | 'complex';
  score: number; // How suitable for practice challenges
}

export interface CodePattern {
  type: 'component' | 'function' | 'class' | 'hook' | 'route' | 'middleware' | 'config';
  name: string;
  file: string;
  line: number;
  content: string;
  complexity: number;
  practices: PracticeOpportunity[];
}

export interface PracticeOpportunity {
  id: string;
  type: string;
  concept: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  file: string;
  line?: number;
  content: string;
  suggestions: string[];
  prerequisites: string[];
  estimatedTime: number;
}

export interface ProjectChallengeRequest {
  userContext: UserLearningContext;
  currentTopic: string;
  vibe: VibeType;
  difficulty: 'easy' | 'medium' | 'hard';
  focusAreas?: string[];
  avoidRecent?: boolean;
  projectPath?: string;
}

export interface ProjectChallenge {
  id: string;
  type: 'enhancement' | 'bug-fix' | 'feature-add' | 'refactor' | 'optimization' | 'test-addition';
  title: string;
  description: string;
  file: string;
  currentCode: string;
  challenge: string;
  context: string;
  steps: string[];
  hints: string[];
  solution: {
    approach: string;
    code: string;
    explanation: string;
  };
  learningObjectives: string[];
  estimatedTime: number;
  difficulty: 'easy' | 'medium' | 'hard';
  prerequisites: string[];
  relatedConcepts: string[];
  projectRelevance: string;
}

export interface ProjectChallengeGeneratorConfig {
  maxFilesToAnalyze: number;
  maxFileSize: number;
  excludePatterns: string[];
  includePatterns: string[];
  cacheResults: boolean;
  cacheTimeout: number;
  analysisTimeout: number;
}

export const DEFAULT_PROJECT_CHALLENGE_GENERATOR_CONFIG: ProjectChallengeGeneratorConfig = {
  maxFilesToAnalyze: 50,
  maxFileSize: 1024 * 1024, // 1MB
  excludePatterns: [
    'node_modules',
    '.git',
    'dist',
    'build',
    'coverage',
    '.vscode',
    '.idea',
    '*.log',
    '*.tmp',
    '.env*'
  ],
  includePatterns: [
    '*.{js,jsx,ts,tsx,vue,py,java,cpp,c,h,go,rs}',
    '*.{json,yaml,yml,md,txt}'
  ],
  cacheResults: true,
  cacheTimeout: 30 * 60 * 1000, // 30 minutes
  analysisTimeout: 10000 // 10 seconds
};

/**
 * Project Challenge Generator Service
 */
export class ProjectChallengeGenerator {
  private readonly logger: any;
  private readonly config: ProjectChallengeGeneratorConfig;
  private readonly projectCache = new Map<string, {
    structure: ProjectStructure;
    timestamp: number;
  }>();

  constructor(dependencies: ServiceDependencies, config: Partial<ProjectChallengeGeneratorConfig> = {}) {
    this.logger = dependencies.logger;
    this.config = { ...DEFAULT_PROJECT_CHALLENGE_GENERATOR_CONFIG, ...config };
    this.logger.info('ProjectChallengeGenerator service initialized');
  }

  /**
   * Generate project-based challenge
   */
  async generateProjectChallenge(request: ProjectChallengeRequest): Promise<ProjectChallenge> {
    try {
      this.logger.info('Generating project-based challenge', {
        userId: request.userContext.id,
        topic: request.currentTopic,
        vibe: request.vibe,
        difficulty: request.difficulty
      });

      // Get or analyze project structure
      const projectStructure = await this.getProjectStructure(request.projectPath);

      if (!projectStructure || projectStructure.files.length === 0) {
        throw new Error('No project files available for analysis');
      }

      // Find relevant practice opportunities
      const opportunities = await this.findPracticeOpportunities(projectStructure, request);

      if (opportunities.length === 0) {
        throw new Error('No suitable practice opportunities found in project');
      }

      // Select best opportunity based on context
      const selectedOpportunity = this.selectBestOpportunity(opportunities, request);

      // Generate challenge from opportunity
      const challenge = await this.createChallengeFromOpportunity(selectedOpportunity, request, projectStructure);

      this.logger.info('Project challenge generated successfully', {
        challengeId: challenge.id,
        type: challenge.type,
        file: challenge.file,
        difficulty: challenge.difficulty
      });

      return challenge;

    } catch (error) {
      this.logger.error('Failed to generate project challenge', error as Error);
      return this.createFallbackChallenge(request);
    }
  }

  /**
   * Get project structure (cached or fresh analysis)
   */
  private async getProjectStructure(projectPath?: string): Promise<ProjectStructure | null> {
    try {
      const cacheKey = projectPath || 'default_project';
      const now = Date.now();

      // Check cache first
      if (this.config.cacheResults) {
        const cached = this.projectCache.get(cacheKey);
        if (cached && (now - cached.timestamp) < this.config.cacheTimeout) {
          this.logger.debug('Using cached project structure');
          return cached.structure;
        }
      }

      // Analyze project structure
      const structure = await this.analyzeProjectStructure(projectPath);

      // Cache result
      if (this.config.cacheResults && structure) {
        this.projectCache.set(cacheKey, {
          structure,
          timestamp: now
        });
      }

      return structure;

    } catch (error) {
      this.logger.error('Failed to get project structure', error as Error);
      return null;
    }
  }

  /**
   * Analyze project structure
   */
  private async analyzeProjectStructure(projectPath?: string): Promise<ProjectStructure | null> {
    try {
      // This would integrate with file system access
      // For now, return mock structure for demonstration
      return {
        name: 'User Project',
        type: 'react',
        rootPath: projectPath || '/project',
        files: await this.getMockProjectFiles(),
        dependencies: {
          'react': '^18.0.0',
          'react-dom': '^18.0.0',
          'typescript': '^4.9.0'
        },
        frameworks: ['React', 'TypeScript'],
        patterns: [],
        complexity: 'moderate',
        score: 0.8
      };

    } catch (error) {
      this.logger.error('Failed to analyze project structure', error as Error);
      return null;
    }
  }

  /**
   * Get mock project files for demonstration
   */
  private async getMockProjectFiles(): Promise<ProjectFile[]> {
    return [
      {
        path: '/src/components/TodoItem.tsx',
        name: 'TodoItem.tsx',
        extension: 'tsx',
        content: `import React, { useState } from 'react';

interface TodoItemProps {
  text: string;
  completed?: boolean;
  onToggle?: () => void;
}

export const TodoItem: React.FC<TodoItemProps> = ({
  text,
  completed = false,
  onToggle
}) => {
  const [isCompleted, setIsCompleted] = useState(completed);

  const handleClick = () => {
    setIsCompleted(!isCompleted);
    onToggle?.();
  };

  return (
    <div
      className={\`todo-item \${isCompleted ? 'completed' : ''}\`}
      onClick={handleClick}
    >
      {text}
    </div>
  );
};`,
        size: 500,
        lastModified: Date.now(),
        type: 'component',
        language: 'typescript',
        framework: 'react'
      },
      {
        path: '/src/components/TodoList.tsx',
        name: 'TodoList.tsx',
        extension: 'tsx',
        content: `import React, { useState } from 'react';
import { TodoItem } from './TodoItem';

interface Todo {
  id: number;
  text: string;
  completed: boolean;
}

export const TodoList: React.FC = () => {
  const [todos, setTodos] = useState<Todo[]>([
    { id: 1, text: 'Learn React hooks', completed: false },
    { id: 2, text: 'Build todo app', completed: false }
  ]);

  const toggleTodo = (id: number) => {
    setTodos(todos.map(todo =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    ));
  };

  return (
    <div className="todo-list">
      {todos.map(todo => (
        <TodoItem
          key={todo.id}
          text={todo.text}
          completed={todo.completed}
          onToggle={() => toggleTodo(todo.id)}
        />
      ))}
    </div>
  );
};`,
        size: 800,
        lastModified: Date.now(),
        type: 'component',
        language: 'typescript',
        framework: 'react'
      },
      {
        path: '/src/utils/helpers.ts',
        name: 'helpers.ts',
        extension: 'ts',
        content: `export const formatDate = (date: Date): string => {
  return date.toLocaleDateString();
};

export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};`,
        size: 400,
        lastModified: Date.now(),
        type: 'utility',
        language: 'typescript'
      }
    ];
  }

  /**
   * Find practice opportunities in project
   */
  private async findPracticeOpportunities(
    structure: ProjectStructure,
    request: ProjectChallengeRequest
  ): Promise<PracticeOpportunity[]> {
    const opportunities: PracticeOpportunity[] = [];

    for (const file of structure.files) {
      const fileOpportunities = await this.analyzeFileForOpportunities(file, request);
      opportunities.push(...fileOpportunities);
    }

    return opportunities.filter(opp => this.isOpportunityRelevant(opp, request));
  }

  /**
   * Analyze individual file for practice opportunities
   */
  private async analyzeFileForOpportunities(
    file: ProjectFile,
    request: ProjectChallengeRequest
  ): Promise<PracticeOpportunity[]> {
    const opportunities: PracticeOpportunity[] = [];

    if (file.type === 'component' && file.framework === 'react') {
      opportunities.push(...this.analyzeReactComponent(file, request));
    }

    if (file.type === 'utility') {
      opportunities.push(...this.analyzeUtilityFile(file, request));
    }

    return opportunities;
  }

  /**
   * Analyze React component for opportunities
   */
  private analyzeReactComponent(file: ProjectFile, request: ProjectChallengeRequest): PracticeOpportunity[] {
    const opportunities: PracticeOpportunity[] = [];

    // Check for useState usage
    if (file.content.includes('useState')) {
      opportunities.push({
        id: `${file.path}_usestate_enhancement`,
        type: 'enhancement',
        concept: 'React hooks - useState',
        description: 'Enhance useState usage in this component',
        difficulty: 'medium',
        file: file.path,
        content: file.content,
        suggestions: [
          'Add validation to state updates',
          'Implement optimistic updates',
          'Add state persistence',
          'Optimize re-renders with useMemo/useCallback'
        ],
        prerequisites: ['Basic React', 'useState hook'],
        estimatedTime: 20
      });
    }

    // Check for event handling
    if (file.content.includes('onClick') || file.content.includes('onChange')) {
      opportunities.push({
        id: `${file.path}_event_enhancement`,
        type: 'enhancement',
        concept: 'React event handling',
        description: 'Improve event handling in this component',
        difficulty: 'easy',
        file: file.path,
        content: file.content,
        suggestions: [
          'Add event delegation',
          'Implement custom event handlers',
          'Add accessibility improvements',
          'Add keyboard navigation'
        ],
        prerequisites: ['React basics', 'Event handling'],
        estimatedTime: 15
      });
    }

    // Check for TypeScript improvements
    if (file.extension === 'tsx' && !file.content.includes('interface')) {
      opportunities.push({
        id: `${file.path}_typescript_enhancement`,
        type: 'enhancement',
        concept: 'TypeScript interfaces',
        description: 'Add TypeScript interfaces to improve type safety',
        difficulty: 'medium',
        file: file.path,
        content: file.content,
        suggestions: [
          'Define prop interfaces',
          'Add type annotations',
          'Improve type inference',
          'Add generic types where applicable'
        ],
        prerequisites: ['TypeScript basics', 'React with TypeScript'],
        estimatedTime: 25
      });
    }

    return opportunities;
  }

  /**
   * Analyze utility file for opportunities
   */
  private analyzeUtilityFile(file: ProjectFile, request: ProjectChallengeRequest): PracticeOpportunity[] {
    const opportunities: PracticeOpportunity[] = [];

    // Check for function improvements
    if (file.content.includes('export const')) {
      opportunities.push({
        id: `${file.path}_function_enhancement`,
        type: 'enhancement',
        concept: 'Utility function optimization',
        description: 'Enhance utility functions with better implementations',
        difficulty: 'medium',
        file: file.path,
        content: file.content,
        suggestions: [
          'Add input validation',
          'Improve error handling',
          'Add JSDoc documentation',
          'Optimize performance',
          'Add unit tests'
        ],
        prerequisites: ['JavaScript/TypeScript', 'Function design'],
        estimatedTime: 20
      });
    }

    return opportunities;
  }

  /**
   * Check if opportunity is relevant to request
   */
  private isOpportunityRelevant(opportunity: PracticeOpportunity, request: ProjectChallengeRequest): boolean {
    // Check topic relevance
    if (request.currentTopic && !opportunity.concept.toLowerCase().includes(request.currentTopic.toLowerCase())) {
      return false;
    }

    // Check difficulty match
    if (opportunity.difficulty !== request.difficulty) {
      return false;
    }

    // Check focus areas
    if (request.focusAreas && request.focusAreas.length > 0) {
      const relevant = request.focusAreas.some(area =>
        opportunity.concept.toLowerCase().includes(area.toLowerCase())
      );
      if (!relevant) return false;
    }

    return true;
  }

  /**
   * Select best opportunity from list
   */
  private selectBestOpportunity(opportunities: PracticeOpportunity[], request: ProjectChallengeRequest): PracticeOpportunity {
    // Score opportunities based on relevance
    const scored = opportunities.map(opp => ({
      opportunity: opp,
      score: this.scoreOpportunity(opp, request)
    }));

    // Sort by score (highest first)
    scored.sort((a, b) => b.score - a.score);

    return scored[0]?.opportunity || opportunities[0];
  }

  /**
   * Score opportunity based on request context
   */
  private scoreOpportunity(opportunity: PracticeOpportunity, request: ProjectChallengeRequest): number {
    let score = 0;

    // Topic relevance
    if (request.currentTopic) {
      if (opportunity.concept.toLowerCase().includes(request.currentTopic.toLowerCase())) {
        score += 30;
      }
    }

    // Vibe-appropriate difficulty
    const vibeDifficultyMap = {
      confused: 'easy',
      understanding: 'medium',
      breakthrough: 'hard',
      practicing: 'medium',
      misunderstanding: 'easy'
    };

    const preferredDifficulty = vibeDifficultyMap[request.vibe] || 'medium';
    if (opportunity.difficulty === preferredDifficulty) {
      score += 20;
    }

    // User level appropriate
    if (request.userContext.confidenceLevel > 0.7 && opportunity.difficulty === 'hard') {
      score += 15;
    } else if (request.userContext.confidenceLevel < 0.5 && opportunity.difficulty === 'easy') {
      score += 15;
    }

    // Avoid recent practice (if requested)
    if (request.avoidRecent && request.userContext.practiceHistory) {
      const recentConcepts = request.userContext.practiceHistory
        .slice(-3)
        .map(p => p.concept);

      if (!recentConcepts.includes(opportunity.concept)) {
        score += 10;
      }
    }

    return score;
  }

  /**
   * Create challenge from opportunity
   */
  private async createChallengeFromOpportunity(
    opportunity: PracticeOpportunity,
    request: ProjectChallengeRequest,
    projectStructure: ProjectStructure
  ): Promise<ProjectChallenge> {
    const challengeType = this.determineChallengeType(opportunity, request.vibe);
    const selectedSuggestion = opportunity.suggestions[Math.floor(Math.random() * opportunity.suggestions.length)];

    return {
      id: `challenge_${Date.now()}`,
      type: challengeType,
      title: this.generateChallengeTitle(opportunity, challengeType),
      description: this.generateChallengeDescription(opportunity, challengeType, request.vibe),
      file: opportunity.file,
      currentCode: opportunity.content,
      challenge: selectedSuggestion,
      context: this.generateChallengeContext(opportunity, projectStructure),
      steps: this.generateChallengeSteps(opportunity, challengeType),
      hints: this.generateChallengeHints(opportunity, challengeType),
      solution: {
        approach: this.generateSolutionApproach(opportunity, challengeType),
        code: this.generateSolutionCode(opportunity, challengeType),
        explanation: this.generateSolutionExplanation(opportunity, challengeType)
      },
      learningObjectives: opportunity.prerequisites,
      estimatedTime: opportunity.estimatedTime,
      difficulty: opportunity.difficulty,
      prerequisites: opportunity.prerequisites,
      relatedConcepts: [opportunity.concept],
      projectRelevance: this.generateProjectRelevance(opportunity, projectStructure)
    };
  }

  /**
   * Determine challenge type based on opportunity and vibe
   */
  private determineChallengeType(opportunity: PracticeOpportunity, vibe: VibeType): ProjectChallenge['type'] {
    const typeMap = {
      confused: 'enhancement',
      understanding: 'enhancement',
      breakthrough: 'feature-add',
      practicing: 'refactor',
      misunderstanding: 'bug-fix'
    };

    return typeMap[vibe] || 'enhancement';
  }

  /**
   * Generate challenge title
   */
  private generateChallengeTitle(opportunity: PracticeOpportunity, type: ProjectChallenge['type']): string {
    const typeTitleMap = {
      enhancement: `Enhance ${opportunity.concept}`,
      'bug-fix': `Fix ${opportunity.concept} Issue`,
      'feature-add': `Add ${opportunity.concept} Feature`,
      refactor: `Refactor ${opportunity.concept}`,
      optimization: `Optimize ${opportunity.concept}`,
      'test-addition': `Test ${opportunity.concept}`
    };

    return typeTitleMap[type] || `Practice ${opportunity.concept}`;
  }

  /**
   * Generate challenge description
   */
  private generateChallengeDescription(opportunity: PracticeOpportunity, type: ProjectChallenge['type'], vibe: VibeType): string {
    const vibeDescriptions = {
      confused: `Let's clarify ${opportunity.concept} with a hands-on improvement to your actual code.`,
      understanding: `Great! Since you understand ${opportunity.concept}, let's apply it to make your project better.`,
      breakthrough: `Excellent! Let's solidify that ${opportunity.concept} insight by improving your real code.`,
      practicing: `Perfect timing to build on your ${opportunity.concept} practice with your actual project.`,
      misunderstanding: `Let's clarify ${opportunity.concept} by fixing a real issue in your code.`
    };

    const baseDescription = vibeDescriptions[vibe] || `Practice ${opportunity.concept} with your actual project code.`;

    return `${baseDescription} You'll be working directly with the file \`${opportunity.file}\` to make meaningful improvements.`;
  }

  /**
   * Generate challenge context
   */
  private generateChallengeContext(opportunity: PracticeOpportunity, projectStructure: ProjectStructure): string {
    const fileName = opportunity.file.split('/').pop() || opportunity.file;
    return `This challenge is based on your actual \`${fileName}\` file in your ${projectStructure.name} project. The changes you make will directly improve your real codebase and help you understand ${opportunity.concept} better through practical application.`;
  }

  /**
   * Generate challenge steps
   */
  private generateChallengeSteps(opportunity: PracticeOpportunity, type: ProjectChallenge['type']): string[] {
    const commonSteps = [
      'Analyze the current code structure',
      'Identify the specific area for improvement',
      'Implement the suggested changes',
      'Test your changes work correctly'
    ];

    const typeSpecificSteps = {
      enhancement: ['Add the new functionality or improvement'],
      'bug-fix': ['Identify and fix the underlying issue'],
      'feature-add': ['Design and implement the new feature'],
      refactor: ['Restructure the code for better maintainability'],
      optimization: ['Optimize performance or efficiency'],
      'test-addition': ['Write comprehensive tests']
    };

    return [...commonSteps, ...(typeSpecificSteps[type] || typeSpecificSteps.enhancement)];
  }

  /**
   * Generate challenge hints
   */
  private generateChallengeHints(opportunity: PracticeOpportunity, type: ProjectChallenge['type']): string[] {
    const commonHints = [
      'Look at similar patterns in other files',
      'Consider the user experience impact',
      'Test your changes thoroughly'
    ];

    const conceptHints = {
      'React hooks - useState': ['Remember to use the setter function', 'Consider initial state carefully'],
      'React event handling': ['Use proper event types', 'Consider accessibility'],
      'TypeScript interfaces': ['Define clear prop interfaces', 'Use generics when appropriate'],
      'Utility function optimization': ['Consider edge cases', 'Add proper error handling']
    };

    return [...commonHints, ...(conceptHints[opportunity.concept] || [])];
  }

  /**
   * Generate solution approach
   */
  private generateSolutionApproach(opportunity: PracticeOpportunity, type: ProjectChallenge['type']): string {
    const approaches = {
      enhancement: 'Enhance the existing functionality by adding the suggested improvements while maintaining backward compatibility.',
      'bug-fix': 'Identify the root cause of the issue and implement a fix that addresses the underlying problem without breaking existing functionality.',
      'feature-add': 'Design and implement the new feature following the project\'s existing patterns and conventions.',
      refactor: 'Restructure the code to improve readability, maintainability, and performance while preserving the original functionality.',
      optimization: 'Optimize the code for better performance, memory usage, or efficiency without changing the external behavior.',
      'test-addition': 'Write comprehensive tests that cover the existing functionality and edge cases.'
    };

    return approaches[type] || approaches.enhancement;
  }

  /**
   * Generate solution code
   */
  private generateSolutionCode(opportunity: PracticeOpportunity, type: ProjectChallenge['type']): string {
    // This would generate actual code based on the opportunity
    // For now, return a placeholder
    return `// Solution implementation for ${opportunity.concept}
// This would contain the actual code solution
// based on the specific opportunity and challenge type`;
  }

  /**
   * Generate solution explanation
   */
  private generateSolutionExplanation(opportunity: PracticeOpportunity, type: ProjectChallenge['type']): string {
    return `The solution addresses the ${opportunity.concept} concept by implementing the suggested improvements. This approach ensures that your code follows best practices while directly enhancing your actual project.`;
  }

  /**
   * Generate project relevance explanation
   */
  private generateProjectRelevance(opportunity: PracticeOpportunity, projectStructure: ProjectStructure): string {
    return `This challenge is highly relevant to your ${projectStructure.name} project as it directly improves your actual \`${opportunity.file.split('/').pop()}\` file. The skills you practice here will immediately benefit your real codebase.`;
  }

  /**
   * Create fallback challenge when project analysis fails
   */
  private createFallbackChallenge(request: ProjectChallengeRequest): ProjectChallenge {
    return {
      id: `fallback_${Date.now()}`,
      type: 'enhancement',
      title: `Practice ${request.currentTopic}`,
      description: `Practice ${request.currentTopic} concepts with a guided exercise.`,
      file: 'practice-file.ts',
      currentCode: '// Example code for practice',
      challenge: `Apply ${request.currentTopic} concepts to improve this code.`,
      context: 'This practice exercise will help you understand the concepts better.',
      steps: ['Analyze the requirements', 'Implement the solution', 'Test your approach'],
      hints: ['Break down the problem', 'Consider edge cases'],
      solution: {
        approach: 'Follow best practices for the given concept.',
        code: '// Solution code would go here',
        explanation: 'This solution demonstrates the proper application of the concepts.'
      },
      learningObjectives: [`Understand ${request.currentTopic}`],
      estimatedTime: 20,
      difficulty: request.difficulty,
      prerequisites: ['Basic programming knowledge'],
      relatedConcepts: [request.currentTopic],
      projectRelevance: 'This practice exercise builds fundamental skills for your projects.'
    };
  }

  /**
   * Clear project cache
   */
  clearCache(): void {
    this.projectCache.clear();
    this.logger.info('Project challenge generator cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    oldestEntry: number | null;
    newestEntry: number | null;
    } {
    if (this.projectCache.size === 0) {
      return { size: 0, oldestEntry: null, newestEntry: null };
    }

    const entries = Array.from(this.projectCache.values());
    const timestamps = entries.map(e => e.timestamp);

    return {
      size: this.projectCache.size,
      oldestEntry: Math.min(...timestamps),
      newestEntry: Math.max(...timestamps)
    };
  }

  /**
   * Dispose of the service
   */
  dispose(): void {
    this.clearCache();
    this.logger.info('ProjectChallengeGenerator service disposed');
  }
}

/**
 * Global project challenge generator instance
 */
export const projectChallengeGenerator = new ProjectChallengeGenerator({
  logger: LoggerFactory.getLogger('ProjectChallengeGenerator')
});