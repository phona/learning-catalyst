/**
 * Workflow Node: ASSESS
 *
 * Mermaid Mapping (Line 8): "Assessment Agent: Analyze Readiness"
 * Part of Path A: Fast Track Assessment
 *
 * Flow Context:
 * - Triggered after: DelegateConf (Orchestrator: Request Assessment)
 * - Triggers: SendReport (Assessment Agent: Send Readiness Report)
 *
 * Purpose:
 * Analyzes user's readiness for a topic by:
 * 1. Fetching profile & history from knowledge graph
 * 2. Calculating confidence score (0-100%) based on:
 *    - Past practice attempts (weighted by recency)
 *    - Recent conversation signals
 *    - Gap identification
 * 3. Returns confidence percentage for orchestration decisions
 *
 * Decision Impact:
 * - Confidence >= 80% → Path A continues (Fast Track)
 * - Confidence < 80% → Path B begins (Standard Learning)
 */

import type { WorkflowDeps } from '../state';
import { WorkflowStateAnnotation } from '../state';
import { parseScore } from '../parse-score';
import { HumanMessage, AIMessage } from '@langchain/core/messages';

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const recencyWeight = (ts?: string) => {
  if (!ts) return 1;
  const t = new Date(ts).getTime();
  if (Number.isNaN(t)) return 1;
  const days = Math.max(0, (Date.now() - t) / (1000 * 60 * 60 * 24));
  return Math.exp(-days / 30);
};

export const assessNode = (deps: WorkflowDeps) => async (state: typeof WorkflowStateAnnotation.State) => {
  const search = await deps.knowledgeService.searchKnowledge({ query: state.topic, limit: 5 });
  const conceptIds = (search?.results ?? []).map((r) => r.id).filter(Boolean);

  const attempts = await deps.learningService.getPracticeHistory({ conceptIds, limit: 100 });
  const gapsSet = new Set<string>();
  for (const a of attempts) {
    const r = a.rubricScores;
    if (r) {
      const vals = [r.retrieval, r.application, r.teachBack].filter((v) => typeof v === 'number');
      if (vals.length) {
        const avg = vals.reduce((s, v) => s + (v ?? 0), 0) / (vals.length * 100);
      }
    }
    (a.errorTags ?? []).forEach((tag) => gapsSet.add(tag));
  }

  const stateMsgs = (state.messages ?? []).slice(-20);

  const passCount = attempts.filter((a) => a.result === 'pass').length;
  const partialCount = attempts.filter((a) => a.result === 'partial').length;
  const failCount = attempts.filter((a) => a.result === 'fail').length;
  const rubricVals = attempts
    .map((a) => a.rubricScores)
    .filter(Boolean)
    .map((r) => [r?.retrieval, r?.application, r?.teachBack])
    .flat()
    .filter((v): v is number => typeof v === 'number');
  const rubricAvg = rubricVals.length
    ? rubricVals.reduce((s: number, v: number) => s + v, 0) / (rubricVals.length * 100)
    : undefined;
  const msgsText = stateMsgs
    .map((m) => {
      // Use instanceof to identify message type, no need for role property
      const role = m instanceof HumanMessage ? 'user' : 'assistant';
      const text = m.content.length > 200 ? m.content.slice(0, 200) : m.content;
      return `${role}: ${text}`;
    })
    .join('\n');
  const { model } = await deps.providerFactory.getModel('chat');
  const prompt = `Assess confidence (0-100%) for topic: ${state.topic}\nPractice: pass=${passCount}, partial=${partialCount}, fail=${failCount}\nRubricAvg: ${typeof rubricAvg === 'number' ? Math.round(rubricAvg * 100) : 'n/a'}%\nMessages:\n${msgsText}\nReturn "Score: NN%".`;
  const res = await model.invoke([new HumanMessage(prompt)]);
  const llmOut = String(res.content ?? res ?? '');
  const llmConfidence = parseScore(llmOut);
  const confidence = clamp01(llmConfidence ?? 0.5);
  const content = `Confidence: ${Math.round(confidence * 100)}%`;
  return {
    messages: [new AIMessage(content)],
    confidence,
    gaps: Array.from(gapsSet),
  };
};
