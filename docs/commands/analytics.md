# Analytics Commands

---
title: Analytics Commands Reference
description: Track progress and monitor usage with Learning Catalyst CLI analytics commands
version: 1.0.0
last_updated: 2025-10-07
---

## Overview

Analytics commands provide insights into your learning progress, token usage, and overall performance metrics. These commands help you understand your learning patterns and optimize your study sessions.

**✅ Current Status:**
- ✅ `/tokens` - **Fully Implemented** - Token usage monitoring validated in examples

## Available Commands

### `/tokens` - Monitor API Token Usage

Display token consumption statistics and cost information for AI provider usage.

**Aliases**: `/usage`

**Syntax**:
```bash
/tokens                        # Show current usage statistics
```

**Real Example from Current Implementation:**
```bash
/tokens                        # Display token usage and cost information
```

**Sample Output from Examples:**
```
📊 Token Usage Statistics:
  Current Session: 1,234 tokens
  Daily Usage: 2,456 tokens
  Monthly Usage: 15,678 tokens

  Cost Breakdown:
    - OpenAI GPT-4: $1.23
    - Deepseek Chat: $0.45
    - Total Today: $1.68
```

**Output Features**:
- **Current Session**: Token usage for active session
- **Daily Usage**: Token consumption for current day
- **Monthly Usage**: Monthly token consumption totals
- **Cost Breakdown**: Cost breakdown by AI provider
- **Provider Breakdown**: Usage statistics for different AI models

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

### `/statistics` - View Learning Statistics (Phase 2 - In Development)

Display comprehensive learning analytics including progress, performance, and engagement metrics.

**Status**: 🔄 **BACKEND COMPLETE, UI IN DEVELOPMENT**

**Aliases**: `/stats`, `/analytics`

**Planned Syntax**:
```bash
/statistics                    # Show overall statistics
/statistics --period [period]  # Filter by time period
/statistics --category [cat]   # Filter by category
/statistics --progress         # Focus on progress metrics
/statistics --performance      # Focus on performance metrics
/statistics --export [file]    # Export statistics
```

**Planned Features**:
- **Learning Progress**: Concepts mastered, topics completed
- **Performance Metrics**: Quiz accuracy, response times
- **Engagement Stats**: Session frequency, duration
- **Knowledge Maps**: Visual representation of learning
- **Trend Analysis**: Progress over time

**Note**: This is a Phase 2 feature. The backend analytics engine is implemented, but the user-facing `/statistics` command is currently in development. Use `/tokens` for current usage monitoring.

## Usage Patterns

### Daily Usage Check
```bash
# Check current session usage
/tokens

# Monitor costs and usage
/tokens --detailed
```

### Usage Monitoring
```bash
# Track token consumption across sessions
/tokens

# Monitor costs for budget management
/tokens
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

## Best Practices

### Usage Monitoring
1. **Regular Checks**: Monitor token usage to control costs
2. **Track Progress**: Use statistics to see learning patterns
3. **Period Filters**: Use time periods for focused analysis
4. **Basic Operations**: Stick to `list`, `get`, `set` for configuration

### Simple Usage
1. **Daily Check**: Use `/tokens` for quick usage overview
2. **Progress Review**: Use `/statistics` to see learning progress
3. **Cost Control**: Monitor usage to manage AI provider costs

---

*See [Command Reference Overview](README.md) for complete command listing and [Configuration Guide](../configuration/) for setup instructions.*