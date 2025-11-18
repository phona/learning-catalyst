/**
 * Format Utilities
 *
 * Utility functions for formatting concepts, relationships, and learning materials
 * for different output formats (JSON, CSV, Markdown, etc.).
 */

import { Concept, ProposedRelationship, LearningMaterial, LearningPath } from '@/shared/types/concept-parsing';

/**
 * Format options
 */
export interface FormatOptions {
  includeMetadata?: boolean;
  includeEvidence?: boolean;
  includeRelationships?: boolean;
  compact?: boolean;
  sortBy?: 'name' | 'confidence' | 'difficulty' | 'recent';
  filter?: {
    types?: string[];
    difficultyRange?: [number, number];
    confidenceRange?: [number, number];
  };
}

/**
 * Format concepts as JSON
 */
export function formatConceptsAsJSON(
  concepts: Concept[],
  options: FormatOptions = {}
): string {
  const {
    includeMetadata = true,
    includeEvidence = true,
    includeRelationships = true,
    compact = false,
    sortBy = 'name'
  } = options;

  let formattedConcepts = [...concepts];

  // Apply filters
  if (options.filter) {
    formattedConcepts = applyFilters(formattedConcepts, options.filter);
  }

  // Sort
  formattedConcepts = sortConcepts(formattedConcepts, sortBy);

  // Format each concept
  const formatted = formattedConcepts.map(concept => {
    const formattedConcept: any = {
      id: concept.id,
      name: concept.name,
      type: concept.type,
      difficulty: concept.difficulty,
      confidence: concept.confidence,
      extractedAt: concept.extractedAt.toISOString()
    };

    if (concept.description) {
      formattedConcept.description = concept.description;
    }

    if (includeEvidence && concept.evidence.length > 0) {
      formattedConcept.evidence = concept.evidence.map(e => ({
        text: e.text,
        context: e.context,
        position: e.position,
        confidence: e.confidence,
        sourceType: e.sourceType
      }));
    }

    if (includeRelationships && concept.relationships.length > 0) {
      formattedConcept.relationships = concept.relationships.map(r => ({
        targetConceptName: r.targetConceptName,
        type: r.type,
        strength: r.strength,
        confidence: r.confidence,
        description: r.description
      }));
    }

    if (includeMetadata) {
      formattedConcept.metadata = concept.metadata;
    }

    return formattedConcept;
  });

  return JSON.stringify(formatted, null, compact ? 0 : 2);
}

/**
 * Format concepts as CSV
 */
