/**
 * Rule-Based Pattern Matching for Concept Extraction
 *
 * This module uses predefined patterns and rules to extract concepts from educational content.
 * It serves as a complement to AI-based extraction, providing deterministic results for
 * common patterns and reducing AI processing costs.
 */

import {
  Concept,
  ConceptEvidence,
  ProposedRelationship,
  RuleConfig,
  ConceptMetadata
} from '@/shared/types/concept-parsing';

export interface ExtractionRule {
  id: string;
  name: string;
  description: string;
  pattern: RegExp | string;
  type: 'concept' | 'relationship' | 'metadata' | 'difficulty';
  confidence: number;
  enabled: boolean;
  priority: number;
  category: string;
  examples?: string[];
  action: RuleAction;
}

export interface RuleAction {
  extract: string; // What to extract (group index, named group, etc.)
  transform?: (match: RegExpMatchArray, context: ExtractionContext) => any;
  validate?: (result: any, context: ExtractionContext) => boolean;
  metadata?: Record<string, any>;
}

export interface ExtractionContext {
  content: string;
  position: number;
  line: number;
  section?: string;
  sectionType?: string;
  previousMatches: ConceptMatch[];
  totalMatches: number;
}

export interface ConceptMatch {
  concept: Partial<Concept>;
  rule: ExtractionRule;
  position: number;
  context: string;
  confidence: number;
  evidence: ConceptEvidence;
}

export interface RelationshipMatch {
  relationship: Partial<ProposedRelationship>;
  rule: ExtractionRule;
  position: number;
  context: string;
  confidence: number;
}

export interface RuleExtractionResult {
  concepts: Concept[];
  relationships: ProposedRelationship[];
  metadata: Record<string, any>;
  ruleUsage: Record<string, number>;
  processingTime: number;
  errors: string[];
}

export class RuleBasedExtractor {
  private readonly rules: Map<string, ExtractionRule> = new Map();
  private conceptRules: ExtractionRule[] = [];
  private relationshipRules: ExtractionRule[] = [];
  private metadataRules: ExtractionRule[] = [];
  private difficultyRules: ExtractionRule[] = [];

  constructor(customRules?: ExtractionRule[]) {
    this.initializeDefaultRules();

    if (customRules) {
      this.addRules(customRules);
    }
  }

  /**
   * Extract concepts and relationships from content using rules
   */
  async extractFromContent(
    content: string,
    context?: Partial<ExtractionContext>
  ): Promise<RuleExtractionResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    const ruleUsage: Record<string, number> = {};
    const conceptMatches: ConceptMatch[] = [];
    const relationshipMatches: RelationshipMatch[] = [];
    const extractedMetadata: Record<string, any> = {};

    try {
      const lines = content.split('\n');
      let currentSection = '';
      let currentSectionType = '';
      let currentPosition = 0;

      // Process content line by line
      for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
        const line = lines[lineIndex];
        const lineStart = currentPosition;
        const lineEnd = currentPosition + line.length;

        // Check for section headers
        const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
        if (headerMatch) {
          currentSection = headerMatch[2];
          currentSectionType = this.inferSectionType(headerMatch[2], headerMatch[1].length);
        }

        // Create context for this line
        const lineContext: ExtractionContext = {
          content,
          position: currentPosition,
          line: lineIndex + 1,
          section: currentSection,
          sectionType: currentSectionType,
          previousMatches: [...conceptMatches],
          totalMatches: conceptMatches.length,
          ...context
        };

        // Apply concept rules
        const conceptResults = this.applyRules(this.conceptRules, line, lineContext);
        conceptMatches.push(...conceptResults);

        // Apply relationship rules
        const relationshipResults = this.applyRelationshipRules(this.relationshipRules, line, lineContext);
        relationshipMatches.push(...relationshipResults);

        // Apply metadata rules
        const metadataResults = this.applyMetadataRules(this.metadataRules, line, lineContext);
        Object.assign(extractedMetadata, metadataResults);

        // Apply difficulty rules to existing concepts
        this.applyDifficultyRules(this.difficultyRules, line, lineContext, conceptMatches);

        currentPosition = lineEnd + 1; // +1 for newline
      }

      // Convert matches to final concepts and relationships
      const concepts = this.consolidateConcepts(conceptMatches, ruleUsage);
      const relationships = this.consolidateRelationships(relationshipMatches, ruleUsage);

