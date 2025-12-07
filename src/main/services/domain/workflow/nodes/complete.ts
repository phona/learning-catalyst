/**
 * Workflow Node: COMPLETE
 *
 * Mermaid Mapping (Line 19): "Orchestrator: Module Complete / Expert"
 * Terminal Node - End of Learning Journey
 *
 * Flow Context:
 * - Triggered after: CheckMastery (Orchestrator: Mastery > 90%?) - when "Yes"
 * - Alternative trigger: NextTopic (Orchestrator: More Topics?) - when "No"
 * - This is the SUCCESS terminal state
 *
 * Purpose:
 * Marks successful completion of the learning module by:
 * 1. Generating a completion summary using pre-defined prompts
 * 2. Celebrating the learner's achievement
 * 3. Providing a sense of accomplishment and progress
 * 4. Signaling the end of the current learning session
 *
 * Outputs:
 * - messages: Assistant message with completion summary and congratulations
 *
 * Flow Termination:
 * - This node represents successful mastery of the topic
 * - No further workflow transitions occur
 * - User can either:
 *   a) Start a new module (return to Start)
 *   b) End the session
 *
 * Success Criteria:
 * - Mastery score >= 90%
 * - All learning objectives achieved
 * - Ready for advancement or completion
 */

import { WorkflowStateAnnotation } from '../state';
import { PROMPTS } from '../prompts';

export const completeNode = () => async (state: typeof WorkflowStateAnnotation.State) => {
  const summary = PROMPTS.COMPLETE_SUMMARY;
  return { messages: [{ role: 'assistant', content: summary }] };
};
