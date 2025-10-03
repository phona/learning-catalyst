### The Philosophy: Concepts as Building Blocks

Think of any subject (like JavaScript) as a collection of interconnected building blocks, or **Concepts**.

*   **Concept:** "Variable"
*   **Concept:** "Function"
*   **Concept:** "Closure"
*   **Concept:** "Promise"

You can't understand a "Closure" without first understanding a "Function." You can't use a "Function" effectively without understanding a "Variable." This network of dependencies is a **Knowledge Graph**.

**Concept Building is the process of:**
1.  **Identifying** these fundamental concepts from the user's Markdown files.
2.  **Structuring** them into a Knowledge Graph that defines their relationships (e.g., prerequisites).
3.  **Tracking** the user's proficiency for each individual concept.
4.  **Using** this graph and proficiency data to make intelligent tutoring decisions.

---

### How It Works: A Phased Implementation

#### Phase 1: Implicit Concepts (MVP)

In the MVP, the "concept" is simply the current topic of conversation, implicitly defined by the last header in the Markdown file or the last thing the user asked about. It's temporary and has no memory.

#### Phase 2 & 3: Explicit Concept Modeling

This is where the real magic happens. We introduce a formal "Concept Model" into the system.

**Step 1: Concept Extraction (The "Syllabus Generator")**
When the application starts or when files are updated, a background process kicks off:

1.  **Scan:** The system reads through the user's Markdown files (`.md`).
2.  **Identify:** It identifies potential concepts. This can be done in two ways:
    *   **Simple Method:** Assume every `##` or `###` header is a concept (e.g., `## JavaScript Promises`).
    *   **Advanced Method (LLM-powered):** Feed the content of a file to an LLM with a prompt like: `"Analyze the following text and extract a list of key concepts or topics being taught. For each concept, provide a one-sentence summary."`
3.  **Store:** Each identified concept is stored in our SQLite database as an object.

**Step 2: The Concept Data Model**
Each concept in the database would have a structure like this:

```json
{
  "id": "js_advanced:closures",
  "title": "Closures",
  "summary": "A function that remembers the environment in which it was created.",
  "source_files": ["./javascript/advanced.md#closures"],
  "dependencies": ["js_basics:functions", "js_basics:scope"],
  "unlocks": ["js_patterns:module_pattern"],
  "user_proficiency": 0.0 // A score from 0.0 to 1.0
}
```

**Step 3: Building the Knowledge Graph (The "Curriculum Planner")**
This is the most critical step. How do we populate the `dependencies` and `unlocks` fields?

The system uses an LLM in a powerful, one-time (per file-update) process:
`"Here is a list of all identified concepts: [Concept A, Concept B, Concept C, ...]. Organize them into a dependency graph. For each concept, list the other concepts that are direct prerequisites. Output this as a JSON object where each key is a concept ID and its value is a list of its dependency IDs."`

The result is a complete map of the curriculum.

**Step 4: Tracking User Proficiency (The `Assessment Engine`)**
This is a continuous process:
1.  When the user answers a question about "Closures" (the system knows because the question was tied to that concept), the `Assessment Engine` records the result.
2.  The `user_proficiency` score for the `"js_advanced:closures"` concept is updated. A simple way is `correct_answers / total_attempts`. A more advanced way is an **Exponential Moving Average (EMA)** that gives more weight to recent answers.
3.  This score is saved in the user's profile, linked to the concept ID.

---

### The Payoff: How Concept Building Enables Features

This underlying framework is what makes our key user stories possible:

*   **Story 8 (Proactive Knowledge Check):** The system isn't just checking if you were listening. It knows it just explained the `useEffect` **Concept**. After you confirm, it marks a mental "first exposure" note. By offering a quiz, it's attempting to move your `user_proficiency` for that specific concept from 0.0 to something higher.

