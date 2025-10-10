# Quick Start Guide

---
title: Learning Catalyst CLI Quick Start
description: Get started with Learning Catalyst CLI in 5 minutes
version: 1.0.0
last_updated: 2025-10-07
---

## Overview

This guide will get you up and running with Learning Catalyst CLI in just 5 minutes. No prior experience needed!

## Prerequisites Check

Before we start, let's verify you have what you need:

```bash
# Check Python version (need 3.8+)
python --version
# OR
python3 --version

# Check Git
git --version
```

If you don't have these installed, see the [Full Installation Guide](README.md).

## 5-Minute Quick Start

### Step 1: Install Learning Catalyst (1 minute)

```bash
# Clone the repository
git clone https://github.com/your-repo/learning-catalyst.git
cd learning-catalyst

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install the application
pip install -e .
```

### Step 2: Launch Learning Catalyst (30 seconds)

```bash
# Start the application
python -m src.cli.main
```

You should see a welcome message like this:
```
🚀 Welcome to Learning Catalyst!

AI-powered learning assistant for the command line.

It looks like you're new here. Let's get you set up!
```

### Step 3: Initial Setup (2 minutes)

Follow the interactive prompts:

1. **Choose AI Provider**:
   ```
   Select your AI provider:
   1) OpenAI (recommended)
   2) Anthropic Claude
   3) ChatGLM
   4) Local Models
   5) Skip for now
   ```

   **Recommendation**: Choose `1) OpenAI` or `5) Skip for now` if you don't have an API key

2. **Enter API Key** (if applicable):
   ```
   Enter your OpenAI API key: [paste your key here]
   ```

3. **Select Model**:
   ```
   Choose your model:
   1) gpt-4o (recommended)
   2) gpt-4o-mini
   3) gpt-3.5-turbo
   ```

4. **Content Analysis**:
   ```
   How would you like to analyze your learning materials?
   1) Headers only (fastest)
   2) Summaries (balanced)
   3) Full content (most detailed)
   ```

   **Recommendation**: Start with `1) Headers only`

### Step 4: First Commands (1 minute)

Once setup is complete, you'll see the main prompt:
```
Learning Catalyst >
```

Try these commands:

```bash
# See what's available
/help

# Browse learning topics
/concepts

# Ask a question
/explain what is machine learning

# Take a quick quiz
/quiz python

# Check your progress
/statistics

# Exit when done
/quit
```

### Step 5: Success! (30 seconds)

🎉 **Congratulations!** You've successfully:
- Installed Learning Catalyst CLI
- Configured your AI provider
- Explored learning concepts
- Asked your first question
- Taken your first quiz

## Next Steps

Now that you're up and running, here's what to do next:

### Immediate Next Steps
1. **Create Learning Materials**: Add some Markdown files to your workspace
2. **Explore Commands**: Try different `/` commands
3. **Customize Settings`: Use `/config` to adjust preferences

### Learning Path
```bash
# Start with something you want to learn
/explain python basics

# Test your knowledge
/quiz python

# See your progress
/knowledge-map

# Explore more topics
/concepts
```

## Quick Reference

### Essential Commands
```bash
/help           # Show available commands
/concepts       # Browse topics
/explain [topic] # Learn about something
/quiz [topic]   # Test yourself
/quit           # Exit application
```

### Command Aliases (Shortcuts)
```bash
/h              # Help
/c              # Concepts
/e              # Explain
/q              # Quiz/Quit (context matters)
```

### Getting Help
```bash
/help           # General help
/help concepts  # Help for concepts command
/help /quiz     # Help for quiz command
```

## Troubleshooting Quick Fixes

### "Python not found"
```bash
# Try python3 instead
python3 -m src.cli.main
```

### "Permission denied"
```bash
# Use user installation
pip install --user -e .
```

### "API key not working"
```bash
# Reconfigure
/config
# Choose provider again and enter correct key
```

### "No concepts found"
```bash
# Create a sample file
echo "# Python\n\nPython is a programming language" > python.md
# Then try /concepts again
```

## Sample Session

Here's what a typical first session looks like:

```bash
$ python -m src.cli.main
🚀 Welcome to Learning Catalyst!

Learning Catalyst > /help
📋 Available Commands:
  /help    - Show this help
  /concepts - Browse learning topics
  /explain - Get explanations
  /quiz    - Take quizzes
  /quit    - Exit

Learning Catalyst > /concepts
📚 Available Learning Concepts:
  1. Python Programming
  2. Machine Learning
  3. Data Structures

Learning Catalyst > /explain python
🧠 Python is a high-level programming language known for its simplicity...
[Detailed explanation follows]

Learning Catalyst > /quiz python
🎯 Quiz: Python Programming
Question 1: What is a Python variable?
A) A container for storing data values
B) A type of function
C) A loop construct
Your answer: a
✅ Correct!

Learning Catalyst > /quit
💾 Session saved. Goodbye!
```

## Tips for Success

### For Beginners
1. **Start with `/help`** - Learn the available commands
2. **Use `/concepts`** - See what topics are available
3. **Ask simple questions** - Start with basic explanations
4. **Take quizzes** - Test your understanding

### For Faster Learning
1. **Be specific** - Instead of `/explain programming`, try `/explain python variables`
2. **Use aliases** - `/h`, `/c`, `/e`, `/q` are faster
3. **Follow up** - Ask related questions after getting an explanation
4. **Practice regularly** - Use `/quiz` to reinforce learning

### For Better Organization
1. **Organize files** - Keep learning materials in organized folders
2. **Use descriptive names** - Name your files clearly
3. **Review progress** - Use `/knowledge-map` to see what you've learned
4. **Set goals** - Focus on specific topics or skills

## Customization Quick Tips

### Set Preferences
```bash
# Set learning difficulty
/preferences learning.difficulty=beginner

# Set session length
/preferences session.length=30

# Show progress always
/preferences display.progress=true
```

### Configure Models
```bash
# Switch AI models
/models
# Select different model from the list

# Add new model
/config
# Choose "Add new model"
```

## Going Further

Once you're comfortable with the basics:

1. **Read the [First Session Guide](first-session.md)** - Detailed walkthrough
2. **Explore [Command Reference](../commands/)** - Learn all commands
3. **Check [Configuration Guide](../configuration/)** - Customize your setup
4. **Try [Usage Examples](../examples/)** - See practical examples

## Community and Support

- **Documentation**: `/help` within the application
- **Issues**: Report problems via GitHub Issues
- **Discussions**: Join community discussions
- **Updates**: Check repository for new features

---

**Congratulations on completing the Quick Start!** You're now ready to use Learning Catalyst CLI for effective learning. 🚀

*For more detailed information, see the [Complete Installation Guide](README.md) or [First Session Guide](first-session.md).*