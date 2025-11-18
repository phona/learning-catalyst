/**
 * Parameterized Exercise Templates
 *
 * Dynamic exercise templates with parameter generation for context-aware
 * challenge creation. Supports multiple exercise types, difficulty levels,
 * and adaptive parameter selection.
 */

import { VibeType } from '@/shared/types/practice';

export interface ExerciseTemplate {
  id: string;
  name: string;
  description: string;
  type: ExerciseType;
  category: ExerciseCategory;
  difficulty: 'easy' | 'medium' | 'hard';
  parameters: TemplateParameter[];
  template: string;
  solutionTemplate: string;
  hintTemplates: string[];
  prerequisites: string[];
  learningObjectives: string[];
  estimatedTime: number;
  variations: TemplateVariation[];
}

export interface TemplateParameter {
  name: string;
  type: 'string' | 'number' | 'array' | 'boolean' | 'enum' | 'range';
  required: boolean;
  description: string;
  defaultValue?: any;
  constraints?: ParameterConstraint;
  generationRules?: GenerationRule[];
}

export interface ParameterConstraint {
  min?: number;
  max?: number;
  options?: string[];
  pattern?: string;
  dependsOn?: string[];
}

export interface GenerationRule {
  condition: string;
  action: 'set' | 'exclude' | 'transform';
  value: any;
  priority: number;
}

export interface TemplateVariation {
  id: string;
  name: string;
  description: string;
  parameterOverrides: Record<string, any>;
  conditions: {
    difficulty?: 'easy' | 'medium' | 'hard';
    userLevel?: 'beginner' | 'intermediate' | 'advanced';
    vibeType?: VibeType;
    topicContext?: string[];
  };
}

export type ExerciseType =
  | 'multiple-choice'
  | 'short-answer'
  | 'coding'
  | 'practical'
  | 'simulation'
  | 'project'
  | 'debugging'
  | 'refactoring'
  | 'design'
  | 'analysis';

export type ExerciseCategory =
  | 'programming'
  | 'algorithms'
  | 'data-structures'
  | 'web-development'
  | 'database'
  | 'system-design'
  | 'testing'
  | 'debugging'
  | 'mathematics'
  | 'logic'
  | 'language'
  | 'science';

export interface ParameterizedExercise {
  id: string;
  templateId: string;
  parameters: Record<string, any>;
  generatedExercise: any;
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedTime: number;
  prerequisites: string[];
  learningObjectives: string[];
}

/**
 * Exercise Template Registry
 */
export class ExerciseTemplateRegistry {
  private readonly templates = new Map<string, ExerciseTemplate>();
  private readonly templatesByType = new Map<ExerciseType, ExerciseTemplate[]>();
  private readonly templatesByCategory = new Map<ExerciseCategory, ExerciseTemplate[]>();

  constructor() {
    this.initializeBuiltinTemplates();
  }

  /**
   * Get template by ID
   */
  getTemplate(id: string): ExerciseTemplate | undefined {
    return this.templates.get(id);
  }

  /**
   * Get templates by type
   */
  getTemplatesByType(type: ExerciseType): ExerciseTemplate[] {
    return this.templatesByType.get(type) || [];
  }

  /**
   * Get templates by category
   */
  getTemplatesByCategory(category: ExerciseCategory): ExerciseTemplate[] {
    return this.templatesByCategory.get(category) || [];
  }

  /**
   * Get templates filtered by criteria
   */
  getFilteredTemplates(criteria: {
    type?: ExerciseType;
    category?: ExerciseCategory;
    difficulty?: 'easy' | 'medium' | 'hard';
    vibeType?: VibeType;
    topicContext?: string[];
  }): ExerciseTemplate[] {
    let templates = Array.from(this.templates.values());

    if (criteria.type) {
      templates = templates.filter(t => t.type === criteria.type);
    }

    if (criteria.category) {
      templates = templates.filter(t => t.category === criteria.category);
    }

    if (criteria.difficulty) {
      templates = templates.filter(t => t.difficulty === criteria.difficulty);
    }

    if (criteria.vibeType || criteria.topicContext) {
      templates = templates.filter(template => {
        return template.variations.some(variation => {
          if (criteria.vibeType && variation.conditions.vibeType !== criteria.vibeType) {
            return false;
          }
          if (criteria.topicContext && variation.conditions.topicContext) {
            const hasMatchingTopic = criteria.topicContext.some(topic =>
              variation.conditions.topicContext!.includes(topic)
            );
            if (!hasMatchingTopic) return false;
          }
          return true;
        });
      });
    }

    return templates;
  }

  /**
   * Register a new template
   */
  registerTemplate(template: ExerciseTemplate): void {
    this.templates.set(template.id, template);

    // Update type index
    if (!this.templatesByType.has(template.type)) {
      this.templatesByType.set(template.type, []);
    }
    this.templatesByType.get(template.type)!.push(template);

    // Update category index
    if (!this.templatesByCategory.has(template.category)) {
      this.templatesByCategory.set(template.category, []);
    }
    this.templatesByCategory.get(template.category)!.push(template);
  }

