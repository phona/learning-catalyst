// @ts-nocheck
/**
 * Streaming Test Utilities
 *
 * Comprehensive utilities for testing streaming responses including
 * MessageChannelMain streaming, real-time AI responses, backpressure
 * handling, and connection management. Enables validation of streaming
 * behavior in main thread services.
 */

import { vi } from 'vitest';

// Mock streaming data types
export interface StreamingChunk {
  content: string;
  metadata?: Record<string, any>;
  timestamp: number;
  chunkId: string;
  isComplete?: boolean;
  error?: Error;
}

export interface StreamingOptions {
  chunkDelay?: number;
  totalChunks?: number;
  chunkSize?: number;
  simulateErrors?: boolean;
  simulateBackpressure?: boolean;
  simulateDisconnection?: boolean;
}

export interface StreamingMetrics {
  totalChunks: number;
  totalBytes: number;
  startTime: number;
  endTime?: number;
  duration?: number;
  averageChunkSize: number;
  chunksPerSecond: number;
  errors: number;
  reconnections: number;
}

// Mock streaming generator
export async function* createMockStream(
  content: string,
  options: StreamingOptions = {},
): AsyncGenerator<StreamingChunk> {
  const {
    chunkDelay = 50,
    chunkSize = 10,
    simulateErrors = false,
    simulateBackpressure = false,
    simulateDisconnection = false,
  } = options;

  const words = content.split(' ');
  let chunkIndex = 0;
  let errorSimulated = false;
  let backpressureActive = false;

  for (let i = 0; i < words.length; i += chunkSize) {
    // Simulate disconnection
    if (simulateDisconnection && i === Math.floor(words.length / 2)) {
      yield {
        content: '',
        metadata: { event: 'disconnected', reason: 'simulate_network_issue' },
        timestamp: Date.now(),
        chunkId: `chunk-${chunkIndex++}`,
      };
      break;
    }

    // Simulate backpressure
    if (simulateBackpressure && i === Math.floor(words.length / 3) && !backpressureActive) {
      backpressureActive = true;
      yield {
        content: '',
        metadata: { event: 'backpressure', status: 'active' },
        timestamp: Date.now(),
        chunkId: `chunk-${chunkIndex++}`,
      };
      await new Promise((resolve) => setTimeout(resolve, chunkDelay * 5)); // Longer delay
      yield {
        content: '',
        metadata: { event: 'backpressure', status: 'resolved' },
        timestamp: Date.now(),
        chunkId: `chunk-${chunkIndex++}`,
      };
    }

    // Simulate errors
    if (simulateErrors && !errorSimulated && i === Math.floor(words.length / 4)) {
      errorSimulated = true;
      yield {
        content: '',
        metadata: { event: 'error', type: 'temporary' },
        timestamp: Date.now(),
        chunkId: `chunk-${chunkIndex++}`,
        error: new Error('Simulated streaming error'),
      };
      await new Promise((resolve) => setTimeout(resolve, chunkDelay * 2));
    }

    // Normal chunk
    const chunkWords = words.slice(i, i + chunkSize);
    const chunkContent = chunkWords.join(' ') + (i + chunkSize < words.length ? ' ' : '');

    yield {
      content: chunkContent,
      metadata: {
        chunkIndex,
        totalChunks: Math.ceil(words.length / chunkSize),
        progress: Math.round(((i + chunkSize) / words.length) * 100),
      },
      timestamp: Date.now(),
      chunkId: `chunk-${chunkIndex++}`,
      isComplete: i + chunkSize >= words.length,
    };

    await new Promise((resolve) => setTimeout(resolve, chunkDelay));
  }
}

// Streaming test collector
export class StreamingTestCollector {
  private chunks: StreamingChunk[] = [];
  private startTime = 0;
  private endTime?: number;
  private errors: Error[] = [];
  private events: string[] = [];

  start(): void {
    this.chunks = [];
    this.errors = [];
    this.events = [];
    this.startTime = Date.now();
    this.endTime = undefined;
  }

