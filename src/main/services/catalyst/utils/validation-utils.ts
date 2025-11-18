/**
 * Validation Utilities
 *
 * Utility functions for validating concepts, relationships, and learning materials.
 */

import { Concept, ProposedRelationship, LearningMaterial, ValidationError } from '@/shared/types/concept-parsing';

/**
 * Validation rules configuration
 */
export interface ValidationRules {
  // Concept validation
  conceptNameMinLength: number;
  conceptNameMaxLength: number;
  conceptNamePattern: RegExp;
  requiredConceptFields: string[];
  prohibitedConceptTerms: string[];

  // Relationship validation
  requiredRelationshipFields: string[];
  validRelationshipTypes: string[];
  relationshipStrengthRange: [number, number];

  // Content validation
  minDescriptionLength: number;
  maxDescriptionLength: number;
  minEvidenceCount: number;
  maxEvidenceCount: number;

  // Quality thresholds
  minConfidenceScore: number;
  maxConfidenceScore: number;
  minQualityScore: number;
}

/**
 * Default validation rules
 */
export const DEFAULT_VALIDATION_RULES: ValidationRules = {
  conceptNameMinLength: 2,
  conceptNameMaxLength: 100,
  conceptNamePattern: /^[A-Za-z0-9\s\-_()[\]{}]+$/,
  requiredConceptFields: ['name', 'type', 'difficulty'],
  prohibitedConceptTerms: [
    'test', 'example', 'placeholder', 'todo', 'fixme', 'debug',
    'click here', 'learn more', 'read more', 'undefined', 'null',
    'error', 'warning', 'sample', 'demo'
  ],
  requiredRelationshipFields: ['targetConceptName', 'type'],
  validRelationshipTypes: ['prerequisite', 'related', 'contains', 'example', 'application', 'contrasts'],
  relationshipStrengthRange: [0.0, 1.0],
  minDescriptionLength: 10,
  maxDescriptionLength: 1000,
  minEvidenceCount: 1,
  maxEvidenceCount: 20,
  minConfidenceScore: 0.0,
  maxConfidenceScore: 1.0,
  minQualityScore: 0.3
};

/**
 * Validate a concept against rules
 */
