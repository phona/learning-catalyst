# Getting Started with Learning Catalyst

Welcome to Learning Catalyst! This guide will get you up and running in 5 minutes.

## What is Learning Catalyst?

Learning Catalyst is an **AI-powered desktop application** that makes learning feel like an
adventure. Instead of boring textbooks, you'll have conversations with AI tutors, explore visual
knowledge maps, and track your progress through achievements.

**Think of it as having a personal learning mentor who:**

- Explains concepts conversationally
- Adapts to your learning style
- Tracks what you've mastered
- Helps you practice through challenges

## Prerequisites

Before installing, verify you have:

```bash
# Check Node.js version (need 18+)
node --version

# Check npm version (need 9+)
npm --version

# Check available disk space (need 1GB)
df -h
```

**Requirements:**

- ✅ Node.js 18+ (LTS recommended)
- ✅ npm 9+ or pnpm 8+
- ✅ 4GB RAM (8GB recommended)
- ✅ 1GB free storage
- ✅ Internet connection (for AI features)

## Installation

### Step 1: Clone Repository

```bash
# Clone the repository
git clone https://github.com/your-org/learning-catalyst.git
cd learning-catalyst
```

### Step 2: Install Dependencies

```bash
# Install with npm
npm install

# OR install with pnpm (faster)
pnpm install
```

### Step 3: Verify Installation

```bash
# Check TypeScript compilation
npm run type-check

# Verify build works
npm run build
```

## First Launch

### Start Development Server

```bash
# Launch the application
npm run dev
```

You should see:

```
🚀 Learning Catalyst starting...
✓ Main process ready
✓ Renderer process loading...
✓ Database initialized
✓ IPC handlers registered

🌐 Open: http://localhost:5173
```

### Desktop App Window Opens

A desktop window will appear with:

- **Welcome Screen**: First-time setup
- **Dashboard**: Your learning overview
- **Chat Interface**: Start conversations
- **Settings**: Configure AI providers

## Initial Setup

### Step 1: Configure AI Provider

When you first launch, you'll see the setup wizard:

```
🎯 Welcome to Learning Catalyst!

Let's set up your AI assistant.

1. Choose AI Provider:
   • OpenAI (GPT-4, GPT-3.5) - Best overall
   • ChatGLM (with thinking) - Shows reasoning
   • DeepSeek (coding) - Great for programming
   • Local Models (offline) - Your own models

Recommended: OpenAI
```

**Choose your provider** and enter your API key:

```bash
# OpenAI example:
API Key: sk-proj-...
Model: gpt-4

# ChatGLM example:
API Key: your-chatglm-key
Model: glm-4
```

### Step 2: Test Configuration

```bash
# In settings or welcome screen:
✓ Test Connection

# You should see:
✅ AI Provider connected successfully!
📝 Model: gpt-4
💰 Estimated cost: $0.03 per request
```

### Step 3: Start Learning

**Option 1: Ask Naturally**

```
You: "Help me understand machine learning"
Learning Catalyst: "I'd be happy to help! Let's explore machine learning together..."

[Detailed explanation follows]
```

**Option 2: Use Commands**

```
/help              # See available commands
/knowledge-map     # View your learning map
/checkpoint save   # Save your progress
```

## Your First Learning Session

### 1. Start a Chat

- Click **"New Chat"** or **"Continue Learning"**
- Or use the **Dashboard** → **Start Session**

### 2. Ask a Question

```
You: "Explain Python to me like I'm a beginner"

AI Response:
"Sure! Python is like having a really smart calculator that you can talk to...

[Full explanation with examples follows]
"
```

### 3. Explore Follow-ups

```
You: "What can I do with Python?"
AI: "Great question! Python is incredibly versatile..."

You: "Show me a simple example"
AI: "Here's a fun example - let's draw a pattern..."
```

### 4. Visualize Knowledge

```
/knowledge-map

[Opens visual map showing:]
Python
  ├── Basics (mastered ✓)
  ├── Data Types (in progress)
  ├── Functions (not started)
  └── Web Development
      └── Flask (not started)
```

### 5. Save Progress

