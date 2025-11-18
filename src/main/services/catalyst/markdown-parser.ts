/**
 * Markdown Parser with LangChain Integration
 *
 * This module handles parsing of markdown content using LangChain document loaders
 * and text splitters optimized for educational content processing.
 */

import { Document } from '@langchain/core/documents';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import {
  LearningMaterial,
  LearningSection,
  ParsingJob,
  ParsingStage,
  ParsingResult,
  ParsingStatistics,
  ParsingError,
  ConceptEvidence,
  LangChainConfig
} from '@/shared/types/concept-parsing';

export interface MarkdownParseOptions {
  chunkSize?: number;
  chunkOverlap?: number;
  minChunkSize?: number;
  maxChunkSize?: number;
  preserveFormatting?: boolean;
  extractMetadata?: boolean;
  includeCodeBlocks?: boolean;
  sectionHeaders?: string[];
  customSeparators?: string[];
}

export interface ParsedSection {
  title: string;
  content: string;
  type: 'introduction' | 'concept' | 'example' | 'exercise' | 'summary' | 'other';
  level: number; // Header level (1-6)
  order: number;
  metadata: Record<string, any>;
  concepts: string[]; // To be filled by concept extraction
  estimatedTime: number;
  difficulty: number;
}

export class MarkdownParser {
  private textSplitter: RecursiveCharacterTextSplitter;
  private config: MarkdownParseOptions;

