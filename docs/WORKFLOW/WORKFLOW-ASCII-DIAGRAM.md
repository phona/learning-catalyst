# Learning Catalyst - Workflow ASCII Diagram

## Overview

This document provides a text-based overview of the Learning Catalyst workflow graph, showing all nodes, paths, and decision logic.

## Node Legend

- **[TOOL]** = Structured output with rich UI (7 nodes)
- **[ASST]** = Conversational/dialogue flow (6 nodes)
- **[DEC]** = Decision point (conditional logic)
- **[●]** = Start/End state

## Complete Workflow Graph

```
                                    ┌─────────────┐
                                    │             │
                                    │     ●       │
                                    │    START    │
                                    │             │
                                    └──────┬──────┘
                                           │
                                           ▼
                              ┌──────────────────────────┐
                              │                          │
                              │     [TOOL] TOPIC_PARSE   │
                              │   Extract & Validate     │
                              │      Concepts            │
                              │                          │
                              └─────────────┬────────────┘
                                            │
                                            ▼
                              ┌──────────────────────────┐
                              │                          │
                              │     [TOOL] ASSESS        │
                              │   Analyze Readiness      │
                              │                          │
                              └───────────┬──────────────┘
                                          │
                    ┌─────────────────────┼─────────────────────┐
                    │                     │                     │
                    ▼                     ▼                     ▼
        ┌────────────────────┐  ┌────────────────────┐  ┌────────────────────┐
        │                    │  │                    │  │                    │
        │  [TOOL] PLAN       │  │ [DEC] Confidence   │  │  [ASST] TEACH      │
        │ Generate Blueprint │  │     Check          │  │ Conversational     │
        │                    │  │                    │  │    Learning        │
        └──────────┬─────────┘  └──────────┬─────────┘  └──────────┬─────────┘
                   │                       │                       │
                   │                       │   ┌───────────────────┴────────────┐
                   │                       │   │                                │
                   │                       ▼   ▼                                ▼
                   │          ┌──────────────────────────┐          ┌──────────────────────────┐
                   │          │                          │          │                          │
                   │          │  [TOOL] FAST_TRACK_QUIZ  │          │    [ASST] QA            │
                   │          │   Generate Diagnostic    │          │   Interactive Q&A       │
                   │          │         Quiz             │          │                          │
                   │          └─────────────┬───────────┘          └─────────────┬────────────┘
                   │                         │                                     │
                   │                         ▼                                     │
                   │            ┌──────────────────────────┐                        │
                   │            │                          │                        │
                   │            │   [TOOL] GRADE_QUIZ      │                        │
                   │            │   Score & Analyze        │                        │
                   │            │                          │                        │
                   │            └─────────────┬────────────┘                        │
                   │                         │                                     │
                   │            ┌────────────┴────────────┐                        │
                   │            │                         │                        │
                   │            ▼                         ▼                        ▼
                   │  ┌────────────────────┐  ┌────────────────────┐              │
                   │  │                    │  │                    │              │
                   │  │   [ASST] COMPLETE  │  │    [ASST] TEACH    │              │
                   │  │   Success &        │  │   Fill Knowledge   │              │
                   │  │   Celebration      │  │       Gaps         │              │
                   │  │                    │  │                    │              │
                   │  └──────────▲─────────┘  └──────────▲─────────┘              │
                   │             │                       │                        │
                   │             │                       │                        │
                   │             └───────────┬───────────┘                        │
                   │                         │                                    │
                   │                         ▼                                    │
                   │              ┌──────────────────────────┐                    │
                   │              │                          │                    │
                   │              │    [TOOL] PRACTICE       │                    │
                   │              │   Generate Exercises     │                    │
                   │              │                          │                    │
                   │              └─────────────┬────────────┘                    │
                   │                            │                                 │
                   │                            ▼                                 │
                   │              ┌──────────────────────────┐                    │
                   │              │                          │                    │
                   │              │    [TOOL] EVALUATE       │                    │
                   │              │   Score Performance      │                    │
                   │              │                          │                    │
                   │              └───────────┬──────────────┘                    │
                   │                          │                                 │
                   │          ┌───────────────┼───────────────┐                 │
                   │          │               │               │                 │
                   │          ▼               ▼               ▼                 │
                   │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐       │
                   │  │              │ │              │ │              │       │
                   │  │ [ASST]       │ │ [ASST]       │ │ [ASST]       │       │
                   │  │ MASTERY_CHECK│ │ REMEDIATE    │ │ BREAKER      │       │
                   │  │ Final Check  │ │ Targeted     │ │ Circuit      │       │
                   │  │              │ │ Help         │ │ Breaker      │       │
                   │  └──────▲───────┘ └──────▲───────┘ └──────▲───────┘       │
                   │         │              │              │              │
                   │         │              │              │              │
                   │         └──────┬───────┘              │              │
                   │                │                      │              │
                   └────────────────┼──────────────────────┼──────────────┘
                                    │                      │
                                    ▼                      ▼
                           ┌─────────────────┐    ┌─────────────────┐
                           │                 │    │                 │
                           │  [ASST] COMPLETE│    │       ●         │
                           │  Success &      │    │      END        │
                           │  Celebration    │    │                 │
                           └─────────────────┘    └─────────────────┘
```

