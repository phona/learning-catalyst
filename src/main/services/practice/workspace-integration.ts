/**
 * Workspace Integration Service
 *
 * Handles integration with user's workspace for accessing project files,
 * analyzing code structure, and managing file system operations.
 */

import { promises as fs } from 'fs';
import { join, extname, basename, dirname, relative } from 'path';
import { ServiceDependencies } from '../agents/types';
import { LoggerFactory } from '../logger';
import type { ProjectFile, ProjectStructure, CodePattern } from './project-challenge-generator';

export interface WorkspaceConfig {
  rootPath: string;
  includePatterns: string[];
  excludePatterns: string[];
  maxFileSize: number;
  maxDepth: number;
  enableBinaryDetection: boolean;
  cacheEnabled: boolean;
}

export interface FileAnalysisOptions {
  analyzeImports: boolean;
  analyzeExports: boolean;
  detectPatterns: boolean;
  extractFunctions: boolean;
  extractClasses: boolean;
  extractComments: boolean;
}

export interface ImportExport {
  type: 'import' | 'export';
  module: string;
  items: string[];
  line: number;
  isDefault: boolean;
  isTypeOnly: boolean;
}

export interface FunctionInfo {
  name: string;
  type: 'function' | 'arrow' | 'method' | 'async';
  parameters: string[];
  returnType?: string;
  line: number;
  content: string;
  complexity: number;
}

export interface ClassInfo {
  name: string;
  extends?: string;
  implements?: string[];
  properties: string[];
  methods: FunctionInfo[];
  line: number;
  content: string;
}

export interface CodeMetrics {
  linesOfCode: number;
  complexity: number;
  functions: number;
  classes: number;
  imports: number;
  exports: number;
  comments: number;
}

export interface AnalysisResult {
  file: ProjectFile;
  imports: ImportExport[];
  exports: ImportExport[];
  functions: FunctionInfo[];
  classes: ClassInfo[];
  patterns: CodePattern[];
  metrics: CodeMetrics;
}

export const DEFAULT_WORKSPACE_CONFIG: WorkspaceConfig = {
  rootPath: process.cwd(),
  includePatterns: [
    '*.{js,jsx,ts,tsx,vue,py,java,cpp,c,h,go,rs,php}',
    '*.{json,yaml,yml,md,txt,config,env}'
  ],
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
    '.env*',
    'package-lock.json',
    'yarn.lock'
  ],
  maxFileSize: 1024 * 1024, // 1MB
  maxDepth: 5,
  enableBinaryDetection: true,
  cacheEnabled: true
};

/**
 * Workspace Integration Service
 */
export class WorkspaceIntegration {
  private readonly logger: any;
  private readonly config: WorkspaceConfig;
  private readonly fileCache = new Map<string, AnalysisResult>();
  private readonly directoryCache = new Map<string, string[]>();

  constructor(dependencies: ServiceDependencies, config: Partial<WorkspaceConfig> = {}) {
    this.logger = dependencies.logger;
    this.config = { ...DEFAULT_WORKSPACE_CONFIG, ...config };
    this.logger.info('WorkspaceIntegration service initialized', { rootPath: this.config.rootPath });
  }

  /**
   * Scan workspace and return project structure
   */
  async scanWorkspace(options: Partial<FileAnalysisOptions> = {}): Promise<ProjectStructure> {
    try {
      this.logger.info('Scanning workspace', { rootPath: this.config.rootPath });

      const files = await this.collectFiles(this.config.rootPath);
      const analysisOptions = this.mergeAnalysisOptions(options);

      const analyzedFiles: ProjectFile[] = [];
      const patterns: CodePattern[] = [];
      const dependencies: Record<string, string> = {};
      const frameworks: string[] = [];

      // Analyze each file
      for (const filePath of files) {
        try {
          const projectFile = await this.createProjectFile(filePath);
          if (projectFile) {
            analyzedFiles.push(projectFile);

            // Analyze file content for patterns
            const analysis = await this.analyzeFile(projectFile, analysisOptions);
            patterns.push(...analysis.patterns);

            // Extract dependencies
            if (projectFile.extension === 'json' && basename(filePath) === 'package.json') {
              Object.assign(dependencies, await this.extractPackageDependencies(projectFile.content));
            }

            // Detect frameworks
            const fileFrameworks = this.detectFrameworks(projectFile);
            frameworks.push(...fileFrameworks);
          }
        } catch (error) {
          this.logger.warn(`Failed to analyze file: ${filePath}`, error);
        }
      }

      // Determine project type and complexity
      const projectType = this.determineProjectType(analyzedFiles, frameworks);
      const complexity = this.determineComplexity(analyzedFiles);

      return {
        name: basename(this.config.rootPath) || 'Project',
        type: projectType,
        rootPath: this.config.rootPath,
        files: analyzedFiles,
        dependencies,
        frameworks: [...new Set(frameworks)],
        patterns,
        complexity,
        score: this.calculateProjectScore(analyzedFiles, complexity)
      };

    } catch (error) {
      this.logger.error('Failed to scan workspace', error as Error);
      throw error;
    }
  }

