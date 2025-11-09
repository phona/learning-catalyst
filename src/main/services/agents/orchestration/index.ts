/**
 * Agent Orchestration Patterns
 *
 * This module exports all orchestration patterns for the multi-agent system.
 * Each pattern provides a different approach to coordinating agent execution
 * and tool usage.
 */

export { ToolCallingOrchestrator } from './tool-calling-orchestrator';
export { HandoffOrchestrator } from './handoff-orchestrator';
export { HybridOrchestrator } from './hybrid-orchestrator';

/**
 * Orchestration pattern types
 */
export type OrchestrationPattern = 'tool_calling' | 'handoff' | 'hybrid' | 'sequential';

/**
 * Orchestration pattern capabilities
 */
export const ORCHESTRATION_CAPABILITIES = {
  tool_calling: [
    'intelligent_tool_selection',
    'secure_tool_execution',
    'result_integration',
    'error_handling',
    'permission_validation'
  ],
  handoff: [
    'intelligent_handoff_decisions',
    'context_preservation',
    'seamless_transitions',
    'conversation_history',
    'agent_coordination'
  ],
  hybrid: [
    'dynamic_strategy_selection',
    'tool_calling_integration',
    'agent_handoff_integration',
    'sequential_execution',
    'intelligent_phasing'
  ],
  sequential: [
    'step_by_step_execution',
    'workflow_orchestration',
    'progress_tracking',
    'error_recovery'
  ]
} as const;

/**
 * Orchestration pattern metadata
 */
export const ORCHESTRATION_METADATA = {
  tool_calling: {
    name: 'Tool Calling Orchestrator',
    description: 'Intelligently selects and executes tools to accomplish tasks',
    bestFor: ['data_analysis', 'information_retrieval', 'document_processing', 'calculations'],
    complexity: 'medium',
    resources: ['tools', 'permissions', 'validation']
  },
  handoff: {
    name: 'Handoff Orchestrator',
    description: 'Manages intelligent agent transitions with context preservation',
    bestFor: ['complex_queries', 'multi_domain_tasks', 'specialized_expertise', 'conversational_flows'],
    complexity: 'high',
    resources: ['agents', 'context_management', 'session_tracking']
  },
  hybrid: {
    name: 'Hybrid Orchestrator',
    description: 'Combines tool calling and handoff patterns for maximum flexibility',
    bestFor: ['complex_workflows', 'multi_step_tasks', 'adaptive_problem_solving', 'comprehensive_queries'],
    complexity: 'very_high',
    resources: ['tools', 'agents', 'context_management', 'strategy_selection']
  },
  sequential: {
    name: 'Sequential Orchestrator',
    description: 'Executes multiple steps in a predefined sequence',
    bestFor: ['structured_workflows', 'procedural_tasks', 'step_by_step_processes', 'quality_assurance'],
    complexity: 'low',
    resources: ['workflow_definition', 'step_execution', 'progress_tracking']
  }
} as const;

/**
 * Orchestration pattern factory
 */
export class OrchestrationPatternFactory {
  /**
   * Get pattern metadata
   */
  static getPatternMetadata(pattern: OrchestrationPattern) {
    return ORCHESTRATION_METADATA[pattern];
  }

  /**
   * Get pattern capabilities
   */
  static getPatternCapabilities(pattern: OrchestrationPattern) {
    return ORCHESTRATION_CAPABILITIES[pattern] || [];
  }

  /**
   * Get all available patterns
   */
  static getAvailablePatterns(): OrchestrationPattern[] {
    return Object.keys(ORCHESTRATION_METADATA) as OrchestrationPattern[];
  }

  /**
   * Recommend pattern based on task characteristics
   */
  static recommendPattern(taskCharacteristics: {
    requiresTools?: boolean;
    requiresSpecializedAgents?: boolean;
    complexity?: 'simple' | 'medium' | 'complex' | 'very_complex';
    isConversational?: boolean;
    hasMultipleSteps?: boolean;
    requiresContextPreservation?: boolean;
  }): OrchestrationPattern {
    const {
      requiresTools = false,
      requiresSpecializedAgents = false,
      complexity = 'medium',
      isConversational = false,
      hasMultipleSteps = false,
      requiresContextPreservation = false
    } = taskCharacteristics;

    // Complex, multi-domain tasks
    if (complexity === 'very_complex' && requiresTools && requiresSpecializedAgents) {
      return 'hybrid';
    }

    // Conversational flows with specialized expertise
    if (isConversational && requiresSpecializedAgents && requiresContextPreservation) {
      return 'handoff';
    }

    // Tool-heavy analytical tasks
    if (requiresTools && !requiresSpecializedAgents) {
      return 'tool_calling';
    }

    // Structured procedural tasks
    if (hasMultipleSteps && complexity === 'simple') {
      return 'sequential';
    }

    // Default to hybrid for flexibility
    return 'hybrid';
  }