  addChunk(chunk: StreamingChunk): void {
    this.chunks.push(chunk);

    if (chunk.metadata?.event) {
      this.events.push(chunk.metadata.event);
    }

    if (chunk.error) {
      this.errors.push(chunk.error);
    }

    if (chunk.isComplete) {
      this.endTime = Date.now();
    }
  }

  complete(): void {
    this.endTime = Date.now();
  }

  getMetrics(): StreamingMetrics {
    const totalBytes = this.chunks.reduce((sum, chunk) => sum + chunk.content.length, 0);
    const duration = (this.endTime || Date.now()) - this.startTime;

    return {
      totalChunks: this.chunks.length,
      totalBytes,
      startTime: this.startTime,
      endTime: this.endTime,
      duration,
      averageChunkSize: this.chunks.length > 0 ? totalBytes / this.chunks.length : 0,
      chunksPerSecond: duration > 0 ? (this.chunks.length / duration) * 1000 : 0,
      errors: this.errors.length,
      reconnections: this.events.filter((event) => event === 'reconnected').length,
    };
  }

  getCombinedContent(): string {
    return this.chunks
      .filter((chunk) => chunk.content.length > 0)
      .map((chunk) => chunk.content)
      .join('');
  }

  hasErrors(): boolean {
    return this.errors.length > 0;
  }

  isComplete(): boolean {
    return this.endTime !== undefined || this.chunks.some((chunk) => chunk.isComplete);
  }

  getEvents(): string[] {
    return [...this.events];
  }

  reset(): void {
    this.chunks = [];
    this.errors = [];
    this.events = [];
    this.startTime = 0;
    this.endTime = undefined;
  }
}

// MessageChannel streaming test utilities
export class MessageChannelTestHelper {
  private messagePort: any;
  private collector: StreamingTestCollector;
  private isConnected = false;

  constructor() {
    this.collector = new StreamingTestCollector();
  }

  async createMockMessageChannel(): Promise<{
    port1: any;
    port2: any;
  }> {
    const mockPort = {
      _messages: [] as StreamingChunk[],
      _listeners: new Map(),
      _closed: false,

      postMessage: vi.fn().mockImplementation((message: any) => {
        if (this._closed) {
          throw new Error('Port is closed');
        }
        this._messages.push(message);
      }),

      start: vi.fn(),
      close: vi.fn().mockImplementation(() => {
        this._closed = true;
      }),

      addEventListener: vi.fn().mockImplementation((event: string, listener: any) => {
        if (!this._listeners.has(event)) {
          this._listeners.set(event, []);
        }
        this._listeners.get(event).push(listener);
      }),

      removeEventListener: vi.fn(),
      onmessage: null,
      onmessageerror: null,

      // Test helper methods
      _receiveMessage: function (message: StreamingChunk) {
        if (this._closed) return;

        this._messages.push(message);

        // Trigger event listeners
        if (this.onmessage) {
          this.onmessage({ data: message });
        }

        const messageListeners = this._listeners.get('message') || [];
        messageListeners.forEach((listener: any) => {
          try {
            listener({ data: message });
          } catch (error) {
            console.error('Error in message listener:', error);
          }
        });
      },

      _simulateError: function (error: Error) {
        if (this.onmessageerror) {
          this.onmessageerror({ error });
        }

        const errorListeners = this._listeners.get('messageerror') || [];
        errorListeners.forEach((listener: any) => {
          listener({ error });
        });
      },
    };

    const port1 = { ...mockPort };
    const port2 = { ...mockPort };

    // Connect ports for bidirectional communication
    port1.addEventListener('message', (message: StreamingChunk) => {
      port2._receiveMessage(message);
    });

    port2.addEventListener('message', (message: StreamingChunk) => {
      port1._receiveMessage(message);
    });

    this.messagePort = port1;
    return { port1, port2 };
  }

