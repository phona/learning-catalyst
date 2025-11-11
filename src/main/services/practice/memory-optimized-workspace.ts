/**
 * Memory-Optimized Workspace Analyzer
 *
 * Optimizes memory usage for large projects (10K+ files) with
 * streaming analysis, efficient data structures, and memory management.
 */

import { promises as fs } from 'fs';
import { join, extname, basename, relative } from 'path';
import { ServiceDependencies } from '../agents/types';
import { LoggerFactory } from '../logger';
import type { ProjectFile, ProjectStructure, CodePattern } from './project-challenge-generator';

export interface MemoryOptimizedConfig {
  maxConcurrentFiles: number;
  bufferSize: number;
  chunkSize: number;
  enableStreaming: boolean;
  enableCompression: boolean;
  memoryThreshold: number;
  gcInterval: number;
}

export interface FileAnalysisChunk {
  files: ProjectFile[];
  patterns: CodePattern[];
  progress: number;
  totalFiles: number;
}

export interface MemoryStats {
  usedHeap: number;
  totalHeap: number;
  external: number;
  arrayBuffers: number;
  bufferUsage: number;
}

export interface LargeProjectConfig {
  enableSampling: boolean;
  sampleRate: number;
  maxFileSize: number;
  excludeLargeFiles: boolean;
  prioritizeKeyFiles: boolean;
}

export const DEFAULT_MEMORY_OPTIMIZED_CONFIG: MemoryOptimizedConfig = {
  maxConcurrentFiles: 100,
  bufferSize: 1024 * 1024, // 1MB
  chunkSize: 500,
  enableStreaming: true,
  enableCompression: true,
  memoryThreshold: 512 * 1024 * 1024, // 512MB
  gcInterval: 30 * 1000 // 30 seconds
};

export const DEFAULT_LARGE_PROJECT_CONFIG: LargeProjectConfig = {
  enableSampling: true,
  sampleRate: 0.1, // 10% sampling for large projects
  maxFileSize: 1024 * 1024, // 1MB per file
  excludeLargeFiles: true,
  prioritizeKeyFiles: true
};

/**
 * Memory-Optimized Workspace Analyzer
 */
export class MemoryOptimizedWorkspaceAnalyzer {
  private logger: any;
  private memoryConfig: MemoryOptimizedConfig;
  private largeProjectConfig: LargeProjectConfig;
  private gcInterval: NodeJS.Timeout | null = null;

  // Memory pools for object reuse
  private filePool: ProjectFile[] = [];
  private patternPool: CodePattern[] = [];

  // Streaming buffers
  private readBuffer: Buffer;
  private analysisBuffer: Buffer;

  // Memory monitoring
  private memoryHistory: MemoryStats[] = [];
  private memoryPeak = 0;

  constructor(
    dependencies: ServiceDependencies,
    memoryConfig: Partial<MemoryOptimizedConfig> = {},
    largeProjectConfig: Partial<LargeProjectConfig> = {}
  ) {
    this.logger = dependencies.logger;
    this.memoryConfig = { ...DEFAULT_MEMORY_OPTIMIZED_CONFIG, ...memoryConfig };
    this.largeProjectConfig = { ...DEFAULT_LARGE_PROJECT_CONFIG, ...largeProjectConfig };

    this.initializeBuffers();
    this.startMemoryMonitoring();

    this.logger.info('MemoryOptimizedWorkspaceAnalyzer initialized', {
      memoryConfig: this.memoryConfig,
      largeProjectConfig: this.largeProjectConfig
    });
  }

  /**
   * Initialize memory buffers
   */
  private initializeBuffers(): void {
    this.readBuffer = Buffer.alloc(this.memoryConfig.bufferSize);
    this.analysisBuffer = Buffer.alloc(this.memoryConfig.bufferSize);
  }