  /**
   * Validate pattern configuration
   */
  static validatePatternConfiguration(
    pattern: OrchestrationPattern,
    configuration: Record<string, any>
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const metadata = this.getPatternMetadata(pattern);

    // Check required resources
    if (metadata.resources.includes('tools' as any) && !configuration.availableTools?.length) {
      errors.push('Tools are required for this pattern but none are available');
    }

    if (metadata.resources.includes('agents' as any) && !configuration.availableAgents?.length) {
      errors.push('Agents are required for this pattern but none are available');
    }

    // Check pattern-specific requirements
    switch (pattern) {
      case 'tool_calling':
        if (!configuration.toolExecutor) {
          errors.push('Tool executor is required for tool calling pattern');
        }
        if (configuration.maxToolCalls && configuration.maxToolCalls > 20) {
          errors.push('Max tool calls should not exceed 20 for performance');
        }
        break;

      case 'handoff':
        if (!configuration.agentManager) {
          errors.push('Agent manager is required for handoff pattern');
        }
        if (configuration.maxHandoffs && configuration.maxHandoffs > 10) {
          errors.push('Max handoffs should not exceed 10 for user experience');
        }
        break;

      case 'hybrid':
        if (!configuration.toolExecutor) {
          errors.push('Tool executor is required for hybrid pattern');
        }
        if (!configuration.agentManager) {
          errors.push('Agent manager is required for hybrid pattern');
        }
        if (configuration.maxPhases && configuration.maxPhases > 15) {
          errors.push('Max phases should not exceed 15 for performance');
        }
        break;

      case 'sequential':
        if (!configuration.workflowSteps?.length) {
          errors.push('Workflow steps are required for sequential pattern');
        }
        break;
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get performance estimates for pattern
   */
  static getPerformanceEstimate(pattern: OrchestrationPattern): {
    estimatedDuration: { min: number; max: number }; // in seconds
    resourceIntensity: 'low' | 'medium' | 'high' | 'very_high';
    memoryUsage: 'low' | 'medium' | 'high' | 'very_high';
    recommendedMaxConcurrency: number;
  } {
    switch (pattern) {
      case 'tool_calling':
        return {
          estimatedDuration: { min: 5, max: 60 },
          resourceIntensity: 'medium',
          memoryUsage: 'medium',
          recommendedMaxConcurrency: 10
        };

      case 'handoff':
        return {
          estimatedDuration: { min: 10, max: 120 },
          resourceIntensity: 'high',
          memoryUsage: 'high',
          recommendedMaxConcurrency: 5
        };

      case 'hybrid':
        return {
          estimatedDuration: { min: 15, max: 180 },
          resourceIntensity: 'very_high',
          memoryUsage: 'very_high',
          recommendedMaxConcurrency: 3
        };

      case 'sequential':
        return {
          estimatedDuration: { min: 5, max: 90 },
          resourceIntensity: 'low',
          memoryUsage: 'low',
          recommendedMaxConcurrency: 15
        };

      default:
        return {
          estimatedDuration: { min: 10, max: 60 },
          resourceIntensity: 'medium',
          memoryUsage: 'medium',
          recommendedMaxConcurrency: 5
        };
    }
  }
}

/**
 * Default configuration for each pattern
 */
export const DEFAULT_PATTERN_CONFIGS = {
  tool_calling: {
    maxToolCalls: 10,
    maxIterations: 5,
    timeout: 60000,
    retryAttempts: 2,
    permissions: ['read', 'write'],
    validateArguments: true
  },
  handoff: {
    maxHandoffs: 5,
    timeout: 120000,
    preserveFullHistory: true,
    contextPreservation: ['conversation', 'user_goals', 'session_data'],
    handoffThreshold: 0.7
  },
  hybrid: {
    maxPhases: 8,
    timeout: 180000,
    strategySelectionThreshold: 0.6,
    enableAdaptivePhasing: true,
    fallbackStrategy: 'tool_calling'
  },
  sequential: {
    maxSteps: 10,
    timeout: 90000,
    continueOnError: false,
    stepTimeout: 30000,
    rollbackOnError: true
  }
} as const;