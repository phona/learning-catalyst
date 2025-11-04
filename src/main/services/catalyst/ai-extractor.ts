/**
 * AI-Powered Concept Extraction Engine
 *
 * This module uses multiple AI models to extract concepts from educational content,
 * with confidence scoring, evidence collection, and relationship inference.
 */

// Temporarily use simple types for now until LangChain setup is resolved
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { Document } from '@langchain/core/documents';


import { LangChainProviderAdapter, LangChainUtils } from './langchain-adapter';
import {
  Concept,
  ConceptEvidence,
  ProposedRelationship,
  ConceptMetadata,
  AIExtractionConfig,
  ModelConfig,
  ParsingStatistics,
  ExtractionThresholds,
  AIExtractionError
} from '@/shared/types/concept-parsing';

export interface ExtractionResult {
  concepts: Concept[];
  relationships: ProposedRelationship[];
  statistics: ParsingStatistics;
  errors: string[];
  processingTime: number;
}

export interface ConceptExtractionPrompt {
  systemPrompt: string;
  userPrompt: string;
  expectedFormat: string;
  examples?: string[];
}

export interface ModelExtractionResult {
  concepts: Partial<Concept>[];
  relationships: Partial<ProposedRelationship>[];
  confidence: number;
  modelId: string;
  processingTime: number;
  tokenUsage: {
    prompt: number;
    completion: number;
    total: number;
  };
}

export class AIConceptExtractor {
  private models: Map<string, LangChainProviderAdapter> = new Map();
  private config: AIExtractionConfig;
  private thresholds: ExtractionThresholds;

  constructor(
    models: LangChainProviderAdapter[],
    config?: Partial<AIExtractionConfig>
  ) {
    // Register models
    models.forEach(model => {
      const info = model.getModelInfo();
      this.models.set(info.modelId, model);
    });

    // Default configuration
    this.config = {
      models: models.map(m => m.getModelInfo()),
      rules: [],
      validation: {
        minConfidence: 0.7,
        maxConcepts: 50,
        requiredFields: ['name', 'type', 'difficulty'],
        prohibitedPatterns: ['test', 'example', 'placeholder'],
        consistencyChecks: true,
        duplicateDetection: true
      },
      thresholds: {
        conceptConfidence: 0.6,
        relationshipStrength: 0.5,
        descriptionMinLength: 10,
        maxConceptNameLength: 100,
        maxRelationshipsPerConcept: 10,
        minEvidenceCount: 1
      },
      ...config
    };

    this.thresholds = this.config.thresholds;
  }