  /**
   * Start memory monitoring
   */
  private startMemoryMonitoring(): void {
    if (this.gcInterval) {
      clearInterval(this.gcInterval);
    }

    this.gcInterval = setInterval(() => {
      this.monitorMemory();
      this.performGarbageCollection();
    }, this.memoryConfig.gcInterval);
  }

  /**
   * Monitor memory usage
   */
  private monitorMemory(): void {
    const memUsage = process.memoryUsage();
    const stats: MemoryStats = {
      usedHeap: memUsage.heapUsed,
      totalHeap: memUsage.heapTotal,
      external: memUsage.external,
      arrayBuffers: memUsage.arrayBuffers,
      bufferUsage: this.readBuffer.length + this.analysisBuffer.length
    };

    this.memoryHistory.push(stats);
    if (this.memoryHistory.length > 100) {
      this.memoryHistory.shift();
    }

    this.memoryPeak = Math.max(this.memoryPeak, stats.usedHeap);

    // Trigger warnings if memory is high
    if (stats.usedHeap > this.memoryConfig.memoryThreshold) {
      this.logger.warn('High memory usage detected', {
        usedHeap: Math.round(stats.usedHeap / 1024 / 1024) + 'MB',
        threshold: Math.round(this.memoryConfig.memoryThreshold / 1024 / 1024) + 'MB'
      });

      // Force garbage collection
      this.performAggressiveCleanup();
    }
  }

  /**
   * Perform garbage collection
   */
  private performGarbageCollection(): void {
    // Clear object pools
    if (this.filePool.length > 100) {
      this.filePool.length = 100;
    }
    if (this.patternPool.length > 100) {
      this.patternPool.length = 100;
    }

    // Clear memory history
    if (this.memoryHistory.length > 50) {
      this.memoryHistory = this.memoryHistory.slice(-50);
    }

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
  }

  /**
   * Perform aggressive memory cleanup
   */
  private performAggressiveCleanup(): void {
    this.logger.info('Performing aggressive memory cleanup');

    // Clear all pools
    this.filePool.length = 0;
    this.patternPool.length = 0;

    // Clear caches
    this.memoryHistory.length = 0;

    // Force multiple garbage collections
    for (let i = 0; i < 3; i++) {
      if (global.gc) {
        global.gc();
      }
    }

    // Reset buffers
    this.readBuffer.fill(0);
    this.analysisBuffer.fill(0);
  }

  /**
   * Scan large workspace with memory optimization
   */
  async scanLargeWorkspace(rootPath: string): Promise<ProjectStructure> {
    this.logger.info('Starting large workspace scan', { rootPath });

    try {
      // First pass: Collect file paths (memory efficient)
      const filePaths = await this.collectFilePaths(rootPath);

      this.logger.info('File paths collected', {
        totalFiles: filePaths.length,
        memoryUsage: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB'
      });

      // Second pass: Analyze files in chunks
      const analysisResult = await this.analyzeFilesInChunks(filePaths, rootPath);

      // Build final structure
      const structure = this.buildOptimizedProjectStructure(
        analysisResult.files,
        analysisResult.patterns,
        rootPath
      );

      this.logger.info('Large workspace scan completed', {
        totalFiles: structure.files.length,
        patterns: structure.patterns.length,
        memoryPeak: Math.round(this.memoryPeak / 1024 / 1024) + 'MB'
      });

      return structure;

    } catch (error) {
      this.logger.error('Large workspace scan failed', error as Error);
      throw error;
    }
  }