  /**
   * Initialize built-in templates
   */
  private initializeBuiltinTemplates(): void {
    // Programming templates
    this.registerTemplate(this.createJavaScriptFunctionTemplate());
    this.registerTemplate(this.createReactComponentTemplate());
    this.registerTemplate(this.createAlgorithmTemplate());
    this.registerTemplate(this.createDataStructureTemplate());
    this.registerTemplate(this.createDebuggingTemplate());

    // Web development templates
    this.registerTemplate(this.createCSSStylingTemplate());
    this.registerTemplate(this.createHTMLStructureTemplate());
    this.registerTemplate(this.createAPIEndpointTemplate());

    // Database templates
    this.registerTemplate(this.createSQLQueryTemplate());
    this.registerTemplate(this.createDatabaseDesignTemplate());

    // Testing templates
    this.registerTemplate(this.createUnitTestTemplate());
    this.registerTemplate(this.createIntegrationTestTemplate());

    // Mathematics templates
    this.registerTemplate(this.createMathProblemTemplate());
    this.registerTemplate(this.createLogicPuzzleTemplate());
  }

  /**
   * JavaScript Function Template
   */
  private createJavaScriptFunctionTemplate(): ExerciseTemplate {
    return {
      id: 'js-function-implementation',
      name: 'JavaScript Function Implementation',
      description: 'Implement a JavaScript function with specific requirements',
      type: 'coding',
      category: 'programming',
      difficulty: 'medium',
      parameters: [
        {
          name: 'functionName',
          type: 'string',
          required: true,
          description: 'Name of the function to implement',
          constraints: { pattern: '^[a-zA-Z_$][a-zA-Z0-9_$]*$' }
        },
        {
          name: 'parameters',
          type: 'array',
          required: true,
          description: 'Array of parameter names and types',
          defaultValue: ['value: number', 'options: object']
        },
        {
          name: 'functionality',
          type: 'string',
          required: true,
          description: 'What the function should do',
          constraints: { min: 10, max: 200 }
        },
        {
          name: 'edgeCases',
          type: 'array',
          required: false,
          description: 'Edge cases to handle',
          defaultValue: ['null input', 'empty array', 'invalid types']
        },
        {
          name: 'complexity',
          type: 'enum',
          required: false,
          description: 'Time complexity requirement',
          defaultValue: 'O(n)',
          constraints: { options: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)', 'O(n²)'] }
        }
      ],
      template: String.raw`Implement a JavaScript function called \${functionName} that:

\${functionality}

**Function Signature:**
\`\`\`javascript
function \${functionName}(\${parameters.join(', ')}) {
  // Your implementation here
}
\`\`\`

**Requirements:**
- Handle the following edge cases: \${edgeCases.join(', ')}
- Time complexity: \${complexity}
- Include proper error handling
- Add JSDoc comments

**Example Usage:**
\`\`\`javascript
// Provide examples of how to use the function
\`\`\``,
      solutionTemplate: String.raw`Here's a solution for the \${functionName} function:

\`\`\`javascript
/**
 * \${functionality}
 * @param {\${parameters.map(p => p.split(':')[0]).join(', ')}}
 * @returns {description}
 */
function \${functionName}(\${parameters.join(', ')}) {
  // Implementation would go here
  // This is a template for the solution structure
}
\`\`\`

**Key Points:**
- The solution handles all specified edge cases
- Time complexity meets the requirement of \${complexity}
- Proper error handling is included`,
      hintTemplates: [
        'Start by considering the basic case without edge cases',
        String.raw`Think about how to handle \${edgeCases[0]}`,
        'Consider using built-in JavaScript methods that could help',
        'Make sure to validate your inputs before processing'
      ],
      prerequisites: ['Basic JavaScript syntax', 'Function declarations', 'Error handling'],
      learningObjectives: [
        'JavaScript function implementation',
        'Edge case handling',
        'Time complexity optimization',
        'Code documentation with JSDoc'
      ],
      estimatedTime: 25,
      variations: [
        {
          id: 'beginner-friendly',
          name: 'Beginner Friendly',
          description: 'Simplified version for beginners',
          parameterOverrides: {
            complexity: 'O(1)',
            edgeCases: ['null input']
          },
          conditions: {
            difficulty: 'easy',
            userLevel: 'beginner'
          }
        },
        {
          id: 'advanced-optimization',
          name: 'Advanced Optimization',
          description: 'Complex version requiring optimization',
          parameterOverrides: {
            complexity: 'O(log n)',
            edgeCases: ['null input', 'empty array', 'invalid types', 'large datasets', 'memory limits']
          },
          conditions: {
            difficulty: 'hard',
            userLevel: 'advanced'
          }
        }
      ]
    };
  }

