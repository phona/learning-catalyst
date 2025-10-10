# Analytics Commands

---
title: Analytics Commands Reference
description: Track progress and monitor usage with Learning Catalyst CLI analytics commands
version: 1.0.0
last_updated: 2025-10-07
---

## Overview

Analytics commands provide insights into your learning progress, token usage, and overall performance metrics. These commands help you understand your learning patterns and optimize your study sessions.

## Available Commands

### `/tokens` - Monitor API Token Usage

Display token consumption statistics and cost information for AI provider usage.

**Aliases**: `/usage`

**Syntax**:
```bash
/tokens                        # Show current usage statistics
/tokens --provider [name]      # Filter by specific provider
/tokens --period [period]      # Filter by time period
/tokens --detailed             # Show detailed breakdown
/tokens --export [file]        # Export usage data
```

**Examples**:
```bash
/tokens                        # Current session usage
/tokens --period today         # Today's usage
/tokens --period week          # This week's usage
/tokens --provider openai      # OpenAI usage only
/tokens --detailed             # Detailed breakdown
/tokens --export usage.csv     # Export to CSV
```

**Output Features**:
- **Current Session**: Token usage for active session
- **Time Periods**: Daily, weekly, monthly statistics
- **Provider Breakdown**: Usage by AI provider
- **Cost Estimates**: Projected costs based on usage
- **Trend Analysis**: Usage patterns over time

**Sample Output**:
```
💰 Token Usage Statistics

CURRENT SESSION:
├── Input Tokens: 1,234
├── Output Tokens: 3,456
├── Total Tokens: 4,690
└── Estimated Cost: $0.023

TODAY'S USAGE:
├── Sessions: 3
├── Total Tokens: 15,432
├── Cost: $0.089
└── Daily Average: 5,144 tokens

WEEKLY USAGE:
├── Sessions: 18
├── Total Tokens: 89,234
├── Cost: $0.523
└── Daily Average: 12,748 tokens

PROVIDER BREAKDOWN:
├── OpenAI (gpt-4o): 67,890 tokens ($0.412)
├── Anthropic (claude-3): 21,344 tokens ($0.111)

TRENDS:
├── Usage Trend: 📈 +12% from last week
├── Cost Efficiency: ✅ Good (avg $0.006/1k tokens)
└── Session Length: 23 minutes average

Use /tokens --detailed for comprehensive breakdown.
```

### `/statistics` - View Learning Statistics

Display comprehensive learning analytics including progress, performance, and engagement metrics.

**Aliases**: `/stats`, `/analytics`

**Syntax**:
```bash
/statistics                    # Show overall statistics
/statistics --period [period]  # Filter by time period
/statistics --category [cat]   # Filter by category
/statistics --progress         # Focus on progress metrics
/statistics --performance      # Focus on performance metrics
/statistics --export [file]    # Export statistics
```

**Examples**:
```bash
/statistics                    # Overall statistics
/statistics --period today     # Today's stats
/statistics --period week      # This week's stats
/statistics --progress         # Progress-focused view
/statistics --performance      # Performance metrics
/statistics --export stats.json # Export to JSON
```

**Output Features**:
- **Learning Progress**: Concepts mastered, topics completed
- **Performance Metrics**: Quiz accuracy, response times
- **Engagement Stats**: Session frequency, duration
- **Knowledge Maps**: Visual representation of learning
- **Trend Analysis**: Progress over time

