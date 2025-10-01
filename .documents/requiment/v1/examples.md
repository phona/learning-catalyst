## 📌 Phase 1 – BYOK AI-Powered MVP

**Scenario:** Alice, a new user, wants to learn *Data Structures*.

- She opens the game for the first time.
- **Mandatory AI Setup**: She's prompted to configure her AI. She enters:
  - Provider: `OpenAI`
  - Model: `gpt-4o`
  - API Key: `sk-xxxxxxxx...`
- The system validates her key, and the main game interface unlocks.
- **Explore Concept** → She selects “Binary Trees” from the knowledge map.
  - The Catalyst Agent sends the Markdown content to her configured LLM.
  - Her screen displays a fresh, **AI-generated explanation** of binary trees.
- **AI-Generated Challenge** → The system prompts her LLM to create a question.
  - AI asks: *“What is the maximum number of nodes at level `n` of a binary tree?”*
- Alice answers: *“2 to the power of n”*.
- The system uses a simple evaluation (or a quick LLM check) and marks it correct.
- She saves a **checkpoint** and exits.

👉 Focus = **Establishing the core loop**: The user provides the AI, and that AI is used to power all explanations and challenges.

---

## 📌 Phase 2 – Gamified Progression & Analytics

**Scenario:** Bob has been studying *Algorithms* for a week with his configured `claude-3-sonnet` model. His interaction history has been saved.

- Opens the game → his profile and last checkpoint auto-load.
- He continues with “Sorting Algorithms”. After an **AI-generated explanation**, he gets a challenge: *“What’s the time complexity of Merge Sort?”*
- He answers incorrectly: *“O(n²)”*.
- **Background Assessment Engine** analyzes his performance history.
  - It updates his **competency profile**:
    - Strengths: Data Structures (85%).
    - Weakness: Sorting Algorithms (45%, down from 60%).
  - It informs the Catalyst Agent of the weakness.
- **AI-Assisted Adaptation**: For the next question, the Catalyst Agent instructs the LLM: *“The user is struggling. Generate an easier, more foundational question about the 'divide and conquer' principle.”*
- **View Stats** → Bob sees a new **analytics dashboard**:
  - A graph shows his "Sorting" accuracy trending downwards over the last 3 days.
- **Preferences** → He decides to switch to a more powerful model for this difficult topic. He changes his configuration to `gpt-4o`.
- Autosave ensures his progress is stored continuously.

👉 Focus = **Using analytics on AI interactions** to provide meaningful feedback and **guide the AI’s behavior** for adaptive learning.

---

## 📌 Phase 3 – Autonomous Tutor

**Scenario:** Carol is using the system with her powerful `gemini-1.5-pro` model to prepare for a *Machine Learning exam*.

- Opens the system → loads her profile plus a **compressed vector of her recent conversations**, giving the AI long-term memory.
- **Proactive AI Guidance**: After she masters "Classification," the Catalyst Agent suggests:
  - *“Excellent work on Classification! Based on your progress, I recommend we tackle ‘Support Vector Machines’ next to build on that. Shall we begin?”*
- **Deeply Personalized Explanation**: She agrees. The Catalyst instructs her LLM:
  - *“Explain SVMs. Remember, this user prefers analogies over pure math and previously struggled with the term 'hyperplane'.”*
  - The AI explains using a "wide road" analogy and connects it to her past questions.
- **Navigator Mode (Free Query)** → Carol goes off-script and asks:
  - *“Can you compare Gradient Descent and Newton’s Method in simple terms for me?”*
  - The Catalyst uses her LLM to generate a tailored, comparative answer.
- After the session, the **AI Assessment Engine** updates her profile:
  - It notes she has strong conceptual understanding but is weak in implementation details.
  - The Catalyst decides her learning path should now include more **AI-generated coding exercises**.
- **Checkpoints** → Now save her progress, analytics state, and the compressed conversational context.

👉 Focus = **A proactive AI partner** with long-term memory, capable of free-form conversation and intelligently guiding the user's entire learning path.

---

## 📊 Summary Example Progression (BYOK AI-First Model)

| Feature                  | Phase 1 (BYOK MVP)               | Phase 2 (Gamified)                               | Phase 3 (Autonomous Tutor)                          |
| :----------------------- | :------------------------------- | :----------------------------------------------- | :-------------------------------------------------- |
| **Explanation Source**   | **LLM-generated (user's model)** | LLM-generated (guided by analytics)              | LLM w/ long-term memory & deep personalization      |
| **Challenge Generation** | **LLM-generated (basic)**        | LLM-generated (difficulty adapted by analytics)  | LLM-generated (type-adapted, e.g., code vs. theory) |
| **Challenge Evaluation** | Correct/Incorrect (AI-assisted)  | Correct/Incorrect + feeds Assessment Engine      | **Full semantic evaluation via LLM**                |
| **Stats & Analytics**    | Basic attempts & correctness %   | **Trends & proficiency dashboards**              | AI-driven insights & path suggestions               |
| **AI Configuration**     | **Mandatory at first run**       | User can **switch models/providers** in settings | AI might suggest optimal models for tasks           |
| **Adaptive Path**        | None                             | AI difficulty is adapted reactively              | **AI proactively suggests next topics**             |
| **Free Query**           | None                             | None                                             | **Navigator Mode (LLM Q&A)**                        |
