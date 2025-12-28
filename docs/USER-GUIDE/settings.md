# Settings Guide

Configure Learning Catalyst to match your learning style, preferences, and AI provider requirements.

## Opening Settings

- **Keyboard**: Press `Ctrl+,` (comma)
- **Menu**: Click gear icon ⚙️ in header
- **Dashboard**: "Settings" quick action

## Settings Layout

```
Settings
├── 🤖 AI Providers
│   ├── OpenAI Configuration
│   ├── ChatGLM Configuration
│   ├── DeepSeek Configuration
│   └── Local Models
│
├── 📚 Learning Preferences
│   ├── Difficulty Level
│   ├── Session Length
│   ├── Practice Frequency
│   └── Assessment Style
│
├── 🎨 Interface
│   ├── Theme
│   ├── Layout
│   ├── Font Size
│   └── Dashboard View
│
├── 💾 Data & Privacy
│   ├── Storage Location
│   ├── Auto Backup
│   ├── Export Data
│   └── Privacy Controls
│
└── ⚙️ Advanced
    ├── Performance
    ├── Debug Mode
    ├── Logs
    └── Reset Options
```

## AI Providers Configuration

### Setting Up OpenAI

```
1. Settings → AI Providers → OpenAI
2. Enter API Key: sk-proj-...
3. Select Model:
   • gpt-4o (recommended) - Best quality
   • gpt-4o-mini - Faster, cheaper
   • gpt-4 - Good all-around
   • gpt-3.5-turbo - Budget option
4. Configure:
   • Temperature: 0.7 (creativity)
   • Max Tokens: 4000
   • Timeout: 60 seconds
5. Test Connection ✓
6. Save
```

**Finding your OpenAI API key:**

- Visit: https://platform.openai.com/api-keys
- Sign in or create account
- Click "Create new secret key"
- Copy key (starts with `sk-`)

**Cost estimation:**

```
GPT-4o: ~$0.005 per 1K tokens
GPT-4: ~$0.03 per 1K tokens
GPT-3.5: ~$0.001 per 1K tokens
```

### Setting Up ChatGLM

```
1. Settings → AI Providers → ChatGLM
2. Enter API Key: your-chatglm-key
3. Select Model:
   • glm-4 (recommended) - Best quality + thinking
   • glm-4-plus - Enhanced reasoning
   • glm-3-turbo - Budget option
4. Configure:
   • Temperature: 0.7
   • Max Tokens: 4000
   • Thinking Mode: Enabled ✓
5. Test Connection ✓
6. Save
```

**ChatGLM features:**

- 🧠 **Thinking Visualization**: See AI reasoning
- 💡 **Smart Suggestions**: Better context
- 💰 **Competitive Pricing**: Often cheaper
- 🇨🇳 **Chinese Support**: Bilingual

**Finding your ChatGLM API key:**

- Visit: https://open.bigmodel.cn/
- Register and verify account
- Go to API Key management
- Create new key

### Setting Up DeepSeek

```
1. Settings → AI Providers → DeepSeek
2. Enter API Key: your-deepseek-key
3. Select Model:
   • deepseek-coder (coding tasks)
   • deepseek-chat (general conversation)
4. Configure:
   • Temperature: 0.7
   • Max Tokens: 4000
5. Test Connection ✓
6. Save
```

**Best for:**

- Programming questions
- Code reviews
- Technical discussions
- Algorithm explanations

### Setting Up Local Models

**Use your own AI models (offline)**

#### Option A: Ollama

```
1. Install Ollama: https://ollama.ai
2. Pull a model:
   • ollama pull llama3
   • ollama pull mistral
   • ollama pull codellama
3. Settings → AI Providers → Local
4. Configure:
   • Host: http://localhost:11434
   • Model: llama3 (or your choice)
   • Temperature: 0.7
5. Test Connection ✓
6. Save
```

**Benefits:**

- ✅ Completely free
- ✅ No data leaves your machine
- ✅ Works offline
- ✅ Unlimited usage

**Requirements:**

- 8GB+ RAM for good models
- 16GB+ for large models (70B+)
- Modern CPU or GPU recommended

#### Option B: LM Studio

```
1. Install LM Studio: https://lmstudio.ai
2. Download a model (GGUF format)
3. Start local server (port 1234)
4. Settings → AI Providers → Local
5. Configure:
   • Host: http://localhost:1234
   • Model: Auto-detected
6. Save
```

## Learning Preferences

### Difficulty Level

**Adjust content complexity**

```
Options:
• Beginner - Simple explanations, basic examples
• Intermediate - Moderate complexity, practical examples
• Advanced - Detailed explanations, complex scenarios
• Expert - Deep dive, edge cases, technical details

Default: Intermediate
```