  /**
   * React Component Template
   */
  private createReactComponentTemplate(): ExerciseTemplate {
    return {
      id: 'react-component-creation',
      name: 'React Component Creation',
      description: 'Create a React component with specific functionality',
      type: 'coding',
      category: 'web-development',
      difficulty: 'medium',
      parameters: [
        {
          name: 'componentName',
          type: 'string',
          required: true,
          description: 'Name of the React component'
        },
        {
          name: 'props',
          type: 'array',
          required: true,
          description: 'Props that the component accepts',
          defaultValue: ['data: array', 'onSelect: function']
        },
        {
          name: 'functionality',
          type: 'string',
          required: true,
          description: 'What the component should do'
        },
        {
          name: 'hooks',
          type: 'array',
          required: false,
          description: 'React hooks to use',
          defaultValue: ['useState', 'useEffect']
        },
        {
          name: 'styling',
          type: 'enum',
          required: false,
          description: 'Styling approach',
          defaultValue: 'CSS modules',
          constraints: { options: ['CSS modules', 'styled-components', 'inline styles', 'Tailwind CSS'] }
        }
      ],
      template: String.raw`Create a React component called \${componentName} that:

\${functionality}

**Props:**
\${props.map(prop => \`- \${prop}\`).join('\\n')}

**Requirements:**
- Use React hooks: \${hooks.join(', ')}
- Implement proper prop validation with PropTypes or TypeScript
- Use \${styling} for styling
- Include accessibility features
- Add error boundaries where appropriate

**Component Structure:**
\`\`\`jsx
import React, { \${hooks.join(', ')} } from 'react';

function \${componentName}({ \${props.map(p => p.split(':')[0]).join(', ')} }) {
  // Your implementation here

  return (
    <div className="\${componentName.toLowerCase()}">
      {/* Component JSX */}
    </div>
  );
}

export default \${componentName};
\`\`\``,
      solutionTemplate: String.raw`Here's a solution for the \${componentName} component:

\`\`\`jsx
import React, { \${hooks.join(', ')} } from 'react';
import PropTypes from 'prop-types';

function \${componentName}({ \${props.map(p => p.split(':')[0]).join(', ')} }) {
  // Component implementation would go here

  return (
    <div className="\${componentName.toLowerCase()}">
      {/* Component JSX implementation */}
    </div>
  );
}

\${componentName}.propTypes = {
  \${props.map(prop => {
    const [name, type] = prop.split(':');
    return String.raw\`\${name}: PropTypes.\${type},\`;
  }).join('\n  ')}
};

export default \${componentName};
\`\`\``,
      hintTemplates: [
        'Start by planning the component\'s state management',
        String.raw`Consider the component lifecycle with \${hooks[0]}`,
        'Think about accessibility from the beginning',
        'Plan your styling approach before writing JSX'
      ],
      prerequisites: ['React basics', 'JSX syntax', 'React hooks', 'Component props'],
      learningObjectives: [
        'React component creation',
        'Hook usage and state management',
        'Props validation',
        'Component styling',
        'Accessibility implementation'
      ],
      estimatedTime: 30,
      variations: [
        {
          id: 'class-component',
          name: 'Class Component Version',
          description: 'Convert to class component',
          parameterOverrides: {
            hooks: []
          },
          conditions: {
            userLevel: 'intermediate'
          }
        }
      ]
    };
  }

  /**
   * Algorithm Template
   */
  private createAlgorithmTemplate(): ExerciseTemplate {
    return {
      id: 'algorithm-implementation',
      name: 'Algorithm Implementation',
      description: 'Implement a classic algorithm with optimizations',
      type: 'coding',
      category: 'algorithms',
      difficulty: 'hard',
      parameters: [
        {
          name: 'algorithmName',
          type: 'string',
          required: true,
          description: 'Name of the algorithm to implement'
        },
        {
          name: 'problemStatement',
          type: 'string',
          required: true,
          description: 'Problem the algorithm solves'
        },
        {
          name: 'inputFormat',
          type: 'string',
          required: true,
          description: 'Expected input format'
        },
        {
          name: 'outputFormat',
          type: 'string',
          required: true,
          description: 'Expected output format'
        },
        {
          name: 'constraints',
          type: 'array',
          required: true,
          description: 'Problem constraints',
          defaultValue: ['Time limit: 1s', 'Memory limit: 256MB', 'Input size: up to 10^5']
        }
      ],
      template: String.raw`Implement the $\{algorithmName} algorithm.

**Problem:**
$\{problemStatement}

**Input Format:**
$\{inputFormat}

**Output Format:**
$\{outputFormat}

**Constraints:**
$\{constraints.join('\n')}

**Requirements:**
- Implement the algorithm from scratch (no built-in solutions)
- Optimize for both time and space complexity
- Include comprehensive test cases
- Add detailed comments explaining your approach
- Consider edge cases and boundary conditions

**Implementation Structure:**
\`\`\`javascript
function $\{algorithmName.toLowerCase().replace(/\s+/g, '')}(input) {
  // Your implementation here
}

// Test cases
function test$\{algorithmName.replace(/\s+/g, '')}() {
  // Add test cases here
}
\`\`\``,
      solutionTemplate: String.raw`Solution for $\{algorithmName} algorithm:

\`\`\`javascript
function $\{algorithmName.toLowerCase().replace(/\s+/g, '')}(input) {
  // Algorithm implementation
}

// Time complexity: O(n) - explanation
// Space complexity: O(1) - explanation
\`\`\``,
      hintTemplates: [
        'Consider the brute force approach first, then optimize',
        'Think about the time complexity requirements',
        'Consider using appropriate data structures',
        'Look for patterns or mathematical properties'
      ],
      prerequisites: ['Data structures', 'Big O notation', 'Algorithm analysis'],
      learningObjectives: [
        'Algorithm implementation',
        'Time and space complexity analysis',
        'Optimization techniques',
        'Test case design'
      ],
      estimatedTime: 45,
      variations: [
        {
          id: 'recursive-solution',
          name: 'Recursive Solution',
          description: 'Implement using recursion',
          conditions: {
            userLevel: 'advanced'
          }
        }
      ]
    };
  }