```
/checkpoint save "Python Basics Session"

✅ Checkpoint created: "Python Basics Session"
📊 Progress: 5 concepts covered
⏱️ Duration: 25 minutes
```

## Core Features Tour

### Dashboard

**Purpose**: See your learning at a glance

**What you'll see:**

- 📊 **Current Session**: What you're learning now
- 🗺️ **Knowledge Map**: Your learning progress visualized
- 🏆 **Achievements**: Badges you've earned
- 📈 **Statistics**: Time spent, concepts mastered
- ⏰ **Recent Activity**: Last 5 sessions

### Chat Interface

**Purpose**: Have conversations with AI tutors

**Features:**

- 💬 **Natural Language**: Ask questions in plain English
- ⚡ **Streaming Responses**: Watch answers appear in real-time
- 🧠 **Thinking Process**: See AI reasoning (ChatGLM models)
- 📝 **Full History**: Complete conversation transcripts
- 🎯 **Context Aware**: AI remembers your learning materials

**Example conversation:**

```
You: "I'm struggling with React hooks"
AI: "Let's work through hooks together! What specific aspect is challenging you?"

You: "useState"
AI: "Great choice! useState is fundamental. Think of it like giving a component memory...

[Begins interactive explanation]
```

### Knowledge Graphs

**Purpose**: Visualize what you've learned

**How to use:**

1. **View Map**: Click any concept to expand
2. **See Connections**: Understand relationships
3. **Track Progress**: Green = mastered, Blue = learning
4. **Plan Next Steps**: See what's recommended

### Learning Sessions

**Purpose**: Structured learning experiences

**Features:**

- 📚 **Topic-Based**: Focus on specific subjects
- 📊 **Progress Tracking**: See completion percentage
- 🎯 **Goals**: Set and track learning objectives
- 📝 **Notes**: Save important insights
- 🔄 **Resume**: Pick up where you left off

### Settings

**Purpose**: Customize your experience

**Configuration Options:**

- 🤖 **AI Providers**: Add/remove/configure models
- 📊 **Learning Preferences**: Difficulty, pace, style
- 💾 **Data Management**: Export/import/backup
- 🎨 **Interface**: Theme, layout, language
- 🔒 **Privacy**: Local storage, data retention

## Common First Tasks

### Task 1: Learn a New Topic

```bash
# Start chat
New Chat >

# Ask question
"Explain React to me"

# Follow up
"Show me how useState works with an example"

# Practice
"Give me a challenge to practice React basics"
```

### Task 2: Review What You Learned

```bash
# View knowledge map
/knowledge-map

# See details
Click on any concept

# Check progress
Dashboard > Progress
```

### Task 3: Prepare for Interview

```bash
# Start learning session
Dashboard > Start Session > "Technical Interview Prep"

# Ask practice questions
"Ask me Python interview questions"

# Save checkpoint
/checkpoint save "Interview Prep - Python"
```

### Task 4: Study for Exam

```bash
# Upload materials
Settings > Materials > Import Files

# Start focused session
New Session > "Biology Exam Review"

# Ask AI to quiz you
"Quiz me on cell biology"

# Track progress
Dashboard > Analytics
```

## Tips for Success

### For Beginners

1. **Start Simple**: Ask basic questions first
   - ✅ "What is Python?"
   - ❌ Don't start with advanced topics

2. **Be Specific**: Get better answers with specific questions
   - ✅ "How do Python lists work?"
   - ❌ "Explain Python"

3. **Ask for Examples**: See concepts in action
   - ✅ "Show me an example of a Python function"
   - ❌ Don't just read definitions

4. **Take Breaks**: Use checkpoints to save progress
   - `/checkpoint save "Session 1"`

### For Effective Learning

1. **Ask Follow-ups**: Dig deeper

   ```
   You: "What is machine learning?"
   AI: [Explanation]
   You: "Give me a simple example"
   AI: [Example]
   You: "How is this different from traditional programming?"
   ```

2. **Practice Immediately**: Apply what you learn

   ```
   AI: "Try writing a function that..."
   You: [Write code]
   AI: [Review and give feedback]
   ```

