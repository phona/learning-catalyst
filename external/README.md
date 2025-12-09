# External Dependencies

This directory contains external tools and binaries required by Learning Catalyst.

## Qdrant Vector Database

**Purpose:** High-performance vector similarity search for knowledge graph embeddings and semantic search.

### What is Qdrant?
Qdrant is a vector database that stores embeddings (numerical representations) of concepts and content. It enables:
- Fast similarity search across knowledge concepts
- Semantic search for content discovery
- Knowledge graph relationship queries
- Concept clustering and recommendations

### Setup

**Automated Setup:**
```bash
npm run setup:qdrant
```

This script will:
1. Download the appropriate Qdrant binary for your platform
2. Extract to `external/qdrant/`
3. Configure the application to use the local instance

**Manual Setup:**
1. Download Qdrant from: https://github.com/qdrant/qdrant/releases
2. Extract to `external/qdrant/`
3. Ensure the binary is executable

### Management

```bash
# Start local Qdrant instance
npm run qdrant:start

# Stop local Qdrant instance
npm run qdrant:stop

# Check Qdrant status
npm run qdrant:status
```

### Configuration

**Default Settings:**
- Host: `localhost`
- Port: `6333`
- Collection name: `learning_catalyst`
- Vector size: Depends on embedding model (typically 384-1536 dimensions)

**Environment Variables:**
```bash
QDRANT_HOST=localhost
QDRANT_PORT=6333
QDRANT_COLLECTION=learning_catalyst
```

### Integration

The application integrates with Qdrant via:
- `src/main/services/core/database/qdrant-integration.ts` - Main integration layer
- `src/main/services/domain/knowledge/vector/` - Vector operations service
- Automatic initialization on application startup

**Usage Example:**
```typescript
import { qdrantService } from '@/main/services/core/database/qdrant-integration';

// Search for similar concepts
const results = await qdrantService.search({
  vector: embedding,
  limit: 10,
  score_threshold: 0.7
});

// Add new concept
await qdrantService.addPoint({
  id: conceptId,
  vector: embedding,
  payload: { name, description, relationships }
});
```

### Data Storage

**What gets stored:**
- Concept embeddings (384-1536 dimensional vectors)
- Concept metadata (name, description, relationships)
- Content embeddings for search
- Knowledge graph relationship vectors

**Storage Location:**
- Local filesystem in user data directory
- Default: `~/.learning_catalyst/qdrant/`
- Persistent across application restarts

### Troubleshooting

**Port Already in Use:**
```bash
# Check if Qdrant is running
npm run qdrant:status

# Stop existing instance
npm run qdrant:stop

# Restart
npm run qdrant:start
```

**Connection Failed:**
1. Verify Qdrant is running: `npm run qdrant:status`
2. Check port 6333 is not blocked by firewall
3. Verify configuration in settings panel

**Performance Issues:**
1. Ensure sufficient RAM (recommended: 2GB+)
2. Check disk space for data storage
3. Monitor vector collection size in Qdrant dashboard

### Platform Support

| Platform | Status | Binary |
|----------|--------|--------|
| Windows x64 | ✅ Supported | qdrant-x86_64-pc-windows-msvc.zip |
| macOS x64 | ✅ Supported | qdrant-x86_64-apple-darwin.tar.gz |
| macOS ARM64 | ✅ Supported | qdrant-aarch64-apple-darwin.tar.gz |
| Linux x64 | ✅ Supported | qdrant-x86_64-unknown-linux-musl.tar.gz |

### Development vs Production

**Development:**
- Uses local Qdrant instance
- Data persists in `~/.learning_catalyst/qdrant/`
- Accessible via web UI at http://localhost:6333/dashboard

**Production:**
- Uses configured Qdrant endpoint (local or remote)
- Configurable via settings panel
- Can connect to cloud Qdrant instance

### Alternative Configurations

**External Qdrant Instance:**
```typescript
// In settings or configuration
{
  "qdrant": {
    "host": "your-qdrant-host.com",
    "port": 6333,
    "apiKey": "your-api-key",
    "https": true
  }
}
```

**In-Memory (Testing Only):**
For tests and development, an in-memory Qdrant instance can be used:
```typescript
import { QdrantClient } from '@qdrant/js-client-rest';

// In-memory client for testing
const client = new QdrantClient({ host: 'localhost', port: 6333 });
```

### Backup and Restore

**Backup:**
```bash
# Qdrant data is stored in ~/.learning_catalyst/qdrant/
# Copy this directory to backup
cp -r ~/.learning_catalyst/qdrant ./qdrant-backup
```

**Restore:**
```bash
# Stop application
npm run qdrant:stop

# Restore data
cp -r ./qdrant-backup ~/.learning_catalyst/qdrant

# Restart application
npm run qdrant:start
```

### Resources

- **Qdrant Documentation:** https://qdrant.tech/documentation/
- **GitHub Repository:** https://github.com/qdrant/qdrant
- **Web UI/Dashboard:** http://localhost:6333/dashboard
- **API Reference:** https://qdrant.tech/documentation/concepts/collections/

## Why Not Use a Different Vector Database?

**Qdrant was chosen because:**
- ✅ Excellent performance for real-time queries
- ✅ Simple REST API and client libraries
- ✅ Built-in filtering and metadata queries
- ✅ Good TypeScript/JavaScript support
- ✅ Self-hostable with no external dependencies
- ✅ Active development and community support
- ✅ Efficient memory usage
- ✅ Cross-platform support

**Alternatives considered:**
- Pinecone (cloud-only, expensive)
- Weaviate (complex setup)
- Chroma (less mature at time of selection)
- FAISS (C++ only, complex integration)

## See Also

- [Database Architecture Guide](../../docs/DEVELOPER-GUIDE/database.md)
- [Knowledge Service Documentation](../../docs/DEVELOPER-GUIDE/services.md#knowledge-service)
- [Configuration Guide](../../docs/USER-GUIDE/settings.md)