*   **Story 9 (Viewing Personal Statistics):** The `/stats` command is no longer just a generic score. It queries the Concept database and displays your proficiency for each concept, sorted from lowest to highest.
    
    > `Your Skills:`
    > `[##........] 0.2/1.0 - Promises` (Weakest)
    > `[####......] 0.4/1.0 - Scope`
    > `[#######...] 0.7/1.0 - Functions`
    > `[#########.] 0.9/1.0 - Variables` (Strongest)
    
*   **Story 10 (Proactive Learning Suggestions):** The `/suggest` command becomes incredibly powerful. Its logic is:
    1.  Find concepts with low `user_proficiency` (e.g., "Promises").
    2.  Check the `dependencies` for that concept (e.g., "Functions" and "Callbacks").
    3.  See if the user has high proficiency in those dependencies.
    4.  If they do, suggest the low-proficiency topic: `"I see you have a good handle on Functions. Now would be a perfect time to tackle Promises. Shall we begin?"`
    5.  If they don't, suggest the missing dependency first: `"Before we dive into Promises, it's important to have a solid grasp of Callbacks. Let's review that first, shall we?"`

### New User Story Proposal

Let's formalize the creation of this core system with its own user story. Since this is a foundational, mostly invisible system task, we can frame it from the system's perspective.

---

#### **Story: System-Driven Concept Graph Generation**
> **As the** Learning Catalyst system,
> **I want to** automatically parse all user-provided Markdown files to identify concepts and map their inter-dependencies,
> **so that** a comprehensive Knowledge Graph is available to enable intelligent and personalized tutoring decisions.

**Acceptance Criteria:**

*   **GIVEN** a directory of Markdown files.
*   **WHEN** the application starts for the first time or detects a file change.
*   **THEN** the system processes the files to extract a list of concepts (e.g., from headers).
*   **AND** the system uses an LLM to generate a dependency map for all extracted concepts.
*   **AND** this Concept Knowledge Graph (concepts + relationships) is stored persistently in the local SQLite database.
*   **AND** this process runs in the background without blocking the user interface.

---

### Implementing Concept Granularity Control

We will offer the user different "modes" for concept extraction. These can be set in a config file (`config.toml`) or as a command-line flag during setup.

```toml
# config.toml
[knowledge]
# Granularity modes: "headers", "summaries", "full_content"
concept_granularity = "summaries"
```

Let's break down how each mode would work.

#### Mode 1: `granularity = "headers"` (The Default)

This is the fast, cheap, and simple method we just discussed.

*   **Process:**
    1.  Parse headers (`##`, `###`).
    2.  Send **only the list of header titles** to the LLM to build the dependency graph.
*   **Pros:** Extremely fast, minimal API cost, works offline after initial setup.
*   **Cons:** "Dumb" understanding. It can't tell the difference between a major concept and a minor subsection header. The quality of the graph depends entirely on how well the user structured their Markdown.

#### Mode 2: `granularity = "summaries"` (The Recommended Balance)

This is the smarter, more robust approach you're alluding to. It uses the LLM to understand the *content* of each section, not just its title.

*   **Process:**
    
    1.  Parse headers locally to get the "Context Slices" (file, start line, end line) for each potential concept.
    2.  **Iterate through each slice:** For every concept section, make a *separate, small* API call.
        *   **Prompt:** `"Read the following text and provide a one-sentence summary and a list of 3-5 keywords that represent the core ideas."`
        *   **Input:** The content of just that one section.
    3.  **Store Enhanced Data:** Now, our concept in the database isn't just a title. It's a richer object.
        ```json
        {
          "id": 3,
          "title": "Promises",
          "summary": "This section explains how promises simplify asynchronous operations by avoiding callback hell and providing clear success/error paths.",
          "keywords": ["async", "then", "catch", "chaining", "pending"]
        }
        ```
    4.  **Build the Graph:** After processing all sections, make the final "Curriculum Planner" call. But this time, we send the richer data.
        *   **Prompt:** `"You are a curriculum planner. Here is a list of concepts with titles and summaries. Based on this information, create a dependency graph. Return a JSON object..."`
        *   **Input:** A JSON array of all the concept objects we just created.
    
