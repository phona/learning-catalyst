/**
 * =============================================================================
 * CONSOLIDATED RELATIONSHIP TYPES - SINGLE SOURCE OF TRUTH
 * =============================================================================
 *
 * ALL relationship types in the application should be imported from this file.
 * This ensures type safety, consistency, and easy maintenance across:
 * - AI extraction (prompts.ts)
 * - Database schema (database.ts)
 * - UI components
 * - Business logic
 *
 * NEVER define relationship types elsewhere!
 * =============================================================================
 */

/**
 * Standard relationship types for educational content.
 *
 * DESIGN RATIONALE:
 * These types cover the full spectrum of educational relationships while
 * maintaining semantic clarity and avoiding ambiguity.
 *
 * GROUPING BY STRENGTH:
 * - Strong dependencies: prerequisite, depends_on, builds_upon
 * - Structural: part_of, generalizes, specializes
 * - Similarity: similar_to, related_to
 * - Learning flow: leads_to, applies_to, example_of
 * - Contrast: contrasts_with
 */
export const RELATIONSHIP_TYPES = {
  // Learning prerequisites (must understand A before B)
  PREREQUISITE: 'prerequisite',

  // Strong dependency (B cannot exist/function without A)
  DEPENDS_ON: 'depends_on',

  // Sequential learning (A leads to understanding B)
  BUILDS_UPON: 'builds_upon',

  // Learning progression (after A, you can learn B)
  LEADS_TO: 'leads_to',

  // Structural hierarchy
  PART_OF: 'part_of',

  // Abstraction levels
  GENERALIZES: 'generalizes',
  SPECIALIZES: 'specializes',

  // Conceptual similarity
  SIMILAR_TO: 'similar_to',

  // General association
  RELATED_TO: 'related_to',

  // Learning applications
  APPLIES_TO: 'applies_to',

  // Concrete examples
  EXAMPLE_OF: 'example_of',

  // Conceptual opposition
  CONTRASTS_WITH: 'contrasts_with',
} as const;

/**
 * Type-level relationship types for TypeScript.
 * Use this in interfaces and type annotations.
 */
export type RelationshipType = typeof RELATIONSHIP_TYPES[keyof typeof RELATIONSHIP_TYPES];

/**
 * Array of all valid relationship type values.
 * Useful for validation, dropdowns, etc.
 * Formatted as a readonly tuple for Zod compatibility.
 */
export const RELATIONSHIP_TYPE_VALUES = [
  'prerequisite',
  'depends_on',
  'builds_upon',
  'leads_to',
  'part_of',
  'generalizes',
  'specializes',
  'similar_to',
  'related_to',
  'applies_to',
  'example_of',
  'contrasts_with',
] as const satisfies readonly RelationshipType[];

/**
 * Metadata for each relationship type.
 * Used for UI display, color coding, icons, etc.
 */
export const RELATIONSHIP_TYPE_META: Record<
  RelationshipType,
  {
    label: string;
    description: string;
    color: string; // Hex color for UI
    bidirectional: boolean; // Can the relationship be bidirectional?
    strength: 'weak' | 'medium' | 'strong'; // Typical strength
    category: 'dependency' | 'structural' | 'similarity' | 'learning' | 'contrast';
  }
> = {
  prerequisite: {
    label: 'Prerequisite',
    description: 'Must understand A before B',
    color: '#e74c3c',
    bidirectional: false,
    strength: 'strong',
    category: 'dependency',
  },
  depends_on: {
    label: 'Depends On',
    description: 'B cannot exist/function without A',
    color: '#c0392b',
    bidirectional: false,
    strength: 'strong',
    category: 'dependency',
  },
  builds_upon: {
    label: 'Builds Upon',
    description: 'B extends or expands on A',
    color: '#d35400',
    bidirectional: false,
    strength: 'strong',
    category: 'dependency',
  },
  leads_to: {
    label: 'Leads To',
    description: 'Learning A enables understanding B',
    color: '#e67e22',
    bidirectional: false,
    strength: 'medium',
    category: 'learning',
  },
  part_of: {
    label: 'Part Of',
    description: 'B is a component of A',
    color: '#3498db',
    bidirectional: false,
    strength: 'medium',
    category: 'structural',
  },
  generalizes: {
    label: 'Generalizes',
    description: 'A is the general case of B',
    color: '#2980b9',
    bidirectional: false,
    strength: 'medium',
    category: 'structural',
  },
  specializes: {
    label: 'Specializes',
    description: 'B is a specific case of A',
    color: '#2980b9',
    bidirectional: false,
    strength: 'medium',
    category: 'structural',
  },
  similar_to: {
    label: 'Similar To',
    description: 'A and B share common properties',
    color: '#16a085',
    bidirectional: true,
    strength: 'weak',
    category: 'similarity',
  },
  related_to: {
    label: 'Related To',
    description: 'A and B are connected',
    color: '#27ae60',
    bidirectional: true,
    strength: 'weak',
    category: 'similarity',
  },
  applies_to: {
    label: 'Applies To',
    description: 'A theory applies to B',
    color: '#8e44ad',
    bidirectional: false,
    strength: 'medium',
    category: 'learning',
  },
  example_of: {
    label: 'Example Of',
    description: 'B is a concrete example of A',
    color: '#9b59b6',
    bidirectional: false,
    strength: 'weak',
    category: 'learning',
  },
  contrasts_with: {
    label: 'Contrasts With',
    description: 'A and B are opposites',
    color: '#7f8c8d',
    bidirectional: true,
    strength: 'medium',
    category: 'contrast',
  },
} as const;

/**
 * Check if a string is a valid relationship type.
 */
export function isRelationshipType(value: unknown): value is RelationshipType {
  return typeof value === 'string' && RELATIONSHIP_TYPE_VALUES.includes(value as RelationshipType);
}

/**
 * Get metadata for a relationship type.
 * Throws if the type is invalid.
 */
export function getRelationshipTypeMeta(type: RelationshipType) {
  return RELATIONSHIP_TYPE_META[type];
}

/**
 * Group relationship types by category.
 */
export const RELATIONSHIP_TYPES_BY_CATEGORY = Object.entries(
  RELATIONSHIP_TYPE_META,
).reduce((acc, [type, meta]) => {
  const category = meta.category;
  if (!acc[category]) {
    acc[category] = [];
  }
  acc[category].push(type as RelationshipType);
  return acc;
}, {} as Record<string, RelationshipType[]>);

// Legacy type alias for backward compatibility
export type { RelationshipType as ConceptRelationshipType };