3. **Make Connections**: Link to what you know

   ```
   You: "How is React similar to Vue.js?"
   You: "How does Python relate to JavaScript?"
   ```

4. **Review Regularly**: Check your knowledge map
   - `/knowledge-map` to see gaps
   - `/checkpoint load` to review past sessions

## Troubleshooting

### "Application won't start"

```bash
# Check Node.js version
node --version
# Should be 18+

# Clear cache
rm -rf node_modules package-lock.json
npm install

# Try again
npm run dev
```

### "AI provider not working"

```bash
# Check API key
Settings > Providers > Your Provider

# Verify key is correct
# Should start with: sk- (OpenAI), etc.

# Test connection
Settings > Test Connection
```

### "Database error"

```bash
# Reset database
# Close application first
rm -rf .catalyst

# Restart
npm run dev
# Database will be recreated
```

### "High memory usage"

```bash
# Monitor memory
# Windows: Task Manager > Details > electron.exe
# macOS: Activity Monitor > Learning Catalyst

# If > 2GB:
# 1. Close other apps
# 2. Restart application
# 3. See: DEVELOPER-GUIDE/performance.md
```

### "Can't find my sessions"

```bash
# Check database location
# Default: ./learning_catalyst.db

# Export data
Settings > Data > Export

# Search for files
find . -name "learning_catalyst.db"
```

## Next Steps

Now that you're set up:

### Explore Features

1. **Read**: [USER-GUIDE/dashboard.md](USER-GUIDE/dashboard.md)
2. **Learn**: [USER-GUIDE/chat-interface.md](USER-GUIDE/chat-interface.md)
3. **Discover**: [USER-GUIDE/knowledge-graphs.md](USER-GUIDE/knowledge-graphs.md)
4. **Customize**: [USER-GUIDE/settings.md](USER-GUIDE/settings.md)

### Advanced Usage

1. **Multi-Agent System**: Let different agents help you
2. **Local Models**: Use offline AI
3. **Custom Materials**: Import your own content
4. **Analytics**: Track your learning patterns

### For Developers

Interested in contributing? See:

- [DEVELOPER-GUIDE/README.md](DEVELOPER-GUIDE/README.md)
- [DEVELOPER-GUIDE/architecture.md](DEVELOPER-GUIDE/architecture.md)

## Keyboard Shortcuts

```bash
# Chat
Ctrl + Enter      # Send message
Ctrl + L          # Clear chat
Ctrl + /          # Show help

# Navigation
Ctrl + 1          # Dashboard
Ctrl + 2          # Chat
Ctrl + 3          # Knowledge Map
Ctrl + 4          # Analytics

# System
Ctrl + ,          # Settings
Ctrl + S          # Save checkpoint
Ctrl + Q          # Quit
```

## Frequently Asked Questions

### Q: Is my data private?

**A**: Yes! All data is stored locally on your machine. Nothing is sent to external servers except
AI API calls.

### Q: Can I use this offline?

**A**: Partially. You can view past sessions, but new AI conversations need internet (unless using
local models).

### Q: How much does it cost?

**A**: The app is free. AI API calls cost:

- OpenAI: ~$0.002 per 1K tokens
- ChatGLM: ~$0.001 per 1K tokens
- Local models: Free (but needs powerful computer)

### Q: Can I export my data?

**A**: Yes! Settings > Data > Export gives you JSON files with all your sessions and progress.

### Q: How do I backup my learning?

**A**: Simply copy the `.catalyst` folder. It contains your database and settings.

### Q: Can I use my own AI models?

**A**: Yes! Configure local models (Ollama, Llama.cpp) in Settings > Providers.

### Q: What if I lose my API key?

**A**: Keys are stored securely. You can regenerate them from your AI provider's dashboard.

## Get Help

- **Documentation**: This docs folder
- **GitHub Issues**: Report bugs or request features
- **GitHub Discussions**: Ask questions, share ideas
- **Built-in Help**: `/help` in chat

---

**Congratulations!** You're now ready to start learning with Learning Catalyst! 🚀

[Next: Explore the Dashboard →](USER-GUIDE/dashboard.md)