**How it affects AI:**

- **Beginner**: Uses analogies, simple terms, step-by-step
- **Intermediate**: Balanced detail, real-world examples
- **Advanced**: Assumes base knowledge, focuses on nuances
- **Expert**: Technical depth, assumes mastery of basics

### Session Length

**Target duration for learning sessions**

```
Options:
• Short (15-30 min) - Quick sessions
• Medium (30-60 min) - Standard sessions
• Long (60-120 min) - Deep dives
• Extended (120+ min) - Marathon sessions

Default: Medium (30-60 min)
```

**How it affects sessions:**

- AI structures content to fit timeframe
- Shorter = more breaks, bite-sized lessons
- Longer = comprehensive coverage, fewer interruptions

### Practice Frequency

**How often AI gives you exercises**

```
Options:
• Rarely - Focus on explanation
• Sometimes - Occasional questions
• Often - Regular challenges
• Constant - Interactive throughout

Default: Sometimes
```

### Assessment Style

**How AI tests your knowledge**

```
Options:
• Gentle - Encouraging, forgiving
• Standard - Balanced feedback
• Strict - Detailed correction
• Adaptive - Adjusts to your level

Default: Standard
```

## Interface Customization

### Theme

**Choose your visual style**

```
Light Theme (default)
• White backgrounds
• Dark text
• Colorful accents
• High readability

Dark Theme
• Dark backgrounds
• Light text
• Subtle colors
• Easy on eyes

High Contrast
• Maximum contrast
• Accessibility-focused
• Bold colors
• Large text options

Colorful
• Vibrant accents
• Fun colors
• Engaging visuals
• Customizable
```

### Layout

**Arrangement of UI elements**

```
Compact
• Smaller cards
• More information visible
• Efficient use of space

Comfortable (default)
• Balanced spacing
• Easy to read
• Pleasant to use

Spacious
• Larger cards
• More whitespace
• Relaxed feeling
```

### Font Size

**Text size throughout the app**

```
Small - Compact, more content
Medium (default) - Balanced
Large - Easier to read
Extra Large - Accessibility
Custom - Define your own
```

**Shortcut:** `Ctrl+Plus/Minus` to adjust quickly

### Dashboard View

**Default dashboard layout**

```
Cards View - Individual cards for sections
List View - Compact list format
Grid View - Organized grid layout
Custom - Your own arrangement
```

## Data & Privacy

### Storage Location

**Where your data is stored**

```
Default: .catalyst/ folder in project directory

Custom locations:
• Documents/Learning-Catalyst/
• ~/.config/learning-catalyst/ (Linux)
• %APPDATA%/learning-catalyst/ (Windows)
```

**What's stored:**

- Learning sessions
- Messages and transcripts
- Knowledge concepts
- Progress tracking
- Settings and preferences
- Achievements and analytics

### Auto Backup

**Automatic data protection**

```
Options:
• Daily - Backup every day
• Weekly - Backup once a week
• Monthly - Backup once a month
• Never - Manual backup only

Default: Weekly
```

**Backup location:**

- Same folder as data
- Timestamped: `backup-2025-01-15.zip`
- Includes all sessions and settings

### Export Data

**Download your learning data**

**Export formats:**

```
JSON - Machine-readable, complete data
Markdown - Human-readable, formatted text
PDF - Shareable document
CSV - Spreadsheet-compatible
```

**How to export:**

```
1. Settings → Data & Privacy → Export Data
2. Choose format
3. Select date range (All time / Last month / Custom)
4. Click Export
5. Save file to your computer
```

**What's included:**

- All learning sessions
- Chat transcripts
- Knowledge concepts
- Progress statistics
- Achievements
- Settings

### Privacy Controls

**Control your data**

```
Local Storage Only ✓ (default)
• All data stays on your machine
• No cloud sync
• Maximum privacy

Allow Anonymous Analytics
• Usage statistics (no personal data)
• Help improve the app
• Opt-in only

Enable Crash Reporting
• Automatic error reports
• Helps fix bugs
• No personal information

Data Retention
• Keep forever (default)
• Auto-delete after 1 year
• Auto-delete after 6 months
• Custom period
```

## Advanced Settings

### Performance

**Optimize for your system**

```
Memory Limit
• Auto-detect (recommended)
• 2GB - Conservative
• 4GB - Balanced
• 8GB - Generous
• Custom - Set your own

GPU Acceleration
• Auto-detect (recommended)
• Enabled - Use GPU if available
• Disabled - CPU only

Caching
• Aggressive - Faster, more memory
• Balanced (default) - Good performance
• Conservative - Less memory, slower
• Disabled - No cache
```

