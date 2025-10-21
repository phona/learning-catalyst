# Qdrant Integration

## Overview

Learning Catalyst integrates Qdrant vector database to provide advanced knowledge management, semantic search, and AI-powered learning recommendations. This integration enables the application to store and retrieve learning content using vector embeddings for intelligent content discovery and personalized learning paths.

## Architecture

### Components

1. **Qdrant Binary** - Vector database engine (`external/qdrant/`)
2. **QdrantService** - Core service layer for Qdrant operations (`src/services/qdrant/`)
3. **KnowledgeService** - High-level knowledge management (`src/services/knowledge/`)
4. **QdrantManager** - Main process lifecycle management (`electron/main/`)
5. **useQdrant Hook** - React interface for frontend (`src/hooks/useQdrant.ts`)

### Data Flow

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │  Main Process    │    │   Qdrant DB     │
│                 │    │                  │    │                 │
│ useQdrant Hook ─┼───▶│ QdrantManager    ─┼───▶│ HTTP/gRPC API   │
│ React Components│    │ QdrantService    │    │                 │
│                 │    │ KnowledgeService │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Configuration

### Qdrant Configuration

The Qdrant configuration is stored in `external/qdrant/config.yaml`:

```yaml
# Storage path for Qdrant data
storage_path: ./data/qdrant

# HTTP REST API bind address
host: 127.0.0.1
port: 6333

# gRPC API bind address
grpc:
  host: 127.0.0.1
  port: 6334

# Web UI configuration
ui:
  host: 127.0.0.1
  port: 6333
  enabled: true
```

### Collections

The system creates several collections for different purposes:

- **knowledge_items** - Main knowledge storage with embeddings
- **conversations** - Conversation context and history
- **learning_resources** - Educational resources and materials
- **content_embeddings** - Content embeddings for similarity search

## API Reference

### QdrantService

Core service for direct Qdrant operations.

#### Methods

- `start()` - Start Qdrant server
- `stop()` - Stop Qdrant server
- `createCollection(name, vectorSize, distance)` - Create new collection
- `deleteCollection(name)` - Delete collection
- `upsertVectors(collectionName, points)` - Add/update vectors
- `searchVectors(collectionName, queryVector, limit, threshold)` - Search similar vectors
- `getVectors(collectionName, ids)` - Retrieve vectors by ID
- `deleteVectors(collectionName, ids)` - Delete vectors by ID

### KnowledgeService

High-level service for knowledge management.

#### Methods

- `addKnowledgeItem(item, aiProvider, embedding)` - Add knowledge item
- `searchKnowledge(query, aiProvider, limit, filters)` - Semantic search
- `getKnowledgeItem(id)` - Retrieve knowledge item
- `updateKnowledgeItem(id, updates, aiProvider)` - Update knowledge item
- `deleteKnowledgeItem(id)` - Delete knowledge item
- `storeConversationContext(sessionId, messages, aiProvider)` - Store conversation
- `getRelevantContext(sessionId, query, aiProvider, limit)` - Get relevant context

### React Hook (useQdrant)

Frontend interface for Qdrant operations.

#### Features

- State management for loading and error handling
- Automatic status monitoring
- IPC communication with main process
- Type-safe method signatures

## Usage Examples

### Adding Knowledge Items

```typescript
import { useQdrant } from '@/hooks/useQdrant';

function KnowledgeManager() {
  const { addKnowledgeItem, isLoading, error } = useQdrant();

  const handleAddItem = async () => {
    const item = {
      id: 'concept-1',
      content: 'Machine learning is a subset of artificial intelligence...',
      type: 'concept' as const,
      metadata: {
        topic: 'AI/ML',
        difficulty: 2,
        timestamp: Date.now(),
        tags: ['AI', 'ML', 'concepts']
      }
    };

    const success = await addKnowledgeItem(item, undefined, openaiProvider);
    if (success) {
      console.log('Knowledge item added successfully');
    }
  };

  return (
    <button onClick={handleAddItem} disabled={isLoading}>
      Add Knowledge Item
    </button>
  );
}
```