  /**
   * Collect all files in workspace matching criteria
   */
  private async collectFiles(rootPath: string, currentDepth = 0): Promise<string[]> {
    if (currentDepth > this.config.maxDepth) {
      return [];
    }

    const cacheKey = rootPath;
    if (this.directoryCache.has(cacheKey)) {
      return this.directoryCache.get(cacheKey)!;
    }

    try {
      const entries = await fs.readdir(rootPath, { withFileTypes: true });
      const files: string[] = [];

      for (const entry of entries) {
        const fullPath = join(rootPath, entry.name);

        // Skip excluded patterns
        if (this.shouldExclude(fullPath)) {
          continue;
        }

        if (entry.isDirectory()) {
          // Recursively scan subdirectories
          const subFiles = await this.collectFiles(fullPath, currentDepth + 1);
          files.push(...subFiles);
        } else if (entry.isFile()) {
          // Check file extension
          if (this.matchesIncludePattern(fullPath)) {
            // Check file size
            const stats = await fs.stat(fullPath);
            if (stats.size <= this.config.maxFileSize) {
              files.push(fullPath);
            }
          }
        }
      }

      // Cache result
      if (this.config.cacheEnabled) {
        this.directoryCache.set(cacheKey, files);
      }

      return files;

    } catch (error) {
      this.logger.warn(`Failed to read directory: ${rootPath}`, error);
      return [];
    }
  }

  /**
   * Check if path should be excluded
   */
  private shouldExclude(filePath: string): boolean {
    const normalizedPath = filePath.replace(/\\/g, '/');

    return this.config.excludePatterns.some(pattern => {
      // Simple glob pattern matching
      const regexPattern = pattern
        .replace(/\*/g, '.*')
        .replace(/\?/g, '.');

      return new RegExp(regexPattern).test(normalizedPath);
    });
  }

  /**
   * Check if file matches include patterns
   */
  private matchesIncludePattern(filePath: string): boolean {
    const normalizedPath = filePath.replace(/\\/g, '/');

    return this.config.includePatterns.some(pattern => {
      const regexPattern = pattern
        .replace(/\*/g, '.*')
        .replace(/\?/g, '.');

      return new RegExp(regexPattern).test(normalizedPath);
    });
  }

  /**
   * Create project file object
   */
  private async createProjectFile(filePath: string): Promise<ProjectFile | null> {
    try {
      const stats = await fs.stat(filePath);
      const content = await fs.readFile(filePath, 'utf-8');
      const ext = extname(filePath);
      const name = basename(filePath);

      // Determine file type
      const fileType = this.determineFileType(filePath, content);
      const language = this.determineLanguage(ext, content);
      const framework = this.detectFileFramework(filePath, content);

      return {
        path: filePath,
        name,
        extension: ext,
        content,
        size: stats.size,
        lastModified: stats.mtime.getTime(),
        type: fileType,
        language,
        framework
      };

    } catch (error) {
      this.logger.warn(`Failed to create project file: ${filePath}`, error);
      return null;
    }
  }

