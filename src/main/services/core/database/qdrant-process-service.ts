/**
 * Qdrant Process Service - Infrastructure Layer
 *
 * Manages the lifecycle of the Qdrant vector database binary.
 * Handles process spawning, monitoring, and graceful shutdown.
 */

import path from 'node:path';
import fs from 'node:fs';
import type { ChildProcess } from 'node:child_process';

export interface QdrantProcessService {
  start(): Promise<void>;
  stop(): Promise<void>;
  isReady(): boolean;
  getHealth(): Promise<boolean>;
  getMetrics(): Promise<string>;
}

const QDRANT_DIR = '.catalyst';
const QDRANT_DATA_DIR = 'qdrant';

function getCatalystDir(workspacePath: string): string {
  return path.join(workspacePath, QDRANT_DIR);
}

function getDefaultQdrantDataPath(workspacePath: string): string {
  const catalystDir = getCatalystDir(workspacePath);
  // Ensure .catalyst directory exists (same as SQLite pattern)
  if (!fs.existsSync(catalystDir)) {
    fs.mkdirSync(catalystDir, { recursive: true });
  }
  return path.join(catalystDir, QDRANT_DATA_DIR);
}

function getDefaultQdrantConfigPath(workspacePath: string): string {
  const dataPath = getDefaultQdrantDataPath(workspacePath);

  // Create qdrant directory if it doesn't exist
  if (!fs.existsSync(dataPath)) {
    fs.mkdirSync(dataPath, { recursive: true });
  }

  // Create config if it doesn't exist
  const configPath = path.join(dataPath, 'config.yaml');
  if (!fs.existsSync(configPath)) {
    // Use object to build config (cleaner than YAML string)
    const config = {
      storage_path: dataPath,
      host: '127.0.0.1',
      port: 6333,
      grpc: {
        host: '127.0.0.1',
        port: 6334,
      },
      ui: {
        host: '127.0.0.1',
        port: 6333,
        enabled: true,
      },
      service: {
        http_port: 6333,
        grpc_port: 6334,
        max_request_size_mb: 32,
      },
      performance: {
        max_search_threads: 4,
        max_optimization_threads: 2,
      },
      log_level: 'INFO',
      telemetry_disabled: true,
      snapshots: {
        snapshot_path: path.join(dataPath, 'snapshots'),
        snapshots_interval: 0,
      },
    };

    // Convert to YAML
    const yamlContent = Object.entries(config)
      .map(([key, value]) => {
        if (typeof value === 'object' && value !== null) {
          return `${key}:\n${Object.entries(value)
            .map(([subKey, subValue]) => `  ${subKey}: ${subValue}`)
            .join('\n')}`;
        }
        return `${key}: ${value}`;
      })
      .join('\n');

    fs.writeFileSync(configPath, yamlContent);
    console.log('Created Qdrant config at:', configPath);
  }

  return configPath;
}

export function createQdrantProcessService(
  workspacePath: string,
  config: {
    host?: string;
    port?: number;
    grpcPort?: number;
    configPath?: string;
    dataPath?: string;
  } = {}
): QdrantProcessService {
  // Process state
  let childProcess: ChildProcess | null = null;
  let isReady = false;
  let isStarting = false;

  const serviceConfig = {
    host: '127.0.0.1',
    port: 6333,
    grpcPort: 6334,
    configPath: getDefaultQdrantConfigPath(workspacePath),  // ← Uses workspace path
    dataPath: getDefaultQdrantDataPath(workspacePath),  // ← Same pattern as SQLite
    ...config,
  };

  /**
   * Start the Qdrant binary as a child process
   */
  async function start(): Promise<void> {
    if (childProcess || isStarting) {
      return;
    }

    isStarting = true;

    try {
      const { spawn } = await import('child_process');
      const fs = await import('fs/promises');

      // Ensure data directory exists
      await fs.mkdir(serviceConfig.dataPath, { recursive: true });

      // Check for binary existence
      const qdrantPath = path.join(process.cwd(), 'external', 'qdrant', 'qdrant.exe');

      try {
        await fs.access(qdrantPath);
      } catch {
        throw new Error(`Qdrant binary not found at ${qdrantPath}`);
      }

      // Spawn the process
      childProcess = spawn(qdrantPath, [
        '--config-path', serviceConfig.configPath
      ], {
        stdio: ['ignore', 'pipe', 'pipe'],
        cwd: path.dirname(qdrantPath),
      });

      // Set up event handlers
      childProcess.on('exit', (code) => {
        console.log(`Qdrant process exited with code ${code}`);
        childProcess = null;
        isReady = false;
      });

      childProcess.on('error', (error) => {
        console.error('Qdrant process error:', error);
      });

      // Wait for server to be ready
      await waitForReady();
      isReady = true;
      console.log('Qdrant service started successfully');
    } finally {
      isStarting = false;
    }
  }

  /**
   * Stop the Qdrant process gracefully
   */
  async function stop(): Promise<void> {
    if (!childProcess) {
      return;
    }

    return new Promise((resolve) => {
      if (childProcess) {
        // Remove all listeners to prevent memory leaks
        childProcess.removeAllListeners('exit');
        childProcess.removeAllListeners('error');
        childProcess.removeAllListeners('close');
        childProcess.stdout?.removeAllListeners();
        childProcess.stderr?.removeAllListeners();

        // Set up exit handler
        childProcess.once('exit', () => {
          childProcess = null;
          isReady = false;
          resolve();
        });

        // Send termination signal
        childProcess.kill('SIGTERM');

        // Force kill after timeout
        setTimeout(() => {
          if (childProcess) {
            childProcess.kill('SIGKILL');
            childProcess = null;
            isReady = false;
            resolve();
          }
        }, 10000);
      } else {
        resolve();
      }
    });
  }

  /**
   * Check if service is ready
   */
  function ready(): boolean {
    return isReady;
  }

  /**
   * Get health status
   */
  async function getHealth(): Promise<boolean> {
    if (!childProcess) {
      return false;
    }

    try {
      const { QdrantClient } = await import('@qdrant/qdrant-js');
      const client = new QdrantClient({
        host: serviceConfig.host,
        port: serviceConfig.port,
      });
      await client.getCollections();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get server metrics
   */
  async function getMetrics(): Promise<string> {
    const url = `http://${serviceConfig.host}:${serviceConfig.port}/metrics`;
    const res = await fetch(url);
    return await res.text();
  }

  /**
   * Wait for Qdrant server to become ready
   */
  async function waitForReady(maxRetries = 30): Promise<void> {
    const { QdrantClient } = await import('@qdrant/qdrant-js');
    const client = new QdrantClient({
      host: serviceConfig.host,
      port: serviceConfig.port,
    });

    for (let i = 0; i < maxRetries; i++) {
      try {
        await client.getCollections();
        return;
      } catch {
        // Server not ready yet
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    throw new Error('Qdrant server failed to start within timeout period');
  }

  return {
    start,
    stop,
    isReady: ready,
    getHealth,
    getMetrics,
  };
}