### Semantic Search

```typescript
function KnowledgeSearch() {
  const { searchKnowledge } = useQdrant();

  const handleSearch = async () => {
    const results = await searchKnowledge(
      'How does neural network work?',
      openaiProvider,
      5,
      { type: 'concept', topic: 'AI/ML' }
    );

    results.forEach(result => {
      console.log(`${result.item.content} (Similarity: ${result.similarity})`);
    });
  };

  return <button onClick={handleSearch}>Search Knowledge</button>;
}
```

### Context Management

```typescript
function ConversationManager() {
  const { storeConversationContext, getRelevantContext } = useQdrant();

  // Store conversation
  const saveConversation = async (sessionId: string, messages: any[]) => {
    await storeConversationContext(sessionId, messages, openaiProvider);
  };

  // Get relevant context for new query
  const getContext = async (sessionId: string, query: string) => {
    const context = await getRelevantContext(sessionId, query, openaiProvider, 3);
    return context;
  };
}
```

## Deployment

### Development

1. Qdrant binary is downloaded automatically by the setup script
2. Service starts when the application launches
3. Configuration is loaded from `external/qdrant/config.yaml`
4. Data is stored in user data directory

### Production

1. Qdrant binary is included in the application bundle
2. Service management is handled by Electron main process
3. Configuration can be customized per deployment
4. Data persistence is maintained across app restarts

## Monitoring and Maintenance

### Health Checks

```typescript
// Check Qdrant status
const status = await getStatus();
console.log('Qdrant ready:', status.ready);
console.log('Collections:', status.collections);
```

### Statistics

```typescript
// Get knowledge statistics
const stats = await getKnowledgeStats();
console.log('Total items:', stats.totalItems);
console.log('Items by type:', stats.itemsByType);
```

### Data Management

```typescript
// Clear all knowledge data
await clearAllKnowledge();

// Get collection information
const collections = await getCollections();
```

## Security Considerations

1. **Local Access Only** - Qdrant binds to localhost only
2. **No External Exposure** - Database not accessible from network
3. **Data Privacy** - All data stored locally on user machine
4. **API Keys** - AI provider keys managed securely by Electron store

## Performance Optimization

1. **Vector Indexing** - Configured for optimal search performance
2. **Batch Operations** - Use bulk operations for large datasets
3. **Memory Management** - Automatic cleanup of unused vectors
4. **Caching** - Frequently accessed items cached in memory

## Troubleshooting

### Common Issues

1. **Port Conflicts** - Qdrant uses port 6333/6334 by default
2. **Binary Permissions** - Ensure executable permissions on Unix systems
3. **Disk Space** - Monitor storage usage for large vector datasets
4. **Memory Usage** - Monitor RAM usage with large collections

### Debug Mode

Enable debug logging in configuration:

```yaml
log_level: DEBUG
```

### Manual Management

Start Qdrant manually for testing:

```bash
cd external/qdrant
./qdrant --config-path config.yaml
```

Access Web UI: http://127.0.0.1:6333/dashboard

## Integration Roadmap

### Phase 1: Core Integration ✅
- Basic vector storage and retrieval
- Semantic search functionality
- Knowledge CRUD operations
- Conversation context management

### Phase 2: Advanced Features (Planned)
- Multi-modal embeddings (text, images)
- Advanced filtering and faceting
- Real-time vector updates
- Custom distance metrics

### Phase 3: Optimization (Planned)
- Performance tuning for large datasets
- Advanced caching strategies
- Distributed vector storage
- GPU acceleration support

## Contributing

When contributing to Qdrant integration:

1. Follow the existing service layer patterns
2. Maintain type safety in all interfaces
3. Add comprehensive error handling
4. Update documentation for new features
5. Test with various data sizes and types
6. Consider performance implications of changes

## References

- [Qdrant Documentation](https://qdrant.tech/documentation/)
- [Vector Database Concepts](https://qdrant.tech/articles/what-is-a-vector-database/)
- [Embedding Best Practices](https://qdrant.tech/articles/how-to-choose-embeddings/)