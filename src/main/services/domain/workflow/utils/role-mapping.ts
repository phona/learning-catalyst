/**
 * Workflow Node to OpenAI Role Mapping
 *
 * PURPOSE:
 * Maps workflow node names to OpenAI message roles for frontend rendering.
 * This enables assistant-ui library to automatically render nodes differently
 * based on their role (tool vs assistant).
 *
 * DESIGN PRINCIPLE:
 * Simple direct mapping - no complex role systems, categories, or intermediate steps.
 * Just node name → OpenAI role (assistant | tool).
 *
 * WHY THIS EXISTS:
 * assistant-ui library supports two OpenAI message roles:
 * - 'assistant' - Natural conversation, standard chat UI
 * - 'tool' - Structured output, rich formatted UI
 *
 * Workflow nodes need to be mapped to these roles so the frontend can render
 * them appropriately without custom UI components.
 *
 * SIMPLIFICATION:
 * We don't maintain a separate role system (TOOL/ASSISTANT enum, categories, etc.)
 * because:
 * 1. OpenAI roles ARE the roles we need
 * 2. Node names are already unique identifiers
 * 3. Direct mapping is clearer and easier to maintain
 * 4. No indirection or abstraction needed
 *
 * USAGE:
 * const role = NODE_NAME_TO_OPENAI_ROLE[nodeName];
 * // Returns 'assistant' or 'tool'
 *
 * UPDATE PROCESS:
 * When adding a new workflow node:
 * 1. Add NodeName to types.ts
 * 2. Add mapping entry here
 * 3. Choose 'tool' for structured output or 'assistant' for conversation
 *
 * EXAMPLES:
 * - PRACTICE node generates exercises → 'tool' (needs rich UI)
 * - TEACH node uses learning agent → 'assistant' (conversation)
 * - GRADE_QUIZ returns structured score → 'tool' (needs formatted display)
 * - QA node is interactive checkpoint → 'assistant' (dialogue)
 */

import { NodeName } from '../types';

/**
 * Direct mapping from workflow node name to OpenAI message role.
 *
 * TOOL nodes produce structured output that benefits from rich formatting:
 * - Structured data (objects, arrays)
 * - Formatted displays (scores, charts, exercises)
 * - Interactive elements (forms, inputs)
 * - Rich UI components (not just plain text)
 *
 * ASSISTANT nodes are conversational:
 * - Natural dialogue
 * - Explanations and guidance
 * - Interactive Q&A
 * - Simple text responses
 */
export const NODE_NAME_TO_OPENAI_ROLE: Readonly<Record<NodeName, 'assistant' | 'tool'>> = {
  // ========================================================================
  // TOOL NODES - Produce structured output for rich UI rendering
  // ========================================================================

  /**
   * TOPIC_PARSE
   * Extracts and validates concepts from user input
   * Returns: Structured concept data (names, relationships, confidence scores)
   * UI: Interactive concept map, validation checkboxes
   */
  [NodeName.TOPIC_PARSE]: 'tool',

  /**
   * ASSESS
   * Analyzes user readiness and calculates confidence
   * Returns: Confidence score, gaps identified, assessment metrics
   * UI: Confidence meters, progress indicators, detailed analysis
   */
  [NodeName.ASSESS]: 'tool',

  /**
   * PLAN
   * Generates structured learning plan (session blueprint)
   * Returns: JSON session plan with blocks, timeline, activities
   * UI: Structured plan display, timeline visualization, block details
   */
  [NodeName.PLAN]: 'tool',

  /**
   * FAST_TRACK_QUIZ
   * Generates diagnostic quiz and collects user answer
   * Returns: Quiz questions, user responses, interruption handling
   * UI: Interactive quiz interface, answer input, progress tracking
   */
  [NodeName.FAST_TRACK_QUIZ]: 'tool',

  /**
   * GRADE_QUIZ
   * Grades quiz responses and provides detailed feedback
   * Returns: Score, detailed feedback, correctness analysis
   * UI: Color-coded results, score breakdown, explanation panels
   */
  [NodeName.GRADE_QUIZ]: 'tool',

  /**
   * PRACTICE
   * Generates practice exercises and collects completion
   * Returns: Structured exercises (steps, hints, suggestions)
   * UI: Interactive exercise display, step-by-step guidance, hint system
   */
  [NodeName.PRACTICE]: 'tool',

  /**
   * EVALUATE
   * Evaluates user practice responses with detailed scoring
   * Returns: Evaluation score, performance metrics, improvement suggestions
   * UI: Performance dashboard, charts, detailed feedback
   */

  [NodeName.EVALUATE]: 'tool',

  // ========================================================================
  // ASSISTANT NODES - Conversational, natural dialogue
  // ========================================================================

  /**
   * TEACH
   * Uses Learning Agent for conversational teaching
   * Returns: Natural language explanations, guided discovery
   * UI: Standard chat interface (assistant-ui default)
   */
  [NodeName.TEACH]: 'assistant',

  /**
   * QA
   * Interactive Q&A checkpoint
   * Returns: Questions and clarifications in conversation
   * UI: Chat interface with Q&A flow (assistant-ui default)
   */
  [NodeName.QA]: 'assistant',

  /**
   * REMEDIATE
   * Conversational remediation via Learning Agent
   * Returns: Targeted help and alternative explanations
   * UI: Chat interface for back-and-forth help (assistant-ui default)
   */
  [NodeName.REMEDIATE]: 'assistant',

  /**
   * MASTERY_CHECK
   * Decision point for mastery assessment
   * Returns: Pass-through state (no output, just decision)
   * UI: Minimal display, or could be 'assistant' for consistency
   */
  [NodeName.MASTERY_CHECK]: 'assistant',

  /**
   * BREAKER
   * Circuit breaker for stuck users
   * Returns: Supportive messages, break suggestions
   * UI: Chat interface for supportive guidance (assistant-ui default)
   */
  [NodeName.BREAKER]: 'assistant',

  /**
   * COMPLETE
   * Session completion and celebration
   * Returns: Completion summary and congratulations
   * UI: Chat interface for wrap-up (assistant-ui default)
   */
  [NodeName.COMPLETE]: 'assistant',
} as const;

