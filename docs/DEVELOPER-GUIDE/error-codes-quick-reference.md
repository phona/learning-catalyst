# Error Codes Quick Reference

## Quick Decision Tree

```
❌ Error Occurred
  ↓
What type of error?

├─ Configuration/Missing Setup
│   └─ Use: CONFIG_ERROR
│
├─ Network/Connection Issues
│   └─ Use: NETWORK_ERROR
│
└─ System/Service Failure
    └─ Use: SYSTEM_ERROR
```

## Error Code Categories

### 🔧 provider.* - AI Provider Configuration
Use when: AI provider setup is missing, invalid, or misconfigured

| Error Code | When to Use | Example |
|------------|-------------|---------|
| `provider.config.missing_api_key` | API key not provided | OpenAI, Anthropic, etc. |
| `provider.config.chat_missing` | Chat model not configured | No chat model selected |
| `provider.config.missing` | Provider entirely missing | Provider not in config |
| `provider.auth.required` | Auth credentials needed | Token expired, invalid |
| `provider.config.unsupported` | Invalid provider config | Bad baseUrl, model name |
| `provider.config.missing_provider_type` | Provider type missing | No providerType field |

**Example:**
```typescript
throw createIPCError({
  type: 'CONFIG_ERROR',
  code: 'provider.config.missing_api_key',
  message: 'OpenAI API key is required',
  details: { provider: 'openai', guidance: 'Add API key in Settings > AI Providers' }
});
```

---

### 💬 chat.* - Chat & Messaging
Use when: Chat functionality fails (sending, receiving, title generation, etc.)

| Error Code | When to Use | Example |
|------------|-------------|---------|
| `chat.generate_title_failed` | Failed to generate session title | LLM call failed |

**Example:**
```typescript
throw createIPCError({
  type: 'SYSTEM_ERROR',
  code: 'chat.generate_title_failed',
  message: 'Failed to generate session title',
  details: { sessionId, retryable: true }
});
```

---

### 📚 learning.* - Learning Sessions & Paths
Use when: Learning session management fails

| Error Code | When to Use | Example |
|------------|-------------|---------|
| `learning.path_not_found` | Learning path unavailable | Path ID invalid |
| `learning.path_error` | Learning path operation failed | CRUD operation failed |
| `learning.start_failed` | Failed to start session | Session init error |
| `learning.progress_failed` | Failed to update progress | Progress tracking error |
| `learning.pause_failed` | Failed to pause session | Pause operation failed |
| `learning.resume_failed` | Failed to resume session | Resume operation failed |
| `learning.complete_failed` | Failed to complete session | Completion tracking error |
| `learning.recent_failed` | Failed to fetch recent sessions | List operation failed |
| `learning.search_failed` | Failed to search sessions | Search query failed |

**Example:**
```typescript
throw createIPCError({
  type: 'SYSTEM_ERROR',
  code: 'learning.start_failed',
  message: 'Failed to start learning session',
  details: { sessionId, operation: 'start' }
});
```

---

### 🗂️ sessions.* - Session Management
Use when: Session CRUD operations fail

| Error Code | When to Use | Example |
|------------|-------------|---------|
| `sessions.create_failed` | Failed to create session | DB insert failed |
| `sessions.not_found` | Session doesn't exist | Invalid session ID |

**Example:**
```typescript
throw createIPCError({
  type: 'SYSTEM_ERROR',
  code: 'sessions.not_found',
  message: 'Session not found',
  details: { sessionId }
});
```

---

### ⚙️ settings.* - Application Settings
Use when: Settings save/load operations fail

| Error Code | When to Use | Example |
|------------|-------------|---------|
| `settings.config_write_failed` | Failed to save settings | Write operation failed |

**Example:**
```typescript
throw createIPCError({
  type: 'SYSTEM_ERROR',
  code: 'settings.config_write_failed',
  message: 'Failed to save settings',
  details: { setting: 'ai.providers.openai' }
});
```

---

### 🧠 knowledge.* - Knowledge Base Operations
Use when: Knowledge ingestion, search, or exploration fails