  /**
   * Data Structure Template
   */
  private createDataStructureTemplate(): ExerciseTemplate {
    return {
      id: 'data-structure-implementation',
      name: 'Data Structure Implementation',
      description: 'Implement a custom data structure',
      type: 'coding',
      category: 'data-structures',
      difficulty: 'hard',
      parameters: [
        {
          name: 'structureName',
          type: 'string',
          required: true,
          description: 'Name of the data structure'
        },
        {
          name: 'operations',
          type: 'array',
          required: true,
          description: 'Operations the data structure should support',
          defaultValue: ['insert', 'delete', 'search', 'update']
        },
        {
          name: 'underlyingStructure',
          type: 'enum',
          required: true,
          description: 'Underlying implementation approach',
          defaultValue: 'linked list',
          constraints: { options: ['array', 'linked list', 'tree', 'hash table', 'hybrid'] }
        }
      ],
      template: String.raw`Implement a $\{structureName} data structure.

**Required Operations:**
\${operations.map(op => \`- \${op}(): description\`).join('\n')}

**Implementation Requirements:**
- Use \${underlyingStructure} as the underlying structure
- Optimize for the most common operations
- Include proper error handling
- Add comprehensive documentation
- Consider edge cases and boundary conditions

**Class Structure:**
\`\`\`javascript
class \${structureName.replace(/\s+/g, '')} {
  constructor() {
    // Initialize your data structure here
  }

  \${operations.map(op => \`  \${op}(...args) {
    // Your implementation here
  }\`).join('\n\n')}
}
\`\`\``,
      solutionTemplate: String.raw`Implementation of $\{structureName}:

\`\`\`javascript
class $\{structureName.replace(/\s+/g, '')} {
  constructor() {
    // Data structure initialization
  }

  \${operations.map(op => \`  \${op}(...args) {
    // Operation implementation
  }\`).join('\n\n')}
}
\`\`\``,
      hintTemplates: [
        'Start by designing the internal structure',
        'Consider the time complexity of each operation',
        'Think about memory usage and efficiency',
        'Plan your testing strategy'
      ],
      prerequisites: ['Object-oriented programming', 'Memory management', 'Algorithm analysis'],
      learningObjectives: [
        'Data structure design',
        'Operation implementation',
        'Performance optimization',
        'Class-based programming'
      ],
      estimatedTime: 60,
      variations: []
    };
  }

  /**
   * Debugging Template
   */
  private createDebuggingTemplate(): ExerciseTemplate {
    return {
      id: 'debugging-challenge',
      name: 'Debugging Challenge',
      description: 'Find and fix bugs in provided code',
      type: 'debugging',
      category: 'debugging',
      difficulty: 'medium',
      parameters: [
        {
          name: 'codeSnippet',
          type: 'string',
          required: true,
          description: 'Buggy code to debug'
        },
        {
          name: 'expectedBehavior',
          type: 'string',
          required: true,
          description: 'What the code should do'
        },
        {
          name: 'bugTypes',
          type: 'array',
          required: false,
          description: 'Types of bugs to find',
          defaultValue: ['syntax errors', 'logic errors', 'runtime errors']
        }
      ],
      template: String.raw`Debug the following code:

**Code:**
\`\`\`javascript
\${codeSnippet}
\`\`\`

**Expected Behavior:**
\${expectedBehavior}

**Issues to Find:**
\${bugTypes.map(bug => \`- \${bug}\`).join('\n')}

**Requirements:**
- Identify all bugs in the code
- Explain what causes each bug
- Provide corrected code
- Add preventive measures
- Suggest improvements

**Debugging Process:**
1. Analyze the code for obvious issues
2. Test with different inputs
3. Identify root causes
4. Fix each bug systematically
5. Verify the fixes work correctly`,
      solutionTemplate: `Debugged code with explanations:

**Issues Found:**
- Bug 1: Description and fix
- Bug 2: Description and fix

**Fixed Code:**
\`\`\`javascript
// Corrected implementation
\`\`\``,
      hintTemplates: [
        'Start by reading through the code carefully',
        'Try running the code with test inputs',
        'Use console.log to trace execution',
        'Check for common JavaScript pitfalls'
      ],
      prerequisites: ['JavaScript syntax', 'Debugging techniques', 'Error analysis'],
      learningObjectives: [
        'Bug identification',
        'Code debugging',
        'Problem-solving',
        'Code analysis'
      ],
      estimatedTime: 20,
      variations: []
    };
  }