  /**
   * Collect file paths efficiently
   */
  private async collectFilePaths(rootPath: string): Promise<string[]> {
    const filePaths: string[] = [];
    const excludePatterns = [
      'node_modules',
      '.git',
      'dist',
      'build',
      'coverage',
      '.vscode',
      '.idea',
      '*.log',
      '*.tmp'
    ];

    const includeExtensions = [
      '.js', '.jsx', '.ts', '.tsx', '.vue',
      '.py', '.java', '.cpp', '.c', '.h',
      '.go', '.rs', '.php', '.rb',
      '.json', '.yaml', '.yml', '.md'
    ];

    // Use streaming approach for large directories
    for await (const filePath of this.streamDirectory(rootPath, excludePatterns, includeExtensions)) {
      filePaths.push(filePath);

      // Check memory usage periodically
      if (filePaths.length % 1000 === 0) {
        this.monitorMemory();
      }
    }

    return filePaths;
  }

  /**
   * Stream directory contents
   */
  private async *streamDirectory(
    rootPath: string,
    excludePatterns: string[],
    includeExtensions: string[]
  ): AsyncGenerator<string> {
    try {
      const entries = await fs.readdir(rootPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(rootPath, entry.name);

        // Skip excluded patterns
        if (this.shouldExclude(fullPath, excludePatterns)) {
          continue;
        }

        if (entry.isDirectory()) {
          // Recursively stream subdirectories
          yield* this.streamDirectory(fullPath, excludePatterns, includeExtensions);
        } else if (entry.isFile()) {
          // Check extension
          const ext = extname(fullPath).toLowerCase();
          if (includeExtensions.includes(ext)) {
            yield fullPath;
          }
        }
      }
    } catch (error) {
      this.logger.warn(`Failed to read directory: ${rootPath}`, error);
    }
  }

  /**
   * Check if path should be excluded
   */
  private shouldExclude(filePath: string, excludePatterns: string[]): boolean {
    const normalizedPath = filePath.replace(/\\/g, '/');

    return excludePatterns.some(pattern => {
      const regexPattern = pattern
        .replace(/\*/g, '.*')
        .replace(/\?/g, '.');
      return new RegExp(regexPattern).test(normalizedPath);
    });
  }

  /**
   * Analyze files in chunks to manage memory
   */
  private async analyzeFilesInChunks(filePaths: string[], rootPath: string): Promise<{
    files: ProjectFile[];
    patterns: CodePattern[];
  }> {
    const files: ProjectFile[] = [];
    const patterns: CodePattern[] = [];
    const totalFiles = filePaths.length;

    // Determine sampling strategy
    const shouldSample = this.largeProjectConfig.enableSampling && totalFiles > 10000;
    const samplingRate = shouldSample ? this.largeProjectConfig.sampleRate : 1.0;

    let processedFiles = 0;

    // Process files in chunks
    for (let i = 0; i < filePaths.length; i += this.memoryConfig.chunkSize) {
      const chunk = filePaths.slice(i, i + this.memoryConfig.chunkSize);

      // Apply sampling if enabled
      const filesToProcess = shouldSample
        ? chunk.filter(() => Math.random() < samplingRate)
        : chunk;

      // Process chunk with concurrency control
      const chunkResults = await this.processChunkConcurrently(filesToProcess, rootPath);

      // Add results to collections
      files.push(...chunkResults.files);
      patterns.push(...chunkResults.patterns);

      processedFiles += chunk.length;

      // Memory management between chunks
      if (i % (this.memoryConfig.chunkSize * 2) === 0) {
        this.performGarbageCollection();
        this.monitorMemory();
      }

      // Report progress
      const progress = (processedFiles / totalFiles) * 100;
      if (progress % 10 === 0) { // Report every 10%
        this.logger.info(`Analysis progress: ${Math.round(progress)}%`, {
          processedFiles,
          totalFiles,
          memoryUsage: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB'
        });
      }
    }

    return { files, patterns };
  }