| Error Code | When to Use | Example |
|------------|-------------|---------|
| `knowledge.ingest_failed` | Failed to ingest knowledge | Import failed |
| `knowledge.search_failed` | Failed to search knowledge | Search service down |
| `knowledge.explore_failed` | Failed to explore concepts | Traversal failed |
| `knowledge.related_failed` | Failed to find related concepts | Similarity search failed |
| `knowledge.map_failed` | Failed to generate knowledge map | Visualization error |
| `knowledge.parse_failed` | Failed to parse knowledge | Parsing error |

**Example:**
```typescript
throw createIPCError({
  type: 'SYSTEM_ERROR',
  code: 'knowledge.search_failed',
  message: 'Knowledge search temporarily unavailable',
  details: { query, timeout: 5000, retryable: true }
});
```

---

### 📄 content.* - Content Processing
Use when: Content import, analysis, or exploration fails

| Error Code | When to Use | Example |
|------------|-------------|---------|
| `content.explore_failed` | Failed to explore content | File read error |
| `content.import_failed` | Failed to import content | Import operation failed |
| `content.recommend_failed` | Failed to get recommendations | Recommendation engine down |
| `content.search_failed` | Failed to search content | Search failed |
| `content.analyze_failed` | Failed to analyze content | Analysis error |
| `content.extract_failed` | Failed to extract content | Extraction failed |

**Example:**
```typescript
throw createIPCError({
  type: 'NETWORK_ERROR',
  code: 'content.import_failed',
  message: 'Failed to import content from URL',
  details: { url, statusCode: 404 }
});
```

---

### 🏥 system.* - System-Level Errors
Use when: Critical system operations fail

| Error Code | When to Use | Example |
|------------|-------------|---------|
| `system.report_error_failed` | Failed to report error | Logging service down |
| `system.health_check_failed` | Health check failed | System unhealthy |
| `system.version_failed` | Failed to get version | Version service down |

**Example:**
```typescript
throw createIPCError({
  type: 'SYSTEM_ERROR',
  code: 'system.health_check_failed',
  message: 'System health check failed',
  details: { component: 'database', status: 'unhealthy' }
});
```

---

### 📊 analytics.* - Analytics & Statistics
Use when: Analytics operations fail (dashboard, charts, achievements, etc.)

| Error Code | When to Use | Example |
|------------|-------------|---------|
| `analytics.dashboard_failed` | Failed to load dashboard | Dashboard query failed |
| `analytics.progress_chart_failed` | Failed to generate progress chart | Chart data missing |
| `analytics.achievements_failed` | Failed to load achievements | Achievement service down |
| `analytics.unlock_failed` | Failed to unlock achievement | Unlock operation failed |
| `analytics.usage_failed` | Failed to get usage stats | Stats query failed |
| `analytics.token_usage_failed` | Failed to get token usage | Token tracking failed |
| `analytics.track_failed` | Failed to track event | Event tracking failed |
| `analytics.concept_progress_failed` | Failed to get concept progress | Progress query failed |
| `analytics.session_history_failed` | Failed to get session history | History query failed |
| `analytics.check_achievements_failed` | Failed to check achievements | Check operation failed |
| `analytics.trends_failed` | Failed to get trends | Trends query failed |
| `analytics.streak_failed` | Failed to get streak | Streak calculation failed |
| `analytics.time_stats_failed` | Failed to get time stats | Time query failed |
| `analytics.export_failed` | Failed to export analytics | Export operation failed |
| `analytics.import_failed` | Failed to import analytics | Import operation failed |
| `analytics.track_session_failed` | Failed to track session | Session tracking failed |
| `analytics.update_concept_failed` | Failed to update concept progress | Update failed |

**Example:**
```typescript
throw createIPCError({
  type: 'SYSTEM_ERROR',
  code: 'analytics.dashboard_failed',
  message: 'Failed to load analytics dashboard',
  details: { userId, query: 'dashboard_metrics' }
});
```

---

## Creating New Error Codes

### Step 1: Add to ipc-error-types.ts

