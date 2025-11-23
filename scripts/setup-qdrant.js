#!/usr/bin/env node

/**
 * Qdrant Setup Script
 *
 * This script sets up Qdrant for the Learning Catalyst application.
 * It downloads the appropriate binary for the platform and configures it.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');
const qdrantDir = path.join(projectRoot, 'external', 'qdrant');

// Platform detection
function getPlatform() {
  const platform = process.platform;
  if (platform === 'win32') return 'windows';
  if (platform === 'darwin') return 'darwin';
  if (platform === 'linux') return 'linux';
  throw new Error(`Unsupported platform: ${platform}`);
}

function getArch() {
  const arch = process.arch;
  if (arch === 'x64') return 'x86_64';
  if (arch === 'arm64') return 'aarch64';
  throw new Error(`Unsupported architecture: ${arch}`);
}

// Download Qdrant binary
async function downloadQdrant() {
  const platform = getPlatform();
  const arch = getArch();
  const version = '1.15.5';

  console.log(`Setting up Qdrant ${version} for ${platform}-${arch}...`);

  // Check if binary already exists
  const binaryName = platform === 'windows' ? 'qdrant.exe' : 'qdrant';
  const binaryPath = path.join(qdrantDir, binaryName);

  if (fs.existsSync(binaryPath)) {
    console.log('✅ Qdrant binary already exists');
    return;
  }

  // Determine download URL
  let downloadUrl;
  if (platform === 'windows') {
    downloadUrl = `https://github.com/qdrant/qdrant/releases/download/v${version}/qdrant-${arch}-pc-windows-msvc.zip`;
  } else if (platform === 'darwin') {
    downloadUrl = `https://github.com/qdrant/qdrant/releases/download/v${version}/qdrant-${arch}-apple-darwin.tar.gz`;
  } else if (platform === 'linux') {
    downloadUrl = `https://github.com/qdrant/qdrant/releases/download/v${version}/qdrant-${arch}-unknown-linux-gnu.tar.gz`;
  }

  console.log(`📥 Downloading Qdrant from: ${downloadUrl}`);

  try {
    // Create directory if it doesn't exist
    fs.mkdirSync(qdrantDir, { recursive: true });

    // Download using curl or wget
    const tempFile = path.join(qdrantDir, path.basename(downloadUrl));

    if (platform === 'windows') {
      execSync(`curl -L -o "${tempFile}" "${downloadUrl}"`, { stdio: 'inherit' });
    } else {
      execSync(`curl -L -o "${tempFile}" "${downloadUrl}"`, { stdio: 'inherit' });
    }

    // Extract the archive
    console.log('📦 Extracting Qdrant...');
    if (platform === 'windows') {
      execSync(
        `powershell -Command "Expand-Archive -Path '${tempFile}' -DestinationPath '${qdrantDir}' -Force"`,
        { stdio: 'inherit' },
      );
    } else {
      execSync(`tar -xzf "${tempFile}" -C "${qdrantDir}" --strip-components=1`, {
        stdio: 'inherit',
      });
    }

    // Clean up the archive
    fs.unlinkSync(tempFile);

    // Make binary executable on Unix systems
    if (platform !== 'windows') {
      fs.chmodSync(binaryPath, '755');
    }

    console.log('✅ Qdrant setup completed successfully!');
  } catch (error) {
    console.error('❌ Failed to setup Qdrant:', error.message);
    process.exit(1);
  }
}

// Create configuration file
function createConfig() {
  const configPath = path.join(qdrantDir, 'config.yaml');

  if (fs.existsSync(configPath)) {
    console.log('✅ Qdrant configuration already exists');
    return;
  }

  const config = `# Qdrant Configuration for Learning Catalyst
# This file contains configuration for the Qdrant vector database

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

# Service configuration
service:
  http_port: 6333
  grpc_port: 6334
  max_request_size_mb: 32

# Performance settings
performance:
  max_search_threads: 4
  max_optimization_threads: 2

# Logging configuration
log_level: INFO

# Telemetry (disabled for privacy)
telemetry_disabled: true

# Snapshot settings
snapshots:
  snapshot_path: ./snapshots/qdrant
  snapshots_interval: 0  # Disabled by default
`;

  fs.writeFileSync(configPath, config);
  console.log('✅ Qdrant configuration created');
}

// Create README
function createReadme() {
  const readmePath = path.join(qdrantDir, 'README.md');

  if (fs.existsSync(readmePath)) {
    console.log('✅ Qdrant README already exists');
    return;
  }

  const readme = `# Qdrant Vector Database

This directory contains the Qdrant vector database binary and configuration for Learning Catalyst.

## Files

- \`qdrant${getPlatform() === 'windows' ? '.exe' : ''}\` - Qdrant vector database binary (v1.15.5)
- \`config.yaml\` - Configuration file for Qdrant
- \`data/\` - Data storage directory (created automatically)
- \`snapshots/\` - Snapshot storage directory (created automatically)

## Usage

Qdrant is started automatically by the Learning Catalyst application. You can also run it manually:

\`\`\`bash
# Start Qdrant with configuration
./qdrant${getPlatform() === 'windows' ? '.exe' : ''} --config-path config.yaml

# Start Qdrant with default settings
./qdrant${getPlatform() === 'windows' ? '.exe' : ''}
\`\`\`

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
`;

  fs.writeFileSync(readmePath, readme);
  console.log('✅ Qdrant README created');
}

// Main setup function
async function main() {
  console.log('🚀 Setting up Qdrant for Learning Catalyst...\n');

  try {
    await downloadQdrant();
    createConfig();
    createReadme();

    console.log('\n🎉 Qdrant setup completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('   1. Run "npm run dev" to start the development server');
    console.log('   2. Qdrant will start automatically when the application launches');
    console.log('   3. Access the Qdrant Web UI at http://127.0.0.1:6333/dashboard');
  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    process.exit(1);
  }
}

// Run setup if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main as setupQdrant };