  /**
   * Process chunk of files concurrently with memory limits
   */
  private async processChunkConcurrently(
    filePaths: string[],
    rootPath: string
  ): Promise<{
    files: ProjectFile[];
    patterns: CodePattern[];
  }> {
    const files: ProjectFile[] = [];
    const patterns: CodePattern[] = [];

    // Create semaphore to control concurrency
    const semaphore = new Array(this.memoryConfig.maxConcurrentFiles).fill(null);
    const promises: Promise<void>[] = [];

    for (const filePath of filePaths) {
      const promise = this.processFileWithMemoryLimit(filePath, rootPath)
        .then(result => {
          if (result.file) {
            files.push(result.file);
          }
          if (result.patterns) {
            patterns.push(...result.patterns);
          }
        })
        .catch(error => {
          this.logger.warn(`Failed to process file: ${filePath}`, error);
        })
        .finally(() => {
          // Release semaphore slot
          semaphore.shift();
        });

      promises.push(promise);

      // Wait for available slot
      if (semaphore.length >= this.memoryConfig.maxConcurrentFiles) {
        await Promise.race(promises.filter(p => p !== promise));
      }
    }

    // Wait for all promises to complete
    await Promise.all(promises);

    return { files, patterns };
  }

  /**
   * Process single file with memory optimization
   */
  private async processFileWithMemoryLimit(
    filePath: string,
    rootPath: string
  ): Promise<{
    file: ProjectFile | null;
    patterns: CodePattern[];
  }> {
    try {
      // Get file stats first to check size
      const stats = await fs.stat(filePath);

      // Skip files that are too large
      if (this.largeProjectConfig.excludeLargeFiles &&
          stats.size > this.largeProjectConfig.maxFileSize) {
        return { file: null, patterns: [] };
      }

      // Read file with size limit
      const content = await this.readFileWithLimit(filePath, stats.size);
      const ext = extname(filePath);
      const name = basename(filePath);

      // Create file object (reuse from pool if available)
      const file = this.filePool.length > 0
        ? this.filePool.pop()!
        : {} as ProjectFile;

      // Populate file object
      Object.assign(file, {
        path: filePath,
        name,
        extension: ext,
        content,
        size: stats.size,
        lastModified: stats.mtime.getTime(),
        type: this.determineFileType(filePath, content),
        language: this.determineLanguage(ext, content),
        framework: this.detectFileFramework(filePath, content)
      });

      // Analyze for patterns (lightweight analysis)
      const patterns = this.extractLightweightPatterns(file);

      return { file, patterns };

    } catch (error) {
      this.logger.warn(`Failed to process file: ${filePath}`, error);
      return { file: null, patterns: [] };
    }
  }

  /**
   * Read file with size limit
   */
  private async readFileWithLimit(filePath: string, fileSize: number): Promise<string> {
    const maxSize = this.largeProjectConfig.maxFileSize;

    if (fileSize <= maxSize) {
      return await fs.readFile(filePath, 'utf-8');
    } else {
      // Read only first part of large file
      const fd = await fs.open(filePath, 'r');
      try {
        const buffer = Buffer.alloc(Math.min(maxSize, fileSize));
        const { bytesRead } = await fd.read(buffer, 0, buffer.length, 0);
        return buffer.toString('utf-8', 0, bytesRead);
      } finally {
        await fd.close();
      }
    }
  }

  /**
   * Extract lightweight patterns (memory efficient)
   */
  private extractLightweightPatterns(file: ProjectFile): CodePattern[] {
    const patterns: CodePattern[] = [];
    const content = file.content;
    const lines = content.split('\n');

    // Quick regex-based pattern extraction
    const patternMatchers = [
      {
        type: 'hook' as const,
        regex: /use[A-Z]\w*/g,
        complexity: 1
      },
      {
        type: 'function' as const,
        regex: /(?:function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?(?:function|\([^)]*\)\s*=>))/g,
        complexity: 2
      },
      {
        type: 'class' as const,
        regex: /class\s+(\w+)/g,
        complexity: 3
      }
    ];

