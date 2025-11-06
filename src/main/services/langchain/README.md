# LangGraph SQLite CheckpointSaver

This module provides a SQLite-based implementation of LangGraph's `BaseCheckpointSaver` interface, enabling persistent state management for LangGraph agents using the existing database infrastructure.

## Features

- **Persistent Storage**: Store LangGraph checkpoints in SQLite database
- **Thread-based Organization**: Organize checkpoints by thread_id for different conversations
- **Namespace Support**: Separate checkpoints using checkpoint_ns for different contexts
- **Version Tracking**: Track channel versions and checkpoint history
- **Performance Optimized**: Efficient database operations with proper indexing
- **Type Safe**: Full TypeScript support with strict typing

## Database Schema

The implementation creates three tables:

### `checkpoints`
Main checkpoint storage
- `id`: Primary key
- `thread_id`: Thread identifier
- `checkpoint_ns`: Namespace for isolation
- `checkpoint_id`: Unique checkpoint identifier
- `parent_checkpoint_id`: Reference to parent checkpoint
- `checkpoint_data`: JSON serialized checkpoint data
- `metadata`: JSON serialized checkpoint metadata
- `created_at`, `updated_at`: Timestamps

### `checkpoint_writes`
Track channel writes and versions
- `id`: Primary key
- `checkpoint_id`: Reference to checkpoint
- `task_id`: Task identifier
- `channel`: Channel name
- `type`: Write type
- `value`: JSON serialized value
- `created_at`: Timestamp

### `checkpoint_blobs`
Store large data objects
- `id`: Primary key
- `checkpoint_id`: Reference to checkpoint
- `task_id`: Task identifier
- `channel`: Channel name
- `blob_type`: Input/output type
- `data`: JSON serialized data
- `created_at`: Timestamp

## Usage

```typescript
import { SQLiteCheckpointSaver } from '../checkpoints/SQLiteCheckpointSaver'
import { createDatabase } from '../database'

// Initialize
const db = await createDatabase()
const checkpointer = new SQLiteCheckpointSaver(db)

// Use with LangGraph
const config = {
  configurable: {
    thread_id: 'conversation-123',
    checkpoint_ns: 'learning'
  }
}

// Store checkpoint
await checkpointer.put(config, checkpoint, metadata, newVersions)

// Retrieve checkpoint
const savedCheckpoint = await checkpointer.get(config)

// List checkpoints
for await (const checkpointTuple of checkpointer.list(config, { limit: 10 })) {
  console.log('Checkpoint:', checkpointTuple.checkpoint.id)
}

// Store writes
await checkpointer.putWrites(config, writes, 'task-123')

// Delete thread
await checkpointer.deleteThread('conversation-123')
```

## Integration with AgentManager

The `AgentManager` class is updated to use the `SQLiteCheckpointSaver`:

```typescript
// Enable checkpointing in agent messages
const response = await agentManager.sendMessage(
  content,
  session,
  AgentType.LEARNING,
  { useCheckpoints: true }
)

// Get checkpoint history
const history = await agentManager.getCheckpointHistory(session, 10)

// Restore from specific checkpoint
const state = await agentManager.restoreFromCheckpoint(session, 'checkpoint-id')
```

## Performance Considerations

- Database indexes on `thread_id`, `checkpoint_ns`, and `checkpoint_id`
- Transactions for atomic checkpoint operations
- JSON serialization for complex data structures
- Efficient pagination for listing checkpoints

## Error Handling

The implementation includes comprehensive error handling:

- Database connection errors
- Transaction rollback on failures
- Invalid configuration validation
- Graceful handling of missing checkpoints

## Migration

The database migration is automatically created when running the application:

```bash
# The migration file: 20251102_create_checkpoints.ts
# Creates all necessary tables and indexes
```

## Testing

Comprehensive test suite included:

```bash
npm test src/test/modules/checkpoint-saver.test.ts
```

Tests cover:
- Basic CRUD operations
- Thread and namespace isolation
- Error handling scenarios
- Performance characteristics