  /**
   * Extract concepts from documents using multiple AI models
   */
  async extractFromDocuments(
    documents: Document[],
    options?: {
      models?: string[];
      includeRelationships?: boolean;
      maxConcepts?: number;
      minConfidence?: number;
    }
  ): Promise<ExtractionResult> {
    const startTime = Date.now();
    const errors: string[] = [];

    try {
      // Select models to use
      const selectedModels = this.selectModels(options?.models);
      if (selectedModels.length === 0) {
        throw new AIExtractionError(
          'No available models for concept extraction',
          'unknown',
          'unknown'
        );
      }

      // Prepare content for extraction
      const content = this.prepareContent(documents);

      // Extract concepts using multiple models
      const modelResults = await this.extractWithMultipleModels(
        content,
        selectedModels,
        options
      );

      // Aggregate and merge results
      const aggregatedResult = await this.aggregateResults(modelResults);

      // Validate and filter concepts
      const validatedConcepts = await this.validateConcepts(aggregatedResult.concepts);

      // Extract relationships if requested
      let relationships: ProposedRelationship[] = [];
      if (options?.includeRelationships !== false) {
        relationships = await this.extractRelationships(
          validatedConcepts,
          content,
          selectedModels
        );
      }

      // Create statistics
      const statistics = this.createStatistics(
        validatedConcepts,
        relationships,
        modelResults,
        Date.now() - startTime
      );

      return {
        concepts: validatedConcepts,
        relationships,
        statistics,
        errors,
        processingTime: Date.now() - startTime
      };
    } catch (error) {
      console.error('AI concept extraction failed:', error);
      errors.push(`Extraction failed: ${(error as Error).message}`);

      return {
        concepts: [],
        relationships: [],
        statistics: {
          totalConcepts: 0,
          validConcepts: 0,
          totalRelationships: 0,
          confidenceDistribution: {},
          difficultyDistribution: {},
          typeDistribution: {},
          processingTime: Date.now() - startTime,
          modelUsage: {}
        },
        errors,
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Extract concepts from a single text chunk
   */
  async extractFromText(
    text: string,
    context?: string,
    modelIds?: string[]
  ): Promise<Partial<Concept>[]> {
    const selectedModels = this.selectModels(modelIds);

    const prompt = this.createExtractionPrompt(text, context);
    const results: Partial<Concept>[] = [];

    for (const modelId of selectedModels) {
      try {
        const model = this.models.get(modelId);
        if (!model) continue;

        const result = await this.extractWithModel(model, prompt);
        results.push(...result.concepts);
      } catch (error) {
        console.warn(`Model ${modelId} extraction failed:`, error);
      }
    }

    return results;
  }

  /**
   * Select models for extraction based on availability and capabilities
   */
  private selectModels(requestedModels?: string[]): string[] {
    const availableModels = Array.from(this.models.keys());

    if (!requestedModels || requestedModels.length === 0) {
      // Return all available models
      return availableModels;
    }

    // Filter requested models to only include available ones
    return requestedModels.filter(modelId => availableModels.includes(modelId));
  }

  /**
   * Prepare content from documents for extraction
   */
  private prepareContent(documents: Document[]): string {
    return documents
      .map(doc => {
        const metadata = doc.metadata;
        let content = doc.pageContent;

        // Add section context if available
        if (metadata?.sectionTitle) {
          content = `## ${metadata.sectionTitle}\n\n${content}`;
        }

        // Add content type context
        if (metadata?.sectionType) {
          content = `Content Type: ${metadata.sectionType}\n\n${content}`;
        }

        return content;
      })
      .join('\n\n---\n\n');
  }

  /**
   * Extract concepts using multiple models in parallel
   */
  private async extractWithMultipleModels(
    content: string,
    modelIds: string[],
    options?: any
  ): Promise<ModelExtractionResult[]> {
    const prompt = this.createExtractionPrompt(content);

    const promises = modelIds.map(async (modelId) => {
      try {
        const model = this.models.get(modelId);
        if (!model) {
          throw new Error(`Model ${modelId} not found`);
        }

        return await this.extractWithModel(model, prompt);
      } catch (error) {
        console.warn(`Extraction with model ${modelId} failed:`, error);
        return {
          concepts: [],
          relationships: [],
          confidence: 0,
          modelId,
          processingTime: 0,
          tokenUsage: { prompt: 0, completion: 0, total: 0 }
        };
      }
    });

    return Promise.all(promises);
  }

  /**
   * Extract concepts using a single model
   */
  private async extractWithModel(
    model: LangChainProviderAdapter,
    prompt: ConceptExtractionPrompt
  ): Promise<ModelExtractionResult> {
    const startTime = Date.now();
    const modelInfo = model.getModelInfo();

    try {
      const messages = [
        new SystemMessage(prompt.systemPrompt),
        new HumanMessage(prompt.userPrompt)
      ];

      const options = LangChainUtils.formatChatOptionsForTask('extraction');
      const response = await model.invoke(messages, options);

      // Parse the model response
      const parsed = this.parseModelResponse(response.content as string);

      return {
        concepts: parsed.concepts || [],
        relationships: parsed.relationships || [],
        confidence: this.calculateModelConfidence(parsed.concepts || []),
        modelId: modelInfo.modelId,
        processingTime: Date.now() - startTime,
        tokenUsage: {
          prompt: 0, // Will be populated by actual model response
          completion: 0,
          total: 0
        }
      };
    } catch (error) {
      console.error(`Model extraction failed for ${modelInfo.modelId}:`, error);
      throw new AIExtractionError(
        `Model extraction failed: ${(error as Error).message}`,
        modelInfo.provider,
        modelInfo.modelId
      );
    }
  }

  /**
   * Create extraction prompt for AI models
   */
  private createExtractionPrompt(content: string, context?: string): ConceptExtractionPrompt {
    const systemPrompt = LangChainUtils.createConceptExtractionSystemPrompt();

    let userPrompt = `Please analyze the following educational content and extract the key learning concepts:\n\n`;

    if (context) {
      userPrompt += `Context: ${context}\n\n`;
    }

    userPrompt += `Content:\n${content}\n\n`;
    userPrompt += `Focus on concepts that are essential for understanding and learning this material.\n`;
    userPrompt += `Consider both explicit concepts and implicit concepts that students need to master.\n`;
    userPrompt += `Provide confidence scores and evidence for each extracted concept.\n\n`;
    userPrompt += `Please respond in valid JSON format following this structure:\n`;
    userPrompt += `{
  "concepts": [
    {
      "name": "Concept Name",
      "type": "topic|skill|fact|procedure|principle",
      "difficulty": 1-5,
      "description": "Clear, concise description",
      "confidence": 0.0-1.0,
      "evidence": [
        {
          "text": "Direct quote from content",
          "context": "Surrounding context",
          "position": {"start": 0, "end": 50},
          "confidence": 0.0-1.0
        }
      ],
      "relationships": [
        {
          "targetConceptName": "Related concept",
          "type": "prerequisite|related|contains|example|application",
          "strength": 0.0-1.0,
          "confidence": 0.0-1.0,
          "description": "Explanation of relationship"
        }
      ]
    }
  ]
}`;

    return {
      systemPrompt,
      userPrompt,
      expectedFormat: 'JSON',
      examples: [
        `{
  "concepts": [
    {
      "name": "React Hooks",
      "type": "skill",
      "difficulty": 3,
      "description": "Functions that let you use state and other React features in functional components",
      "confidence": 0.95,
      "evidence": [
        {
          "text": "React Hooks are functions that let you use state and other React features",
          "context": "React Hooks are functions that let you use state and other React features in functional components without writing a class.",
          "position": {"start": 0, "end": 60},
          "confidence": 0.98
        }
      ],
      "relationships": [
        {
          "targetConceptName": "React Components",
          "type": "related",
          "strength": 0.9,
          "confidence": 0.85,
          "description": "Hooks are used within React components"
        }
      ]
    }
  ]
}`
      ]
    };
  }

  /**
   * Parse model response and extract structured data
   */
  private parseModelResponse(response: string): {
    concepts?: Partial<Concept>[];
    relationships?: Partial<ProposedRelationship>[];
  } {
    try {
      // Try to extract JSON from response
      const jsonMatch = response.match(/```json\s*(\{[\s\S]*?\})\s*```/);
      const jsonContent = jsonMatch ? jsonMatch[1] : response;

      // Clean up the JSON string
      const cleanJson = jsonContent
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
        .replace(/\\n/g, '\\\\n') // Escape newlines
        .trim();

      const parsed = JSON.parse(cleanJson);

      // Validate and normalize the parsed data
      const concepts = Array.isArray(parsed.concepts) ? parsed.concepts : [];
      const relationships = Array.isArray(parsed.relationships) ? parsed.relationships : [];

      return {
        concepts: concepts.map(this.normalizeConcept),
        relationships: relationships.map(this.normalizeRelationship)
      };
    } catch (error) {
      console.warn('Failed to parse model response as JSON:', error);
      console.warn('Response content:', response.substring(0, 500) + '...');

      // Fallback: try to extract concepts using regex patterns
      return this.extractConceptsFromText(response);
    }
  }

  /**
   * Normalize and validate concept data
   */
  private normalizeConcept(concept: any): Partial<Concept> {
    return {
      name: typeof concept.name === 'string' ? concept.name.trim() : '',
      type: ['topic', 'skill', 'fact', 'procedure', 'principle'].includes(concept.type)
        ? concept.type
        : 'topic',
      difficulty: [1, 2, 3, 4, 5].includes(parseInt(concept.difficulty) as any)
        ? parseInt(concept.difficulty) as 1 | 2 | 3 | 4 | 5
        : 3,
      description: typeof concept.description === 'string' ? concept.description.trim() : '',
      confidence: Math.max(0, Math.min(1, parseFloat(concept.confidence) || 0.5)),
      evidence: Array.isArray(concept.evidence) ? concept.evidence.map(this.normalizeEvidence) : [],
      relationships: Array.isArray(concept.relationships) ? concept.relationships.map(this.normalizeRelationship) : []
    };
  }

  /**
   * Normalize evidence data
   */
  private normalizeEvidence(evidence: any): ConceptEvidence {
    return {
      text: typeof evidence.text === 'string' ? evidence.text.trim() : '',
      context: typeof evidence.context === 'string' ? evidence.context.trim() : '',
      position: {
        start: parseInt(evidence.position?.start) || 0,
        end: parseInt(evidence.position?.end) || 0,
        line: parseInt(evidence.position?.line)
      },
      confidence: Math.max(0, Math.min(1, parseFloat(evidence.confidence) || 0.5)),
      sourceType: 'ai',
      modelId: evidence.modelId
    };
  }

  /**
   * Normalize relationship data
   */
  private normalizeRelationship(relationship: any): Partial<ProposedRelationship> {
    return {
      targetConceptName: typeof relationship.targetConceptName === 'string'
        ? relationship.targetConceptName.trim()
        : '',
      type: ['prerequisite', 'related', 'contains', 'example', 'application', 'contrasts']
        .includes(relationship.type)
        ? relationship.type
        : 'related',
      strength: Math.max(0, Math.min(1, parseFloat(relationship.strength) || 0.5)),
      confidence: Math.max(0, Math.min(1, parseFloat(relationship.confidence) || 0.5)),
      description: typeof relationship.description === 'string' ? relationship.description.trim() : '',
      evidence: Array.isArray(relationship.evidence) ? relationship.evidence.map(this.normalizeEvidence) : []
    };
  }

  /**
   * Fallback method to extract concepts from plain text
   */
  private extractConceptsFromText(text: string): {
    concepts: Partial<Concept>[];
    relationships: Partial<ProposedRelationship>[];
  } {
    // Simple regex-based extraction as fallback
    const concepts: Partial<Concept>[] = [];

    // Look for patterns like: "Concept: Definition" or bold terms followed by explanations
    const conceptPatterns = [
      /\*\*([^*]+)\*\*[:\s]+([^.\n]+)/gi,
      /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:is|are|refers to|means)\s+([^.\n]+)/gi
    ];

    conceptPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const [, name, description] = match;
        if (name && description) {
          concepts.push({
            name: name.trim(),
            description: description.trim(),
            type: 'topic' as const,
            difficulty: 3,
            confidence: 0.6,
            evidence: [{
              text: match[0],
              context: text.substring(Math.max(0, match.index - 50), match.index + match[0].length + 50),
              position: { start: match.index, end: match.index + match[0].length },
              confidence: 0.6,
              sourceType: 'ai'
            }]
          });
        }
      }
    });

