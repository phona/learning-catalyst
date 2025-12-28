# Dashboard Guide

The Dashboard is your **command center** - a visual overview of your learning progress, current
activities, and achievements.

## Opening the Dashboard

- **Keyboard**: Press `Ctrl+1`
- **Menu**: Click "Dashboard" in sidebar
- **Auto-open**: Appears on app launch

## Dashboard Layout

```
┌────────────────────────────────────────────────────────────┐
│                     Header Bar                             │
│  [Logo] Learning Catalyst     [Search] [Settings] [Help]  │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│                    Quick Stats                             │
│  📚 5 Sessions   🎯 23 Concepts   ⏱️ 12.5 hrs   🔥 7 day streak│
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│  Current Session          │        Recent Achievements      │
│  ┌─────────────────────┐  │  ┌──────────────────────────┐  │
│  │ React Hooks Session │  │  │ 🏆 First Concept         │  │
│  │ Progress: 65%       │  │  │ 🔥 Week Streak            │  │
│  │ [Continue] [Pause]  │  │  │ ⭐ Helper Badge           │  │
│  └─────────────────────┘  │  └──────────────────────────┘  │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│                   Knowledge Map                            │
│        [Interactive visual graph of your learning]         │
│         Green: Mastered  Blue: Learning  Gray: New        │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│               Recent Sessions & Activity                   │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ • Python Basics - 2 hours ago                        │ │
│  │ • Machine Learning - Yesterday                       │ │
│  │ • React Components - 3 days ago                      │ │
│  └──────────────────────────────────────────────────────┘ │
│                          [View All]                        │
└────────────────────────────────────────────────────────────┘
```

## Dashboard Sections

### 1. Quick Stats

**Purpose**: High-level overview of your learning

**What you'll see:**

- 📚 **Total Sessions**: Number of learning sessions completed
- 🎯 **Concepts Mastered**: Total concepts you've learned
- ⏱️ **Time Spent**: Total learning time across all sessions
- 🔥 **Current Streak**: Consecutive days you've learned

**How to use:**

- Get quick sense of your progress
- Identify if you're on track with goals
- Celebrate streaks and milestones

### 2. Current Session

**Purpose**: Continue your active learning

**What you'll see:**

- **Session Name**: Title of your current learning session
- **Progress**: Visual bar showing completion percentage
- **Time Spent**: How long you've been learning
- **Controls**: Continue, Pause, Save Checkpoint buttons

**How to use:**

```
1. Click "Continue" to return to your chat
2. Click "Pause" to save state without ending
3. Click "Save Checkpoint" to create a snapshot
```

**Example**:

```
Current Session: Machine Learning Fundamentals
Progress: ████████████████░░░░░░ 60%
Time Spent: 45 minutes
[Continue] [Pause] [Save Checkpoint]
```

### 3. Recent Achievements

**Purpose**: Celebrate your learning milestones

**Achievement Types**:

- 🏆 **First Concept**: Your first mastered concept
- 🔥 **Week Streak**: 7+ days of consistent learning
- ⭐ **Helper Badge**: Helped someone else learn
- 🎯 **Quiz Master**: Scored 100% on 5 quizzes
- 🚀 **Speed Learner**: Mastered 10 concepts in a week
- 📚 **Deep Diver**: Completed a 5+ hour session

**How achievements work:**

- Automatically detected as you learn
- Stored permanently in your profile
- Shareable milestones

### 4. Knowledge Map

**Purpose**: Visual representation of what you've learned

**Features:**

- **Interactive Graph**: Click nodes to explore
- **Color Coding**:
  - 🟢 Green: Mastered concepts
  - 🔵 Blue: Currently learning
  - ⚪ White/Gray: Not yet started
- **Connections**: Lines show relationships
- **Zoom & Pan**: Navigate large maps

**How to use:**

```
1. Click any concept to see details
2. Hover over connections to see relationships
3. Use mouse wheel to zoom in/out
4. Drag to pan around the map
5. Click "Full Screen" for expanded view
```

**Example Navigation**:

```
React (Mastered)
  ├── Components (Mastered)
  │   ├── Props (Mastered)
  │   └── State (Learning) ← Currently here
  └── Hooks (Learning)
      ├── useState (Learning)
      └── useEffect (Not started)
```

### 5. Recent Activity

**Purpose**: Quick access to your learning history

**Shows:**

- Last 5 learning sessions
- Session titles and timestamps
- Session durations
- Quick resume buttons

**How to use:**

```
1. Click session to resume
2. View activity history
3. Check learning consistency
```

**Example**:

```
Recent Activity:
• Python Data Structures - 2 hours ago (1.5 hrs)
• React Hooks Deep Dive - Yesterday (2.5 hrs)
• Machine Learning Basics - 2 days ago (3 hrs)
• JavaScript Fundamentals - Last week (2 hrs)
• HTML & CSS Review - Last week (1 hr)

[View All Sessions]
```

## Dashboard Features

### Search

**How to use:**

