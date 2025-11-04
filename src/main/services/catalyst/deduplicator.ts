/**
 * Concept Deduplication and Validation System
 *
 * This module provides intelligent deduplication and quality validation for extracted concepts.
 * It uses semantic similarity, string matching, and quality criteria to ensure concept uniqueness
 * and validity before integration into the knowledge graph.
 */

import {
  Concept,
  ConceptEvidence,
  ProposedRelationship,
  ConceptMetadata,
  ValidationError
} from '@/shared/types/concept-parsing';

export interface DeduplicationConfig {
  similarityThreshold: number; // 0-1, threshold for considering concepts as duplicates
  exactMatchThreshold: number; // 0-1, threshold for exact matching
  semanticThreshold: number; // 0-1, threshold for semantic similarity
  minEvidenceCount: number;
  minConfidenceScore: number;
  maxConceptNameLength: number;
  requireDescription: boolean;
  prohibitedTerms: string[];
  requiredFields: string[];
}

export interface DuplicateGroup {
  canonical: Concept;
  duplicates: Concept[];
  similarityScore: number;
  matchType: 'exact' | 'semantic' | 'partial';
  mergeStrategy: 'keep_best' | 'merge_all' | 'manual';
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: string[];
  score: number; // 0-1 quality score
  recommendations: string[];
}

export interface ConceptCluster {
  id: string;
  concepts: Concept[];
  centroid: Concept;
  similarity: number;
  quality: number;
}

export interface DeduplicationResult {
  uniqueConcepts: Concept[];
  duplicateGroups: DuplicateGroup[];
  removedCount: number;
  mergedCount: number;
  validationResults: ValidationResult[];
  statistics: DeduplicationStatistics;
}

export interface DeduplicationStatistics {
  totalInput: number;
  uniqueOutput: number;
  duplicateGroups: number;
  exactMatches: number;
  semanticMatches: number;
  partialMatches: number;
  averageSimilarity: number;
  processingTime: number;
}

export class ConceptDeduplicator {
  private config: DeduplicationConfig;
  private stopWords: Set<string> = new Set();
  private termFrequencyCache: Map<string, Map<string, number>> = new Map();

  constructor(config?: Partial<DeduplicationConfig>) {
    this.config = {
      similarityThreshold: 0.8,
      exactMatchThreshold: 0.95,
      semanticThreshold: 0.7,
      minEvidenceCount: 1,
      minConfidenceScore: 0.3,
      maxConceptNameLength: 100,
      requireDescription: false,
      prohibitedTerms: [
        'test', 'example', 'placeholder', 'todo', 'fixme',
        'click here', 'learn more', 'read more', 'undefined',
        'null', 'error', 'warning', 'debug'
      ],
      requiredFields: ['name', 'type', 'difficulty'],
      ...config
    };

    this.initializeStopWords();
  }

  /**
   * Main deduplication method
   */
  async deduplicateConcepts(concepts: Concept[]): Promise<DeduplicationResult> {
    const startTime = Date.now();
    const validationResults: ValidationResult[] = [];

    // Step 1: Validate all concepts
    const validConcepts = await this.validateConcepts(concepts, validationResults);

    // Step 2: Create similarity matrix
    const similarityMatrix = await this.createSimilarityMatrix(validConcepts);

    // Step 3: Find duplicate groups
    const duplicateGroups = this.findDuplicateGroups(validConcepts, similarityMatrix);

    // Step 4: Merge duplicates
    const uniqueConcepts = await this.mergeDuplicates(validConcepts, duplicateGroups);

    // Step 5: Final validation of merged concepts
    const finalValidationResults: ValidationResult[] = [];
    const finalConcepts = await this.validateConcepts(uniqueConcepts, finalValidationResults);

    const statistics: DeduplicationStatistics = {
      totalInput: concepts.length,
      uniqueOutput: finalConcepts.length,
      duplicateGroups: duplicateGroups.length,
      exactMatches: duplicateGroups.filter(g => g.matchType === 'exact').length,
      semanticMatches: duplicateGroups.filter(g => g.matchType === 'semantic').length,
      partialMatches: duplicateGroups.filter(g => g.matchType === 'partial').length,
      averageSimilarity: this.calculateAverageSimilarity(duplicateGroups),
      processingTime: Date.now() - startTime
    };

    return {
      uniqueConcepts: finalConcepts,
      duplicateGroups,
      removedCount: concepts.length - finalConcepts.length,
      mergedCount: duplicateGroups.reduce((sum, group) => sum + group.duplicates.length, 0),
      validationResults: [...validationResults, ...finalValidationResults],
      statistics
    };
  }

