# Knowledge Graphs Guide

Knowledge Graphs provide a **visual map** of what you've learned, showing concepts and their relationships at a glance.

## Opening Knowledge Graphs

- **Keyboard**: Press `Ctrl+3`
- **Dashboard**: Click "Knowledge Map" section
- **Menu**: Click "Knowledge" in sidebar

## What Are Knowledge Graphs?

**A visual representation of your learning**

Think of it like a **treasure map** where:
- **🟢 Green nodes** = Concepts you've mastered
- **🔵 Blue nodes** = Concepts you're currently learning
- **⚪ White nodes** = New concepts you haven't explored
- **Lines** = Relationships between concepts
- **Thickness** = Strength of connection

```
         Python Programming (Mastered)
                /   |   \
               /    |    \
        Variables  Data Types  Functions
         (M)        (M)        (M)
           \         |         /
            \        |        /
             \       |       /
              Lists & Dictionaries
                    (Learning)
```

## Knowledge Graph Layout

```
┌────────────────────────────────────────────────────────────┐
│ Knowledge Map Controls                                       │
│ [Search] [Filter: All] [Layout: Force] [Export] [Fullscreen] │
│                                                             │
├────────────────────────────────────────────────────────────┤
│                                                             │
│    React Components (Mastered)                             │
│    ╭───────────────╮                                       │
│    │     Green     │                                       │
│    ╰──────────────╯                                       │
│          │                                                 │
│          │ uses                                            │
│          │                                                 │
│       Props (Mastered)                                     │
│    ╭───────────────╮                                       │
│    │     Green     │                                       │
│    ╰──────────────╯                                       │
│          │                                                 │
│          │ updates                                         │
│          │                                                 │
│       State (Learning)                                     │
│    ╭───────────────╮                                       │
│    │     Blue      │                                       │
│    ╰──────────────╯                                       │
│          │                                                 │
│          │ manages                                        │
│          │                                                 │
│    useState Hook (New)                                     │
│    ╭───────────────╮                                       │
│    │    White      │                                       │
│    ╰──────────────╯                                       │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

## Navigating the Graph

### Basic Navigation

```
Mouse Controls:
• Drag: Pan around the map
• Scroll: Zoom in/out
• Click node: Select concept
• Double-click: Focus on concept
• Right-click: Context menu
• Hover: Preview details
```

### Keyboard Shortcuts

```
Arrow Keys: Navigate between nodes
Enter: Select focused node
Escape: Deselect all
Space: Fit all in view
+/-: Zoom in/out
F: Focus on selected
R: Reset layout
```

### Finding Concepts

**Search:**
```
1. Click search box (or press Ctrl+F)
2. Type concept name
3. Matching nodes highlight
4. Press Enter to jump to it
```

**Browse by category:**
```
Filter dropdown:
• All Concepts
• Mastered Only
• Learning Only
• New Concepts
• By Category (Programming, Math, Science, etc.)
```

## Concept Details

### Viewing Information

**Click any node to see details:**

```
React Components
┌─────────────────────────────────────────────────────────┐
│ Overview                                                  │
│ Status: Mastered ✓                                        │
│ Category: Programming → Frontend                          │
│ Difficulty: Intermediate                                  │
│                                                           │
│ Description                                               │
│ Components are the building blocks of React              │
│ applications. They encapsulate UI and behavior.          │
│                                                           │
│ Key Points                                                │
│ • Reusable pieces of UI                                  │
│ • Can accept props (inputs)                              │
│ • Can manage internal state                              │
│ • Return JSX (UI markup)                                 │
│                                                           │
│ Related Concepts                                          │
│ • Props (uses)                                           │
│ • State (updates)                                        │
│ • JSX (returns)                                          │
│ • Lifecycle (related)                                    │
│                                                           │
│ Progress                                                  │
│ Time Spent: 3.5 hours                                    │
│ Times Practiced: 12                                      │
│ Confidence: 95%                                          │
│                                                           │
│ Actions                                                   │
│ [Review] [Practice] [Mark as Learning] [Hide]            │
└─────────────────────────────────────────────────────────┘
```

### Node Status Meanings

**🟢 Mastered (Green)**
- You've demonstrated understanding
- Can explain and use the concept
- Ready to move on to advanced topics
- Confidence: 80%+

**🔵 Learning (Blue)**
- Currently studying this concept
- Have basic understanding
- Need more practice
- Confidence: 40-79%

**⚪ New (White/Gray)**
- Not yet explored
- Available to learn
- Or hidden/deferred

## Graph Layouts

### Force-Directed Layout (Default)

**Auto-organizes based on relationships**

```
Best for:
• Exploration
• Discovery
• Seeing connections
• Initial overview