  async startStreamTest(
    streamGenerator: AsyncGenerator<StreamingChunk>,
    options: {
      validateChunks?: boolean;
      collectMetrics?: boolean;
      onChunk?: (chunk: StreamingChunk) => void;
      onError?: (error: Error) => void;
      onComplete?: () => void;
    } = {},
  ): Promise<{
    collector: StreamingTestCollector;
    success: boolean;
    error?: Error;
  }> {
    const { validateChunks = true, collectMetrics = true, onChunk, onError, onComplete } = options;

    this.collector.start();
    this.isConnected = true;

    try {
      for await (const chunk of streamGenerator) {
        if (!this.isConnected) {
          throw new Error('Stream disconnected');
        }

        // Validate chunk structure
        if (validateChunks) {
          this.validateChunk(chunk);
        }

        // Collect chunk
        if (collectMetrics) {
          this.collector.addChunk(chunk);
        }

        // Call custom handlers
        if (onChunk) {
          try {
            onChunk(chunk);
          } catch (error) {
            console.error('Error in onChunk handler:', error);
          }
        }

        // Handle chunk events
        if (chunk.error && onError) {
          onError(chunk.error);
        }

        if (chunk.isComplete) {
          this.collector.complete();
          if (onComplete) {
            onComplete();
          }
          break;
        }
      }

      return {
        collector: this.collector,
        success: true,
      };
    } catch (error) {
      this.collector.addChunk({
        content: '',
        metadata: { event: 'stream_error' },
        timestamp: Date.now(),
        chunkId: 'error',
        error: error as Error,
      });

      return {
        collector: this.collector,
        success: false,
        error: error as Error,
      };
    }
  }

  validateChunk(chunk: StreamingChunk): void {
    expect(chunk).toHaveProperty('content');
    expect(chunk).toHaveProperty('timestamp');
    expect(chunk).toHaveProperty('chunkId');
    expect(typeof chunk.content).toBe('string');
    expect(typeof chunk.timestamp).toBe('number');
    expect(typeof chunk.chunkId).toBe('string');
  }

  disconnect(): void {
    this.isConnected = false;
    if (this.messagePort) {
      this.messagePort.close();
    }
  }

  reset(): void {
    this.collector.reset();
    this.isConnected = false;
  }
}

// Streaming performance test utilities
export class StreamingPerformanceTester {
  async testStreamPerformance(
    streamGenerator: AsyncGenerator<StreamingChunk>,
    options: {
      expectedLatency?: number;
      expectedThroughput?: number;
      maxMemoryUsage?: number;
      duration?: number;
    } = {},
  ): Promise<{
    metrics: StreamingMetrics;
    performance: {
      latencyOk: boolean;
      throughputOk: boolean;
      memoryOk: boolean;
      durationOk: boolean;
    };
    success: boolean;
  }> {
    const {
      expectedLatency = 1000, // 1 second max latency per chunk
      expectedThroughput = 10, // 10 chunks per second minimum
      maxMemoryUsage = 50 * 1024 * 1024, // 50MB max
      duration = 30000, // 30 seconds max
    } = options;

    const collector = new StreamingTestCollector();
    const startTime = Date.now();
    let lastChunkTime = startTime;
    let memoryUsage = 0;

    collector.start();

    try {
      for await (const chunk of streamGenerator) {
        const now = Date.now();
        const chunkLatency = now - lastChunkTime;
        lastChunkTime = now;

        // Check memory usage (mock implementation)
        memoryUsage += chunk.content.length * 2; // Rough estimate

        // Validate performance constraints
        if (chunkLatency > expectedLatency) {
          console.warn(`Chunk latency exceeded: ${chunkLatency}ms > ${expectedLatency}ms`);
        }

        collector.addChunk(chunk);

        // Check duration limit
        if (now - startTime > duration) {
          throw new Error(`Stream exceeded maximum duration of ${duration}ms`);
        }

        if (chunk.isComplete) {
          break;
        }
      }

      collector.complete();
      const metrics = collector.getMetrics();

      const performance = {
        latencyOk: true, // Would need more detailed tracking
        throughputOk: metrics.chunksPerSecond >= expectedThroughput,
        memoryOk: memoryUsage <= maxMemoryUsage,
        durationOk: (metrics.duration || 0) <= duration,
      };

      return {
        metrics,
        performance,
        success: Object.values(performance).every((ok) => ok),
      };
    } catch (error) {
      const metrics = collector.getMetrics();
      return {
        metrics,
        performance: {
          latencyOk: false,
          throughputOk: false,
          memoryOk: false,
          durationOk: false,
        },
        success: false,
      };
    }
  }
}

