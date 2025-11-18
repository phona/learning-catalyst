# Chat Interface Guide

The Chat Interface is where **learning comes alive** through conversation. Ask questions, get explanations, practice skills, and explore topics naturally.

## Opening the Chat

- **Keyboard**: Press `Ctrl+2`
- **Menu**: Click "Chat" in sidebar
- **From Dashboard**: "Continue" button

## Chat Layout

```
┌────────────────────────────────────────────────────────────┐
│ Chat Header                                                  │
│ React Hooks Session          [Settings] [End Session]      │
│                                                             │
│                                                             │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  AI: Welcome! What would you like to learn about React?   │
│        [Thinking: Analyzing question...]                    │
│                                                             │
│  You: What are hooks?                                       │
│                                                             │
│  AI: Great question! Hooks are functions that let you:     │
│      • Use state in functional components                  │
│      • Access lifecycle methods                            │
│      • Share logic between components                      │
│                                                             │
│      Think of hooks as "plugin functions" that add         │
│      superpowers to your components!                       │
│                                                             │
│  You: Can you show me useState?                            │
│                                                             │
│  AI: Absolutely! Here's a simple example:                 │
│      ```javascript                                         │
│      import { useState } from 'react';                    │
│                                                             │
│      function Counter() {                                  │
│        const [count, setCount] = useState(0);            │
│                                                             │
│        return (                                            │
│          <div>                                             │
│            <p>Count: {count}</p>                          │
│            <button onClick={() => setCount(count + 1)}>   │
│              Increment                                     │
│            </button>                                       │
│          </div>                                            │
│        );                                                  │
│      }                                                     │
│      ```                                                   │
│                                                             │
│      Let's break this down...                              │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  [Type your message...]                            [Send]  │
│                                                             │
│  💡 Ask naturally - No commands needed!                    │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

## Core Features

### 1. Natural Language Conversation

**Just talk naturally** - no commands or special syntax needed!

**Good conversation starters:**
```
✅ "Explain machine learning to me"
✅ "How do Python lists work?"
✅ "What is React and why is it popular?"
✅ "Can you quiz me on JavaScript?"
✅ "Show me a simple example of recursion"
✅ "I'm confused about closures in JavaScript"
```

**Tips for better conversations:**
```
1. Be specific: "How do Python decorators work?" not "Explain Python"
2. Ask for examples: "Show me an example"
3. Request analogies: "Explain like I'm new to programming"
4. Follow up: "Can you elaborate on that?"
5. Practice: "Give me a challenge to try"
```

### 2. Real-time Streaming

**Watch responses appear progressively**

**What you'll see:**
```
AI is typing...
[Response appears word by word]

⚡ Streaming... 45 words | 12.3 w/s | 3.6s

[Content appears progressively with live updates]

✅ Response complete | 187 words | 15.2s
📊 Response: 187 words (12.3 w/s) • ⏱️ 15.2s
```

**Benefits:**
- Feel more conversational
- See progress on long responses
- Cancel if you need to stop (`Ctrl+C`)

### 3. AI Thinking Visualization (ChatGLM)

**If using ChatGLM models, see the AI's reasoning**

```
🧠 [AI Thinking Process]

Analyzing the question...
User wants to understand hooks. They're probably a React beginner.
Should explain: What hooks are, why they're useful, basic examples.

Breaking down:
1. Definition: Hooks as functions
2. Purpose: State, lifecycle, context
3. Analogy: Like plugins or superpowers
4. Example: useState demo
5. Next steps: useEffect, custom hooks

[Thinking complete]

🤖 [AI Response]

Great question! Hooks are functions that let you add superpowers to your functional components...
```

**How to enable:**
- Use ChatGLM provider: Settings → AI Providers → ChatGLM
- Toggle: "Show Thinking" in chat settings

### 4. Message History

**Complete conversation transcript**

**Features:**
- **Infinite scroll**: Load more messages as needed
- **Search**: Find past messages
- **Jump to date**: Navigate by time
- **Export**: Save conversations

**How to access:**
```
1. Chat header → "History" button
2. Or use: Ctrl+H
3. Search box at top
4. Click any message to jump to it
```

### 5. Message Actions

**Right-click any message for options**

**Available actions:**
- **Copy**: Copy message text
- **Copy as Code**: Format for code blocks
- **Create Checkpoint**: Save this point
- **Edit**: Modify your message (before AI responds)
- **Delete**: Remove message
- **Bookmark**: Save important messages

**How to use:**
```
Right-click message → Select action
OR
Hover over message → Click ••• icon
```

## Conversation Techniques

### 1. Socratic Method

**Ask questions to learn deeply**

```
You: "What is a closure in JavaScript?"