  /**
   * CSS Styling Template
   */
  private createCSSStylingTemplate(): ExerciseTemplate {
    return {
      id: 'css-styling-challenge',
      name: 'CSS Styling Challenge',
      description: 'Create CSS styles for a specific layout or component',
      type: 'practical',
      category: 'web-development',
      difficulty: 'medium',
      parameters: [
        {
          name: 'layoutRequirement',
          type: 'string',
          required: true,
          description: 'Layout or component to style'
        },
        {
          name: 'stylingConstraints',
          type: 'array',
          required: true,
          description: 'CSS constraints and requirements',
          defaultValue: ['Responsive design', 'Cross-browser compatibility', 'Accessibility']
        },
        {
          name: 'cssFeatures',
          type: 'array',
          required: false,
          description: 'CSS features to use',
          defaultValue: ['Flexbox', 'Grid', 'Custom properties']
        }
      ],
      template: String.raw`Create CSS styles for the following requirement:

**Layout/Component:**
\${layoutRequirement}

**CSS Requirements:**
\${stylingConstraints.map(constraint => \`- \${constraint}\`).join('\n')}

**CSS Features to Use:**
\${cssFeatures.map(feature => \`- \${feature}\`).join('\n')}

**Requirements:**
- Write clean, maintainable CSS
- Follow CSS best practices
- Ensure responsiveness
- Consider accessibility
- Optimize for performance

**HTML Structure (provided):**
\`\`\`html
<!-- HTML structure to style -->
\`\`\`

**CSS Structure:**
\`\`\`css
/* Your CSS implementation here */
\`\`\``,
      solutionTemplate: String.raw`CSS solution for $\{layoutRequirement}:

\`\`\`css
/* Complete CSS implementation */
\`\`\``,
      hintTemplates: [
        'Start with a mobile-first approach',
        'Use CSS custom properties for consistency',
        'Test your styles across different screen sizes',
        'Consider browser support for newer CSS features'
      ],
      prerequisites: ['CSS fundamentals', 'Responsive design', 'CSS layout systems'],
      learningObjectives: [
        'CSS layout techniques',
        'Responsive design',
        'CSS best practices',
        'Cross-browser compatibility'
      ],
      estimatedTime: 25,
      variations: []
    };
  }

  /**
   * HTML Structure Template
   */
  private createHTMLStructureTemplate(): ExerciseTemplate {
    return {
      id: 'html-structure-creation',
      name: 'HTML Structure Creation',
      description: 'Create semantic HTML structure',
      type: 'practical',
      category: 'web-development',
      difficulty: 'easy',
      parameters: [
        {
          name: 'contentRequirement',
          type: 'string',
          required: true,
          description: 'Content structure to create'
        },
        {
          name: 'semanticElements',
          type: 'array',
          required: true,
          description: 'Semantic HTML elements to use',
          defaultValue: ['header', 'nav', 'main', 'article', 'section', 'aside', 'footer']
        },
        {
          name: 'accessibilityFeatures',
          type: 'array',
          required: false,
          description: 'Accessibility features to include',
          defaultValue: ['ARIA labels', 'semantic markup', 'keyboard navigation']
        }
      ],
      template: String.raw`Create semantic HTML structure for:

**Content Requirement:**
\${contentRequirement}

**Semantic Elements to Use:**
\${semanticElements.map(element => \`- <\${element}>\`).join('\n')}

**Accessibility Features:**
\${accessibilityFeatures.map(feature => \`- \${feature}\`).join('\n')}

**Requirements:**
- Use semantic HTML5 elements appropriately
- Include proper heading hierarchy
- Add accessibility attributes
- Ensure logical document structure
- Include meta tags and proper DOCTYPE

**HTML Structure:**
\`\`\`html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Page Title</title>
</head>
<body>
    <!-- Your HTML structure here -->
</body>
</html>
\`\`\``,
      solutionTemplate: `Semantic HTML structure:

\`\`\`html
<!DOCTYPE html>
<html lang="en">
<!-- Complete HTML implementation -->
</html>
\`\`\``,
      hintTemplates: [
        'Plan your document outline first',
        'Use semantic elements for their intended purpose',
        'Ensure proper heading hierarchy (h1, h2, h3...)',
        'Test with screen readers for accessibility'
      ],
      prerequisites: ['HTML basics', 'Semantic HTML', 'Web accessibility'],
      learningObjectives: [
        'Semantic HTML structure',
        'Accessibility implementation',
        'Document outline',
        'HTML best practices'
      ],
      estimatedTime: 15,
      variations: []
    };
  }