How it works:
• Nodes push away from each other
• Connected nodes pull together
• Dynamic, organic arrangement
• Easy to see clusters
```

### Hierarchical Layout

**Organizes by difficulty/category**

```
Best for:
• Planning learning path
• Understanding prerequisites
• Structured study
• Curriculum planning

How it works:
• Prerequisites at top
• Advanced concepts below
• Categories grouped
• Linear progression
```

### Radial Layout

**Radiates from central concept**

```
Best for:
• Deep dive into one topic
• Understanding dependencies
• Topic-centric view
• Concentrated study

How it works:
• Selected concept in center
• Related concepts in rings
• Distance = relationship strength
• Clear focus
```

### Custom Layout

**Manual arrangement**

```
How to use:
1. Select node
2. Drag to desired position
3. Save custom layout
4. Share with others

Great for:
• Personal study plans
• Team collaboration
• Presentations
• Note-taking
```

## Learning with Knowledge Graphs

### 1. Plan Your Learning Path

**Use the graph to plan what to learn next:**

```
1. Find a green node (mastered)
2. Follow blue nodes (learning)
3. Identify white nodes (next)
4. Plan sequence based on connections

Example path:
React Components → Props → State → useState → useEffect
```

### 2. Identify Knowledge Gaps

**Find white nodes between green nodes:**

```
React (Mastered)
     |
     | (gap - not learned)
     |
  Something New
     |
     | (gap - not learned)
     |
  Advanced Topic

This indicates a knowledge gap!
```

### 3. Strengthen Connections

**See relationships visually:**

```
React Components
     │
     │ uses
     │
   Props
     │
     │ passes
     │
  Component Data

This visual connection helps you
understand HOW concepts relate!
```

### 4. Track Progress

**Watch your graph grow:**

```
Day 1: 3 green nodes
Day 7: 15 green nodes
Day 30: 50 green nodes

Your visual learning journey!
```

## Features

### Filtering

**Show only what you want to see:**

```
Status Filter:
✓ Mastered (green)
✓ Learning (blue)
✓ New (white)

Category Filter:
✓ Programming
✓ Math
✓ Science
✓ History
...

Difficulty Filter:
✓ Beginner
✓ Intermediate
✓ Advanced
✓ Expert
```

**How to use:**
```
1. Click "Filter" button
2. Check/uncheck categories
3. Apply filters
4. See refined graph
5. Save filter preset
```

### Clustering

**Group related concepts:**

```
Automatic Clustering:
• Algorithm groups similar topics
• Color-coded clusters
• Easy to see knowledge areas
• Helps plan study sessions

Example clusters:
🔵 Programming
  - React
  - JavaScript
  - TypeScript

🔵 Data Science
  - Python
  - Pandas
  - Machine Learning
```

### Paths

**Highlight learning paths:**

```
Path from A to B:
1. Select starting concept
2. Select target concept
3. Click "Find Path"
4. Shortest route highlighted

Great for:
• Planning curriculum
• Understanding prerequisites
• Review before exams
```

### Recommendations

**AI suggests what to learn next:**

```
Based on:
• Your progress
• Concept relationships
• Learning goals
• Difficulty progression

Example:
"You mastered React Components.
Next recommended: State Management
Difficulty: Perfect match for you!"
```

## Visualizations

### Concept Details

**Information displayed on hover:**

```
React Components
┌─────────────────────┐
│ Status: Mastered    │
│ Category: Frontend  │
│ Difficulty: ★★★☆☆   │
│ Confidence: 95%     │
│ Related: 12         │
└─────────────────────┘
```

### Relationship Details

**Information about connections:**

```
React Components ──uses──> Props

┌─────────────────────────────┐
│ Relationship: uses          │
│ Strength: Strong            │
│ Type: Functional            │
│ Explains: How data flows    │
└─────────────────────────────┘
```

### Progress Indicators

**Visual learning progress:**

```
Knowledge Growth Over Time:
[■■■■■■■■■■] 10 concepts (This week)
[■■■■■■■■■■■■■■■■■■] 25 concepts (This month)