export function formatConceptsAsCSV(
  concepts: Concept[],
  options: FormatOptions = {}
): string {
  const {
    includeMetadata = false,
    includeEvidence = false,
    sortBy = 'name'
  } = options;

  let formattedConcepts = [...concepts];

  // Apply filters
  if (options.filter) {
    formattedConcepts = applyFilters(formattedConcepts, options.filter);
  }

  // Sort
  formattedConcepts = sortConcepts(formattedConcepts, sortBy);

  // CSV headers
  const headers = [
    'ID',
    'Name',
    'Type',
    'Difficulty',
    'Confidence',
    'Description',
    'Evidence Count',
    'Relationship Count',
    'Tags',
    'Extracted At'
  ];

  if (includeMetadata) {
    headers.push('Extraction Method', 'Validation Score');
  }

  if (includeEvidence) {
    headers.push('Evidence Text', 'Evidence Confidence');
  }

  // Format rows
  const rows = formattedConcepts.map(concept => {
    const row = [
      concept.id,
      `"${concept.name.replace(/"/g, '""')}"`, // Escape quotes
      concept.type,
      concept.difficulty.toString(),
      concept.confidence.toFixed(3),
      `"${(concept.description || '').replace(/"/g, '""')}"`,
      concept.evidence.length.toString(),
      concept.relationships.length.toString(),
      `"${concept.metadata.tags.join('; ')}"`,
      concept.extractedAt.toISOString()
    ];

    if (includeMetadata) {
      row.push(concept.metadata.extractionMethod, concept.metadata.validationScore?.toFixed(3) || '');
    }

    if (includeEvidence) {
      const primaryEvidence = concept.evidence[0];
      if (primaryEvidence) {
        row.push(
          `"${primaryEvidence.text.replace(/"/g, '""')}"`,
          primaryEvidence.confidence.toFixed(3)
        );
      } else {
        row.push('', '');
      }
    }

    return row.join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

/**
 * Format concepts as Markdown
 */
export function formatConceptsAsMarkdown(
  concepts: Concept[],
  options: FormatOptions = {}
): string {
  const {
    includeMetadata = true,
    includeEvidence = true,
    includeRelationships = true,
    sortBy = 'confidence',
    filter
  } = options;

  let formattedConcepts = [...concepts];

  // Apply filters
  if (filter) {
    formattedConcepts = applyFilters(formattedConcepts, filter);
  }

  // Sort
  formattedConcepts = sortConcepts(formattedConcepts, sortBy);

  let markdown = '# Extracted Concepts\n\n';

  // Add summary statistics
  const stats = generateConceptStatistics(formattedConcepts);
  markdown += '## Summary\n\n';
  markdown += `- **Total Concepts:** ${stats.total}\n`;
  markdown += `- **Average Confidence:** ${stats.averageConfidence.toFixed(2)}\n`;
  markdown += `- **Types:** ${Object.entries(stats.typeDistribution)
    .map(([type, count]) => `${type} (${count})`)
    .join(', ')}\n`;
  markdown += `- **Difficulty:** ${Object.entries(stats.difficultyDistribution)
    .map(([diff, count]) => `Level ${diff} (${count})`)
    .join(', ')}\n\n`;

  // Format each concept
  formattedConcepts.forEach((concept, index) => {
    markdown += `## ${index + 1}. ${concept.name}\n\n`;

    // Basic info
    markdown += `**Type:** ${concept.type}  \n`;
    markdown += `**Difficulty:** ${'⭐'.repeat(concept.difficulty)} (${concept.difficulty}/5)  \n`;
    markdown += `**Confidence:** ${Math.round(concept.confidence * 100)}%  \n`;
    markdown += `**Extracted:** ${concept.extractedAt.toLocaleDateString()}\n\n`;

    // Description
    if (concept.description) {
      markdown += `### Description\n\n${concept.description}\n\n`;
    }

    // Evidence
    if (includeEvidence && concept.evidence.length > 0) {
      markdown += `### Evidence (${concept.evidence.length} sources)\n\n`;
      concept.evidence.forEach((evidence, i) => {
        markdown += `${i + 1}. "${evidence.text}" (Confidence: ${Math.round(evidence.confidence * 100)}%)\n`;
        if (evidence.context && evidence.context !== evidence.text) {
          markdown += `   *Context: ${evidence.context.substring(0, 100)}...*\n`;
        }
      });
      markdown += '\n';
    }

    // Relationships
    if (includeRelationships && concept.relationships.length > 0) {
      markdown += `### Relationships\n\n`;
      concept.relationships.forEach(rel => {
        const emoji = getRelationshipEmoji(rel.type);
        markdown += `- ${emoji} **${rel.type}:** ${rel.targetConceptName}`;
        if (rel.description) {
          markdown += ` - ${rel.description}`;
        }
        markdown += ` (${Math.round(rel.confidence * 100)}% confidence)\n`;
      });
      markdown += '\n';
    }

    // Metadata
    if (includeMetadata) {
      markdown += `### Metadata\n\n`;
      if (concept.metadata.tags.length > 0) {
        markdown += `**Tags:** ${concept.metadata.tags.join(', ')}  \n`;
      }
      markdown += `**Extraction Method:** ${concept.metadata.extractionMethod}  \n`;
      if (concept.metadata.validationScore) {
        markdown += `**Validation Score:** ${Math.round(concept.metadata.validationScore * 100)}%  \n`;
      }
      markdown += '\n';
    }

    markdown += '---\n\n';
  });

  return markdown;
}

/**
 * Format learning path as Markdown
 */
export function formatLearningPathAsMarkdown(path: LearningPath): string {
  let markdown = `# ${path.title}\n\n`;

  if (path.description) {
    markdown += `${path.description}\n\n`;
  }

  // Path summary
  markdown += '## Learning Path Summary\n\n';
  markdown += `- **Estimated Duration:** ${path.estimatedDuration} minutes\n`;
  markdown += `- **Difficulty Level:** ${'⭐'.repeat(path.difficulty)} (${path.difficulty}/5)\n`;
  markdown += `- **Number of Modules:** ${path.modules.length}\n`;
  markdown += `- **Target Mastery:** ${path.targetMastery}/5\n\n`;

  // Progress (if available)
  if (path.progress && path.progress.userId) {
    markdown += '## Your Progress\n\n';
    markdown += `- **Current Module:** ${path.progress.currentModule || 'Not started'}\n`;
    markdown += `- **Completed Modules:** ${path.progress.completedModules.length}/${path.modules.length}\n`;
    markdown += `- **Mastery Level:** ${path.progress.masteryLevel}/5\n`;
    markdown += `- **Completion Rate:** ${Math.round(path.progress.completionRate * 100)}%\n\n`;
  }

  // Modules
  markdown += '## Learning Modules\n\n';

  path.modules.forEach((module, index) => {
    const status = path.progress?.completedModules.includes(module.id) ? '✅' : '⏳';
    markdown += `### ${status} Module ${index + 1}: ${module.title}\n\n`;

    if (module.description) {
      markdown += `${module.description}\n\n`;
    }

    markdown += `- **Estimated Time:** ${module.estimatedTime} minutes\n`;
    markdown += `- **Difficulty:** ${'⭐'.repeat(module.difficulty)} (${module.difficulty}/5)\n`;
    markdown += `- **Concepts:** ${module.concepts.length}\n`;
    if (module.isOptional) {
      markdown += `- **Status:** Optional\n`;
    }

    markdown += '\n';
  });

  return markdown;
}

/**
 * Format concepts as HTML table
 */
export function formatConceptsAsHTMLTable(
  concepts: Concept[],
  options: FormatOptions = {}
): string {
  const {
    includeMetadata = false,
    sortBy = 'name',
    filter
  } = options;

  let formattedConcepts = [...concepts];

  // Apply filters
  if (filter) {
    formattedConcepts = applyFilters(formattedConcepts, filter);
  }

  // Sort
  formattedConcepts = sortConcepts(formattedConcepts, sortBy);

  let html = `
<table class="concepts-table">
  <thead>
    <tr>
      <th>Name</th>
      <th>Type</th>
      <th>Difficulty</th>
      <th>Confidence</th>
      <th>Description</th>
      <th>Evidence</th>
      <th>Relationships</th>`;

  if (includeMetadata) {
    html += '<th>Tags</th><th>Method</th>';
  }

  html += `
    </tr>
  </thead>
  <tbody>
`;

  formattedConcepts.forEach(concept => {
    html += '<tr>';
    html += `<td><strong>${escapeHtml(concept.name)}</strong></td>`;
    html += `<td><span class="type-${concept.type}">${concept.type}</span></td>`;
    html += `<td>${'⭐'.repeat(concept.difficulty)}</td>`;
    html += `<td>${Math.round(concept.confidence * 100)}%</td>`;
    html += `<td>${escapeHtml(concept.description || '').substring(0, 100)}${concept.description && concept.description.length > 100 ? '...' : ''}</td>`;
    html += `<td>${concept.evidence.length}</td>`;
    html += `<td>${concept.relationships.length}</td>`;

    if (includeMetadata) {
      html += `<td>${concept.metadata.tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join(' ')}</td>`;
      html += `<td>${concept.metadata.extractionMethod}</td>`;
    }

    html += '</tr>\n';
  });

  html += `
  </tbody>
</table>`;

  return html;
}

/**
 * Format learning material for export
 */
export function formatLearningMaterialForExport(
  material: LearningMaterial,
  format: 'json' | 'markdown' | 'html' = 'json'
): string {
  switch (format) {
  case 'json':
    return JSON.stringify(material, null, 2);
  case 'markdown':
    return formatLearningMaterialAsMarkdown(material);
  case 'html':
    return formatLearningMaterialAsHTML(material);
  default:
    throw new Error(`Unsupported format: ${format}`);
  }
}

/**
 * Format learning material as Markdown
 */
function formatLearningMaterialAsMarkdown(material: LearningMaterial): string {
  let markdown = `# ${material.title}\n\n`;

  if (material.content) {
    markdown += `${material.content}\n\n`;
  }

  // Learning path
  if (material.learningPath) {
    markdown += formatLearningPathAsMarkdown(material.learningPath);
    markdown += '\n';
  }

  // Concepts
  if (material.concepts.length > 0) {
    markdown += formatConceptsAsMarkdown(material.concepts, {
      includeMetadata: true,
      includeEvidence: true,
      includeRelationships: true
    });
  }

  return markdown;
}

/**
 * Format learning material as HTML
 */
function formatLearningMaterialAsHTML(material: LearningMaterial): string {
  let html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(material.title)}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }
        .concept { border: 1px solid #e0e0e0; border-radius: 8px; padding: 16px; margin: 16px 0; }
        .concept h3 { margin-top: 0; color: #333; }
        .type-topic { color: #2196F3; }
        .type-skill { color: #4CAF50; }
        .type-fact { color: #FF9800; }
        .type-procedure { color: #9C27B0; }
        .type-principle { color: #F44336; }
        .evidence { background: #f5f5f5; padding: 8px; border-radius: 4px; margin: 4px 0; font-style: italic; }
        .tag { background: #e3f2fd; color: #1976d2; padding: 2px 8px; border-radius: 12px; font-size: 0.8em; margin: 2px; }
    </style>
</head>
<body>
    <h1>${escapeHtml(material.title)}</h1>
`;

  if (material.content) {
    html += `<div class="content">${escapeHtml(material.content).replace(/\n/g, '<br>')}</div>`;
  }

  // Concepts
  if (material.concepts.length > 0) {
    html += '<h2>Extracted Concepts</h2>';
    material.concepts.forEach(concept => {
      html += `
        <div class="concept">
            <h3 class="type-${concept.type}">${escapeHtml(concept.name)}</h3>
            <p><strong>Type:</strong> ${concept.type} | <strong>Difficulty:</strong> ${'⭐'.repeat(concept.difficulty)} | <strong>Confidence:</strong> ${Math.round(concept.confidence * 100)}%</p>
            ${concept.description ? `<p>${escapeHtml(concept.description)}</p>` : ''}
            ${concept.metadata.tags.length > 0 ? `<p><strong>Tags:</strong> ${concept.metadata.tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join(' ')}</p>` : ''}
        </div>
      `;
    });
  }

  html += `
</body>
</html>`;

  return html;
}

/**
 * Helper function to sort concepts
 */
function sortConcepts(concepts: Concept[], sortBy: string): Concept[] {
  return [...concepts].sort((a, b) => {
    switch (sortBy) {
    case 'name':
      return a.name.localeCompare(b.name);
    case 'confidence':
      return b.confidence - a.confidence;
    case 'difficulty':
      return a.difficulty - b.difficulty;
    case 'recent':
      return b.extractedAt.getTime() - a.extractedAt.getTime();
    default:
      return 0;
    }
  });
}

/**
 * Helper function to apply filters
 */
function applyFilters(concepts: Concept[], filter: any): Concept[] {
  return concepts.filter(concept => {
    if (filter.types && !filter.types.includes(concept.type)) {
      return false;
    }

    if (filter.difficultyRange) {
      const [min, max] = filter.difficultyRange;
      if (concept.difficulty < min || concept.difficulty > max) {
        return false;
      }
    }

    if (filter.confidenceRange) {
      const [min, max] = filter.confidenceRange;
      if (concept.confidence < min || concept.confidence > max) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Generate concept statistics
 */
function generateConceptStatistics(concepts: Concept[]) {
  const stats = {
    total: concepts.length,
    averageConfidence: 0,
    typeDistribution: {} as Record<string, number>,
    difficultyDistribution: {} as Record<string, number>
  };

  if (concepts.length === 0) return stats;

  stats.averageConfidence = concepts.reduce((sum, c) => sum + c.confidence, 0) / concepts.length;

  concepts.forEach(concept => {
    stats.typeDistribution[concept.type] = (stats.typeDistribution[concept.type] || 0) + 1;
    stats.difficultyDistribution[concept.difficulty.toString()] = (stats.difficultyDistribution[concept.difficulty.toString()] || 0) + 1;
  });

  return stats;
}

/**
 * Get emoji for relationship type
 */
function getRelationshipEmoji(type: string): string {
  const emojis = {
    prerequisite: '🔗',
    related: '🔗',
    contains: '📦',
    example: '💡',
    application: '🛠️',
    contrasts: '⚖️'
  };
  return emojis[type as keyof typeof emojis] || '🔗';
}

/**
 * Escape HTML characters
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Generate export filename
 */
export function generateExportFilename(
  title: string,
  format: 'json' | 'csv' | 'markdown' | 'html',
  timestamp?: Date
): string {
  const date = timestamp || new Date();
  const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
  const timeStr = date.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS

  const safeTitle = title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 50);

  return `${safeTitle}-concepts-${dateStr}-${timeStr}.${format}`;
}

/**
 * Validate export format
 */
export function validateExportFormat(format: string): format is 'json' | 'csv' | 'markdown' | 'html' {
  return ['json', 'csv', 'markdown', 'html'].includes(format);
}

/**
 * Get format MIME type
 */
export function getFormatMimeType(format: string): string {
  const mimeTypes = {
    json: 'application/json',
    csv: 'text/csv',
    markdown: 'text/markdown',
    html: 'text/html'
  };
  return mimeTypes[format as keyof typeof mimeTypes] || 'application/octet-stream';
}