  /**
   * API Endpoint Template
   */
  private createAPIEndpointTemplate(): ExerciseTemplate {
    return {
      id: 'api-endpoint-creation',
      name: 'API Endpoint Creation',
      description: 'Create a REST API endpoint',
      type: 'coding',
      category: 'web-development',
      difficulty: 'hard',
      parameters: [
        {
          name: 'endpointPurpose',
          type: 'string',
          required: true,
          description: 'What the API endpoint should do'
        },
        {
          name: 'httpMethod',
          type: 'enum',
          required: true,
          description: 'HTTP method for the endpoint',
          defaultValue: 'GET',
          constraints: { options: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] }
        },
        {
          name: 'dataModel',
          type: 'string',
          required: true,
          description: 'Data structure the endpoint works with'
        }
      ],
      template: String.raw`Create a REST API endpoint for:

**Purpose:**
$\{endpointPurpose}

**HTTP Method:** $\{httpMethod}
**Data Model:** $\{dataModel}

**Requirements:**
- Implement proper error handling
- Add input validation
- Include status codes
- Add API documentation
- Consider security measures
- Handle edge cases

**Endpoint Structure:**
\`\`\`javascript
// Express.js example
app.$\{httpMethod.toLowerCase()}('/api/endpoint', async (req, res) => {
  try {
    // Your implementation here
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
\`\`\``,
      solutionTemplate: String.raw`API endpoint implementation:

\`\`\`javascript
app.$\{httpMethod.toLowerCase()}('/api/endpoint', async (req, res) => {
  // Complete implementation
});
\`\`\``,
      hintTemplates: [
        'Consider the HTTP status codes to return',
        'Plan your error handling strategy',
        'Think about input validation requirements',
        'Consider rate limiting and security'
      ],
      prerequisites: ['REST API concepts', 'HTTP methods', 'Express.js or similar framework'],
      learningObjectives: [
        'REST API design',
        'HTTP status codes',
        'Error handling in APIs',
        'Input validation',
        'API security'
      ],
      estimatedTime: 35,
      variations: []
    };
  }

  /**
   * SQL Query Template
   */
  private createSQLQueryTemplate(): ExerciseTemplate {
    return {
      id: 'sql-query-writing',
      name: 'SQL Query Writing',
      description: 'Write SQL queries to solve specific problems',
      type: 'coding',
      category: 'database',
      difficulty: 'medium',
      parameters: [
        {
          name: 'queryPurpose',
          type: 'string',
          required: true,
          description: 'What the SQL query should accomplish'
        },
        {
          name: 'tableSchema',
          type: 'string',
          required: true,
          description: 'Database table structure'
        },
        {
          name: 'queryType',
          type: 'enum',
          required: true,
          description: 'Type of SQL query',
          defaultValue: 'SELECT',
          constraints: { options: ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'JOIN', 'Aggregate'] }
        }
      ],
      template: String.raw`Write a SQL query for the following requirement:

**Query Purpose:**
$\{queryPurpose}

**Table Schema:**
$\{tableSchema}

**Query Type:** $\{queryType}

**Requirements:**
- Write efficient SQL query
- Consider performance implications
- Handle edge cases
- Use appropriate SQL functions
- Follow SQL best practices

**Expected Output:**
\`\`\`
// Describe expected query results
\`\`\`

**SQL Query:**
\`\`\`sql
-- Your SQL query here
\`\`\``,
      solutionTemplate: `SQL query solution:

\`\`\`sql
-- Complete SQL query with explanation
\`\`\``,
      hintTemplates: [
        'Start by understanding the table relationships',
        'Consider indexing for performance',
        'Test with sample data',
        'Review SQL syntax for your database system'
      ],
      prerequisites: ['SQL fundamentals', 'Database concepts', 'Query optimization'],
      learningObjectives: [
        'SQL query writing',
        'Database querying',
        'Query optimization',
        'SQL functions and joins'
      ],
      estimatedTime: 20,
      variations: []
    };
  }

  /**
   * Database Design Template
   */
  private createDatabaseDesignTemplate(): ExerciseTemplate {
    return {
      id: 'database-design',
      name: 'Database Design',
      description: 'Design a database schema for a specific application',
      type: 'design',
      category: 'database',
      difficulty: 'hard',
      parameters: [
        {
          name: 'applicationType',
          type: 'string',
          required: true,
          description: 'Type of application to design database for'
        },
        {
          name: 'entities',
          type: 'array',
          required: true,
          description: 'Main entities in the system',
          defaultValue: ['User', 'Product', 'Order']
        },
        {
          name: 'relationships',
          type: 'array',
          required: false,
          description: 'Relationships between entities',
          defaultValue: ['one-to-many', 'many-to-many']
        }
      ],
      template: String.raw`Design a database schema for:

**Application Type:**
\${applicationType}

**Main Entities:**
\${entities.map(entity => \`- \${entity}\`).join('\n')}

**Relationships:**
\${relationships.map(rel => \`- \${rel}\`).join('\n')}

**Requirements:**
- Create normalized database schema
- Define appropriate data types
- Establish relationships and constraints
- Consider indexing strategy
- Plan for scalability
- Include data integrity rules

**Deliverables:**
1. Entity-Relationship Diagram (ERD)
2. Table creation scripts
3. Relationship definitions
4. Index recommendations
5. Sample data

**Schema Design:**
\`\`\`sql
-- Your table creation scripts here
\`\`\``,
      solutionTemplate: `Database schema design:

**ERD:**
[Diagram description]

**Table Scripts:**
\`\`\`sql
-- Complete database schema
\`\`\``,
      hintTemplates: [
        'Start with identifying entities and attributes',
        'Consider normalization rules (1NF, 2NF, 3NF)',
        'Plan for both current and future needs',
        'Think about query patterns for indexing'
      ],
      prerequisites: ['Database design principles', 'Normalization', 'SQL', 'ERD modeling'],
      learningObjectives: [
        'Database schema design',
        'Entity-relationship modeling',
        'Normalization techniques',
        'Database optimization',
        'Scalability planning'
      ],
      estimatedTime: 50,
      variations: []
    };
  }

  /**
   * Unit Test Template
   */
  private createUnitTestTemplate(): ExerciseTemplate {
    return {
      id: 'unit-test-creation',
      name: 'Unit Test Creation',
      description: 'Write comprehensive unit tests for given code',
      type: 'testing',
      category: 'testing',
      difficulty: 'medium',
      parameters: [
        {
          name: 'functionToTest',
          type: 'string',
          required: true,
          description: 'Function or module to test'
        },
        {
          name: 'testFramework',
          type: 'enum',
          required: true,
          description: 'Testing framework to use',
          defaultValue: 'Jest',
          constraints: { options: ['Jest', 'Mocha', 'Jasmine', 'Vitest'] }
        },
        {
          name: 'testCases',
          type: 'array',
          required: true,
          description: 'Test cases to cover',
          defaultValue: ['happy path', 'edge cases', 'error conditions']
        }
      ],
      template: String.raw`Write unit tests for:

**Function/Module to Test:**
\${functionToTest}

**Testing Framework:** \${testFramework}

**Required Test Cases:**
\${testCases.map(test => \`- \${test}\`).join('\n')}

**Requirements:**
- Achieve high code coverage
- Test both positive and negative cases
- Include edge cases and boundary conditions
- Use appropriate assertions
- Add clear test descriptions
- Mock external dependencies

**Test Structure:**
\`\`\`javascript
describe('$\{functionToTest}', () => {
  // Your test cases here
});
\`\`\``,
      solutionTemplate: `Unit tests for \${functionToTest}:

\`\`\`javascript
describe('\${functionToTest}', () => {
  // Complete test implementation
});
\`\`\``,
      hintTemplates: [
        'Consider all possible input scenarios',
        'Test both success and failure paths',
        'Use descriptive test names',
        'Mock external dependencies properly'
      ],
      prerequisites: ['Testing concepts', String.raw`$\{testFramework} framework`, 'JavaScript functions'],
      learningObjectives: [
        'Unit test writing',
        'Test case design',
        'Assertion techniques',
        'Mocking and stubbing',
        'Code coverage'
      ],
      estimatedTime: 25,
      variations: []
    };
  }

  /**
   * Integration Test Template
   */
  private createIntegrationTestTemplate(): ExerciseTemplate {
    return {
      id: 'integration-test-creation',
      name: 'Integration Test Creation',
      description: 'Write integration tests for multiple components',
      type: 'testing',
      category: 'testing',
      difficulty: 'hard',
      parameters: [
        {
          name: 'components',
          type: 'array',
          required: true,
          description: 'Components to test together',
          defaultValue: ['API endpoint', 'Database layer', 'Service layer']
        },
        {
          name: 'testScenario',
          type: 'string',
          required: true,
          description: 'Integration scenario to test'
        }
      ],
      template: `Write integration tests for:

**Components:**
\${components.map(comp => \`- \${comp}\`).join('\\n')}

**Test Scenario:**
\${testScenario}

**Requirements:**
- Test component interactions
- Verify data flow between components
- Include setup and teardown
- Test error propagation
- Use test databases/services
- Simulate real-world scenarios

**Integration Test Structure:**
\`\`\`javascript
describe('Integration: \${testScenario}', () => {
  beforeAll(async () => {
    // Setup test environment
  });

  afterAll(async () => {
    // Cleanup test environment
  });

  // Your integration tests here
});
\`\`\``,
      solutionTemplate: `Integration tests for \${testScenario}:

\`\`\`javascript
describe('Integration: \${testScenario}', () => {
  // Complete integration test implementation
});
\`\`\``,
      hintTemplates: [
        'Plan your test environment setup carefully',
        'Consider using testcontainers or similar tools',
        'Test both happy path and failure scenarios',
        'Ensure tests are independent and repeatable'
      ],
      prerequisites: ['Integration testing concepts', 'Test environment setup', 'System architecture'],
      learningObjectives: [
        'Integration test design',
        'Test environment management',
        'Component interaction testing',
        'End-to-end validation'
      ],
      estimatedTime: 40,
      variations: []
    };
  }

  /**
   * Math Problem Template
   */
  private createMathProblemTemplate(): ExerciseTemplate {
    return {
      id: 'math-problem-solving',
      name: 'Math Problem Solving',
      description: 'Solve mathematical problems with step-by-step solutions',
      type: 'analysis',
      category: 'mathematics',
      difficulty: 'medium',
      parameters: [
        {
          name: 'mathTopic',
          type: 'string',
          required: true,
          description: 'Mathematical topic or concept'
        },
        {
          name: 'problemStatement',
          type: 'string',
          required: true,
          description: 'Mathematical problem to solve'
        },
        {
          name: 'solutionMethod',
          type: 'string',
          required: false,
          description: 'Method or approach to use',
          defaultValue: 'algebraic'
        }
      ],
      template: `Solve the following mathematical problem:

**Topic:** \${mathTopic}
**Problem:** \${problemStatement}
**Method:** \${solutionMethod}

**Requirements:**
- Show step-by-step solution
- Explain mathematical reasoning
- Verify your answer
- Discuss alternative approaches
- Include relevant formulas

**Solution Structure:**
1. Problem analysis
2. Approach selection
3. Step-by-step solution
4. Answer verification
5. Alternative methods

**Solution:**`,
      solutionTemplate: `Mathematical solution:

**Step-by-step solution:**
[Detailed solution process]

**Answer:** [Final answer]

**Verification:** [Answer verification process]

**Alternative approaches:** [Other methods]`,
      hintTemplates: [
        'Identify the key mathematical concepts involved',
        'Consider different problem-solving strategies',
        'Check your units and dimensions',
        'Verify your answer makes sense in context'
      ],
      prerequisites: ['Mathematical fundamentals', 'Problem-solving techniques'],
      learningObjectives: [
        'Mathematical problem-solving',
        'Step-by-step reasoning',
        'Mathematical verification',
        'Method selection'
      ],
      estimatedTime: 20,
      variations: []
    };
  }

  /**
   * Logic Puzzle Template
   */
  private createLogicPuzzleTemplate(): ExerciseTemplate {
    return {
      id: 'logic-puzzle-solving',
      name: 'Logic Puzzle Solving',
      description: 'Solve logic puzzles with systematic reasoning',
      type: 'analysis',
      category: 'logic',
      difficulty: 'medium',
      parameters: [
        {
          name: 'puzzleType',
          type: 'enum',
          required: true,
          description: 'Type of logic puzzle',
          defaultValue: 'deduction',
          constraints: { options: ['deduction', 'induction', 'spatial', 'numerical', 'verbal'] }
        },
        {
          name: 'puzzleStatement',
          type: 'string',
          required: true,
          description: 'Logic puzzle to solve'
        }
      ],
      template: `Solve the following logic puzzle:

**Puzzle Type:** \${puzzleType}
**Puzzle:** \${puzzleStatement}

**Requirements:**
- Use systematic reasoning
- Show your logical steps
- Consider all possibilities
- Eliminate contradictions
- Verify your solution

**Reasoning Process:**
1. Identify given information
2. Determine constraints
3. Apply logical rules
4. Eliminate possibilities
5. Reach conclusion

**Solution Process:**`,
      solutionTemplate: `Logic puzzle solution:

**Given Information:** [List of known facts]
**Constraints:** [Identified constraints]
**Logical Steps:** [Step-by-step reasoning]
**Conclusion:** [Final answer]
**Verification:** [Check the solution]`,
      hintTemplates: [
        'Start by listing all given information',
        'Look for direct relationships and constraints',
        'Consider using truth tables or diagrams',
        'Test your solution against all conditions'
      ],
      prerequisites: ['Logical reasoning', 'Problem decomposition', 'Systematic thinking'],
      learningObjectives: [
        'Logical reasoning',
        'Problem decomposition',
        'Systematic analysis',
        'Deductive reasoning'
      ],
      estimatedTime: 25,
      variations: []
    };
  }

  /**
   * Get all available template types
   */
  getAvailableTypes(): ExerciseType[] {
    return [
      'multiple-choice',
      'short-answer',
      'coding',
      'practical',
      'simulation',
      'project',
      'debugging',
      'refactoring',
      'design',
      'analysis'
    ];
  }

  /**
   * Get all available categories
   */
  getAvailableCategories(): ExerciseCategory[] {
    return [
      'programming',
      'algorithms',
      'data-structures',
      'web-development',
      'database',
      'system-design',
      'testing',
      'debugging',
      'mathematics',
      'logic',
      'language',
      'science'
    ];
  }

  /**
   * Get template statistics
   */
  getStatistics(): {
    totalTemplates: number;
    templatesByType: Record<ExerciseType, number>;
    templatesByCategory: Record<ExerciseCategory, number>;
    difficultyDistribution: Record<string, number>;
    } {
    const templates = Array.from(this.templates.values());

    const templatesByType = templates.reduce((acc, template) => {
      acc[template.type] = (acc[template.type] || 0) + 1;
      return acc;
    }, {} as Record<ExerciseType, number>);

    const templatesByCategory = templates.reduce((acc, template) => {
      acc[template.category] = (acc[template.category] || 0) + 1;
      return acc;
    }, {} as Record<ExerciseCategory, number>);

    const difficultyDistribution = templates.reduce((acc, template) => {
      acc[template.difficulty] = (acc[template.difficulty] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalTemplates: templates.length,
      templatesByType,
      templatesByCategory,
      difficultyDistribution
    };
  }
}

/**
 * Global template registry instance
 */
export const exerciseTemplateRegistry = new ExerciseTemplateRegistry();