Mastery Distribution:
██████████ 40% Mastered
█████ 25% Learning
███████████ 35% New
```

## Export & Sharing

### Export Graph

**Save your knowledge map:**

```
Formats:
• PNG/SVG - Images
• PDF - Printable
• JSON - Data format
• Interactive HTML - Shareable view

How to export:
1. Click "Export" button
2. Choose format
3. Select scope (current view / all)
4. Save file
```

### Sharing

**Share with others:**

```
Shareable Link:
• View-only access
• Updates in real-time
• Great for study groups
• Teachers can share with students

How to create:
1. Click "Share" button
2. Generate link
3. Copy and send
4. Recipients can view
```

### Embed

**Embed in other documents:**

```
How to use:
1. Export as SVG
2. Insert into:
   • Notion
   • Google Docs
   • Presentation slides
   • Blog posts
```

## Advanced Usage

### Study Planning

**Plan your learning systematically:**

```
1. Choose a goal concept (advanced)
2. Work backwards using dependencies
3. Create ordered list
4. Study in sequence

Example:
Goal: Build a React App
Prerequisites:
  → React Components
    → JSX
      → JavaScript ES6+
        → HTML & CSS
          → Programming Basics
```

### Review Before Exams

**Quick knowledge check:**

```
1. Filter to show only mastered concepts
2. Review node details
3. Test yourself on each
4. Identify weak areas
5. Focus review there

Green nodes = Ready ✓
Blue nodes = Review needed ⚠️
```

### Collaborative Learning

**Learn with friends:**

```
1. Share graph link
2. See each other's progress
3. Discuss relationships
4. Recommend paths
5. Compete to complete clusters
```

## Tips & Tricks

### 1. Regular Reviews

```
Weekly routine:
• Open knowledge graph
• Review learned concepts
• Identify gaps
• Plan next week
• Adjust difficulty
```

### 2. Use Categories

```
Organize by:
• Subject area
• Learning source
• Difficulty level
• Time spent
• Application type
```

### 3. Follow Connections

```
Instead of random learning:
• Pick one concept
• Explore connections
• Follow the path
• Deep dive naturally
```

### 4. Track Confidence

```
Update confidence as you learn:
• High confidence = ready to move on
• Medium = needs practice
• Low = review basics
```

### 5. Visual Memory

```
Use visual cues:
• Node size = importance
• Color = status
• Position = difficulty
• Connections = relationships
```

## Troubleshooting

### Graph Not Loading

**Symptoms**: Empty or loading forever

**Solutions**:
```
1. Refresh page (F5)
2. Check internet connection
3. Clear browser cache
4. Restart application
5. Reset layout: Ctrl+R
```

### Can't Find Concept

**Symptoms**: Know you learned it but can't see it

**Solutions**:
```
1. Search for it (Ctrl+F)
2. Check filters (show all)
3. Zoom out to see full graph
4. View by category
5. Check hidden concepts
```

### Graph Too Messy

**Symptoms**: Too many nodes, hard to read

**Solutions**:
```
1. Filter to current category
2. Use hierarchical layout
3. Hide mastered concepts
4. Zoom in on area
5. Save custom layout
```

### Slow Performance

**Symptoms**: Lag when navigating

**Solutions**:
```
1. Close other apps
2. Reduce detail level
3. Hide labels
4. Use simpler layout
5. Increase memory limit
```

## Keyboard Shortcuts

```
Search: Ctrl+F
Fit to screen: Space
Zoom in: +
Zoom out: -
Reset view: R
Toggle filters: F
Export: Ctrl+E
Fullscreen: F11
Focus selected: Enter
Deselect: Escape
```

## Next Steps

Now that you understand knowledge graphs:

- **[Dashboard](dashboard.md)** - See overview
- **[Learning Sessions](learning-sessions.md)** - Structured learning
- **[Chat Interface](chat-interface.md)** - Ask about concepts

---

**Quick Reference**
- Open Knowledge Graph: `Ctrl+3`
- Search: `Ctrl+F`
- Fit to screen: `Space`
- Zoom: `+/-`
- Reset: `R`