    return { concepts, relationships: [] };
  }

  /**
   * Aggregate results from multiple models
   */
  private async aggregateResults(
    modelResults: ModelExtractionResult[]
  ): Promise<{ concepts: Partial<Concept>[]; relationships: Partial<ProposedRelationship>[] }> {
    const conceptMap = new Map<string, Partial<Concept>>();
    const relationshipMap = new Map<string, Partial<ProposedRelationship>>();

    // Process each model's results
    for (const result of modelResults) {
      // Aggregate concepts
      for (const concept of result.concepts) {
        if (!concept.name) continue;

        const key = concept.name.toLowerCase().trim();
        const existing = conceptMap.get(key);

        if (!existing) {
          conceptMap.set(key, {
            ...concept,
            metadata: {
              extractionMethod: 'ai',
              extractedBy: [result.modelId],
              validationScore: concept.confidence || 0.5,
              tags: [],
              learningObjectives: [],
              prerequisites: [],
              relatedTopics: [],
              difficulty: concept.difficulty || 3
            }
          });
        } else {
          // Merge with existing concept
          this.mergeConcepts(existing, concept, result);
        }
      }

      // Aggregate relationships
      for (const relationship of result.relationships || []) {
        if (!relationship.targetConceptName) continue;

        const key = `${relationship.targetConceptName}-${relationship.type}`;
        const existing = relationshipMap.get(key);

        if (!existing) {
          relationshipMap.set(key, {
            ...relationship,
            evidence: [...(relationship.evidence || [])]
          });
        } else {
          this.mergeRelationships(existing, relationship, result);
        }
      }
    }

    return {
      concepts: Array.from(conceptMap.values()),
      relationships: Array.from(relationshipMap.values())
    };
  }

  /**
   * Merge concept data from multiple models
   */
  private mergeConcepts(
    existing: Partial<Concept>,
    newConcept: Partial<Concept>,
    result: ModelExtractionResult
  ): void {
    // Combine evidence
    const evidence = [...(existing.evidence || []), ...(newConcept.evidence || [])];

    // Update confidence (weighted average)
    const confidence = this.calculateCombinedConfidence(existing, newConcept, result);

    // Merge metadata
    const metadata = existing.metadata as ConceptMetadata || {
      extractionMethod: 'ai',
      extractedBy: [],
      validationScore: 0,
      tags: [],
      learningObjectives: [],
      prerequisites: [],
      relatedTopics: []
    };

    metadata.extractedBy.push(result.modelId);
    metadata.validationScore = confidence;

    // Update existing concept
    existing.evidence = evidence;
    existing.confidence = confidence;
    existing.metadata = metadata;

    // Use the best description
    if (newConcept.description && (newConcept.confidence || 0) > (existing.confidence || 0)) {
      existing.description = newConcept.description;
    }
  }

  /**
   * Merge relationship data from multiple models
   */
  private mergeRelationships(
    existing: Partial<ProposedRelationship>,
    newRelationship: Partial<ProposedRelationship>,
    result: ModelExtractionResult
  ): void {
    // Combine evidence
    const evidence = [...(existing.evidence || []), ...(newRelationship.evidence || [])];

    // Update strength and confidence (weighted average)
    const strength = ((existing.strength || 0.5) + (newRelationship.strength || 0.5)) / 2;
    const confidence = ((existing.confidence || 0.5) + (newRelationship.confidence || 0.5)) / 2;

    existing.evidence = evidence;
    existing.strength = strength;
    existing.confidence = confidence;
  }

  /**
   * Calculate confidence for a model's extraction
   */
  private calculateModelConfidence(concepts: Partial<Concept>[]): number {
    if (concepts.length === 0) return 0;

    const totalConfidence = concepts.reduce((sum, concept) => {
      return sum + (concept.confidence || 0);
    }, 0);

    return totalConfidence / concepts.length;
  }

  /**
   * Calculate combined confidence from multiple models
   */
  private calculateCombinedConfidence(
    existing: Partial<Concept>,
    newConcept: Partial<Concept>,
    result: ModelExtractionResult
  ): number {
    const existingConfidence = existing.confidence || 0;
    const newConfidence = newConcept.confidence || 0;

    // Weight by evidence count
    const existingEvidenceCount = existing.evidence?.length || 0;
    const newEvidenceCount = newConcept.evidence?.length || 0;
    const totalEvidence = existingEvidenceCount + newEvidenceCount;

    if (totalEvidence === 0) return (existingConfidence + newConfidence) / 2;

    const weightedConfidence = (
      (existingConfidence * existingEvidenceCount) +
      (newConfidence * newEvidenceCount)
    ) / totalEvidence;

    return Math.min(1, weightedConfidence);
  }

  /**
   * Validate and filter concepts
   */
  private async validateConcepts(
    concepts: Partial<Concept>[]
  ): Promise<Concept[]> {
    const validatedConcepts: Concept[] = [];

    for (const concept of concepts) {
      if (!this.isValidConcept(concept)) {
        continue;
      }

      // Create full concept object
      const fullConcept: Concept = {
        id: `concept_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
        name: concept.name!,
        type: concept.type as Concept['type'],
        difficulty: concept.difficulty as Concept['difficulty'],
        confidence: concept.confidence || 0.5,
        evidence: concept.evidence || [],
        relationships: (concept.relationships || []).map(rel => ({
          ...rel,
          evidence: rel.evidence || []
        })) as ProposedRelationship[],
        metadata: concept.metadata as ConceptMetadata || {
          extractionMethod: 'ai',
          extractedBy: [],
          validationScore: concept.confidence || 0.5,
          tags: [],
          learningObjectives: [],
          prerequisites: [],
          relatedTopics: [],
          difficulty: concept.difficulty || 3
        },
        extractedAt: new Date()
      };

      validatedConcepts.push(fullConcept);
    }

    return validatedConcepts;
  }

  /**
   * Check if a concept meets validation criteria
   */
  private isValidConcept(concept: Partial<Concept>): boolean {
    // Check required fields
    if (!concept.name || concept.name.trim().length === 0) return false;
    if (!concept.type || !['topic', 'skill', 'fact', 'procedure', 'principle'].includes(concept.type)) return false;
    if (!concept.difficulty || concept.difficulty < 1 || concept.difficulty > 5) return false;

    // Check confidence threshold
    if ((concept.confidence || 0) < this.thresholds.conceptConfidence) return false;

    // Check name length
    if (concept.name.length > this.thresholds.maxConceptNameLength) return false;

    // Check description length
    if (concept.description && concept.description.length < this.thresholds.descriptionMinLength) {
      // Allow missing description if confidence is high
      if ((concept.confidence || 0) < 0.8) return false;
    }

    // Check evidence
    const evidenceCount = concept.evidence?.length || 0;
    if (evidenceCount < this.thresholds.minEvidenceCount) return false;

    // Check for prohibited patterns
    const nameLower = concept.name.toLowerCase();
    for (const pattern of this.config.validation.prohibitedPatterns) {
      if (nameLower.includes(pattern.toLowerCase())) return false;
    }

    return true;
  }

  /**
   * Extract relationships between concepts
   */
  private async extractRelationships(
    concepts: Concept[],
    content: string,
    modelIds: string[]
  ): Promise<ProposedRelationship[]> {
    const relationships: ProposedRelationship[] = [];

    // Use existing relationships from concepts
    for (const concept of concepts) {
      relationships.push(...concept.relationships);
    }

    // Additional relationship extraction can be added here
    // For now, we'll use the relationships identified during concept extraction

    return relationships;
  }

  /**
   * Create extraction statistics
   */
  private createStatistics(
    concepts: Concept[],
    relationships: ProposedRelationship[],
    modelResults: ModelExtractionResult[],
    processingTime: number
  ): ParsingStatistics {
    // Calculate confidence distribution
    const confidenceDistribution: Record<string, number> = {};
    const difficultyDistribution: Record<number, number> = {};
    const typeDistribution: Record<string, number> = {};

    concepts.forEach(concept => {
      const confidenceRange = this.getConfidenceRange(concept.confidence);
      confidenceDistribution[confidenceRange] = (confidenceDistribution[confidenceRange] || 0) + 1;

      difficultyDistribution[concept.difficulty] = (difficultyDistribution[concept.difficulty] || 0) + 1;
      typeDistribution[concept.type] = (typeDistribution[concept.type] || 0) + 1;
    });

    // Calculate model usage
    const modelUsage: Record<string, number> = {};
    modelResults.forEach(result => {
      modelUsage[result.modelId] = result.processingTime;
    });

    return {
      totalConcepts: concepts.length,
      validConcepts: concepts.filter(c => c.confidence >= this.thresholds.conceptConfidence).length,
      totalRelationships: relationships.length,
      confidenceDistribution,
      difficultyDistribution,
      typeDistribution,
      processingTime,
      modelUsage
    };
  }

  /**
   * Get confidence range category
   */
  private getConfidenceRange(confidence: number): string {
    if (confidence >= 0.9) return 'very_high';
    if (confidence >= 0.7) return 'high';
    if (confidence >= 0.5) return 'medium';
    if (confidence >= 0.3) return 'low';
    return 'very_low';
  }

  /**
   * Get available models
   */
  getAvailableModels(): string[] {
    return Array.from(this.models.keys());
  }

  /**
   * Add a new model to the extractor
   */
  addModel(model: LangChainProviderAdapter): void {
    const info = model.getModelInfo();
    this.models.set(info.modelId, model);
    this.config.models.push(info);
  }

  /**
   * Remove a model from the extractor
   */
  removeModel(modelId: string): void {
    this.models.delete(modelId);
    this.config.models = this.config.models.filter(m => m.modelId !== modelId);
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<AIExtractionConfig>): void {
    this.config = { ...this.config, ...newConfig };
    if (newConfig.thresholds) {
      this.thresholds = newConfig.thresholds;
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): AIExtractionConfig {
    return { ...this.config };
  }
}

export default AIConceptExtractor;