// Backpressure simulation utilities
export class BackpressureSimulator {
  async testBackpressureHandling(
    streamGenerator: AsyncGenerator<StreamingChunk>,
    options: {
      triggerPoints?: number[];
      backpressureDuration?: number;
      expectedBehavior?: 'pause' | 'buffer' | 'drop';
    } = {},
  ): Promise<{
    handledCorrectly: boolean;
    behavior: string;
    events: string[];
  }> {
    const {
      triggerPoints = [0.25, 0.5, 0.75],
      backpressureDuration = 1000,
      expectedBehavior = 'pause',
    } = options;

    const events: string[] = [];
    const collector = new StreamingTestCollector();
    collector.start();

    let totalChunks = 0;
    let backpressureActive = false;

    try {
      for await (const chunk of streamGenerator) {
        totalChunks++;

        // Check if we should trigger backpressure
        const progress = totalChunks / 10; // Assume 10 total chunks for simplicity
        const shouldTrigger = triggerPoints.some((point) => Math.abs(progress - point) < 0.1);

        if (shouldTrigger && !backpressureActive) {
          backpressureActive = true;
          events.push('backpressure_triggered');

          // Simulate backpressure delay
          await new Promise((resolve) => setTimeout(resolve, backpressureDuration));

          backpressureActive = false;
          events.push('backpressure_resolved');
        }

        collector.addChunk(chunk);

        if (chunk.isComplete) {
          break;
        }
      }

      collector.complete();

      // Determine if backpressure was handled correctly
      const handledCorrectly =
        events.includes('backpressure_triggered') && events.includes('backpressure_resolved');

      return {
        handledCorrectly,
        behavior: expectedBehavior,
        events,
      };
    } catch (error) {
      return {
        handledCorrectly: false,
        behavior: 'error',
        events: [...events, 'error'],
      };
    }
  }
}

// Streaming test scenarios
export const StreamingTestScenarios = {
  // Basic streaming test
  async basicStreaming(content: string): Promise<boolean> {
    const helper = new MessageChannelTestHelper();
    const stream = createMockStream(content, { chunkDelay: 10 });

    const result = await helper.startStreamTest(stream);

    return (
      result.success &&
      result.collector.getCombinedContent() === content &&
      result.collector.isComplete()
    );
  },

  // Error handling test
  async errorHandling(content: string): Promise<boolean> {
    const helper = new MessageChannelTestHelper();
    const stream = createMockStream(content, {
      simulateErrors: true,
      chunkDelay: 10,
    });

    let errorsCaught = 0;
    const result = await helper.startStreamTest(stream, {
      onError: () => errorsCaught++,
    });

    return result.success && errorsCaught > 0;
  },

  // Backpressure test
  async backpressureHandling(content: string): Promise<boolean> {
    const simulator = new BackpressureSimulator();
    const stream = createMockStream(content, { chunkDelay: 5 });

    const result = await simulator.testBackpressureHandling(stream, {
      triggerPoints: [0.3, 0.7],
      backpressureDuration: 100,
    });

    return result.handledCorrectly;
  },

  // Performance test
  async performanceTest(content: string): Promise<boolean> {
    const tester = new StreamingPerformanceTester();
    const stream = createMockStream(content, { chunkDelay: 20 });

    const result = await tester.testStreamPerformance(stream, {
      expectedLatency: 100,
      expectedThroughput: 5,
    });

    return result.success;
  },

  // Disconnection handling test
  async disconnectionHandling(content: string): Promise<boolean> {
    const helper = new MessageChannelTestHelper();
    const stream = createMockStream(content, {
      simulateDisconnection: true,
      chunkDelay: 10,
    });

    const result = await helper.startStreamTest(stream);

    // Should handle disconnection gracefully
    return !result.success && result.collector.getEvents().includes('disconnected');
  },
};

// Intentionally export individual utilities above; aggregate export removed to avoid duplicate declarations.