AI: [Explains closures]

You: "Why would I use a closure?"

AI: [Explains use cases]

You: "Can you give me a practical example?"

AI: [Shows example]

You: "What happens if I don't use a closure here?"

AI: [Shows difference]
```

### 2. Progressive Disclosure

**Start broad, then dive deeper**

```
Level 1: "Explain machine learning"
Level 2: "How does supervised learning work?"
Level 3: "What's the difference between classification and regression?"
Level 4: "Show me a classification algorithm example"
Level 5: "Implement a decision tree in Python"
```

### 3. Code-Along Learning

**Learn by doing, not just reading**

```
You: "Teach me Python functions"

AI: [Explains functions]

You: "Show me an example I can code along with"

AI: ```python
def greet(name):
    print(f"Hello, {name}!")

greet("Alice")
```

You: "Let me try - what if I want to return a value?"

AI: Great question! Let me show you...
```

### 4. Error-Driven Learning

**Learn from mistakes**

```
You: "Write a Python function to sort a list"

AI: [Shows function]

You: *Runs code and gets error*

You: "I got an error: 'list object has no attribute sort()'

AI: Ah! That's because sort() is a method, not a function. Try this...
```

### 5. Challenge-Based Learning

**Test your understanding**

```
You: "I'm learning Python. Can you quiz me?"

AI: Sure! Here's your first question:

Question 1: What's the output?
```python
x = [1, 2, 3]
y = x
y.append(4)
print(x)
```

A) [1, 2, 3]
B) [1, 2, 3, 4]
C) Error
D) [4]

You: B

AI: Correct! Great job. This demonstrates that lists are reference types...
```

## Message Types

### User Messages

**Your questions and prompts**

```
You: "Explain async/await in JavaScript"

You: [Code block with your question]
```javascript
const result = await fetch('/api/data');
```

You: "Can you quiz me on this topic?"
```

### AI Responses

**Detailed explanations and answers**

**Structure:**
1. **Direct answer** to your question
2. **Examples** to illustrate concepts
3. **Analogies** to make it memorable
4. **Next steps** for further learning
5. **Questions** to engage you

**Example:**
```
AI: Great question! Async/await is sugar syntax for Promises
that makes asynchronous code look synchronous.

Here's what it does:
1. "async" makes a function return a Promise
2. "await" pauses execution until Promise resolves
3. Error handling with try/catch

Example:
```javascript
async function getData() {
  try {
    const response = await fetch('/api/data');
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error:', error);
  }
}
```

Try it yourself! What happens if you call getData()?

Want to see more examples or practice with a challenge?
```

### Thinking Content (ChatGLM)

**AI's reasoning process (optional)**

```
🧠 [ChatGLM thinking]

User is asking about useState. They're learning React basics.
They want a practical example they can understand.

Should cover:
1. What useState does (adds state)
2. How it works (returns [value, setter])
3. Why it's useful (reactive UI)
4. Simple example they can try

Using analogy: "like giving component memory"
```

## Chat Controls

### Input Box

**Type your messages here**

**Features:**
- **Auto-resize**: Grows with long messages
- **Code highlighting**: Syntax highlighting for code
- **Markdown support**: *italic*, **bold**, `code`
- **Mentions**: @ to reference past messages

**Markdown examples:**
```
*Italic text*
**Bold text**
`inline code`

```javascript
// Code blocks
const x = 5;
```

1. Numbered lists
- Bullet lists
```

### Send Button

**Send your message**

**Keyboard shortcuts:**
- `Enter`: Send message
- `Shift+Enter`: New line in message
- `Ctrl+Enter`: Send (alternative)
- `Ctrl+C`: Cancel streaming response

### Attachments

**Share files, images, or links**

**Supported:**
- **Code files**: `.js`, `.py`, `.ts`, etc.
- **Text files**: `.txt`, `.md`
- **Images**: View in chat
- **Links**: Auto-preview

**How to use:**
```
1. Click 📎 (paperclip) icon
2. Select file or paste URL
3. Add context: "Explain this code"
4. Send
```

## Session Management

### Starting a Session

```
1. Dashboard → "New Session" button
2. Or Chat → "Start New Chat"
3. Name your session (or auto-generated)
4. Begin conversation!
```

### Saving Sessions

**Automatic:**
- Messages saved automatically
- Resume anytime
- Persistent history

**Manual:**
```
1. Chat → "Save Checkpoint"
2. Name it (e.g., "React Hooks Notes")
3. Saves current state
4. Access from: Dashboard → Checkpoints
```

### Ending a Session

```
1. Chat header → "End Session" button
2. Session moved to history
3. Can resume from Dashboard
4. Or export transcript
```

## Advanced Features

### Code Execution

**Run code directly in chat**

```
You: "Test this Python function"
```python
def factorial(n):
    if n == 1:
        return 1
    return n * factorial(n - 1)

print(factorial(5))
```