  /**
   * Validate concepts against quality criteria
   */
  async validateConcepts(
    concepts: Concept[],
    validationResults: ValidationResult[] = []
  ): Promise<Concept[]> {
    const validConcepts: Concept[] = [];

    for (const concept of concepts) {
      const result = await this.validateConcept(concept);
      validationResults.push(result);

      if (result.isValid && result.score >= 0.3) { // Minimum quality threshold
        validConcepts.push(concept);
      }
    }

    return validConcepts;
  }

  /**
   * Validate a single concept
   */
  async validateConcept(concept: Concept): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];
    let score = 1.0;

    // Check required fields
    for (const field of this.config.requiredFields) {
      if (!concept[field as keyof Concept]) {
        errors.push(new ValidationError(
          `Missing required field: ${field}`,
          field,
          concept[field as keyof Concept]
        ));
        score -= 0.3;
      }
    }

    // Validate concept name
    if (concept.name) {
      if (concept.name.length === 0) {
        errors.push(new ValidationError(
          'Concept name cannot be empty',
          'name',
          concept.name
        ));
        score -= 0.5;
      } else if (concept.name.length > this.config.maxConceptNameLength) {
        errors.push(new ValidationError(
          `Concept name too long (${concept.name.length} > ${this.config.maxConceptNameLength})`,
          'name',
          concept.name
        ));
        score -= 0.2;
      } else if (this.containsProhibitedTerms(concept.name)) {
        errors.push(new ValidationError(
          'Concept name contains prohibited terms',
          'name',
          concept.name
        ));
        score -= 0.4;
      } else if (this.isLikelyGarbage(concept.name)) {
        warnings.push('Concept name appears to be low quality or automated content');
        score -= 0.2;
      }
    }

    // Validate difficulty level
    if (concept.difficulty < 1 || concept.difficulty > 5) {
      errors.push(new ValidationError(
        'Difficulty must be between 1 and 5',
        'difficulty',
        concept.difficulty
      ));
      score -= 0.2;
    }

    // Validate concept type
    const validTypes = ['topic', 'skill', 'fact', 'procedure', 'principle'];
    if (!validTypes.includes(concept.type)) {
      errors.push(new ValidationError(
        `Invalid concept type: ${concept.type}`,
        'type',
        concept.type
      ));
      score -= 0.3;
    }

    // Validate confidence score
    if (concept.confidence < 0 || concept.confidence > 1) {
      errors.push(new ValidationError(
        'Confidence must be between 0 and 1',
        'confidence',
        concept.confidence
      ));
      score -= 0.2;
    } else if (concept.confidence < this.config.minConfidenceScore) {
      warnings.push(`Low confidence score: ${concept.confidence.toFixed(2)}`);
      score -= 0.1;
    }

    // Validate evidence
    if (!concept.evidence || concept.evidence.length === 0) {
      warnings.push('No evidence provided for concept');
      score -= 0.2;
    } else if (concept.evidence.length < this.config.minEvidenceCount) {
      warnings.push(`Insufficient evidence: ${concept.evidence.length} items`);
      score -= 0.1;
    }

    // Validate description
    if (this.config.requireDescription && (!concept.description || concept.description.length < 10)) {
      warnings.push('Description is missing or too short');
      score -= 0.1;
    }

    // Check for meaningful content
    if (concept.description && this.isLikelyGarbage(concept.description)) {
      warnings.push('Description appears to be low quality content');
      score -= 0.1;
    }

    // Generate recommendations
    if (score < 0.7) {
      recommendations.push('Consider reviewing and improving concept quality');
    }
    if (!concept.description || concept.description.length < 20) {
      recommendations.push('Add a more detailed description');
    }
    if (concept.evidence.length < 2) {
      recommendations.push('Add more evidence to support this concept');
    }
    if (concept.confidence < 0.8) {
      recommendations.push('Consider manual review to improve confidence');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      score: Math.max(0, score),
      recommendations
    };
  }

  /**
   * Create similarity matrix for concepts
   */
  private async createSimilarityMatrix(concepts: Concept[]): Promise<number[][]> {
    const matrix: number[][] = [];

    for (let i = 0; i < concepts.length; i++) {
      matrix[i] = [];
      for (let j = 0; j < concepts.length; j++) {
        if (i === j) {
          matrix[i][j] = 1.0;
        } else {
          const similarity = await this.calculateConceptSimilarity(concepts[i], concepts[j]);
          matrix[i][j] = similarity;
        }
      }
    }

    return matrix;
  }

  /**
   * Calculate similarity between two concepts
   */
  private async calculateConceptSimilarity(concept1: Concept, concept2: Concept): Promise<number> {
    // Exact name match
    const nameSimilarity = this.calculateStringSimilarity(concept1.name, concept2.name);
    if (nameSimilarity >= this.config.exactMatchThreshold) {
      return nameSimilarity;
    }

    // Description similarity
    let descriptionSimilarity = 0;
    if (concept1.description && concept2.description) {
      descriptionSimilarity = this.calculateStringSimilarity(concept1.description, concept2.description);
    }

    // Content similarity
    let contentSimilarity = 0;
    const content1 = this.extractContentTerms(concept1);
    const content2 = this.extractContentTerms(concept2);
    if (content1.length > 0 && content2.length > 0) {
      contentSimilarity = this.calculateJaccardSimilarity(content1, content2);
    }

    // Type and difficulty similarity
    const typeSimilarity = concept1.type === concept2.type ? 1.0 : 0.0;
    const difficultySimilarity = 1.0 - Math.abs(concept1.difficulty - concept2.difficulty) / 4.0;

    // Weighted combination
    const weights = {
      name: 0.4,
      description: 0.3,
      content: 0.2,
      type: 0.05,
      difficulty: 0.05
    };

    const similarity =
      nameSimilarity * weights.name +
      descriptionSimilarity * weights.description +
      contentSimilarity * weights.content +
      typeSimilarity * weights.type +
      difficultySimilarity * weights.difficulty;

    return Math.min(1.0, similarity);
  }

  /**
   * Calculate string similarity using multiple methods
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    const normalized1 = this.normalizeString(str1);
    const normalized2 = this.normalizeString(str2);

    // Exact match
    if (normalized1 === normalized2) {
      return 1.0;
    }

    // Jaccard similarity on word sets
    const words1 = new Set(normalized1.split(/\s+/));
    const words2 = new Set(normalized2.split(/\s+/));
    const jaccard = this.calculateJaccardSimilarity(Array.from(words1), Array.from(words2));

    // Levenshtein distance similarity
    const levenshtein = this.calculateLevenshteinSimilarity(normalized1, normalized2);

    // Take the maximum of both methods
    return Math.max(jaccard, levenshtein);
  }

  /**
   * Normalize string for comparison
   */
  private normalizeString(str: string): string {
    return str
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Replace non-word characters with spaces
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .trim();
  }

  /**
   * Calculate Jaccard similarity between two arrays
   */
  private calculateJaccardSimilarity(arr1: string[], arr2: string[]): number {
    const set1 = new Set(arr1);
    const set2 = new Set(arr2);
    const intersection = new Set(Array.from(set1).filter(x => set2.has(x)));
    const union = new Set(Array.from(set1).concat(Array.from(set2)));

    return intersection.size / union.size;
  }

  /**
   * Calculate Levenshtein distance similarity
   */
  private calculateLevenshteinSimilarity(str1: string, str2: string): number {
    const distance = this.levenshteinDistance(str1, str2);
    const maxLength = Math.max(str1.length, str2.length);
    return maxLength === 0 ? 1.0 : 1.0 - (distance / maxLength);
  }

  /**
   * Calculate Levenshtein distance
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() =>
      Array(str1.length + 1).fill(null)
    );

    for (let i = 0; i <= str1.length; i++) {
      matrix[0][i] = i;
    }

    for (let j = 0; j <= str2.length; j++) {
      matrix[j][0] = j;
    }

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // deletion
          matrix[j - 1][i] + 1, // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Extract meaningful terms from concept content
   */
  private extractContentTerms(concept: Concept): string[] {
    const terms: string[] = [];

    // Add name terms
    terms.push(...this.extractTerms(concept.name));

    // Add description terms
    if (concept.description) {
      terms.push(...this.extractTerms(concept.description));
    }

    // Add evidence terms
    for (const evidence of concept.evidence) {
      terms.push(...this.extractTerms(evidence.text));
    }

    // Remove duplicates and filter
    return Array.from(new Set(terms)).filter(term =>
      term.length > 2 &&
      !this.stopWords.has(term) &&
      !/^\d+$/.test(term)
    );
  }

  /**
   * Extract terms from text
   */
  private extractTerms(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2);
  }

  /**
   * Find duplicate groups using similarity matrix
   */
  private findDuplicateGroups(concepts: Concept[], similarityMatrix: number[][]): DuplicateGroup[] {
    const visited = new Set<number>();
    const groups: DuplicateGroup[] = [];

    for (let i = 0; i < concepts.length; i++) {
      if (visited.has(i)) continue;

      const group: Concept[] = [concepts[i]];
      const similarities: number[] = [1.0];

      for (let j = i + 1; j < concepts.length; j++) {
        if (visited.has(j)) continue;

        const similarity = similarityMatrix[i][j];
        if (similarity >= this.config.similarityThreshold) {
          group.push(concepts[j]);
          similarities.push(similarity);
          visited.add(j);
        }
      }

      if (group.length > 1) {
        visited.add(i);

        // Determine match type and create canonical concept
        const avgSimilarity = similarities.reduce((sum, sim) => sum + sim, 0) / similarities.length;
        const matchType = this.determineMatchType(avgSimilarity);
        const canonical = this.selectCanonicalConcept(group, similarities);

        groups.push({
          canonical,
          duplicates: group.filter(c => c.id !== canonical.id),
          similarityScore: avgSimilarity,
          matchType,
          mergeStrategy: avgSimilarity >= this.config.exactMatchThreshold ? 'merge_all' : 'keep_best'
        });
      }
    }

    return groups;
  }

  /**
   * Determine match type based on similarity score
   */
  private determineMatchType(similarity: number): DuplicateGroup['matchType'] {
    if (similarity >= this.config.exactMatchThreshold) {
      return 'exact';
    } else if (similarity >= this.config.semanticThreshold) {
      return 'semantic';
    } else {
      return 'partial';
    }
  }

  /**
   * Select the best concept as canonical from a group
   */
  private selectCanonicalConcept(concepts: Concept[], similarities: number[]): Concept {
    let bestConcept = concepts[0];
    let bestScore = this.calculateConceptQuality(bestConcept) * similarities[0];

    for (let i = 1; i < concepts.length; i++) {
      const score = this.calculateConceptQuality(concepts[i]) * similarities[i];
      if (score > bestScore) {
        bestScore = score;
        bestConcept = concepts[i];
      }
    }

    return bestConcept;
  }

  /**
   * Calculate overall quality score for a concept
   */
  private calculateConceptQuality(concept: Concept): number {
    let score = 0;

    // Confidence weight: 30%
    score += concept.confidence * 0.3;

    // Evidence count weight: 25%
    const evidenceScore = Math.min(1.0, concept.evidence.length / 3);
    score += evidenceScore * 0.25;

    // Description quality weight: 20%
    const descriptionScore = concept.description && concept.description.length > 20 ? 1.0 : 0.5;
    score += descriptionScore * 0.2;

    // Name quality weight: 15%
    const nameScore = this.assessNameQuality(concept.name);
    score += nameScore * 0.15;

    // Relationship count weight: 10%
    const relationshipScore = Math.min(1.0, concept.relationships.length / 2);
    score += relationshipScore * 0.1;

    return score;
  }

  /**
   * Assess quality of concept name
   */
  private assessNameQuality(name: string): number {
    if (!name || name.length < 3) return 0;

    let score = 0.5; // Base score

    // Length bonus
    if (name.length >= 5 && name.length <= 30) {
      score += 0.2;
    }

    // Capitalization bonus (proper nouns, acronyms)
    if (/^[A-Z][a-z]/.test(name) || /^[A-Z]{2,}$/.test(name)) {
      score += 0.1;
    }

    // Penalty for all lowercase or all uppercase (except acronyms)
    if (name === name.toLowerCase() || (name === name.toUpperCase() && name.length > 5)) {
      score -= 0.1;
    }

    // Penalty for numbers at end (likely auto-generated)
    if (/\d+$/.test(name)) {
      score -= 0.2;
    }

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Merge duplicate concepts
   */
  private async mergeDuplicates(
    concepts: Concept[],
    duplicateGroups: DuplicateGroup[]
  ): Promise<Concept[]> {
    const mergedIds = new Set<string>();
    const uniqueConcepts: Concept[] = [];

    // Add canonical concepts from groups
    for (const group of duplicateGroups) {
      const merged = await this.mergeConceptGroup(group);
      uniqueConcepts.push(merged);
      mergedIds.add(group.canonical.id);
      group.duplicates.forEach(dup => mergedIds.add(dup.id));
    }

    // Add concepts that weren't in any duplicate group
    for (const concept of concepts) {
      if (!mergedIds.has(concept.id)) {
        uniqueConcepts.push(concept);
      }
    }

    return uniqueConcepts;
  }

  /**
   * Merge a group of duplicate concepts
   */
  private async mergeConceptGroup(group: DuplicateGroup): Promise<Concept> {
    const allConcepts = [group.canonical, ...group.duplicates];

    // Merge evidence
    const allEvidence = allConcepts.flatMap(c => c.evidence);
    const uniqueEvidence = this.deduplicateEvidence(allEvidence);

    // Merge relationships
    const allRelationships = allConcepts.flatMap(c => c.relationships);
    const uniqueRelationships = this.deduplicateRelationships(allRelationships);

    // Merge metadata
    const mergedMetadata = this.mergeMetadata(allConcepts.map(c => c.metadata));

    // Create merged concept
    const merged: Concept = {
      ...group.canonical,
      evidence: uniqueEvidence,
      relationships: uniqueRelationships,
      metadata: {
        ...mergedMetadata,
        extractionMethod: 'hybrid',
        extractedBy: Array.from(new Set(allConcepts.flatMap(c => c.metadata.extractedBy))),
        validationScore: Math.max(...allConcepts.map(c => c.metadata.validationScore || 0))
      },
      extractedAt: new Date()
    };

    // Select best attributes
    if (group.canonical.confidence < 0.8) {
      const bestConcept = allConcepts.reduce((best, current) =>
        current.confidence > best.confidence ? current : best
      );
      merged.confidence = bestConcept.confidence;
      merged.description = bestConcept.description || merged.description;
    }

    return merged;
  }

  /**
   * Deduplicate evidence items
   */
  private deduplicateEvidence(evidence: ConceptEvidence[]): ConceptEvidence[] {
    const seen = new Set<string>();
    const unique: ConceptEvidence[] = [];

    for (const item of evidence) {
      const key = `${item.text.substring(0, 50)}_${item.position.start}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(item);
      }
    }

    return unique;
  }

  /**
   * Deduplicate relationships
   */
  private deduplicateRelationships(relationships: ProposedRelationship[]): ProposedRelationship[] {
    const seen = new Set<string>();
    const unique: ProposedRelationship[] = [];

    for (const rel of relationships) {
      const key = `${rel.targetConceptName}_${rel.type}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(rel);
      }
    }

    return unique;
  }

  /**
   * Merge metadata from multiple concepts
   */
  private mergeMetadata(metadataList: ConceptMetadata[]): ConceptMetadata {
    const merged: ConceptMetadata = {
      extractionMethod: 'hybrid',
      extractedBy: [],
      tags: [],
      learningObjectives: [],
      prerequisites: [],
      relatedTopics: [],
      difficulty: 3,
      validationScore: 0
    };

    for (const metadata of metadataList) {
      // Merge extractedBy
      merged.extractedBy.push(...(metadata.extractedBy || []));

      // Merge tags
      merged.tags.push(...(metadata.tags || []));

      // Merge learning objectives
      merged.learningObjectives.push(...(metadata.learningObjectives || []));

      // Merge prerequisites
      merged.prerequisites.push(...(metadata.prerequisites || []));

      // Merge related topics
      merged.relatedTopics.push(...(metadata.relatedTopics || []));

      // Take max validation score
      const metadataScore = metadata.validationScore ?? 0;
      merged.validationScore = Math.max(merged.validationScore, metadataScore);

      // Average difficulty
      if (metadata.difficulty !== undefined) {
        merged.difficulty = (merged.difficulty + metadata.difficulty) / 2;
      }
    }

    // Remove duplicates
    merged.extractedBy = Array.from(new Set(merged.extractedBy));
    merged.tags = Array.from(new Set(merged.tags));
    merged.learningObjectives = Array.from(new Set(merged.learningObjectives));
    merged.prerequisites = Array.from(new Set(merged.prerequisites));
    merged.relatedTopics = Array.from(new Set(merged.relatedTopics));

    return merged;
  }

  /**
   * Calculate average similarity for statistics
   */
  private calculateAverageSimilarity(groups: DuplicateGroup[]): number {
    if (groups.length === 0) return 0;

    const totalSimilarity = groups.reduce((sum, group) => sum + group.similarityScore, 0);
    return totalSimilarity / groups.length;
  }

  /**
   * Check if text contains prohibited terms
   */
  private containsProhibitedTerms(text: string): boolean {
    const lowerText = text.toLowerCase();
    return this.config.prohibitedTerms.some(term => lowerText.includes(term));
  }

  /**
   * Check if text is likely garbage or automated content
   */
  private isLikelyGarbage(text: string): boolean {
    if (!text || text.length < 3) return true;

    const lowerText = text.toLowerCase();

    // Check for common garbage patterns
    const garbagePatterns = [
      /^(lorem|ipsum|test|example|sample)/,
      /^(click|learn|read|get) (here|more)/,
      /^undefined$|^null$|^error$|^warning$/,
      /^\d+$/, // Only numbers
      /^(.)\1+$/, // Repeated characters
      /^[^\w\s]+$/ // Only symbols
    ];

    return garbagePatterns.some(pattern => pattern.test(lowerText));
  }

  /**
   * Initialize stop words for text processing
   */
  private initializeStopWords(): void {
    this.stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'during',
      'before', 'after', 'above', 'below', 'between', 'among', 'is', 'are',
      'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do',
      'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might',
      'must', 'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he',
      'she', 'it', 'we', 'they', 'what', 'which', 'who', 'when', 'where',
      'why', 'how', 'all', 'each', 'every', 'both', 'few', 'more', 'most',
      'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same',
      'so', 'than', 'too', 'very', 'just', 'now', 'also', 'here', 'there'
    ]);
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<DeduplicationConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  getConfig(): DeduplicationConfig {
    return { ...this.config };
  }

  /**
   * Add custom prohibited terms
   */
  addProhibitedTerms(terms: string[]): void {
    this.config.prohibitedTerms.push(...terms);
  }

  /**
   * Remove prohibited terms
   */
  removeProhibitedTerms(terms: string[]): void {
    this.config.prohibitedTerms = this.config.prohibitedTerms.filter(
      term => !terms.includes(term)
    );
  }
}

export default ConceptDeduplicator;