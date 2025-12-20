/**
 * Qdrant Process Service - Infrastructure Layer
 *
 * Manages the lifecycle of the Qdrant vector database binary.
 * Handles process spawning, monitoring, and graceful shutdown.
 */

import path from 'node:path';
import fs from 'node:fs';
import type { ChildProcess } from 'node:child_process';
import type { LoggerService } from '../logger/logger-service';
import { spawn } from 'child_process';
import asyncfs from 'fs/promises'
import { IPC_ERROR_CODES, IPCErrorException } from '@/shared/types/ipc-error';

export interface QdrantProcessService {
  start(): Promise<void>;
  stop(): Promise<void>;
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
  logger: LoggerService,
  config: {
    host?: string;
    port?: number;
    grpcPort?: number;
    configPath?: string;
    dataPath?: string;
  } = {},
): QdrantProcessService {
  // Process state
  let childProcess: ChildProcess | null = null;
  let isReady = false;
  let isStarting = false;
  let startupPromise: Promise<void> | null = null;

  const serviceConfig = {
    host: '127.0.0.1',
    port: 6333,
    grpcPort: 6334,
    configPath: getDefaultQdrantConfigPath(workspacePath), // ← Uses workspace path
    dataPath: getDefaultQdrantDataPath(workspacePath), // ← Same pattern as SQLite
    ...config,
  };

  /**
   * Start the Qdrant binary as a child process
   */
  async function start(): Promise<void> {
    // If already running, return immediately
    if (childProcess && isReady) {
      return;
    }

    // If startup is in progress, wait for the existing startup operation
    if (startupPromise) {
      return startupPromise;
    }

    // Start the process
    startupPromise = performStartup();
    return startupPromise;
  }

  async function performStartup(): Promise<void> {
    isStarting = true;

    try {
      const { binaryPath } = await validateEnvironment();
      const { child, stdoutChunks, stderrChunks } = spawnQdrantProcess(binaryPath);

      // Create a promise that rejects if process exits/errors during startup
      let startupErrorReject: (error: Error) => void;
      const processErrorPromise = new Promise<never>((_, reject) => {
        startupErrorReject = reject;
      });

      setupProcessMonitoring(child, stdoutChunks, stderrChunks, startupErrorReject!);

      // Race between ready check and process error
      await Promise.race([
        waitForReady(),
        processErrorPromise
      ]);

      isReady = true;

      logger.info('Qdrant service started successfully');
    } catch (error) {
      // On error, clean up the process reference
      if (childProcess) {
        try {
          childProcess.kill();
        } catch {
          // Ignore kill errors
        }
        childProcess = null;
      }
      isReady = false;

      // Log detailed error information
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Failed to start Qdrant service', error, {
        errorMessage,
        workspacePath,
        configPath: serviceConfig.configPath,
        dataPath: serviceConfig.dataPath,
      });

      // Re-throw to propagate error to callers
      throw error;
    } finally {
      isStarting = false;
    }
  }

  async function validateEnvironment(): Promise<{ binaryPath: string }> {
    await asyncfs.mkdir(serviceConfig.dataPath, { recursive: true });

    const binaryPath = path.join(process.cwd(), 'external', 'qdrant', 'qdrant.exe');

    try {
      await asyncfs.access(binaryPath);
    } catch {
      throw new Error(`Qdrant binary not found at ${binaryPath}`);
    }

    // Double-check process hasn't started while we were preparing
    if (childProcess && isReady) {
      throw new Error('Qdrant already running');
    }

    return { binaryPath };
  }

  function spawnQdrantProcess(binaryPath: string) {
    const child = spawn(binaryPath, ['--config-path', serviceConfig.configPath], {
      stdio: ['ignore', 'pipe', 'pipe'],
      cwd: path.dirname(binaryPath),
    });

    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];

    child.stdout?.on('data', (chunk: Buffer) => {
      stdoutChunks.push(chunk);
      const output = chunk.toString().trim();
      if (output) {
        logger.debug(`[Qdrant] ${output}`);
      }
    });

    child.stderr?.on('data', (chunk: Buffer) => {
      stderrChunks.push(chunk);
      const error = chunk.toString().trim();
      if (error) {
        logger.error(`[Qdrant Error] ${error}`);
      }
    });

    return { child, stdoutChunks, stderrChunks };
  }

  function setupProcessMonitoring(
    child: ChildProcess,
    stdoutChunks: Buffer[],
    stderrChunks: Buffer[],
    onStartupError?: (error: Error) => void
  ) {
    child.on('exit', (code, signal) => {
      const stdout = Buffer.concat(stdoutChunks).toString().trim();
      const stderr = Buffer.concat(stderrChunks).toString().trim();

      if (code !== 0 || signal) {
        const errorMessage =
          stderr ||
          stdout ||
          `Qdrant process exited with code ${code}${signal ? ` and signal ${signal}` : ''}`;

        logger.error('Qdrant process exited with error', {
          code,
          signal,
          stdout: stdout || undefined,
          stderr: stderr || undefined,
          errorMessage,
        });

        if (stdout) {
          logger.debug('[Qdrant Stdout]:', stdout);
        }
        if (stderr) {
          logger.debug('[Qdrant Stderr]:', stderr);
        }

        // Reject startup if still in progress
        if (isStarting && onStartupError) {
          onStartupError(new IPCErrorException({
            message: errorMessage,
            type: 'SYSTEM_ERROR',
            code: IPC_ERROR_CODES.system.healthCheckFailed,
          }));
        }
      } else {
        logger.info(`Qdrant process exited normally with code ${code}`);
      }

      const wasReady = isReady;

      childProcess = null;
      isReady = false;

      if (wasReady && startupPromise) {
        startupPromise = null;
      }
    });

    child.on('error', (error) => {
      logger.error('Qdrant process spawn error', error, {
        message: error.message,
        code: error.code,
        errno: error.errno,
        syscall: error.syscall,
        path: error.path,
      });
    });
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
          startupPromise = null; // Clear startup promise on stop
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
            startupPromise = null; // Clear startup promise on force kill
            resolve();
          }
        }, 10000);
      } else {
        resolve();
      }
    });
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
  };
}