```typescript
// src/shared/types/ipc-error.ts
export const IPC_ERROR_CODES = {
  // ... existing categories
  myNewCategory: {
    myNewError: 'myNewCategory.my_new_error',
  }
} as const;
```

### Step 2: Use It

```typescript
throw createIPCError({
  type: 'SYSTEM_ERROR',  // or CONFIG_ERROR or NETWORK_ERROR
  code: 'myNewCategory.my_new_error',
  message: 'Human-readable error message',
  details: {
    // Additional context for debugging
    field: 'value',
    retryable: true
  }
});
```

### Step 3: Add to This Reference

Update this file with your new error code and example.

---

## Error Type Selection

### CONFIG_ERROR
Use when: Application needs configuration/setup from user

**Examples:**
- Missing API keys
- Provider not configured
- Required settings absent

**User Action:** Guide user to settings/configuration

---

### NETWORK_ERROR
Use when: Network-dependent operations fail

**Examples:**
- HTTP requests timeout
- Connection refused
- DNS resolution failed

**User Action:** Check network connection, retry

---

### SYSTEM_ERROR
Use when: Internal system operations fail

**Examples:**
- Database errors
- Service unavailable
- File system errors
- Unknown errors

**User Action:** Try again later, contact support if persistent

---

## Common Patterns

### Pattern 1: Validation Error
```typescript
if (!input.requiredField) {
  throw createIPCError({
    type: 'SYSTEM_ERROR',
    code: 'domain.validation_failed',
    message: 'Required field is missing',
    details: { field: 'requiredField', value: input.requiredField }
  });
}
```

### Pattern 2: Service Unavailable
```typescript
try {
  return await externalService.call();
} catch (error) {
  throw createIPCError({
    type: 'SYSTEM_ERROR',
    code: 'domain.service_unavailable',
    message: 'Service temporarily unavailable',
    details: { service: 'external', retryable: true }
  });
}
```

### Pattern 3: Configuration Missing
```typescript
if (!config.apiKey) {
  throw createIPCError({
    type: 'CONFIG_ERROR',
    code: 'provider.config.missing_api_key',
    message: 'API key is required',
    details: {
      provider: config.providerName,
      guidance: 'Add your API key in Settings'
    }
  });
}
```

### Pattern 4: Network Failure
```typescript
try {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
} catch (error) {
  throw createIPCError({
    type: 'NETWORK_ERROR',
    code: 'content.import_failed',
    message: 'Failed to import content',
    details: { url, error: error.message }
  });
}
```

---

## Testing Error Codes

```typescript
// Unit test example
it('throws correct error code for missing API key', () => {
  expect(() => {
    validateProviderConfig({});
  }).toThrow(createIPCError({
    type: 'CONFIG_ERROR',
    code: 'provider.config.missing_api_key'
  }));
});
```

---

## Quick Lookup

| Need to... | Use Code |
|------------|----------|
| API key missing | `provider.config.missing_api_key` |
| Chat model not set | `provider.config.chat_missing` |
| Session not found | `sessions.not_found` |
| Failed to create session | `sessions.create_failed` |
| Knowledge search fails | `knowledge.search_failed` |
| Content import fails | `content.import_failed` |
| Analytics dashboard fails | `analytics.dashboard_failed` |
| Settings save fails | `settings.config_write_failed` |
| Learning path not found | `learning.path_not_found` |
| System unhealthy | `system.health_check_failed` |

---

## Best Practices

1. **Be Specific**: Use the most precise error code available
2. **Include Context**: Add relevant details to `details` field
3. **User-Friendly Messages**: Message should explain what happened and what to do
4. **Retry Guidance**: Set `retryable: true` in details if appropriate
5. **Setup Guidance**: Include `guidance` in details for CONFIG_ERRORs

## When in Doubt

- **Not configured?** → CONFIG_ERROR
- **Network issue?** → NETWORK_ERROR
- **Internal failure?** → SYSTEM_ERROR
- **Still unsure?** → SYSTEM_ERROR with descriptive code

---

For more details, see the full [Error Handling Guide](./error-handling.md).