/**
 * Get OpenAI role for a workflow node.
 *
 * @param nodeName - The workflow node name
 * @returns OpenAI role: 'assistant' or 'tool'
 *
 * USAGE:
 * const role = getOpenAIRole(NodeName.PRACTICE);
 * // Returns: 'tool'
 *
 * // In frontend component:
 * const openAIRole = getOpenAIRole(currentNode);
 * // Use role to determine UI rendering approach
 */
export function getOpenAIRole(nodeName: NodeName): 'assistant' | 'tool' {
  return NODE_NAME_TO_OPENAI_ROLE[nodeName];
}

/**
 * Check if a node should use tool role (structured output).
 *
 * @param nodeName - The workflow node name
 * @returns true if node uses 'tool' role, false otherwise
 *
 * USAGE:
 * if (isToolNode(currentNode)) {
 *   // Show rich structured UI
 *   renderStructuredDisplay(data);
 * }
 */
export function isToolNode(nodeName: NodeName): boolean {
  return NODE_NAME_TO_OPENAI_ROLE[nodeName] === 'tool';
}

/**
 * Check if a node should use assistant role (conversational).
 *
 * @param nodeName - The workflow node name
 * @returns true if node uses 'assistant' role, false otherwise
 *
 * USAGE:
 * if (isAssistantNode(currentNode)) {
 *   // Show standard chat UI
 *   renderChatInterface(messages);
 * }
 */
export function isAssistantNode(nodeName: NodeName): boolean {
  return NODE_NAME_TO_OPENAI_ROLE[nodeName] === 'assistant';
}

/**
 * Get all nodes that use 'tool' role.
 *
 * @returns Array of node names that produce structured output
 *
 * USAGE:
 * const toolNodes = getToolNodes();
 * // Returns: [TOPIC_PARSE, ASSESS, PLAN, ...]
 */
export function getToolNodes(): NodeName[] {
  return Object.entries(NODE_NAME_TO_OPENAI_ROLE)
    .filter(([, role]) => role === 'tool')
    .map(([name]) => name as NodeName);
}

/**
 * Get all nodes that use 'assistant' role.
 *
 * @returns Array of node names that are conversational
 *
 * USAGE:
 * const assistantNodes = getAssistantNodes();
 * // Returns: [TEACH, QA, REMEDIATE, ...]
 */
export function getAssistantNodes(): NodeName[] {
  return Object.entries(NODE_NAME_TO_OPENAI_ROLE)
    .filter(([, role]) => role === 'assistant')
    .map(([name]) => name as NodeName);
}

/**
 * Validate that all workflow nodes have role mappings.
 * Run this at startup to catch missing mappings.
 *
 * THROWS:
 * Error if any node is missing from the mapping
 *
 * USAGE:
 * // Call at application startup
 * validateNodeRoleMappings();
 */
export function validateNodeRoleMappings(): void {
  // Import NodeName enum values
  const allNodes = Object.values(NodeName);
  const mappedNodes = Object.keys(NODE_NAME_TO_OPENAI_ROLE);

  // Check for unmapped nodes
  const unmapped = allNodes.filter(node => !mappedNodes.includes(node));

  if (unmapped.length > 0) {
    throw new Error(
      `Missing role mappings for nodes: ${unmapped.join(', ')}\n` +
      'Add these nodes to NODE_NAME_TO_OPENAI_ROLE mapping.'
    );
  }

  // Check for orphaned mappings (nodes that don't exist)
  const orphaned = mappedNodes.filter(nodeName => !allNodes.includes(nodeName as NodeName));

  if (orphaned.length > 0) {
    console.warn(
      `Orphaned role mappings (nodes no longer exist): ${orphaned.join(', ')}\n` +
      'Consider removing these from NODE_NAME_TO_OPENAI_ROLE mapping.'
    );
  }
}

/**
 * ADDING NEW NODES - Checklist
 *
 * When adding a new workflow node, follow these steps:
 *
 * 1. Add NodeName to types.ts:
 *    export enum NodeName {
 *      // ... existing nodes
 *      NEW_NODE = 'NewNode',
 *    }
 *
 * 2. Add mapping in this file:
 *    [NodeName.NEW_NODE]: 'tool', // or 'assistant'
 *
 * 3. Choose the role:
 *    - 'tool' if node produces structured data (objects, arrays, formatted output)
 *    - 'assistant' if node is conversational (dialogue, explanations, Q&A)
 *
 * 4. Add to appropriate section above with JSDoc comment
 *
 * 5. No need to update utility functions - they auto-detect from mapping
 */