- Click search bar in header
- Type concept, topic, or session name
- Results appear in dropdown

**What you can search:**

```
• "React" - Find React-related sessions
• "functions" - Find Python function content
• "machine learning" - Find ML sessions
• "yesterday" - Find recent sessions
```

### Quick Actions

**Available from dashboard:**

- ➕ **New Session**: Start learning something new
- 📊 **View Analytics**: Detailed progress charts
- 💾 **Export Data**: Backup your learning
- 🎯 **Set Goals**: Define learning objectives
- ⚙️ **Settings**: Configure preferences

### Time Range Filter

**View different time periods:**

- **Today**: Today's learning only
- **This Week**: Current week's progress
- **This Month**: Monthly overview
- **All Time**: Complete learning history

## Dashboard Customization

### Layout Options

**Choose your view:**

- **Compact**: Smaller cards, more info visible
- **Comfortable**: Balanced spacing
- **Spacious**: Large cards, easier to read

**Set in**: Settings → Interface → Dashboard Layout

### Widget Configuration

**Show/hide widgets:**

- ✅ Quick Stats
- ✅ Current Session
- ✅ Recent Achievements
- ✅ Knowledge Map
- ✅ Recent Activity

**Reorder widgets:**

- Drag and drop sections
- Persist your preferred layout

### Theme

**Choose your style:**

- Light theme (default)
- Dark theme
- High contrast
- Colorful

**Set in**: Settings → Interface → Theme

## Tips & Tricks

### 1. Daily Check-in

Make the dashboard your daily routine:

```
Every morning:
1. Open dashboard (Ctrl+1)
2. Check your streak 🔥
3. Review today's progress 📊
4. Continue current session ▶️
5. Set a goal for the day 🎯
```

### 2. Progress Monitoring

Use the dashboard to stay on track:

```
Weekly Review:
1. Check total concepts mastered 🎯
2. Review knowledge map gaps 🗺️
3. Celebrate achievements 🏆
4. Plan next week's learning 📅
```

### 3. Quick Resume

Jump back into learning fast:

```
From dashboard:
1. See current session at top
2. Click "Continue" button
3. Immediately in your chat
4. No need to navigate menus
```

### 4. Achievement Hunting

Chase achievements for motivation:

```
Achievement Checklist:
□ First Concept (automatic)
□ Week Streak (learn daily)
□ Quiz Master (high scores)
□ Helper Badge (assist others)
□ Speed Learner (10 concepts/week)
```

### 5. Visual Learning

Use the knowledge map effectively:

```
Map Navigation:
1. Start with green (mastered) nodes
2. Follow blue (learning) connections
3. Identify white (new) concepts
4. Plan your next focus area
```

## Common Tasks

### Task 1: Start a New Learning Session

```
1. Dashboard → "New Session" button
2. Choose topic (or ask AI to suggest)
3. Begin chatting!
```

### Task 2: Continue Where You Left Off

```
1. Dashboard → "Current Session" card
2. Click "Continue" button
3. Back in your chat interface
```

### Task 3: Review Your Progress

```
1. Dashboard → Quick Stats section
2. See numbers at a glance
3. Or click "View Analytics" for details
```

### Task 4: Explore Knowledge Connections

```
1. Dashboard → Knowledge Map section
2. Click any concept node
3. See related concepts and dependencies
4. Navigate through the graph
```

### Task 5: Set Learning Goals

```
1. Dashboard → "Set Goals" quick action
2. Define targets (e.g., "10 concepts this week")
3. Track progress over time
4. Celebrate when achieved!
```

## Troubleshooting

### Dashboard Not Loading

**Symptoms**: Blank or white dashboard

**Solutions**:

```
1. Press F5 to refresh
2. Restart application
3. Check database: Settings → Data → Verify
4. See: Settings → Advanced → Reset Dashboard
```

### Knowledge Map Empty

**Symptoms**: No concepts visible

**Solutions**:

```
1. Start a learning session first
2. Ask AI to teach you something
3. Concepts will appear as you learn
4. Import materials: Settings → Materials
```

### Stats Seem Wrong

**Symptoms**: Inaccurate counts or times

**Solutions**:

```
1. Settings → Data → Recalculate Stats
2. Check for database corruption
3. Export data and reimport if needed
4. Contact support if persists
```

### Dashboard Slow

**Symptoms**: Delayed loading or scrolling

**Solutions**:

```
1. Close other apps to free memory
2. Settings → Interface → Compact view
3. Disable knowledge map animation
4. Restart application
```

## Next Steps

Now that you understand the dashboard:

- **[Chat Interface](chat-interface.md)** - Learn how to have conversations
- **[Knowledge Graphs](knowledge-graphs.md)** - Explore visual learning
- **[Learning Sessions](learning-sessions.md)** - Manage your progress
- **[Settings](settings.md)** - Customize your experience

---

**Quick Reference**

- Open Dashboard: `Ctrl+1`
- Search: Click search bar
- New Session: "New Session" button
- Continue: "Continue" button
- Settings: Gear icon