    for (const matcher of patternMatchers) {
      let match;
      while ((match = matcher.regex.exec(content)) !== null) {
        const name = match[1] || match[2];
        if (name) {
          // Reuse pattern object from pool if available
          const pattern = this.patternPool.length > 0
            ? this.patternPool.pop()!
            : {} as CodePattern;

          Object.assign(pattern, {
            type: matcher.type,
            name,
            file: file.path,
            line: this.getLineNumber(content, match.index),
            content: this.extractLine(content, match.index),
            complexity: matcher.complexity,
            practices: [] // Skip practice generation for memory efficiency
          });

          patterns.push(pattern);
        }
      }
    }

    return patterns;
  }

  /**
   * Get line number from character index
   */
  private getLineNumber(content: string, index: number): number {
    return content.substring(0, index).split('\n').length;
  }

  /**
   * Extract line from content
   */
  private extractLine(content: string, index: number): string {
    const start = content.lastIndexOf('\n', index) + 1;
    const end = content.indexOf('\n', index);
    return content.substring(start, end > -1 ? end : content.length);
  }

  /**
   * Determine file type efficiently
   */
  private determineFileType(filePath: string, content: string): ProjectFile['type'] {
    const path = filePath.toLowerCase();
    const name = basename(filePath).toLowerCase();

    // Quick string checks instead of regex for performance
    if (name.includes('test') || name.includes('spec')) return 'test';
    if (name.includes('readme') || path.includes('docs')) return 'documentation';
    if (name.includes('config') || name.includes('setting')) return 'config';
    if (content.includes('export.*component') || path.includes('components')) return 'component';
    if (path.includes('utils') || path.includes('helpers')) return 'utility';

    return 'other';
  }

  /**
   * Determine language efficiently
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
   * Detect file framework efficiently
   */
  private detectFileFramework(filePath: string, content: string): string | undefined {
    const lowerContent = content.toLowerCase();

    // Quick string checks
    if (lowerContent.includes('react') || filePath.endsWith('.jsx') || filePath.endsWith('.tsx')) {
      return 'react';
    }
    if (filePath.endsWith('.vue')) return 'vue';
    if (lowerContent.includes('@angular')) return 'angular';
    if (lowerContent.includes('express')) return 'express';
    if (lowerContent.includes('fastapi') || lowerContent.includes('from fastapi')) return 'fastapi';
    if (lowerContent.includes('django') || lowerContent.includes('from django')) return 'django';

    return undefined;
  }

  /**
   * Build optimized project structure
   */
  private buildOptimizedProjectStructure(
    files: ProjectFile[],
    patterns: CodePattern[],
    rootPath: string
  ): ProjectStructure {
    // Extract dependencies efficiently
    const packageJsonFile = files.find(f => f.name === 'package.json');
    const dependencies: Record<string, string> = {};

    if (packageJsonFile) {
      try {
        const packageJson = JSON.parse(packageJsonFile.content);
        Object.assign(dependencies, packageJson.dependencies || {});
        Object.assign(dependencies, packageJson.devDependencies || {});
      } catch (error) {
        this.logger.warn('Failed to parse package.json', error);
      }
    }

    // Detect frameworks
    const frameworks = [...new Set(
      files
        .map(f => f.framework)
        .filter(Boolean)
    )];

    // Determine project type and complexity
    const projectType = this.determineProjectType(files, frameworks);
    const complexity = this.determineComplexity(files);

    return {
      name: basename(rootPath) || 'Large Project',
      type: projectType,
      rootPath,
      files: files.slice(0, 1000), // Limit to 1000 files for memory
      dependencies,
      frameworks,
      patterns: patterns.slice(0, 500), // Limit patterns
      complexity,
      score: this.calculateProjectScore(files, complexity)
    };
  }

  /**
   * Determine project type
   */
  private determineProjectType(files: ProjectFile[], frameworks: string[]): ProjectStructure['type'] {
    if (frameworks.includes('react') || frameworks.includes('vue') || frameworks.includes('angular')) {
      return 'react'; // Default to react for frontend
    }

    if (frameworks.includes('express') || frameworks.includes('fastapi') || frameworks.includes('django')) {
      return 'express'; // Default to express for backend
    }

    if (files.some(f => f.extension === '.py')) return 'python';
    if (files.some(f => f.extension === '.js' || f.extension === '.ts')) return 'node';

    return 'general';
  }

  /**
   * Determine project complexity
   */
  private determineComplexity(files: ProjectFile[]): 'simple' | 'moderate' | 'complex' {
    const totalFiles = files.length;
    const codeFiles = files.filter(f => f.type !== 'documentation' && f.type !== 'config').length;
    const avgFileSize = files.reduce((sum, f) => sum + f.size, 0) / files.length;

    if (totalFiles > 50000 || codeFiles > 20000 || avgFileSize > 50000) {
      return 'complex';
    } else if (totalFiles > 10000 || codeFiles > 5000 || avgFileSize > 20000) {
      return 'moderate';
    } else {
      return 'simple';
    }
  }

  /**
   * Calculate project score
   */
  private calculateProjectScore(files: ProjectFile[], complexity: string): number {
    let score = 0.5;

    // Add points for code files (capped)
    const codeFiles = files.filter(f => f.type === 'component' || f.type === 'utility');
    score += Math.min(0.3, Math.min(codeFiles.length / 100, 0.3));

    // Add points for complexity
    const complexityBonus = complexity === 'simple' ? 0.1 : complexity === 'moderate' ? 0.2 : 0.3;
    score += complexityBonus;

    // Add points for framework diversity
    const frameworks = new Set(files.map(f => f.framework).filter(Boolean));
    score += Math.min(0.1, frameworks.size * 0.02);

    return Math.min(1, score);
  }

  /**
   * Get memory statistics
   */
  getMemoryStats(): MemoryStats & {
    history: MemoryStats[];
    peak: number;
    thresholds: {
      current: number;
      max: number;
    };
  } {
    const currentUsage = process.memoryUsage();

    return {
      usedHeap: currentUsage.heapUsed,
      totalHeap: currentUsage.heapTotal,
      external: currentUsage.external,
      arrayBuffers: currentUsage.arrayBuffers,
      bufferUsage: this.readBuffer.length + this.analysisBuffer.length,
      history: [...this.memoryHistory],
      peak: this.memoryPeak,
      thresholds: {
        current: currentUsage.heapUsed,
        max: this.memoryConfig.memoryThreshold
      }
    };
  }

  /**
   * Configure memory optimization settings
   */
  configureMemoryOptimization(config: {
    maxConcurrentFiles?: number;
    memoryThreshold?: number;
    gcInterval?: number;
  }): void {
    if (config.maxConcurrentFiles !== undefined) {
      this.memoryConfig.maxConcurrentFiles = config.maxConcurrentFiles;
    }
    if (config.memoryThreshold !== undefined) {
      this.memoryConfig.memoryThreshold = config.memoryThreshold;
    }
    if (config.gcInterval !== undefined) {
      this.memoryConfig.gcInterval = config.gcInterval;
      this.startMemoryMonitoring(); // Restart with new interval
    }

    this.logger.info('Memory optimization configuration updated', config);
  }

  /**
   * Dispose of the service
   */
  dispose(): void {
    if (this.gcInterval) {
      clearInterval(this.gcInterval);
    }

    this.performAggressiveCleanup();

    // Clear buffers
    this.readBuffer = Buffer.alloc(0);
    this.analysisBuffer = Buffer.alloc(0);

    this.logger.info('MemoryOptimizedWorkspaceAnalyzer disposed');
  }
}

/**
 * Global memory-optimized workspace analyzer instance
 */
export const memoryOptimizedWorkspaceAnalyzer = new MemoryOptimizedWorkspaceAnalyzer({
  logger: LoggerFactory.getLogger('MemoryOptimizedWorkspaceAnalyzer')
});