## Flow Paths

### Path A: Fast Track Assessment (High Confidence)
```
START → TOPIC_PARSE → ASSESS (confidence ≥ 0.7) → FAST_TRACK_QUIZ → GRADE_QUIZ
                                                                            ↓
GRADE_QUIZ (mastery ≥ 0.9) → COMPLETE → END
                     ↓ (mastery < 0.9)
               TEACH (continue to Path B)
```

### Path B: Standard Learning Loop (Low Confidence)
```
START → TOPIC_PARSE → ASSESS (confidence < 0.7) → TEACH → QA → PRACTICE → EVALUATE
                                                                                ↓
                                                       EVALUATE (mastery ≥ 0.7) → MASTERY_CHECK
                                                                                ↓ (mastery < 0.7, attempts < 5)
                                                       REMEDIATE → PRACTICE (loop)
                                                                                ↓ (attempts ≥ 5)
                                                       BREAKER → END
```

### Path C: Remediation Loop
```
PRACTICE → EVALUATE → REMEDIATE → PRACTICE → ... → EVALUATE
        (retry until mastery or attempts exhausted)
```

### Path D: Circuit Breaker
```
EVALUATE (attempts ≥ 5) → BREAKER → END
```

## Decision Points

### 1. ASSESS Decision
```typescript
if (confidence >= THRESHOLDS.CONFIDENCE_FAST_TRACK) {
  return FAST_TRACK_QUIZ;  // Path A
} else {
  return TEACH;  // Path B
}
```

### 2. GRADE_QUIZ Decision
```typescript
if (mastery >= THRESHOLDS.MASTERY_COMPLETE) {
  return COMPLETE;  // Success
} else {
  return TEACH;  // Path B
}
```

### 3. EVALUATE Decision
```typescript
if (mastery >= THRESHOLDS.MASTERY_PASS) {
  return MASTERY_CHECK;
} else if (attempts >= THRESHOLDS.BREAKER_ATTEMPTS) {
  return BREAKER;  // Circuit breaker
} else {
  return REMEDIATE;  // Path C
}
```

### 4. MASTERY_CHECK Decision
```typescript
if (mastery >= THRESHOLDS.MASTERY_COMPLETE) {
  return COMPLETE;  // Success
} else {
  return PRACTICE;  // Continue practice
}
```

## Node Roles

### TOOL Nodes (7) - Structured Output
1. **TOPIC_PARSE** - Concept extraction & validation
2. **ASSESS** - Confidence analysis
3. **PLAN** - Session blueprint generation
4. **FAST_TRACK_QUIZ** - Quiz generation with interruption
5. **GRADE_QUIZ** - Scoring & detailed feedback
6. **PRACTICE** - Exercise generation with interruption
7. **EVALUATE** - Performance scoring

### ASSISTANT Nodes (6) - Conversational
1. **TEACH** - Conversational learning
2. **QA** - Interactive Q&A
3. **REMEDIATE** - Targeted help
4. **MASTERY_CHECK** - Final assessment
5. **BREAKER** - Circuit breaker support
6. **COMPLETE** - Success celebration

## State Flow Example

```
User: "I want to learn French geography"

1. TOPIC_PARSE → Extracts: {regions, cities, landmarks}
2. ASSESS → Confidence: 0.8 (High!)
3. FAST_TRACK_QUIZ → Generates 5 quiz questions
4. USER → Answers quiz
5. GRADE_QUIZ → Score: 85% (Below 90%)
6. TEACH → Explains weak areas
7. PRACTICE → Generates exercises
8. USER → Completes exercises
9. EVALUATE → Score: 92% (Above 90%)
10. MASTERY_CHECK → Confirms mastery
11. COMPLETE → "Congratulations! You've mastered French geography! 🎉"
12. END
```

## Key Features

1. **Interrupt Handling**: FAST_TRACK_QUIZ and PRACTICE handle user input via interrupts
2. **Simplified Graph**: No WAIT nodes (merged into parent nodes)
3. **Direct Mapping**: Node name → OpenAI role (assistant/tool)
4. **Three Paths**: Fast track, Standard, and Remediation
5. **Circuit Breaker**: Prevents infinite loops
6. **State Persistence**: Checkpoints save progress

## Thresholds

```typescript
THRESHOLDS = {
  CONFIDENCE_FAST_TRACK: 0.7,    // 70% confidence
  MASTERY_PASS: 0.7,             // 70% mastery
  MASTERY_COMPLETE: 0.9,         // 90% mastery
  BREAKER_ATTEMPTS: 5            // 5 attempts
}
```

## Files

- **Graph Definition**: `src/main/services/domain/workflow/graph.ts`
- **Edges**: `src/main/services/domain/workflow/edges.ts`
- **Types**: `src/main/services/domain/workflow/types.ts`
- **Role Mapping**: `src/main/services/domain/workflow/utils/role-mapping.ts`
- **Normalization**: `src/main/services/domain/workflow/utils/normalization.ts`