AI: Let me run this for you...
✅ Output: 120

Great implementation! You correctly used recursion.
Want to try an iterative version?
```

### Multi-Agent Collaboration

**Different AI agents help you**

**Agent Types:**
- **Learning Agent**: Explains concepts
- **Practice Agent**: Gives challenges
- **Assessment Agent**: Tests your knowledge
- **Tutoring Agent**: Personalized help

**How to use:**
```
1. Chat → "Agent Mode"
2. Choose agent type
3. Continue conversation
4. Different perspective, same chat
```

### Conversation Export

**Save your learning**

**Formats:**
- **PDF**: Readable document
- **Markdown**: Text with formatting
- **JSON**: Machine-readable
- **Plain Text**: Simple transcript

**How to export:**
```
1. Chat → "Export" button
2. Choose format
3. Select date range (optional)
4. Save file
```

## Tips for Better Conversations

### 1. Use Complete Sentences

```
✅ "Can you explain how decorators work in Python?"
❌ "decorators?"
```

### 2. Provide Context

```
✅ "I'm building a web app. Can you explain React state?"
❌ "Explain state"
```

### 3. Ask Follow-up Questions

```
After explanation:
- "Can you elaborate on that?"
- "What if I do this instead?"
- "Give me a practical example"
- "How is this different from X?"
```

### 4. Request Different Perspectives

```
- "Explain it differently"
- "Use an analogy"
- "Show me the code version"
- "Explain it to a beginner"
```

### 5. Practice Active Learning

```
Don't just read:
- "Give me a challenge"
- "Quiz me on this"
- "What questions should I ask?"
- "How would I use this in a real project?"
```

## Troubleshooting

### Messages Not Sending

**Symptoms**: Click send but nothing happens

**Solutions**:
```
1. Check internet connection
2. Verify AI provider is configured: Settings
3. Check API key is valid
4. Press Enter (not just click)
5. Restart application
```

### AI Not Responding

**Symptoms**: Long delay or no response

**Solutions**:
```
1. Check API rate limits
2. Try shorter messages
3. Switch provider: Settings → Providers
4. Check: Settings → Advanced → Timeout
5. View logs: Help → Show Logs
```

### Thinking Process Not Showing

**Symptoms**: Using ChatGLM but no thinking visible

**Solutions**:
```
1. Verify ChatGLM is selected: Settings
2. Enable: Chat Settings → Show Thinking
3. Restart application
4. Check model supports thinking
```

### Chat Feels Slow

**Symptoms**: Responses take a long time

**Solutions**:
```
1. Check internet speed
2. Try faster model: Settings → Model
3. Disable streaming: Chat Settings
4. Close other apps
5. Use local model if available
```

### Lost Message History

**Symptoms**: Past conversations gone

**Solutions**:
```
1. Check session: Dashboard → History
2. Restore from backup: Settings → Data
3. Verify database: Settings → Verify
4. Import if you have export
```

## Keyboard Shortcuts

```
Send message: Enter
New line: Shift+Enter
Cancel response: Ctrl+C
Search chat: Ctrl+F
History: Ctrl+H
New session: Ctrl+N
End session: Ctrl+E
Attach file: Ctrl+U
```

## Next Steps

Now that you know the chat interface:

- **[Knowledge Graphs](knowledge-graphs.md)** - Visualize what you learn
- **[Learning Sessions](learning-sessions.md)** - Structure your learning
- **[Settings](settings.md)** - Configure AI providers

---

**Quick Reference**
- Open Chat: `Ctrl+2`
- Send: `Enter`
- New line: `Shift+Enter`
- Search: `Ctrl+F`
- New Session: `Ctrl+N`