**Sample Output**:
```
📊 Learning Statistics Dashboard

OVERALL PROGRESS:
├── 📚 Concepts Learned: 142/256 (55%)
├── 🎯 Topics Mastered: 12/23 (52%)
├── ⏱️ Total Learning Time: 18h 34m
├── 🔥 Current Streak: 7 days
└── 📈 Learning Velocity: 2.3 concepts/day

PERFORMANCE METRICS:
├── ✅ Quiz Accuracy: 84.2%
├── ⚡ Average Response Time: 2.3s
├── 🎯 Difficulty Progression: Beginner → Intermediate
├── 📝 Questions Attempted: 487
└── 🏆 Best Streak: 12 days

ENGAGEMENT STATISTICS:
├── 📅 Sessions This Week: 5/7 (71%)
├── ⏰ Average Session Length: 23 minutes
├── 🌟 Peak Learning Time: 2:00 PM - 4:00 PM
├── 🔄 Session Frequency: Every 1.4 days
└── 💡 Questions per Session: 8.2 average

TOPIC BREAKDOWN:
├── 🐍 Python Programming: 89% complete
├── 🤖 Machine Learning: 67% complete
├── 📊 Data Structures: 45% complete
├── 🔬 Algorithms: 34% complete
└── 🌐 Web Development: 12% complete

RECENT ACHIEVEMENTS:
├── 🏅 Mastered: Neural Networks
├── 🎯 Perfect Quiz: Python Decorators (10/10)
├── 🔥 Week Streak: 7 days
└── 📚 Knowledge Seeker: 100+ concepts learned

Use /statistics --detailed for comprehensive metrics.
```

## Usage Patterns

### Daily Check-in
```bash
# Start of session check
/statistics --period yesterday

# Monitor usage during session
/tokens

# End of session summary
/statistics --period today
/tokens --period today
```

### Weekly Review
```bash
# Weekly progress overview
/statistics --period week
/tokens --period week

# Detailed analysis
/statistics --period week --detailed
/statistics --progress --period week

# Export for records
/statistics --export weekly-$(date +%Y%m%d).json
```

### Performance Tracking
```bash
# Check learning velocity
/statistics --performance

# Monitor quiz performance
/statistics --performance --period month

# Identify weak areas
/statistics --weak-areas
```

## Advanced Analytics

### Progress Tracking

#### Learning Velocity
```bash
# Calculate learning rate
/statistics --velocity

# Compare with goals
/statistics --goals

# Project completion time
/statistics --projection
```

#### Knowledge Retention
```bash
# Check retention rates
/statistics --retention

# Review forgotten concepts
/statistics --review-needed

# Spaced repetition analysis
/statistics --spaced-repetition
```

### Performance Analysis

#### Difficulty Progression
```bash
# Track difficulty progression
/statistics --difficulty-progress

# Adaptive performance
/statistics --adaptive-performance

# Challenge success rate
/statistics --challenge-success
```

#### Learning Patterns
```bash
# Best learning times
/statistics --peak-hours

# Session effectiveness
/statistics --session-effectiveness

# Topic correlations
/statistics --topic-correlations
```

## Data Export and Integration

### Export Formats

#### JSON Export
```bash
# Export all statistics
/statistics --export stats.json

# Export specific period
/statistics --export week-$(date +%Y%m%d).json --period week

# Export token usage
/tokens --export tokens-$(date +%Y%m%d).csv
```

#### CSV Export
```bash
# Export session data
/statistics --export sessions.csv --format csv

# Export quiz results
/statistics --export quizzes.csv --type quizzes

# Export token usage by provider
/tokens --export provider-usage.csv --by-provider
```

### Integration Examples

#### Integration with Spreadsheets
```bash
# Generate CSV for spreadsheet analysis
/statistics --export learning-data.csv --format csv

# Create monthly report
statistics --export report-$(date +%Y-%m).csv --period month
```

#### Integration with Monitoring Tools
```bash
# Generate metrics for monitoring
/statistics --export metrics.json --format prometheus

# Create health check
/statistics --health-check --format json
```

## Performance Considerations

### Response Times
- `/statistics`: < 1s (cached), 2-3s (fresh calculation)
- `/tokens`: < 0.5s (instant)
- `/statistics --export`: 1-2s depending on data size

### Resource Usage
- **Memory**: Minimal for basic statistics
- **Disk**: Statistics stored in compact format
- **CPU**: Light processing for calculations

### Optimization Tips
1. **Use Period Filters**: Limit data range for faster queries
2. **Cache Results**: Statistics are cached for 5 minutes
3. **Export Batches**: Export data in batches for large datasets

## Error Handling

### Common Issues