### Debug Mode

**Developer and troubleshooting options**

```
Enable Debug Logging
• Detailed logs for troubleshooting
• Performance metrics
• API call details
• Useful for support

Show Technical Details
• Show memory usage
• Display performance metrics
• API response times
• Database queries

Verbose Mode
• Extra information everywhere
• Helpful for development
• Can be overwhelming
```

### Logs

**View and manage application logs**

**Log types:**

```
Application Logs - General app behavior
Error Logs - Errors and exceptions
Performance Logs - Memory and speed metrics
API Logs - AI provider interactions
Database Logs - Database operations
```

**How to view:**

```
1. Settings → Advanced → Logs
2. Select log type
3. Choose time range
4. View in built-in viewer
5. Export if needed
```

### Reset Options

**Restore settings or reset data**

```
Reset Settings
• Restore defaults
• Keep your learning data
• Useful if things break

Factory Reset
• Reset everything
• Delete all sessions
• Clear all progress
• ⚠️ Cannot be undone!

Reset Checkpoints
• Remove all saved sessions
• Keep current session
• Start fresh

Clear Cache
• Remove temporary files
• Fix performance issues
• Keep all data
• Safe to do
```

## Common Configurations

### For Programming Learners

```
AI Provider: OpenAI (GPT-4o) or DeepSeek
Difficulty: Intermediate
Session Length: Medium
Practice: Often
Theme: Dark (easier on eyes)
Auto Backup: Weekly
```

### For Students

```
AI Provider: ChatGLM (good value)
Difficulty: Beginner to Intermediate
Session Length: Short
Practice: Sometimes
Assessment: Gentle
Auto Backup: Daily
```

### For Researchers

```
AI Provider: OpenAI (GPT-4)
Difficulty: Advanced to Expert
Session Length: Long
Practice: Sometimes
Assessment: Strict
Auto Backup: Daily
```

### For Privacy-Conscious

```
AI Provider: Local Models (Ollama)
Data Storage: Custom location
Privacy: Local only ✓
Auto Backup: Weekly
Debug Mode: Disabled
```

## Troubleshooting

### "API Key Invalid"

**Solutions:**

```
1. Double-check key (no extra spaces)
2. Regenerate key from provider
3. Verify account has credits
4. Check provider status page
5. Try different key format
```

### "Connection Failed"

**Solutions:**

```
1. Check internet connection
2. Verify provider is up: provider-status.com
3. Check firewall settings
4. Try different port
5. Restart application
```

### "Settings Not Saving"

**Solutions:**

```
1. Check write permissions to config folder
2. Close other instances of app
3. Run as administrator (Windows)
4. Check disk space
5. Reset settings and reconfigure
```

### "High Memory Usage"

**Solutions:**

```
1. Reduce memory limit: Settings → Advanced → Performance
2. Clear cache: Advanced → Reset → Clear Cache
3. Restart application
4. Close other apps
5. Enable GPU acceleration
```

### "Theme Not Changing"

**Solutions:**

```
1. Restart application
2. Check system theme setting
3. Clear cache
4. Reset interface settings
5. Update graphics drivers
```

## Tips & Tricks

### 1. Multiple AI Providers

Use different providers for different tasks:

```
OpenAI - Best for general learning
ChatGLM - Good for thinking process
DeepSeek - Best for coding
Local - Privacy and unlimited use
```

### 2. Gradual Difficulty Increase

Start easy, increase over time:

```
Week 1: Beginner
Week 2-3: Intermediate
Week 4+: Advanced
```

### 3. Regular Backups

Protect your learning:

```
1. Enable auto-backup (weekly)
2. Export data monthly
3. Store backups in cloud
4. Test restoration
```

### 4. Performance Tuning

Optimize for your hardware:

```
Low-end PC: Compact layout, conservative settings
Mid-range: Balanced settings
High-end: Aggressive settings, all features
```

## Keyboard Shortcuts

```
Open Settings: Ctrl+,
Switch Provider: Ctrl+Shift+P
Toggle Theme: Ctrl+Shift+T
Export Data: Ctrl+Shift+E
Reset Settings: Ctrl+Shift+R
```

## Next Steps

Now that you've configured settings:

- **[Dashboard](dashboard.md)** - Explore with new settings
- **[Chat Interface](chat-interface.md)** - Try different models
- **[Learning Sessions](learning-sessions.md)** - Structure your learning

---

**Quick Reference**

- Open Settings: `Ctrl+,`
- Save: Settings save automatically
- Reset: Settings → Advanced → Reset Settings
- Export: Settings → Data → Export Data