  /**
   * Determine file type based on path and content
   */
  private determineFileType(filePath: string, content: string): ProjectFile['type'] {
    const path = filePath.toLowerCase();
    const name = basename(filePath).toLowerCase();

    if (name.includes('test') || name.includes('spec')) {
      return 'test';
    }

    if (name.includes('readme') || name.includes('doc') || path.includes('docs')) {
      return 'documentation';
    }

    if (name.includes('config') || name.includes('setting')) {
      return 'config';
    }

    if (this.isComponentFile(filePath, content)) {
      return 'component';
    }

    if (this.isUtilityFile(filePath, content)) {
      return 'utility';
    }

    return 'other';
  }

  /**
   * Determine programming language
   */
  private determineLanguage(extension: string, content: string): string {
    const languageMap: Record<string, string> = {
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.vue': 'vue',
      '.py': 'python',
      '.java': 'java',
      '.cpp': 'cpp',
      '.c': 'c',
      '.h': 'c',
      '.go': 'go',
      '.rs': 'rust',
      '.php': 'php',
      '.rb': 'ruby'
    };

    return languageMap[extension] || 'text';
  }

  /**
   * Detect frameworks used in file
   */
  private detectFileFramework(filePath: string, content: string): string | undefined {
    const lowerContent = content.toLowerCase();

    // React detection
    if (lowerContent.includes('react') || lowerContent.includes('jsx') ||
        filePath.endsWith('.jsx') || filePath.endsWith('.tsx')) {
      return 'react';
    }

    // Vue detection
    if (lowerContent.includes('vue') || filePath.endsWith('.vue')) {
      return 'vue';
    }

    // Angular detection
    if (lowerContent.includes('@angular') || lowerContent.includes('angular/core')) {
      return 'angular';
    }

    // Express detection
    if (lowerContent.includes('express') || lowerContent.includes('app.get') ||
        lowerContent.includes('app.post')) {
      return 'express';
    }

    // FastAPI detection
    if (lowerContent.includes('fastapi') || lowerContent.includes('from fastapi')) {
      return 'fastapi';
    }

    // Django detection
    if (lowerContent.includes('django') || lowerContent.includes('from django')) {
      return 'django';
    }

    return undefined;
  }

  /**
   * Detect if file is a component
   */
  private isComponentFile(filePath: string, content: string): boolean {
    const path = filePath.toLowerCase();
    const name = basename(filePath).toLowerCase();
    const contentLower = content.toLowerCase();

    // Component indicators
    const componentIndicators = [
      'component',
      'widget',
      'element',
      'control',
      'view'
    ];

    return (
      path.includes('components') ||
      path.includes('views') ||
      path.includes('pages') ||
      componentIndicators.some(indicator => name.includes(indicator)) ||
      contentLower.includes('export.*component') ||
      contentLower.includes('react.fc') ||
      contentLower.includes('vue.component')
    );
  }

  /**
   * Detect if file is a utility
   */
  private isUtilityFile(filePath: string, content: string): boolean {
    const path = filePath.toLowerCase();
    const name = basename(filePath).toLowerCase();

    // Utility indicators
    const utilityIndicators = [
      'util',
      'helper',
      'service',
      'tool',
      'lib',
      'common'
    ];

    return (
      path.includes('utils') ||
      path.includes('helpers') ||
      path.includes('services') ||
      path.includes('lib') ||
      utilityIndicators.some(indicator => name.includes(indicator))
    );
  }

  /**
   * Analyze file content
   */
  async analyzeFile(file: ProjectFile, options: FileAnalysisOptions): Promise<AnalysisResult> {
    const cacheKey = file.path;

    if (this.fileCache.has(cacheKey)) {
      return this.fileCache.get(cacheKey)!;
    }

    try {
      const imports = options.analyzeImports ? this.extractImports(file.content) : [];
      const exports = options.analyzeExports ? this.extractExports(file.content) : [];
      const functions = options.extractFunctions ? this.extractFunctions(file.content) : [];
      const classes = options.extractClasses ? this.extractClasses(file.content) : [];
      const patterns = options.detectPatterns ? this.detectCodePatterns(file, functions, classes) : [];
      const metrics = this.calculateMetrics(file, imports, exports, functions, classes);

      const result: AnalysisResult = {
        file,
        imports,
        exports,
        functions,
        classes,
        patterns,
        metrics
      };

      // Cache result
      if (this.config.cacheEnabled) {
        this.fileCache.set(cacheKey, result);
      }

      return result;

    } catch (error) {
      this.logger.error(`Failed to analyze file: ${file.path}`, error);
      throw error;
    }
  }

