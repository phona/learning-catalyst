## User Story Backlog: Learning Catalyst

### Epic: Phase 1 - Guided Conversational Core

These stories focus on establishing the minimum viable product, centered on the guided startup and core learning loop.

---

#### **Story 1: First-Time User Onboarding**
> **As a** new user,
> **I want** the application to welcome me and suggest a starting topic based on my local files,
> **so that** I can begin learning immediately without confusion.

**Acceptance Criteria:**
*   **GIVEN** I launch the application for the first time in a directory containing Markdown files.
*   **AND** no previous session state exists.
*   **WHEN** the application starts.
*   **THEN** I see a welcome message.
*   **AND** the AI proactively suggests a specific first topic to learn (e.g., `"Welcome! I see you have content on 'Data Structures'. Shall we begin with 'Arrays'?"`).
*   **AND** the application waits for my "yes/no" or equivalent response.

---

#### **Story 2: Seamless Session Resumption**
> **As a** returning user,
> **I want** the application to automatically load my last session and prompt me to continue,
> **so that** I can pick up exactly where I left off with zero friction.

**Acceptance Criteria:**
*   **GIVEN** I have a previously saved session where I was learning about "JavaScript Promises".
*   **WHEN** I launch the application.
*   **THEN** my entire previous conversation history is displayed on the screen.
*   **AND** the AI shows a context-aware message (e.g., `"Welcome back! We were just wrapping up our discussion on 'JavaScript Promises'"`).
*   **AND** the AI suggests a specific next action (e.g., `"Would you like a quick quiz on that, or should we move on to 'Async/Await'?"`).

---

#### **Story 3: Requesting an Explanation**
> **As a** learner,
> **I want** to ask the AI to explain a concept in my own words,
> **so that** I can gain a clear understanding of the material.

**Acceptance Criteria:**
*   **GIVEN** the application is running.
*   **WHEN** I type a query like `"Explain what a decorator is in Python"`.
*   **THEN** the AI provides a clear, concise explanation based on the content of my local Markdown files.
*   **AND** the conversation (my question and the AI's answer) is added to the history.

---

#### **Story 4: Requesting a Challenge**
> **As a** student,
> **I want** to ask the AI to quiz me on the current topic,
> **so that** I can test my knowledge and reinforce my learning.

**Acceptance Criteria:**
*   **GIVEN** I have just received an explanation on "CSS Flexbox".
*   **WHEN** I type `"quiz me on that"` or `"give me a question"`.
*   **THEN** the AI presents a relevant question (e.g., open-ended or multiple-choice) about CSS Flexbox.
*   **AND** the application state changes to "awaiting answer".

---

#### **Story 5: Answering a Challenge and Getting Feedback**
> **As a** user being tested,
> **I want** to submit my answer to a question and receive immediate, constructive feedback,
> **so that** I know if I was right and can learn from my mistakes.

**Acceptance Criteria:**
*   **GIVEN** the AI has asked me a question.
*   **WHEN** I type my answer and press enter.
*   **THEN** the AI evaluates my answer and responds with a confirmation (e.g., `"That's correct!"` or `"Not quite..."`).
*   **AND** if incorrect, the AI provides the correct answer with a brief explanation.
*   **AND** the question, my answer, and the feedback are stored in the Q&A database.

---

#### **Story 6: Configuring AI Models**
> **As a** power user,
> **I want** to be able to add, list, and switch between different AI models,
> **so that** I can manage my API costs and choose the best model for my needs.

**Acceptance Criteria:**
*   **GIVEN** the application is running.
*   **WHEN** I type `/model add`, I am guided through a wizard to add a new model.
*   **WHEN** I type `/models`, I see a list of all configured models (excluding API keys).
*   **WHEN** I type `/model use <model-id>`, the system confirms the change.
*   **THEN** all subsequent AI interactions use the newly selected model.

---

#### **Story 7: Manual State Checkpointing**
> **As a** diligent learner,
> **I want** to save a named snapshot of my learning session,
> **so that** I can create specific restore points before tackling a big topic or for later review.

**Acceptance Criteria:**
*   **GIVEN** I am in the middle of a session.
*   **WHEN** I type `/checkpoint save chapter-4-review`.
*   **THEN** the system confirms that the checkpoint was saved successfully.
*   **AND LATER**, when I type `/checkpoint load chapter-4-review`, my session state is restored to that exact point.

---

### Epic: Phase 2 - Enhanced Analytics & Adaptivity

This phase focuses on making the AI tutor more intelligent and aware of the user's progress.

------

#### **Story 8: Proactive Knowledge Check (Tutor-Initiated)**

> **As a** learner, **I want** the AI tutor to proactively offer to quiz me after explaining a new or complex concept, **so that** I am prompted to immediately confirm my understanding and reinforce the new information.

**Notes:** This story is distinct from Story 4 ("Requesting a Challenge"). In Story 4, the user is in control and must explicitly ask for a quiz. In this story, the AI takes the initiative, behaving more like a real-world tutor by sensing a natural point to check for understanding.

**Acceptance Criteria:**

- **GIVEN** the AI has just finished providing an explanation on a topic (e.g., "the `useEffect` hook in React").
- **WHEN** the explanation is complete.
- **THEN** the Catalyst Agent makes a conversational offer to test my knowledge, such as `"That's the core idea of useEffect. To make sure it sticks, shall I ask you a quick question about it?"`
- **AND** the application awaits my "yes/no" or equivalent response.
- **AND IF** I respond affirmatively (e.g., "yes", "sure", "ok"), **THEN** the system proceeds to generate a relevant question about `useEffect`, and the flow continues as in Story 5.
- **AND IF** I decline (e.g., "no", "not right now"), **THEN** the AI gracefully acknowledges my choice and prompts for the next action, such as `"No problem. Shall we move on, or is there anything else you'd like to review?"

---

#### **Story 9: Viewing Personal Learning Statistics**

> **As a** goal-oriented learner, **I want** to see a summary of my performance across different topics, **so that** I can easily identify my areas of weakness and focus my efforts.

**Acceptance Criteria:**

- **GIVEN** I have answered at least 10 quiz questions across 3 different topics.
- **WHEN** I type the `/stats` command.
- **THEN** the application displays a text-based dashboard showing my average score per topic.
- **AND** It should highlight the topic with the lowest score as an area for improvement.

---

### Epic: Phase 3 - AI-Driven Tutor

---

#### **Story 10: Receiving Proactive Learning Suggestions**
> **As a** learner who is unsure what to study next,
> **I want** the AI to intelligently suggest the next logical topic based on my progress,
> **so that** I can follow a structured and personalized learning path.

**Acceptance Criteria:**
*   **GIVEN** my performance profile shows high proficiency in "basic functions" but low proficiency in "recursion".
*   **WHEN** I type the `/suggest` command.
*   **THEN** the AI analyzes my profile and the available learning materials.
*   **AND** it suggests a relevant next step, such as `"You have a good grasp of functions. A great next challenge would be 'Recursion'. Would you like to start?"`.