export function validateConcept(
  concept: Concept,
  rules: ValidationRules = DEFAULT_VALIDATION_RULES
): {
  isValid: boolean;
  errors: ValidationError[];
  warnings: string[];
  score: number;
} {
  const errors: ValidationError[] = [];
  const warnings: string[] = [];
  let score = 1.0;

  // Validate required fields
  for (const field of rules.requiredConceptFields) {
    if (!(field in concept) || concept[field as keyof Concept] === undefined) {
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
    // Length validation
    if (concept.name.length < rules.conceptNameMinLength) {
      errors.push(new ValidationError(
        `Concept name too short (${concept.name.length} < ${rules.conceptNameMinLength})`,
        'name',
        concept.name
      ));
      score -= 0.2;
    }

    if (concept.name.length > rules.conceptNameMaxLength) {
      errors.push(new ValidationError(
        `Concept name too long (${concept.name.length} > ${rules.conceptNameMaxLength})`,
        'name',
        concept.name
      ));
      score -= 0.1;
    }

    // Pattern validation
    if (!rules.conceptNamePattern.test(concept.name)) {
      errors.push(new ValidationError(
        'Concept name contains invalid characters',
        'name',
        concept.name
      ));
      score -= 0.15;
    }

    // Prohibited terms validation
    const nameLower = concept.name.toLowerCase();
    const hasProhibitedTerm = rules.prohibitedConceptTerms.some(term =>
      nameLower.includes(term.toLowerCase())
    );

    if (hasProhibitedTerm) {
      errors.push(new ValidationError(
        'Concept name contains prohibited terms',
        'name',
        concept.name
      ));
      score -= 0.4;
    }

    // Quality checks
    if (concept.name.trim() !== concept.name) {
      warnings.push('Concept name has leading/trailing whitespace');
      score -= 0.05;
    }

    if (concept.name.toUpperCase() === concept.name && concept.name.length > 5) {
      warnings.push('Concept name is in all caps');
      score -= 0.05;
    }

    if (/^\d/.test(concept.name)) {
      warnings.push('Concept name starts with a number');
      score -= 0.05;
    }
  }

  // Validate concept type
  const validTypes = ['topic', 'skill', 'fact', 'procedure', 'principle'];
  if (concept.type && !validTypes.includes(concept.type)) {
    errors.push(new ValidationError(
      `Invalid concept type: ${concept.type}`,
      'type',
      concept.type
    ));
    score -= 0.3;
  }

  // Validate difficulty
  if (concept.difficulty && (concept.difficulty < 1 || concept.difficulty > 5)) {
    errors.push(new ValidationError(
      'Difficulty must be between 1 and 5',
      'difficulty',
      concept.difficulty
    ));
    score -= 0.2;
  }

  // Validate confidence
  if (concept.confidence !== undefined) {
    if (concept.confidence < rules.minConfidenceScore || concept.confidence > rules.maxConfidenceScore) {
      errors.push(new ValidationError(
        `Confidence must be between ${rules.minConfidenceScore} and ${rules.maxConfidenceScore}`,
        'confidence',
        concept.confidence
      ));
      score -= 0.2;
    } else if (concept.confidence < 0.5) {
      warnings.push(`Low confidence score: ${concept.confidence.toFixed(2)}`);
      score -= 0.1;
    }
  }

  // Validate description
  if (concept.description) {
    if (concept.description.length < rules.minDescriptionLength) {
      warnings.push(`Description too short (${concept.description.length} < ${rules.minDescriptionLength})`);
      score -= 0.1;
    }

    if (concept.description.length > rules.maxDescriptionLength) {
      warnings.push(`Description too long (${concept.description.length} > ${rules.maxDescriptionLength})`);
      score -= 0.05;
    }

    if (concept.description.trim() !== concept.description) {
      warnings.push('Description has leading/trailing whitespace');
      score -= 0.02;
    }
  } else {
    warnings.push('Concept has no description');
    score -= 0.15;
  }

  // Validate evidence
  if (concept.evidence) {
    if (concept.evidence.length < rules.minEvidenceCount) {
      errors.push(new ValidationError(
        `Insufficient evidence (${concept.evidence.length} < ${rules.minEvidenceCount})`,
        'evidence',
        concept.evidence
      ));
      score -= 0.2;
    } else if (concept.evidence.length > rules.maxEvidenceCount) {
      warnings.push(`Too many evidence items (${concept.evidence.length} > ${rules.maxEvidenceCount})`);
      score -= 0.05;
    }

    // Validate individual evidence items
    concept.evidence.forEach((evidence, index) => {
      if (!evidence.text || evidence.text.trim().length === 0) {
        warnings.push(`Evidence item ${index + 1} has no text`);
        score -= 0.02;
      }

      if (evidence.confidence && (evidence.confidence < 0 || evidence.confidence > 1)) {
        warnings.push(`Evidence item ${index + 1} has invalid confidence score`);
        score -= 0.02;
      }
    });
  } else {
    errors.push(new ValidationError(
      'No evidence provided',
      'evidence',
      concept.evidence
    ));
    score -= 0.3;
  }

  // Validate relationships
  if (concept.relationships) {
    concept.relationships.forEach((rel, index) => {
      const relValidation = validateRelationship(rel, rules);
      if (!relValidation.isValid) {
        warnings.push(`Relationship ${index + 1} has validation issues`);
        score -= 0.05;
      }
    });
  }

  // Validate metadata
  if (concept.metadata) {
    if (concept.metadata.tags && concept.metadata.tags.length > 20) {
      warnings.push('Too many tags (maximum 20 recommended)');
      score -= 0.05;
    }

    if (concept.metadata.extractedBy?.length === 0) {
      warnings.push('No extraction method recorded in metadata');
      score -= 0.1;
    }
  }

  const finalScore = Math.max(0, score);
  const isValid = errors.length === 0 && finalScore >= rules.minQualityScore;

  return {
    isValid,
    errors,
    warnings,
    score: finalScore
  };
}

/**
 * Validate a relationship
 */
export function validateRelationship(
  relationship: ProposedRelationship,
  rules: ValidationRules = DEFAULT_VALIDATION_RULES
): {
  isValid: boolean;
  errors: ValidationError[];
  warnings: string[];
} {
  const errors: ValidationError[] = [];
  const warnings: string[] = [];

  // Validate required fields
  for (const field of rules.requiredRelationshipFields) {
    if (!(field in relationship) || relationship[field as keyof ProposedRelationship] === undefined) {
      errors.push(new ValidationError(
        `Missing required field: ${field}`,
        field,
        relationship[field as keyof ProposedRelationship]
      ));
    }
  }

  // Validate relationship type
  if (relationship.type && !rules.validRelationshipTypes.includes(relationship.type)) {
    errors.push(new ValidationError(
      `Invalid relationship type: ${relationship.type}`,
      'type',
      relationship.type
    ));
  }

  // Validate strength
  if (relationship.strength !== undefined) {
    const [min, max] = rules.relationshipStrengthRange;
    if (relationship.strength < min || relationship.strength > max) {
      errors.push(new ValidationError(
        `Relationship strength must be between ${min} and ${max}`,
        'strength',
        relationship.strength
      ));
    }
  }

  // Validate confidence
  if (relationship.confidence !== undefined) {
    if (relationship.confidence < 0 || relationship.confidence > 1) {
      errors.push(new ValidationError(
        'Relationship confidence must be between 0 and 1',
        'confidence',
        relationship.confidence
      ));
    } else if (relationship.confidence < 0.5) {
      warnings.push(`Low relationship confidence: ${relationship.confidence.toFixed(2)}`);
    }
  }

  // Validate target concept name
  if (relationship.targetConceptName) {
    if (relationship.targetConceptName.trim().length === 0) {
      errors.push(new ValidationError(
        'Target concept name cannot be empty',
        'targetConceptName',
        relationship.targetConceptName
      ));
    }

    if (relationship.targetConceptName.length > 100) {
      warnings.push('Target concept name is very long');
    }
  }

  // Validate evidence
  if (relationship.evidence && relationship.evidence.length > 0) {
    relationship.evidence.forEach((evidence, index) => {
      if (!evidence.text || evidence.text.trim().length === 0) {
        warnings.push(`Relationship evidence item ${index + 1} has no text`);
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate learning material
 */
export function validateLearningMaterial(
  material: LearningMaterial,
  rules: ValidationRules = DEFAULT_VALIDATION_RULES
): {
  isValid: boolean;
  errors: ValidationError[];
  warnings: string[];
  conceptScores: Record<string, number>;
} {
  const errors: ValidationError[] = [];
  const warnings: string[] = [];
  const conceptScores: Record<string, number> = {};

  // Validate material basic properties
  if (!material.title || material.title.trim().length === 0) {
    errors.push(new ValidationError(
      'Material title is required',
      'title',
      material.title
    ));
  }

  if (!material.content || material.content.trim().length === 0) {
    errors.push(new ValidationError(
      'Material content is required',
      'content',
      material.content
    ));
  }

  // Validate sections
  if (material.sections && material.sections.length > 0) {
    material.sections.forEach((section, index) => {
      if (!section.title || section.title.trim().length === 0) {
        warnings.push(`Section ${index + 1} has no title`);
      }

      if (!section.content || section.content.trim().length === 0) {
        warnings.push(`Section ${index + 1} has no content`);
      }

      if (section.estimatedTime < 0) {
        warnings.push(`Section ${index + 1} has invalid estimated time`);
      }
    });
  } else {
    warnings.push('Material has no sections');
  }

  // Validate concepts
  if (material.concepts && material.concepts.length > 0) {
    material.concepts.forEach(concept => {
      const validation = validateConcept(concept, rules);
      conceptScores[concept.id] = validation.score;

      if (!validation.isValid) {
        errors.push(...validation.errors);
      }
      warnings.push(...validation.warnings);
    });
  } else {
    warnings.push('Material has no extracted concepts');
  }

  // Validate learning path
  if (material.learningPath) {
    if (!material.learningPath.title || material.learningPath.title.trim().length === 0) {
      warnings.push('Learning path has no title');
    }

    if (material.learningPath.modules.length === 0) {
      warnings.push('Learning path has no modules');
    }

    if (material.learningPath.estimatedDuration < 0) {
      warnings.push('Learning path has invalid estimated duration');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    conceptScores
  };
}

/**
 * Batch validate concepts
 */
export function batchValidateConcepts(
  concepts: Concept[],
  rules: ValidationRules = DEFAULT_VALIDATION_RULES
): {
  validConcepts: Concept[];
  invalidConcepts: { concept: Concept; errors: ValidationError[] }[];
  warnings: string[];
  averageScore: number;
} {
  const validConcepts: Concept[] = [];
  const invalidConcepts: { concept: Concept; errors: ValidationError[] }[] = [];
  const allWarnings: string[] = [];
  let totalScore = 0;

  concepts.forEach(concept => {
    const validation = validateConcept(concept, rules);
    totalScore += validation.score;

    if (validation.isValid) {
      validConcepts.push(concept);
    } else {
      invalidConcepts.push({
        concept,
        errors: validation.errors
      });
    }

    allWarnings.push(...validation.warnings);
  });

  const averageScore = concepts.length > 0 ? totalScore / concepts.length : 0;

  return {
    validConcepts,
    invalidConcepts,
    warnings: [...new Set(allWarnings)], // Remove duplicates
    averageScore
  };
}

/**
 * Check for concept duplicates
 */
export function findConceptDuplicates(
  concepts: Concept[],
  similarityThreshold: number = 0.8
): Array<{
  group: Concept[];
  similarity: number;
  reason: string;
}> {
  const duplicates: Array<{ group: Concept[]; similarity: number; reason: string }> = [];
  const processed = new Set<string>();

  concepts.forEach((concept1, i) => {
    if (processed.has(concept1.id)) return;

    const similarConcepts: Concept[] = [concept1];
    let maxSimilarity = 0;
    let reason = '';

    concepts.forEach((concept2, j) => {
      if (i === j || processed.has(concept2.id)) return;

      // Check exact name match
      if (concept1.name.toLowerCase() === concept2.name.toLowerCase()) {
        similarConcepts.push(concept2);
        processed.add(concept2.id);
        maxSimilarity = 1.0;
        reason = 'Exact name match';
        return;
      }

      // Check partial name match
      const nameSimilarity = calculateNameSimilarity(concept1.name, concept2.name);
      if (nameSimilarity >= similarityThreshold) {
        similarConcepts.push(concept2);
        processed.add(concept2.id);
        maxSimilarity = Math.max(maxSimilarity, nameSimilarity);
        if (!reason) reason = `Name similarity: ${Math.round(nameSimilarity * 100)}%`;
      }
    });

    processed.add(concept1.id);

    if (similarConcepts.length > 1) {
      duplicates.push({
        group: similarConcepts,
        similarity: maxSimilarity,
        reason
      });
    }
  });

  return duplicates;
}

/**
 * Calculate name similarity
 */
function calculateNameSimilarity(name1: string, name2: string): number {
  const normalize = (name: string) =>
    name.toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();

  const norm1 = normalize(name1);
  const norm2 = normalize(name2);

  // Exact match
  if (norm1 === norm2) return 1.0;

  // Jaccard similarity on word sets
  const words1 = new Set(norm1.split(' '));
  const words2 = new Set(norm2.split(' '));
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);

  return intersection.size / union.size;
}

/**
 * Sanitize concept name
 */
export function sanitizeConceptName(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/[^\w\s\-_()[\]{}]/g, '') // Remove invalid characters
    .replace(/^\d+/, '') // Remove leading numbers
    .substring(0, 100); // Limit length
}

/**
 * Generate validation report
 */
export function generateValidationReport(
  concepts: Concept[],
  rules: ValidationRules = DEFAULT_VALIDATION_RULES
): {
  summary: {
    total: number;
    valid: number;
    invalid: number;
    averageScore: number;
    qualityDistribution: Record<string, number>;
  };
  details: Array<{
    concept: Concept;
    isValid: boolean;
    score: number;
    errors: ValidationError[];
    warnings: string[];
  }>;
  recommendations: string[];
} {
  const details = concepts.map(concept => {
    const validation = validateConcept(concept, rules);
    return {
      concept,
      isValid: validation.isValid,
      score: validation.score,
      errors: validation.errors,
      warnings: validation.warnings
    };
  });

  const validCount = details.filter(d => d.isValid).length;
  const totalScore = details.reduce((sum, d) => sum + d.score, 0);
  const averageScore = details.length > 0 ? totalScore / details.length : 0;

  // Quality distribution
  const qualityDistribution: Record<string, number> = {
    excellent: 0,    // 0.9 - 1.0
    good: 0,        // 0.7 - 0.9
    fair: 0,        // 0.5 - 0.7
    poor: 0         // 0.0 - 0.5
  };

  details.forEach(d => {
    if (d.score >= 0.9) qualityDistribution.excellent++;
    else if (d.score >= 0.7) qualityDistribution.good++;
    else if (d.score >= 0.5) qualityDistribution.fair++;
    else qualityDistribution.poor++;
  });

  // Generate recommendations
  const recommendations: string[] = [];

  if (averageScore < 0.7) {
    recommendations.push('Overall concept quality is below average. Consider reviewing extraction parameters.');
  }

  const noDescriptionCount = details.filter(d => !d.concept.description).length;
  if (noDescriptionCount > concepts.length * 0.3) {
    recommendations.push('Many concepts lack descriptions. Consider enabling description extraction.');
  }

  const lowEvidenceCount = details.filter(d => d.concept.evidence.length < 2).length;
  if (lowEvidenceCount > concepts.length * 0.5) {
    recommendations.push('Many concepts have insufficient evidence. Consider adjusting extraction sensitivity.');
  }

  const duplicates = findConceptDuplicates(concepts);
  if (duplicates.length > 0) {
    recommendations.push(`${duplicates.length} potential duplicate concept groups found. Consider running deduplication.`);
  }

  return {
    summary: {
      total: concepts.length,
      valid: validCount,
      invalid: concepts.length - validCount,
      averageScore,
      qualityDistribution
    },
    details,
    recommendations
  };
}