  /**
   * Extract imports from content
   */
  private extractImports(content: string): ImportExport[] {
    const imports: ImportExport[] = [];

    // JavaScript/TypeScript imports
    const jsImportRegex = /import\s+(?:(?:\*\s+as\s+\w+)|(?:\w+)|(?:\{[^}]+\}))\s+from\s+['"`]([^'"`]+)['"`]/g;
    const requireRegex = /(?:const|let|var)\s+(?:(?:\*\s+as\s+\w+)|(?:\w+)|(?:\{[^}]+\}))\s*=\s*require\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g;

    let match;
    while ((match = jsImportRegex.exec(content)) !== null) {
      imports.push({
        type: 'import',
        module: match[1],
        items: this.parseImportItems(match[0]),
        line: this.getLineNumber(content, match.index),
        isDefault: match[0].includes('* as'),
        isTypeOnly: match[0].includes('type')
      });
    }

    while ((match = requireRegex.exec(content)) !== null) {
      imports.push({
        type: 'import',
        module: match[1],
        items: this.parseImportItems(match[0]),
        line: this.getLineNumber(content, match.index),
        isDefault: match[0].includes('* as'),
        isTypeOnly: false
      });
    }

    // Python imports
    const pythonImportRegex = /(?:from\s+([^`\s]+)\s+)?import\s+(.+)/g;
    while ((match = pythonImportRegex.exec(content)) !== null) {
      imports.push({
        type: 'import',
        module: match[1] || match[2].split('.')[0],
        items: match[2].split(',').map(item => item.trim()),
        line: this.getLineNumber(content, match.index),
        isDefault: false,
        isTypeOnly: false
      });
    }

    return imports;
  }

  /**
   * Extract exports from content
   */
  private extractExports(content: string): ImportExport[] {
    const exports: ImportExport[] = [];

    // JavaScript/TypeScript exports
    const exportRegex = /export\s+(?:(?:default\s+)?(?:class|function|const|let|var)\s+(\w+)|(?:\{([^}]+)\})|(?:\*\s+from\s+['"`]([^'"`]+)['"`]))/g;

    let match;
    while ((match = exportRegex.exec(content)) !== null) {
      const items = match[1] ? [match[1]] : (match[2] ? match[2].split(',').map(item => item.trim()) : []);
      const module = match[3] || '';

      exports.push({
        type: 'export',
        module,
        items,
        line: this.getLineNumber(content, match.index),
        isDefault: match[0].includes('default'),
        isTypeOnly: match[0].includes('type')
      });
    }

    return exports;
  }

  /**
   * Extract functions from content
   */
  private extractFunctions(content: string): FunctionInfo[] {
    const functions: FunctionInfo[] = [];

    // Function declarations
    const functionRegex = /(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)/g;
    // Arrow functions
    const arrowRegex = /(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\(([^)]*)\)\s*=>/g;
    // Method definitions
    const methodRegex = /(?:async\s+)?(\w+)\s*\(([^)]*)\)\s*[{:]/g;

    const extractFunction = (regex: RegExp, type: FunctionInfo['type']) => {
      let match;
      while ((match = regex.exec(content)) !== null) {
        functions.push({
          name: match[1],
          type,
          parameters: match[2] ? match[2].split(',').map(p => p.trim()).filter(p => p) : [],
          line: this.getLineNumber(content, match.index),
          content: this.extractFunctionContent(content, match.index),
          complexity: this.calculateFunctionComplexity(match[0])
        });
      }
    };

    extractFunction(functionRegex, 'function');
    extractFunction(arrowRegex, 'arrow');
    extractFunction(methodRegex, 'method');

    return functions;
  }

  /**
   * Extract classes from content
   */
  private extractClasses(content: string): ClassInfo[] {
    const classes: ClassInfo[] = [];

    const classRegex = /(?:export\s+)?(?:abstract\s+)?class\s+(\w+)(?:\s+extends\s+(\w+))?(?:\s+implements\s+([^{]+))?/g;

    let match;
    while ((match = classRegex.exec(content)) !== null) {
      const classContent = this.extractClassContent(content, match.index);
      const methods = this.extractFunctions(classContent);

      classes.push({
        name: match[1],
        extends: match[2],
        implements: match[3] ? match[3].split(',').map(i => i.trim()) : [],
        properties: this.extractProperties(classContent),
        methods,
        line: this.getLineNumber(content, match.index),
        content: classContent
      });
    }

    return classes;
  }

  /**
   * Detect code patterns
   */
  private detectCodePatterns(file: ProjectFile, functions: FunctionInfo[], classes: ClassInfo[]): CodePattern[] {
    const patterns: CodePattern[] = [];

    // React hook patterns
    const hookRegex = /use[A-Z]\w*/g;
    let match;
    while ((match = hookRegex.exec(file.content)) !== null) {
      patterns.push({
        type: 'hook',
        name: match[0],
        file: file.path,
        line: this.getLineNumber(file.content, match.index),
        content: this.extractLine(file.content, match.index),
        complexity: 1,
        practices: [{
          id: `${file.path}_${match[0]}_practice`,
          type: 'enhancement',
          concept: 'React hooks',
          description: `Practice using ${match[0]} hook`,
          difficulty: 'medium',
          file: file.path,
          content: file.content,
          suggestions: [`Optimize ${match[0]} usage`, `Add proper dependencies`],
          prerequisites: ['React hooks basics'],
          estimatedTime: 15
        }]
      });
    }

    // Add function patterns
    functions.forEach(func => {
      patterns.push({
        type: 'function',
        name: func.name,
        file: file.path,
        line: func.line,
        content: func.content,
        complexity: func.complexity,
        practices: [{
          id: `${file.path}_${func.name}_practice`,
          type: 'enhancement',
          concept: 'Function optimization',
          description: `Optimize ${func.name} function`,
          difficulty: func.complexity > 5 ? 'hard' : func.complexity > 2 ? 'medium' : 'easy',
          file: file.path,
          content: func.content,
          suggestions: ['Improve performance', 'Add error handling', 'Optimize complexity'],
          prerequisites: ['JavaScript/TypeScript'],
          estimatedTime: func.complexity * 5
        }]
      });
    });

    return patterns;
  }

  /**
   * Helper methods
   */
  private mergeAnalysisOptions(options: Partial<FileAnalysisOptions>): FileAnalysisOptions {
    return {
      analyzeImports: true,
      analyzeExports: true,
      detectPatterns: true,
      extractFunctions: true,
      extractClasses: true,
      extractComments: false,
      ...options
    };
  }

  private parseImportItems(importStatement: string): string[] {
    const match = importStatement.match(/\{([^}]+)\}/);
    if (match) {
      return match[1].split(',').map(item => item.trim().replace(/.*as\s+/, ''));
    }
    return [];
  }

  private getLineNumber(content: string, index: number): number {
    return content.substring(0, index).split('\n').length;
  }

  private extractLine(content: string, index: number): string {
    const start = content.lastIndexOf('\n', index) + 1;
    const end = content.indexOf('\n', index);
    return content.substring(start, end > -1 ? end : content.length);
  }

  private extractFunctionContent(content: string, startIndex: number): string {
    const start = content.indexOf('{', startIndex);
    if (start === -1) return '';

    let braceCount = 0;
    let i = start;
    for (; i < content.length; i++) {
      if (content[i] === '{') braceCount++;
      if (content[i] === '}') braceCount--;
      if (braceCount === 0) break;
    }

    return content.substring(start, i + 1);
  }

  private extractClassContent(content: string, startIndex: number): string {
    const start = content.indexOf('{', startIndex);
    if (start === -1) return '';

    let braceCount = 0;
    let i = start;
    for (; i < content.length; i++) {
      if (content[i] === '{') braceCount++;
      if (content[i] === '}') braceCount--;
      if (braceCount === 0) break;
    }

    return content.substring(start, i + 1);
  }

  private extractProperties(classContent: string): string[] {
    const properties: string[] = [];
    const propertyRegex = /(?:private|public|protected)?\s*(?:readonly\s+)?(\w+)\s*(?::[^{;]+)?\s*[=;]/g;

    let match;
    while ((match = propertyRegex.exec(classContent)) !== null) {
      properties.push(match[1]);
    }

    return properties;
  }

  private calculateFunctionComplexity(functionSignature: string): number {
    let complexity = 1;

    // Add complexity for parameters
    const paramCount = (functionSignature.match(/,/g) || []).length;
    complexity += Math.min(paramCount, 3);

    // Add complexity for async
    if (functionSignature.includes('async')) complexity += 1;

    // Add complexity for generics
    const genericCount = (functionSignature.match(/</g) || []).length;
    complexity += Math.min(genericCount, 2);

    return complexity;
  }

  private calculateMetrics(
    file: ProjectFile,
    imports: ImportExport[],
    exports: ImportExport[],
    functions: FunctionInfo[],
    classes: ClassInfo[]
  ): CodeMetrics {
    const lines = file.content.split('\n').length;
    const commentLines = (file.content.match(/\/\*[\s\S]*?\*\/|\/\/.*/g) || []).length;

    return {
      linesOfCode: lines,
      complexity: functions.reduce((sum, func) => sum + func.complexity, 0),
      functions: functions.length,
      classes: classes.length,
      imports: imports.length,
      exports: exports.length,
      comments: commentLines
    };
  }

  private extractPackageDependencies(content: string): Record<string, string> {
    try {
      const packageJson = JSON.parse(content);
      return {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
        ...packageJson.peerDependencies
      };
    } catch {
      return {};
    }
  }

  private detectFrameworks(file: ProjectFile): string[] {
    const frameworks: string[] = [];

    if (file.framework) {
      frameworks.push(file.framework);
    }

    return frameworks;
  }

  private determineProjectType(files: ProjectFile[], frameworks: string[]): ProjectStructure['type'] {
    if (frameworks.includes('react') || frameworks.includes('vue') || frameworks.includes('angular')) {
      return 'react'; // Default to react for frontend frameworks
    }

    if (frameworks.includes('express') || frameworks.includes('fastapi') || frameworks.includes('django')) {
      return 'express'; // Default to express for backend frameworks
    }

    if (files.some(f => f.extension === '.py')) {
      return 'python';
    }

    if (files.some(f => f.extension === '.js' || f.extension === '.ts')) {
      return 'node';
    }

    return 'general';
  }

  private determineComplexity(files: ProjectFile[]): 'simple' | 'moderate' | 'complex' {
    const totalFiles = files.length;
    const codeFiles = files.filter(f => f.type !== 'documentation' && f.type !== 'config').length;
    const avgFileSize = files.reduce((sum, f) => sum + f.size, 0) / files.length;

    if (totalFiles < 10 && codeFiles < 5 && avgFileSize < 5000) {
      return 'simple';
    } else if (totalFiles < 50 && codeFiles < 20 && avgFileSize < 10000) {
      return 'moderate';
    } else {
      return 'complex';
    }
  }

  private calculateProjectScore(files: ProjectFile[], complexity: string): number {
    let score = 0.5; // Base score

    // Add points for code files
    const codeFiles = files.filter(f => f.type === 'component' || f.type === 'utility');
    score += Math.min(0.3, codeFiles.length * 0.05);

    // Add points for complexity
    const complexityBonus = complexity === 'simple' ? 0.1 : complexity === 'moderate' ? 0.2 : 0.3;
    score += complexityBonus;

    // Add points for variety
    const uniqueExtensions = new Set(files.map(f => f.extension)).size;
    score += Math.min(0.1, uniqueExtensions * 0.02);

    return Math.min(1, score);
  }

  /**
   * Clear all caches
   */
  clearCaches(): void {
    this.fileCache.clear();
    this.directoryCache.clear();
    this.logger.info('Workspace integration caches cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    fileCacheSize: number;
    directoryCacheSize: number;
    } {
    return {
      fileCacheSize: this.fileCache.size,
      directoryCacheSize: this.directoryCache.size
    };
  }

  /**
   * Dispose of the service
   */
  dispose(): void {
    this.clearCaches();
    this.logger.info('WorkspaceIntegration service disposed');
  }
}

/**
 * Global workspace integration instance
 */
export const workspaceIntegration = new WorkspaceIntegration({
  logger: LoggerFactory.getLogger('WorkspaceIntegration')
});