**No Data Available**:
```
📊 No learning data available for the selected period.

Solutions:
1. Start a learning session: /concepts
2. Take a quiz: /quiz [topic]
3. Check different period: /statistics --period all
```

**Export Failed**:
```
❌ Failed to export statistics data.

Solutions:
1. Check file permissions: ls -la ~/Downloads/
2. Choose different location: /statistics --export /tmp/stats.json
3. Check disk space: df -h
```

**Provider API Issues**:
```
⚠️ Unable to fetch token usage from provider.

Solutions:
1. Check internet connection
2. Verify API configuration: /config --validate
3. Use cached data: /tokens --offline
```

### Data Recovery

```bash
# Restore from backup
/statistics --restore backup-stats.json

# Rebuild corrupted data
/statistics --rebuild

# Validate data integrity
/statistics --validate
```

## Custom Analytics

### Personal Metrics

Create custom learning metrics:

```bash
# Set learning goals
/statistics --set-goal daily-concepts=5
/statistics --set-goal weekly-quiz-score=85%

# Track custom metrics
/statistics --custom-metric study-streak
/statistics --custom-metric topic-mastery-time
```

### Reporting Templates

Create custom report templates:

```bash
# Generate daily report
/statistics --report-template daily

# Create weekly summary
/statistics --report-template weekly --email

# Monthly progress report
/statistics --report-template monthly --export
```

## Integration Examples

### Learning Automation

```bash
#!/bin/bash
# daily-analytics.sh

echo "📊 Daily Learning Report - $(date)"
echo "================================"

learning-catalyst << EOF
/statistics --period today
/tokens --period today
/statistics --goals
/quit
EOF

echo "Report saved to daily-report-$(date +%Y%m%d).txt"
```

### Progress Tracking

```bash
#!/bin/bash
# track-progress.sh

# Weekly progress tracking
learning-catalyst << EOF > weekly-progress-$(date +%Y%m%d).md
/statistics --period week
/knowledge-map --progress
/statistics --export week-stats.json
/quit
EOF

# Generate summary
echo "## Weekly Progress - $(date +%Y-%m-%d)" >> progress-log.md
cat weekly-progress-$(date +%Y%m%d).md >> progress-log.md
```

### Cost Monitoring

```bash
#!/bin/bash
# cost-monitor.sh

# Check monthly costs
learning-catalyst << EOF
/tokens --period month
/tokens --provider openai --period month
/tokens --provider anthropic --period month
/quit
EOF

# Alert if cost exceeds threshold
if [ $(learning-catalyst << EOF | grep "Estimated Cost" | awk '{print $3}' | tr -d '$') -gt 10 ]; then
    echo "⚠️ Monthly cost exceeds $10"
fi
```

## Best Practices

### Data Management
1. **Regular Exports**: Export data regularly for backup
2. **Monitor Costs**: Keep track of token usage and costs
3. **Validate Data**: Periodically validate statistics data
4. **Clean Old Data**: Archive old data to maintain performance

### Performance Optimization
1. **Use Period Filters**: Limit data range for faster queries
2. **Cache Results**: Leverage cached statistics for repeated queries
3. **Batch Operations**: Combine multiple analytics operations
4. **Export Formats**: Choose appropriate export formats for analysis

### Privacy Considerations
1. **Local Storage**: All analytics data stored locally
2. **Data Export**: Control what data you export
3. **Retention Policy**: Set data retention periods
4. **Secure Storage**: Protect exported analytics files

## Troubleshooting

### Data Issues
```bash
# Validate statistics data
/statistics --validate

# Rebuild corrupted data
/statistics --rebuild

# Check data sources
/statistics --sources
```

### Performance Issues
```bash
# Clear analytics cache
/statistics --clear-cache

# Optimize database
/statistics --optimize

# Check resource usage
/statistics --resource-usage
```

### Export Problems
```bash
# Check export permissions
/statistics --test-export

# Try different format
/statistics --export data.txt --format plain

# Use alternative location
/statistics --export /tmp/data.json
```

---

*See [Command Reference Overview](README.md) for complete command listing and [Configuration Guide](../configuration/) for setup instructions.*