  constructor(config: MarkdownParseOptions = {}) {
    this.config = {
      chunkSize: config.chunkSize || 1000,
      chunkOverlap: config.chunkOverlap || 200,
      minChunkSize: config.minChunkSize || 200,
      maxChunkSize: config.maxChunkSize || 4000,
      preserveFormatting: config.preserveFormatting ?? true,
      extractMetadata: config.extractMetadata ?? true,
      includeCodeBlocks: config.includeCodeBlocks ?? true,
      sectionHeaders: config.sectionHeaders || [
        'introduction', 'overview', 'getting started',
        'concept', 'theory', 'background',
        'example', 'demo', 'illustration',
        'exercise', 'practice', 'lab',
        'summary', 'conclusion', 'recap'
      ],
      customSeparators: config.customSeparators || []
    };

    this.textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: this.config.chunkSize,
      chunkOverlap: this.config.chunkOverlap,
      separators: [
        '\n## ',  // H2 headers
        '\n### ', // H3 headers
        '\n#### ', // H4 headers
        '\n##### ', // H5 headers
        '\n###### ', // H6 headers
        '\n\n',   // Paragraph breaks
        '\n',     // Line breaks
        '. ',     // Sentence endings
        ' ',      // Words
        ''        // Characters
      ]
    });
  }

  /**
   * Parse markdown content into structured learning material
   */
  async parseMarkdown(
    content: string,
    materialId: string,
    title?: string
  ): Promise<{ material: LearningMaterial; sections: ParsedSection[] }> {
    try {
      const startTime = Date.now();

      // Clean and preprocess content
      const cleanedContent = this.preprocessContent(content);

      // Extract metadata from front matter
      const metadata = this.extractMetadata(cleanedContent);

      // Split content into sections based on headers
      const sections = await this.parseSections(cleanedContent);

      // Create documents for each section
      const documents = await this.createDocuments(sections);

      // Split documents into chunks for processing
      const chunkedDocs = await this.textSplitter.splitDocuments(documents);

      // Analyze sections for educational content
      const analyzedSections = await this.analyzeSections(sections, chunkedDocs);

      // Create learning material
      const material = await this.createLearningMaterial(
        materialId,
        title || metadata.title || 'Untitled Learning Material',
        cleanedContent,
        analyzedSections,
        metadata
      );

      const processingTime = Date.now() - startTime;

      return {
        material: {
          ...material,
          metadata: {
            ...material.metadata,
            processingTime,
            sectionCount: sections.length,
            chunkCount: chunkedDocs.length,
            parsedAt: new Date()
          }
        },
        sections: analyzedSections
      };
    } catch (error) {
      console.error('Error parsing markdown:', error);
      throw new Error(`Markdown parsing failed: ${(error as Error).message}`);
    }
  }

  /**
   * Preprocess markdown content for better parsing
   */
  private preprocessContent(content: string): string {
    let processed = content;

    // Normalize line endings
    processed = processed.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // Ensure proper spacing around headers
    processed = processed.replace(/([^\n])\n(#{1,6}\s)/g, '$1\n\n$2');
    processed = processed.replace(/(#{1,6}\s[^\n]+)\n([^#\n])/g, '$1\n\n$2');

    // Clean up excessive whitespace
    processed = processed.replace(/\n{3,}/g, '\n\n');

    // Preserve code blocks if configured
    if (!this.config.includeCodeBlocks) {
      processed = processed.replace(/```[\s\S]*?```/g, '[CODE_BLOCK]');
      processed = processed.replace(/`[^`]+`/g, '[INLINE_CODE]');
    }

    return processed.trim();
  }

  /**
   * Extract metadata from YAML front matter
   */
  private extractMetadata(content: string): Record<string, any> {
    const metadata: Record<string, any> = {};

    // Check for YAML front matter
    const frontMatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (frontMatterMatch) {
      try {
        // Simple YAML parsing (basic implementation)
        const yamlContent = frontMatterMatch[1];
        const lines = yamlContent.split('\n');

        for (const line of lines) {
          const match = line.match(/^(\w+):\s*(.+)$/);
          if (match) {
            const [, key, value] = match;
            // Try to parse as JSON, otherwise keep as string
            try {
              metadata[key] = JSON.parse(value);
            } catch {
              metadata[key] = value;
            }
          }
        }
      } catch (error) {
        console.warn('Failed to parse front matter:', error);
      }
    }

    // Extract title from first H1 if not in metadata
    if (!metadata.title) {
      const titleMatch = content.match(/^#\s+(.+)$/m);
      if (titleMatch) {
        metadata.title = titleMatch[1];
      }
    }

    // Estimate reading time
    const wordCount = content.split(/\s+/).length;
    metadata.readingTime = Math.ceil(wordCount / 200); // 200 words per minute

    return metadata;
  }

  /**
   * Parse markdown content into sections based on headers
   */
  private async parseSections(content: string): Promise<ParsedSection[]> {
    const sections: ParsedSection[] = [];
    const lines = content.split('\n');
    let currentSection: Partial<ParsedSection> | null = null;
    let sectionContent: string[] = [];
    let order = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);

      if (headerMatch) {
        // Save previous section if exists
        if (currentSection && sectionContent.length > 0) {
          sections.push({
            ...currentSection,
            content: sectionContent.join('\n').trim(),
            order: order++
          } as ParsedSection);
        }

        // Start new section
        const [, hashes, title] = headerMatch;
        const level = hashes.length;

        currentSection = {
          title: title.trim(),
          level,
          type: this.determineSectionType(title, level),
          order,
          metadata: {},
          concepts: [],
          estimatedTime: this.estimateSectionTime(title, level),
          difficulty: this.estimateSectionDifficulty(title, level)
        };

        sectionContent = [];
      } else if (currentSection) {
        sectionContent.push(line);
      }
    }

    // Add the last section
    if (currentSection && sectionContent.length > 0) {
      sections.push({
        ...currentSection,
        content: sectionContent.join('\n').trim(),
        order: order++
      } as ParsedSection);
    }

    return sections;
  }

  /**
   * Determine section type based on title and content
   */
  private determineSectionType(title: string, level: number): ParsedSection['type'] {
    const normalizedTitle = title.toLowerCase();

    // Check for explicit type indicators
    for (const header of this.config.sectionHeaders) {
      if (normalizedTitle.includes(header)) {
        if (header.includes('intro') || header.includes('overview')) return 'introduction';
        if (header.includes('concept') || header.includes('theory') || header.includes('background')) return 'concept';
        if (header.includes('example') || header.includes('demo') || header.includes('illustration')) return 'example';
        if (header.includes('exercise') || header.includes('practice') || header.includes('lab')) return 'exercise';
        if (header.includes('summary') || header.includes('conclusion') || header.includes('recap')) return 'summary';
      }
    }

    // Determine based on level and title patterns
    if (level === 1) return 'introduction';
    if (normalizedTitle.includes('how to') || normalizedTitle.includes('step') || normalizedTitle.includes('guide')) return 'example';
    if (normalizedTitle.includes('definition') || normalizedTitle.includes('what is')) return 'concept';
    if (normalizedTitle.includes('example') || normalizedTitle.includes('sample')) return 'example';

    return 'other';
  }

  /**
   * Estimate time required for section in minutes
   */
  private estimateSectionTime(title: string, level: number): number {
    const baseTime = {
      1: 5,   // H1 sections (intro/overview)
      2: 15,  // H2 sections (main topics)
      3: 10,  // H3 sections (subtopics)
      4: 8,   // H4 sections (details)
      5: 5,   // H5 sections (specifics)
      6: 3    // H6 sections (minor points)
    };

    let time = baseTime[level as keyof typeof baseTime] || 5;

    // Adjust based on title keywords
    const normalizedTitle = title.toLowerCase();
    if (normalizedTitle.includes('exercise') || normalizedTitle.includes('practice')) time *= 2;
    if (normalizedTitle.includes('example') || normalizedTitle.includes('demo')) time *= 1.5;
    if (normalizedTitle.includes('summary') || normalizedTitle.includes('conclusion')) time *= 0.7;

    return Math.round(time);
  }

  /**
   * Estimate section difficulty based on title and level
   */
  private estimateSectionDifficulty(title: string, level: number): number {
    let difficulty = Math.min(5, Math.max(1, level));

    const normalizedTitle = title.toLowerCase();

    // Adjust difficulty based on keywords
    if (normalizedTitle.includes('introduction') || normalizedTitle.includes('basic')) difficulty = Math.max(1, difficulty - 1);
    if (normalizedTitle.includes('advanced') || normalizedTitle.includes('complex')) difficulty = Math.min(5, difficulty + 1);
    if (normalizedTitle.includes('expert') || normalizedTitle.includes('master')) difficulty = 5;
    if (normalizedTitle.includes('quick') || normalizedTitle.includes('easy')) difficulty = 1;

    return difficulty;
  }

  /**
   * Create LangChain documents from parsed sections
   */
  private async createDocuments(sections: ParsedSection[]): Promise<Document[]> {
    const documents: Document[] = [];

    for (const section of sections) {
      const document = new Document({
        pageContent: section.content,
        metadata: {
          sectionTitle: section.title,
          sectionType: section.type,
          sectionLevel: section.level,
          sectionOrder: section.order,
          estimatedTime: section.estimatedTime,
          difficulty: section.difficulty,
          ...section.metadata
        }
      });

      documents.push(document);
    }

    return documents;
  }

  /**
   * Analyze sections for additional educational content insights
   */
  private async analyzeSections(
    sections: ParsedSection[],
    chunkedDocs: Document[]
  ): Promise<ParsedSection[]> {
    const analyzedSections = [...sections];

    for (let i = 0; i < analyzedSections.length; i++) {
      const section = analyzedSections[i];

      // Find related chunks for this section
      const sectionChunks = chunkedDocs.filter(
        doc => doc.metadata.sectionTitle === section.title
      );

      // Count code blocks, examples, and exercises
      const codeBlockCount = (section.content.match(/```[\s\S]*?```/g) || []).length;
      const exampleCount = (section.content.toLowerCase().match(/\bexample\b/g) || []).length;
      const exerciseCount = (section.content.toLowerCase().match(/\bexercise\b/g) || []).length;

      // Update section metadata
      section.metadata = {
        ...section.metadata,
        codeBlockCount,
        exampleCount,
        exerciseCount,
        chunkCount: sectionChunks.length,
        wordCount: section.content.split(/\s+/).length
      };

      // Adjust estimated time based on content
      if (codeBlockCount > 0) section.estimatedTime += codeBlockCount * 3;
      if (exerciseCount > 0) section.estimatedTime += exerciseCount * 10;
      if (exampleCount > 0) section.estimatedTime += exampleCount * 2;

      // Refine section type based on content analysis
      if (exerciseCount > 0 && section.type !== 'exercise') {
        section.type = 'exercise';
      } else if (exampleCount > 2 && section.type === 'other') {
        section.type = 'example';
      } else if (codeBlockCount > 0 && section.type === 'other') {
        section.type = 'concept'; // Technical concept
      }
    }

    return analyzedSections;
  }

  /**
   * Create learning material from parsed sections
   */
  private async createLearningMaterial(
    materialId: string,
    title: string,
    content: string,
    sections: ParsedSection[],
    metadata: Record<string, any>
  ): Promise<LearningMaterial> {
    // Convert sections to learning sections
    const learningSections: LearningSection[] = sections.map((section, index) => ({
      id: `section_${materialId}_${index}`,
      title: section.title,
      content: section.content,
      type: section.type === 'other' ? 'concept' : section.type, // Map 'other' to 'concept'
      order: section.order,
      concepts: [], // Will be filled by concept extraction
      prerequisites: [], // Will be determined by relationship extraction
      estimatedTime: section.estimatedTime,
      metadata: section.metadata
    }));

    // Calculate overall metrics
    const totalEstimatedTime = sections.reduce((sum, section) => sum + section.estimatedTime, 0);
    const averageDifficulty = sections.reduce((sum, section) => sum + section.difficulty, 0) / sections.length;

    // Extract tags from metadata and content
    const tags = this.extractTags(content, metadata);

    return {
      id: materialId,
      title,
      type: 'markdown',
      content,
      sections: learningSections,
      concepts: [], // Will be filled by concept extraction
      learningPath: {
        id: `path_${materialId}`,
        title: `${title} - Learning Path`,
        description: `Learning path for ${title}`,
        estimatedDuration: totalEstimatedTime,
        difficulty: Math.round(averageDifficulty),
        modules: [], // Will be created from sections
        prerequisites: [],
        targetMastery: 4,
        adaptations: [],
        progress: {
          userId: '',
          currentModule: '',
          completedModules: [],
          currentConcept: '',
          masteredConcepts: [],
          timeSpent: 0,
          assessmentScores: [],
          lastAccess: new Date(),
          completionRate: 0,
          masteryLevel: 0
        }
      },
      assessments: [], // Will be generated
      estimatedDuration: totalEstimatedTime,
      difficultyLevel: Math.round(averageDifficulty),
      tags,
      metadata: {
        ...metadata,
        sectionCount: sections.length,
        wordCount: content.split(/\s+/).length,
        parsedAt: new Date()
      },
      processedAt: new Date()
    };
  }

  /**
   * Extract tags from content and metadata
   */
  private extractTags(content: string, metadata: Record<string, any>): string[] {
    const tags = new Set<string>();

    // Add tags from metadata
    if (metadata.tags) {
      if (Array.isArray(metadata.tags)) {
        metadata.tags.forEach((tag: string) => tags.add(tag));
      } else if (typeof metadata.tags === 'string') {
        tags.add(metadata.tags);
      }
    }

    // Extract common programming languages and technologies
    const techKeywords = [
      'javascript', 'typescript', 'react', 'vue', 'angular', 'node',
      'python', 'java', 'cpp', 'c#', 'php', 'ruby', 'go', 'rust',
      'html', 'css', 'sql', 'nosql', 'mongodb', 'postgresql',
      'ai', 'machine learning', 'deep learning', 'nlp',
      'web development', 'mobile', 'desktop', 'backend', 'frontend'
    ];

    const contentLower = content.toLowerCase();
    techKeywords.forEach(tech => {
      if (contentLower.includes(tech)) {
        tags.add(tech);
      }
    });

    // Extract common learning level indicators
    if (contentLower.includes('beginner') || contentLower.includes('intro')) tags.add('beginner');
    if (contentLower.includes('intermediate')) tags.add('intermediate');
    if (contentLower.includes('advanced')) tags.add('advanced');
    if (contentLower.includes('tutorial')) tags.add('tutorial');
    if (contentLower.includes('guide')) tags.add('guide');
    if (contentLower.includes('reference')) tags.add('reference');

    return Array.from(tags);
  }

  /**
   * Parse a markdown file from disk
   */
  async parseMarkdownFile(filePath: string, title?: string): Promise<{ material: LearningMaterial; sections: ParsedSection[] }> {
    // TODO: Implement file reading from filesystem
    // This should include:
    // 1. Read file content from disk using Node.js fs module
    // 2. Handle different file encodings (UTF-8, etc.)
    // 3. Support for relative and absolute file paths
    // 4. Error handling for missing files or permissions
    // 5. Support for additional file formats (txt, md)
    try {
      const fs = await import('fs/promises');
      const content = await fs.readFile(filePath, 'utf-8');
      const materialId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      return await this.parseMarkdown(content, materialId, title || filePath);
    } catch (error) {
      console.error('Error parsing markdown file:', error);
      throw new Error(`Failed to read or parse file "${filePath}": ${(error as Error).message}`);
    }
  }

  /**
   * Create a parsing job for async processing
   */
  createParsingJob(materialId: string, content: string, title?: string): ParsingJob {
    return {
      id: `job_${materialId}_${Date.now()}`,
      materialId,
      status: 'pending',
      progress: 0,
      stages: [
        {
          name: 'preprocessing',
          status: 'pending',
          progress: 0
        },
        {
          name: 'section_parsing',
          status: 'pending',
          progress: 0
        },
        {
          name: 'document_creation',
          status: 'pending',
          progress: 0
        },
        {
          name: 'content_analysis',
          status: 'pending',
          progress: 0
        },
        {
          name: 'material_creation',
          status: 'pending',
          progress: 0
        }
      ]
    };
  }

  /**
   * Get parser configuration
   */
  getConfig(): MarkdownParseOptions {
    return { ...this.config };
  }

  /**
   * Update parser configuration
   */
  updateConfig(newConfig: Partial<MarkdownParseOptions>): void {
    this.config = { ...this.config, ...newConfig };

    // Recreate text splitter with new settings
    this.textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: this.config.chunkSize,
      chunkOverlap: this.config.chunkOverlap,
      separators: [
        '\n## ',
        '\n### ',
        '\n#### ',
        '\n##### ',
        '\n###### ',
        '\n\n',
        '\n',
        '. ',
        ' ',
        ''
      ]
    });
  }
}

export default MarkdownParser;