      // Add extracted metadata to concepts
      this.enrichConceptsWithMetadata(concepts, extractedMetadata);

      return {
        concepts,
        relationships,
        metadata: extractedMetadata,
        ruleUsage,
        processingTime: Date.now() - startTime,
        errors
      };
    } catch (error) {
      console.error('Rule-based extraction failed:', error);
      errors.push(`Rule extraction failed: ${(error as Error).message}`);

      return {
        concepts: [],
        relationships: [],
        metadata: {},
        ruleUsage,
        processingTime: Date.now() - startTime,
        errors
      };
    }
  }

  /**
   * Apply concept extraction rules to a line of text
   */
  private applyRules(
    rules: ExtractionRule[],
    text: string,
    context: ExtractionContext
  ): ConceptMatch[] {
    const matches: ConceptMatch[] = [];

    // Sort rules by priority (higher priority first)
    const sortedRules = [...rules].sort((a, b) => b.priority - a.priority);

    for (const rule of sortedRules) {
      if (!rule.enabled) continue;

      try {
        const ruleMatches = this.applyRule(rule, text, context);
        matches.push(...ruleMatches);
      } catch (error) {
        console.warn(`Rule ${rule.name} failed:`, error);
      }
    }

    return matches;
  }

  /**
   * Apply a single extraction rule
   */
  private applyRule(
    rule: ExtractionRule,
    text: string,
    context: ExtractionContext
  ): ConceptMatch[] {
    const matches: ConceptMatch[] = [];

    if (rule.pattern instanceof RegExp) {
      let match;
      const regex = new RegExp(rule.pattern.source, rule.pattern.flags + 'g');

      while ((match = regex.exec(text)) !== null) {
        const concept = this.extractConceptFromMatch(rule, match, context);
        if (concept && this.validateConcept(concept, rule, context)) {
          const evidence = this.createEvidence(match, text, rule, context);

          matches.push({
            concept,
            rule,
            position: match.index + context.position,
            context: this.getContextAroundMatch(text, match.index, match[0].length),
            confidence: this.calculateRuleConfidence(rule, match, context),
            evidence
          });
        }
      }
    } else if (typeof rule.pattern === 'string') {
      const index = text.toLowerCase().indexOf(rule.pattern.toLowerCase());
      if (index !== -1) {
        const match = [text.substring(index, index + rule.pattern.length)] as RegExpMatchArray;
        match.index = index;
        match.input = text;

        const concept = this.extractConceptFromMatch(rule, match, context);
        if (concept && this.validateConcept(concept, rule, context)) {
          const evidence = this.createEvidence(match, text, rule, context);

          matches.push({
            concept,
            rule,
            position: index + context.position,
            context: this.getContextAroundMatch(text, index, rule.pattern.length),
            confidence: this.calculateRuleConfidence(rule, match, context),
            evidence
          });
        }
      }
    }

    return matches;
  }

  /**
   * Extract concept data from a rule match
   */
  private extractConceptFromMatch(
    rule: ExtractionRule,
    match: RegExpMatchArray,
    context: ExtractionContext
  ): Partial<Concept> | null {
    try {
      let extractedValue: string;

      if (rule.action.extract.startsWith('$')) {
        // Regex group reference
        const groupIndex = parseInt(rule.action.extract.substring(1));
        extractedValue = match[groupIndex] || match[0];
      } else if (rule.action.extract.startsWith('?')) {
        // Named group reference
        const groupName = rule.action.extract.substring(1);
        extractedValue = (match as any)[groupName] || match[0];
      } else {
        // Literal or custom extraction
        extractedValue = rule.action.extract === '$0' ? match[0] : rule.action.extract;
      }

      // Apply transformation function if provided
      let conceptData: Partial<Concept> = {
        name: extractedValue.trim(),
        type: this.inferConceptType(extractedValue, context),
        difficulty: this.inferDifficulty(extractedValue, context),
        confidence: rule.confidence
      };

      if (rule.action.transform) {
        conceptData = { ...conceptData, ...rule.action.transform(match, context) };
      }

      return conceptData;
    } catch (error) {
      console.warn(`Failed to extract concept from rule ${rule.name}:`, error);
      return null;
    }
  }

  /**
   * Validate extracted concept
   */
  private validateConcept(
    concept: Partial<Concept>,
    rule: ExtractionRule,
    context: ExtractionContext
  ): boolean {
    // Basic validation
    if (!concept.name || concept.name.trim().length === 0) return false;
    if (concept.name.length > 100) return false; // Too long to be a valid concept

    // Skip common non-concept patterns
    const excludePatterns = [
      /^(the|a|an|this|that|these|those)\s+/i,
      /^(here|there|now|then)\s+/i,
      /^(however|therefore|moreover|furthermore|consequently)$/i,
      /^[0-9]+(\.[0-9]+)?$/, // Pure numbers
      /^[^\w\s]$/ // Single symbols
    ];

    for (const pattern of excludePatterns) {
      if (pattern.test(concept.name)) return false;
    }

    // Check for duplicates in previous matches
    const isDuplicate = context.previousMatches.some(
      prev => prev.concept.name?.toLowerCase() === concept.name?.toLowerCase()
    );

    if (isDuplicate && rule.priority < 8) { // Allow high-priority rules to override
      return false;
    }

    // Apply custom validation if provided
    if (rule.action.validate) {
      return rule.action.validate(concept, context);
    }

    return true;
  }

  /**
   * Create evidence for a concept match
   */
  private createEvidence(
    match: RegExpMatchArray,
    text: string,
    rule: ExtractionRule,
    context: ExtractionContext
  ): ConceptEvidence {
    const matchText = match[0];
    const matchStart = match.index || 0;
    const matchEnd = matchStart + matchText.length;

    return {
      text: matchText,
      context: this.getContextAroundMatch(text, matchStart, matchText.length),
      position: {
        start: matchStart + context.position,
        end: matchEnd + context.position,
        line: context.line
      },
      confidence: rule.confidence,
      sourceType: 'rule',
      modelId: rule.id
    };
  }

  /**
   * Get context around a match
   */
  private getContextAroundMatch(text: string, matchStart: number, matchLength: number, contextSize = 100): string {
    const start = Math.max(0, matchStart - contextSize);
    const end = Math.min(text.length, matchStart + matchLength + contextSize);

    let context = text.substring(start, end);

    if (start > 0) context = '...' + context;
    if (end < text.length) context = context + '...';

    return context;
  }

  /**
   * Apply relationship extraction rules
   */
  private applyRelationshipRules(
    rules: ExtractionRule[],
    text: string,
    context: ExtractionContext
  ): RelationshipMatch[] {
    const matches: RelationshipMatch[] = [];

    for (const rule of rules) {
      if (!rule.enabled) continue;

      try {
        let match;
        const regex = new RegExp(rule.pattern.source, rule.pattern.flags + 'g');

        while ((match = regex.exec(text)) !== null) {
          const relationship = this.extractRelationshipFromMatch(rule, match, context);
          if (relationship) {
            matches.push({
              relationship,
              rule,
              position: (match.index || 0) + context.position,
              context: this.getContextAroundMatch(text, match.index || 0, match[0].length),
              confidence: rule.confidence
            });
          }
        }
      } catch (error) {
        console.warn(`Relationship rule ${rule.name} failed:`, error);
      }
    }

    return matches;
  }

  /**
   * Extract relationship from match
   */
  private extractRelationshipFromMatch(
    rule: ExtractionRule,
    match: RegExpMatchArray,
    context: ExtractionContext
  ): Partial<ProposedRelationship> | null {
    try {
      const relationship: Partial<ProposedRelationship> = {
        type: 'related',
        strength: rule.confidence,
        confidence: rule.confidence
      };

      if (rule.action.transform) {
        Object.assign(relationship, rule.action.transform(match, context));
      }

      return relationship;
    } catch (error) {
      console.warn(`Failed to extract relationship from rule ${rule.name}:`, error);
      return null;
    }
  }

  /**
   * Apply metadata extraction rules
   */
  private applyMetadataRules(
    rules: ExtractionRule[],
    text: string,
    context: ExtractionContext
  ): Record<string, any> {
    const metadata: Record<string, any> = {};

    for (const rule of rules) {
      if (!rule.enabled) continue;

      try {
        let match;
        const regex = new RegExp(rule.pattern.source, rule.pattern.flags + 'g');

        while ((match = regex.exec(text)) !== null) {
          const key = rule.action.extract;
          let value = match[1] || match[0];

          if (rule.action.transform) {
            value = rule.action.transform(match, context);
          }

          // Convert common metadata types
          if (key === 'difficulty') {
            value = parseInt(value) || 3;
          } else if (key === 'time') {
            value = this.parseTimeValue(value);
          } else if (key === 'tags') {
            value = Array.isArray(value) ? value : [value];
          }

          metadata[key] = value;
        }
      } catch (error) {
        console.warn(`Metadata rule ${rule.name} failed:`, error);
      }
    }

    return metadata;
  }

  /**
   * Apply difficulty estimation rules to existing concepts
   */
  private applyDifficultyRules(
    rules: ExtractionRule[],
    text: string,
    context: ExtractionContext,
    conceptMatches: ConceptMatch[]
  ): void {
    for (const match of conceptMatches) {
      for (const rule of rules) {
        if (!rule.enabled) continue;

        try {
          if (rule.pattern.test(match.concept.name || '')) {
            const newDifficulty = rule.action.extract === 'auto'
              ? this.inferDifficulty(match.concept.name || '', context)
              : parseInt(rule.action.extract);

            if (newDifficulty >= 1 && newDifficulty <= 5) {
              match.concept.difficulty = newDifficulty as Concept['difficulty'];
              match.confidence = Math.max(match.confidence, rule.confidence);
            }
          }
        } catch (error) {
          console.warn(`Difficulty rule ${rule.name} failed:`, error);
        }
      }
    }
  }

  /**
   * Consolidate concept matches into final concepts
   */
  private consolidateConcepts(
    matches: ConceptMatch[],
    ruleUsage: Record<string, number>
  ): Concept[] {
    const conceptMap = new Map<string, Concept>();

    for (const match of matches) {
      const name = match.concept.name?.trim().toLowerCase();
      if (!name) continue;

      // Track rule usage
      ruleUsage[match.rule.id] = (ruleUsage[match.rule.id] || 0) + 1;

      const existing = conceptMap.get(name);
      if (!existing) {
        // Create new concept
        const concept: Concept = {
          id: `concept_rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: match.concept.name || '',
          type: match.concept.type as Concept['type'] || 'topic',
          difficulty: match.concept.difficulty as Concept['difficulty'] || 3,
          confidence: match.confidence,
          evidence: [match.evidence],
          relationships: [],
          metadata: {
            extractionMethod: 'rule',
            extractedBy: [match.rule.id],
            validationScore: match.confidence,
            tags: [],
            learningObjectives: [],
            prerequisites: [],
            relatedTopics: [],
            difficulty: match.concept.difficulty || 3
          },
          extractedAt: new Date()
        };

        conceptMap.set(name, concept);
      } else {
        // Merge with existing concept
        existing.evidence.push(match.evidence);
        existing.confidence = Math.max(existing.confidence, match.confidence);

        if (match.concept.type && match.confidence > 0.8) {
          existing.type = match.concept.type as Concept['type'];
        }

        if (match.concept.difficulty && match.confidence > existing.confidence) {
          existing.difficulty = match.concept.difficulty as Concept['difficulty'];
          existing.metadata!.difficulty = match.concept.difficulty;
        }

        if (!existing.metadata!.extractedBy.includes(match.rule.id)) {
          existing.metadata!.extractedBy.push(match.rule.id);
        }
      }
    }

    return Array.from(conceptMap.values());
  }

  /**
   * Consolidate relationship matches
   */
  private consolidateRelationships(
    matches: RelationshipMatch[],
    ruleUsage: Record<string, number>
  ): ProposedRelationship[] {
    const relationshipMap = new Map<string, ProposedRelationship>();

    for (const match of matches) {
      const key = `${match.relationship.targetConceptName}-${match.relationship.type}`;
      ruleUsage[match.rule.id] = (ruleUsage[match.rule.id] || 0) + 1;

      const existing = relationshipMap.get(key);
      if (!existing) {
        const relationship: ProposedRelationship = {
          targetConceptName: match.relationship.targetConceptName,
          type: match.relationship.type as ProposedRelationship['type'],
          strength: match.relationship.strength || 0.5,
          confidence: match.confidence,
          description: match.relationship.description,
          evidence: []
        };

        relationshipMap.set(key, relationship);
      } else {
        existing.confidence = Math.max(existing.confidence, match.confidence);
        existing.strength = Math.max(existing.strength, match.relationship.strength || 0.5);
      }
    }

    return Array.from(relationshipMap.values());
  }

  /**
   * Enrich concepts with extracted metadata
   */
  private enrichConceptsWithMetadata(
    concepts: Concept[],
    metadata: Record<string, any>
  ): void {
    for (const concept of concepts) {
      // Add global metadata to individual concepts
      if (metadata.tags && Array.isArray(metadata.tags)) {
        concept.metadata!.tags.push(...metadata.tags);
      }

      if (metadata.domain) {
        concept.metadata!.domain = metadata.domain;
      }

      if (metadata.language) {
        concept.metadata!.language = metadata.language;
      }
    }
  }

  /**
   * Infer concept type from name and context
   */
  private inferConceptType(name: string, context: ExtractionContext): Concept['type'] {
    const nameLower = name.toLowerCase();

    // Skill indicators
    const skillPatterns = [
      /^(how to|learn|master|implement|create|build|develop|write|use|apply)/i,
      /^(using|working with|handling|managing|operating)/i,
      /(programming|coding|development|implementation|technique|method|approach)$/i
    ];

    for (const pattern of skillPatterns) {
      if (pattern.test(name)) return 'skill';
    }

    // Procedure indicators
    const procedurePatterns = [
      /^(step|process|procedure|algorithm|workflow|guide|tutorial)/i,
      /^(first|second|third|next|then|finally)/i,
      /\b(steps|instructions|directions)\b/i
    ];

    for (const pattern of procedurePatterns) {
      if (pattern.test(name)) return 'procedure';
    }

    // Principle indicators
    const principlePatterns = [
      /^(principle|rule|law|theorem|concept|theory|model|paradigm)/i,
      /^(best practice|guideline|standard|convention)/i
    ];

    for (const pattern of principlePatterns) {
      if (pattern.test(name)) return 'principle';
    }

    // Fact indicators
    const factPatterns = [
      /^(definition|what is|meaning of)/i,
      /^(fact|information|data|statistic|figure)/i
    ];

    for (const pattern of factPatterns) {
      if (pattern.test(name)) return 'fact';
    }

    // Default to topic
    return 'topic';
  }

  /**
   * Infer difficulty from name and context
   */
  private inferDifficulty(name: string, context: ExtractionContext): Concept['difficulty'] {
    const nameLower = name.toLowerCase();
    let difficulty = 3; // Default medium

    // Easy indicators
    const easyPatterns = [
      /\b(introduction|basic|beginner|getting started|fundamentals|essentials)\b/i,
      /\b(simple|easy|quick|overview|summary)\b/i,
      /^(hello world|first step|basic concept)\b/i
    ];

    for (const pattern of easyPatterns) {
      if (pattern.test(name)) {
        difficulty = Math.min(difficulty, 1);
        break;
      }
    }

    // Advanced indicators
    const advancedPatterns = [
      /\b(advanced|expert|master|complex|sophisticated)\b/i,
      /\b(deep dive|comprehensive|in-depth|thorough)\b/i,
      /\b(architecture|patterns|optimization|performance)\b/i
    ];

    for (const pattern of advancedPatterns) {
      if (pattern.test(name)) {
        difficulty = Math.max(difficulty, 4);
        break;
      }
    }

    // Expert indicators
    const expertPatterns = [
      /\b(expert level|mastery|professional|enterprise)\b/i,
      /\b(internals|advanced topics|specialized)\b/i
    ];

    for (const pattern of expertPatterns) {
      if (pattern.test(name)) {
        difficulty = 5;
        break;
      }
    }

    // Adjust based on section type
    if (context.sectionType === 'introduction') {
      difficulty = Math.min(difficulty, 2);
    } else if (context.sectionType === 'exercise') {
      difficulty = Math.max(difficulty, 3);
    }

    return difficulty as Concept['difficulty'];
  }

  /**
   * Infer section type from header
   */
  private inferSectionType(title: string, level: number): string {
    const titleLower = title.toLowerCase();

    if (titleLower.includes('introduction') || titleLower.includes('overview')) return 'introduction';
    if (titleLower.includes('concept') || titleLower.includes('theory')) return 'concept';
    if (titleLower.includes('example') || titleLower.includes('demo')) return 'example';
    if (titleLower.includes('exercise') || titleLower.includes('practice')) return 'exercise';
    if (titleLower.includes('summary') || titleLower.includes('conclusion')) return 'summary';

    return 'other';
  }

  /**
   * Parse time value from text
   */
  private parseTimeValue(value: string): number {
    const match = value.match(/(\d+)\s*(minute|hour|hr|min)s?/i);
    if (!match) return 0;

    const [, number, unit] = match;
    const time = parseInt(number);

    return unit.toLowerCase().startsWith('h') ? time * 60 : time;
  }

  /**
   * Calculate rule confidence based on context
   */
  private calculateRuleConfidence(
    rule: ExtractionRule,
    match: RegExpMatchArray,
    context: ExtractionContext
  ): number {
    let confidence = rule.confidence;

    // Boost confidence for exact matches
    if (match[0] === match.input) {
      confidence += 0.1;
    }

    // Adjust based on context
    if (context.sectionType === 'concept' || context.sectionType === 'introduction') {
      confidence += 0.1;
    }

    // Reduce confidence for very short or very long matches
    const matchLength = match[0].length;
    if (matchLength < 3 || matchLength > 50) {
      confidence -= 0.1;
    }

    return Math.max(0.1, Math.min(1.0, confidence));
  }

  /**
   * Initialize default extraction rules
   */
  private initializeDefaultRules(): void {
    const defaultRules: ExtractionRule[] = [
      // Header-based concept extraction
      {
        id: 'header_concepts',
        name: 'Header Concepts',
        description: 'Extract concepts from markdown headers',
        pattern: /^(#{1,6})\s+(.+)$/gm,
        type: 'concept',
        confidence: 0.9,
        enabled: true,
        priority: 9,
        category: 'structure',
        action: {
          extract: '$2',
          transform: (match, context) => ({
            type: context.sectionType === 'introduction' ? 'topic' : 'concept'
          })
        }
      },

      // Bold/italic concept extraction
      {
        id: 'formatted_concepts',
        name: 'Formatted Concepts',
        description: 'Extract concepts from bold and italic text',
        pattern: /\*\*([^*]+)\*\*|\*([^*]+)\*/g,
        type: 'concept',
        confidence: 0.7,
        enabled: true,
        priority: 6,
        category: 'formatting',
        action: {
          extract: '$1$2',
          validate: (concept, context) => {
            const name = concept.name || '';
            return name.length > 2 && name.length < 50 && !/^(the|a|an|is|are|and|or|but)$/i.test(name);
          }
        }
      },

      // Definition patterns
      {
        id: 'definitions',
        name: 'Definitions',
        description: 'Extract concept definitions',
        pattern: /^([A-Z][a-zA-Z\s]+)\s+(?:is|are|refers to|means?|can be defined as)\s+([^.]+)/gm,
        type: 'concept',
        confidence: 0.8,
        enabled: true,
        priority: 8,
        category: 'definition',
        action: {
          extract: '$1',
          transform: (match, context) => ({
            type: 'concept',
            description: match[2].trim()
          })
        }
      },

      // Relationship patterns
      {
        id: 'prerequisite_relationships',
        name: 'Prerequisite Relationships',
        description: 'Extract prerequisite relationships',
        pattern: /(?:before|prior to|first learn|need to know|should understand)\s+([^.]+)/gi,
        type: 'relationship',
        confidence: 0.7,
        enabled: true,
        priority: 7,
        category: 'relationship',
        action: {
          extract: 'prerequisite',
          transform: (match, context) => ({
            targetConceptName: match[1].trim(),
            type: 'prerequisite' as const,
            description: `Should be learned before current topic`
          })
        }
      },

      // Time estimation patterns
      {
        id: 'time_estimates',
        name: 'Time Estimates',
        description: 'Extract time estimates from content',
        pattern: /(?:takes?|requires?|spend|allocate)\s+(\d+)\s*(minutes?|hours?|hrs?|mins?)/gi,
        type: 'metadata',
        confidence: 0.8,
        enabled: true,
        priority: 5,
        category: 'metadata',
        action: {
          extract: 'time',
          transform: (match, context) => {
            const value = parseInt(match[1]);
            const unit = match[2].toLowerCase();
            return unit.startsWith('h') ? value * 60 : value;
          }
        }
      },

      // Difficulty indicators
      {
        id: 'difficulty_indicators',
        name: 'Difficulty Indicators',
        description: 'Extract difficulty levels from content',
        pattern: /\b(beginner|basic|intermediate|advanced|expert)\b/gi,
        type: 'difficulty',
        confidence: 0.6,
        enabled: true,
        priority: 4,
        category: 'difficulty',
        action: {
          extract: 'auto',
          transform: (match, context) => {
            const difficultyMap: Record<string, number> = {
              beginner: 1, basic: 1,
              intermediate: 2,
              advanced: 4,
              expert: 5
            };
            return difficultyMap[match[1].toLowerCase()] || 3;
          }
        }
      },

      // List item concepts
      {
        id: 'list_concepts',
        name: 'List Item Concepts',
        description: 'Extract concepts from list items',
        pattern: /^\s*[-*+]\s+([A-Z][^.]*):?\s*$/gm,
        type: 'concept',
        confidence: 0.5,
        enabled: true,
        priority: 3,
        category: 'structure',
        action: {
          extract: '$1',
          validate: (concept, context) => {
            const name = concept.name || '';
            return name.length > 3 && name.length < 40 && !name.includes(':');
          }
        }
      },

      // Code block concepts
      {
        id: 'code_concepts',
        name: 'Code Block Concepts',
        description: 'Extract programming concepts from code blocks',
        pattern: /```[\s\S]*?```/g,
        type: 'concept',
        confidence: 0.6,
        enabled: true,
        priority: 4,
        category: 'code',
        action: {
          extract: '$0',
          transform: (match, context) => {
            const code = match[0];
            const functions = code.match(/function\s+(\w+)|const\s+(\w+)|class\s+(\w+)/g) || [];
            const mainFunction = functions[0];

            if (mainFunction) {
              const name = mainFunction.replace(/function\s+|const\s+|class\s+/, '');
              return {
                name,
                type: 'skill' as const,
                description: `Programming concept: ${name}`
              };
            }

            return null;
          },
          validate: (concept, context) => concept.name !== null
        }
      }
    ];

    this.addRules(defaultRules);
  }

  /**
   * Add new extraction rules
   */
  addRules(rules: ExtractionRule[]): void {
    for (const rule of rules) {
      this.rules.set(rule.id, rule);

      // Categorize rules
      switch (rule.type) {
      case 'concept':
        this.conceptRules.push(rule);
        break;
      case 'relationship':
        this.relationshipRules.push(rule);
        break;
      case 'metadata':
        this.metadataRules.push(rule);
        break;
      case 'difficulty':
        this.difficultyRules.push(rule);
        break;
      }
    }

    // Sort rules by priority
    this.conceptRules.sort((a, b) => b.priority - a.priority);
    this.relationshipRules.sort((a, b) => b.priority - a.priority);
    this.metadataRules.sort((a, b) => b.priority - a.priority);
    this.difficultyRules.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Get all rules
   */
  getAllRules(): ExtractionRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Get rules by category
   */
  getRulesByCategory(category: string): ExtractionRule[] {
    return Array.from(this.rules.values()).filter(rule => rule.category === category);
  }

  /**
   * Enable/disable a rule
   */
  setRuleEnabled(ruleId: string, enabled: boolean): void {
    const rule = this.rules.get(ruleId);
    if (rule) {
      rule.enabled = enabled;
    }
  }

  /**
   * Update rule priority
   */
  updateRulePriority(ruleId: string, priority: number): void {
    const rule = this.rules.get(ruleId);
    if (rule) {
      rule.priority = priority;
      // Re-sort rules
      this.conceptRules.sort((a, b) => b.priority - a.priority);
      this.relationshipRules.sort((a, b) => b.priority - a.priority);
      this.metadataRules.sort((a, b) => b.priority - a.priority);
      this.difficultyRules.sort((a, b) => b.priority - a.priority);
    }
  }

  /**
   * Remove a rule
   */
  removeRule(ruleId: string): void {
    this.rules.delete(ruleId);
    this.conceptRules = this.conceptRules.filter(rule => rule.id !== ruleId);
    this.relationshipRules = this.relationshipRules.filter(rule => rule.id !== ruleId);
    this.metadataRules = this.metadataRules.filter(rule => rule.id !== ruleId);
    this.difficultyRules = this.difficultyRules.filter(rule => rule.id !== ruleId);
  }

  /**
   * Export rules configuration
   */
  exportRules(): ExtractionRule[] {
    return Array.from(this.rules.values()).map(rule => ({ ...rule }));
  }

  /**
   * Import rules configuration
   */
  importRules(rules: ExtractionRule[]): void {
    this.rules.clear();
    this.conceptRules = [];
    this.relationshipRules = [];
    this.metadataRules = [];
    this.difficultyRules = [];

    this.addRules(rules);
  }
}

export default RuleBasedExtractor;