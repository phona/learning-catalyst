# Qdrant Vector Database

This directory contains the Qdrant vector database binary and configuration for Learning Catalyst.

## Files

- `qdrant.exe` - Qdrant vector database binary (v1.15.5)
- `config.yaml` - Configuration file for Qdrant
- `data/` - Data storage directory (created automatically)
- `snapshots/` - Snapshot storage directory (created automatically)

## Usage

Qdrant is started automatically by the Learning Catalyst application. You can also run it manually:

```bash
# Start Qdrant with configuration
./qdrant.exe --config-path config.yaml

# Start Qdrant with default settings
./qdrant.exe
```

## Default Configuration

- **HTTP API**: http://127.0.0.1:6333
- **gRPC API**: 127.0.0.1:6334
- **Web UI**: http://127.0.0.1:6333/dashboard
- **Data Storage**: ./data/qdrant
- **Logging Level**: INFO

## Integration

Qdrant is integrated into Learning Catalyst for:

- Vector storage and similarity search
- Knowledge graph embeddings
- Learning content recommendations
- Session context management

## Management

The application manages Qdrant automatically:
- Starts the service on app launch
- Stops the service on app exit
- Handles restarts and error recovery
- Manages data persistence