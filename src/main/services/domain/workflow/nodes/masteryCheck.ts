/**
 * Workflow Node: MASTERY CHECK
 *
 * Mermaid Mapping (Line 51): "Assessment Agent: Mastery Pulse Check?"
 * Part of Path B: Standard Learning Loop - Success Path
 *
 * Flow Context:
 * - Triggered after: Eval (Assessment Agent: Evaluate) when answer is Correct
 * - Triggers: Branching decision based on mastery assessment:
 *   - If Yes → LogSuccess (Orchestrator: Log Success)
 *   - If No → PracticeStart (Practice Agent: Generate Problem) - continue practice
 *
 * Purpose:
 * Periodic pulse check to assess if user has achieved sufficient mastery by:
 * 1. Evaluating current mastery level against threshold
 * 2. Determining if user is ready to advance or needs more practice
 * 3. Making go/no-go decision for progression
 *
 * Decision Criteria:
 * - Checks if mastery score meets advancement threshold
 * - Considers user's learning trajectory
 * - Balances confidence building with progression
 *
 * Flow Outcomes:
 * - Pass: LogSuccess → NextTopic check → Complete or continue
 * - Continue: Return to PracticeStart for more exercises
 *
 * Note:
 * This node is a decision point (pass-through implementation)
 * - Actual decision logic handled by orchestration layer
 * - Returns current state unchanged
 * - Orchestrator evaluates mastery field to make progression decision
 *
 * This represents the assessment agent's role in continuous monitoring
 * of learning progress and mastery development
 */

import { WorkflowStateAnnotation } from '../state';
import type { LangGraphRunnableConfig } from '@langchain/langgraph';
import { createChunkEmitter, generateId } from '../utils/chunk-emitter';
import { NodeName } from '../types';

export const masteryCheckNode = () => async (
  state: typeof WorkflowStateAnnotation.State,
  config: LangGraphRunnableConfig
) => {
  const emitter = createChunkEmitter(config);
  const nodeName = NodeName.MASTERY_CHECK;
  const toolCallId = generateId(nodeName);
  emitter.toolInputStart(toolCallId, nodeName);

  const mastery = state.mastery ?? 0;
  const threshold = 0.9;
  const isPassing = mastery >= threshold;

  emitter.toolInputAvailable(toolCallId, nodeName, {
    mastery,
    threshold,
    isPassing,
  });

  emitter.toolOutputAvailable(toolCallId, {
    ok: true,
    data: {
      mastery,
      threshold,
      isPassing,
      decision: isPassing ? 'advance' : 'continue',
    },
  });

  return { ...state };
};