*   **Pros:**
    *   **High Accuracy:** The LLM now has context. It can understand that a section titled "Advanced Usage" should come after "Basic Usage". It can spot implicit dependencies (e.g., realizes a section on `async/await` depends on `Promises` even if the user didn't explicitly link them).
    *   **More Robust:** Less reliant on perfect header titles. The content itself informs the graph.
*   **Cons:**
    *   **Slower Setup:** If you have 100 concept sections, this requires 101 API calls (100 for summarizing, 1 for graphing) instead of just 1.
    *   **Higher Initial Cost:** More API calls mean a higher cost for the initial knowledge-base analysis.

#### Mode 3: `granularity = "full_content"` (The "Deep Dive" - Experimental/Niche)

This mode would be for a user with a small number of very dense, interconnected documents who wants the absolute highest fidelity graph, regardless of cost. This is closer to the original "problem" scenario but executed in a more controlled way.

*   **Process:**
    1.  This would use an advanced technique like "map-reduce" style prompting.
    2.  First, it would get summaries for each section (like in Mode 2).
    3.  Then, it would recursively combine summaries of related concepts and ask the LLM to find deeper connections.
    4.  This is complex and computationally expensive. It's more of a power-user feature for the future. For our main design, **Mode 1 and Mode 2 are the perfect pair.**

---

### How This Looks in the App

**1. Initial Setup:**

The user runs `catalyst init` or a similar command for the first time.

```bash
$ catalyst init
> ⚙️ Welcome to Learning Catalyst setup!
>
> How should I analyze your notes to build your curriculum?
>
> 1. Headers Only (Fastest, good for well-structured notes)
> 2. Summaries (Slower, but more accurate for complex topics)
>
> Choose an option [1/2]: 2
>
> 🧠 Analyzing 42 concept sections... (This may take a few minutes)
> [████████████████████████████████████████] 42/42 sections summarized.
> 🗺️ Building dependency map...
> ✨ Curriculum built!
```

**2. Practical Impact on Tutoring:**

Let's revisit our `/suggest` command scenario with the enhanced data from **"Summaries Mode"**.

**Scenario:** The user has two sections:
*   `## Looping` (covers `for` and `while` loops)
*   `## The map() method` (explains array iteration)

In **"Headers Mode"**, the LLM might not know that `map()` is a form of looping. It sees them as two separate topics.

In **"Summaries Mode"**, the graph-building LLM receives this:
```json
[
  {
    "title": "Looping",
    "summary": "Covers fundamental iteration constructs like for loops and while loops for repeating actions."
  },
  {
    "title": "The map() method",
    "summary": "Explains how to use the a.map() high-order function to iterate over an array and create a new array."
  }
]
```
The LLM immediately sees the keyword "iterate" in both summaries and correctly establishes "`Looping`" as a prerequisite for "`The map() method`".

This means the `/suggest` command will now correctly recommend mastering basic loops *before* tackling functional array methods, making the tutoring path much more logical and effective.

You have identified a critical design choice. Offering **Concept Granularity Control** makes the application flexible, powerful, and transparent to the user about how it's "thinking" about their content. This is a massive improvement.

---

### The New, Seamless First-Run Experience

**Goal:** A user with a folder of Markdown notes can download the app, run `catalyst`, and start learning in seconds.

**Scenario:** A user navigates to their `~/Projects/learning-python` directory and runs the app for the very first time.

**Revised User Experience:**

1. **User runs the command:**

   ```bash
   $ cd ~/Projects/learning-python
   $ catalyst
   ```

2. **The App's "Smart" Startup Logic:**

   - **Check for State:** The app looks for a local state file, like `.catalyst/db.sqlite`.
   - **File Not Found (First Run):** The app detects it's a first run.
   - **Automatic Analysis:** It immediately kicks off the default, "fast" analysis (`granularity = "headers"`). It shows a non-intrusive, one-line status.

3. **The Interface:**

   ```bash
   $ catalyst
   > 🔎 First time running in this directory. Analyzing notes...
   > ✨ Curriculum built with 28 concepts from your notes.
   >
   > Looks like you're studying Python. To get started, shall we review the fundamentals of 'Data Types'? [y/n]
   ```

**Key Advantages of this Approach:**

- **Low Friction:** The user doesn't need to read a manual to figure out how to start. They just run the main command.
- **Instant Gratification:** The app provides immediate value by analyzing the notes and suggesting a starting point.
- **Progressive Disclosure:** Advanced features, like changing the granularity, are not presented upfront. This keeps the initial experience clean and simple. The user can discover them later via a `/config` or `/rebuild` command.

------

### Designing the "Smart" Startup and Configuration Logic

This requires a clear internal state machine and a way to handle configuration.

#### 1. The Internal State File

The app will create a hidden directory, `.catalyst`, in the project root. This is standard practice for tools like `git` or `vscode`.

```
learning-python/
├── .catalyst/
│   ├── db.sqlite      # The main database for concepts, proficiency, etc.
│   └── config.toml    # Stores user-defined settings for this project.
├── basics/
│   ├── 01-data-types.md
│   └── 02-control-flow.md
└── advanced/
    └── 03-decorators.md
```

#### 2. The Startup Logic Flow

Here is the pseudo-code for what happens every time `catalyst` is executed:

```
function onAppStart():
    // 1. Check for the existence of the state directory
    if !exists("./.catalyst"):
        // This is a first run
        print("🔎 First time running in this directory. Analyzing notes...")
        
        // Create the state directory
        createDirectory("./.catalyst")
        
        // Perform the default, fast initialization
        runInitialization(granularity = "headers")
        
        // Create a default config file for future customization
        createDefaultConfigFile("./.catalyst/config.toml")
        
        print("✨ Curriculum built...")
    else:
        // This is a subsequent run
        // Quietly load the database and user profile from ./.catalyst/db.sqlite
        loadStateFromDatabase()
    // 2. Start the main interactive loop
    runMainLoop()
```

#### 3. Handling Re-analysis and Customization

What if the user adds new notes or wants a more detailed analysis? We provide explicit commands for this.

**Command: `/rebuild`**

This command allows the user to re-run the analysis.

- User Action:

  ```bash
  > /rebuild
  > ⚙️ How would you like to rebuild your curriculum?
  > 1. Headers Only (Fastest)
  > 2. Summaries (More accurate, but slower)
  >
  > Choose an option [1/2]: 2
  >
  > 🗑️ Clearing old curriculum...
  > 🧠 Re-analyzing notes with summaries...
  > [Progress Bar]
  > ✨ New curriculum built! Your progress has been preserved where possible.
  ```

- **Logic:** The `/rebuild` command re-runs the `runInitialization()` function. It's smart enough to try and map old proficiency scores to the newly generated concepts if the titles match. It also updates the `config.toml` file with the user's new preference.

**Command: `/status` or `/config`**

This command shows the current configuration.

- User Action:

  ```
  > /status
  > 📊 Project Status:
  >   - Concepts Tracked: 28
  - Analysis Mode: headers
  - Notes Directory: ./
  >
  > To re-analyze your notes with more detail, use the '/rebuild' command.
  ```

### The Final, Polished User Journey

1. **First Run:** `catalyst` -> Automatic, fast analysis -> Immediate learning suggestion.
2. **Subsequent Runs:** `catalyst` -> Instantly loads previous state -> User continues where they left off.
3. **Adding New Notes:** User saves a new `.md` file -> Runs `catalyst` -> Sees a message: `💡 I've detected new files. Run '/rebuild' to add them to your curriculum.`
4. **Wanting More Accuracy:** User runs `/rebuild` -> Chooses "Summaries" mode -> App performs a one-time, deeper analysis -> The user now has a higher-fidelity learning path.