/**
 * IPC Interceptor for Integration Testing
 *
 * Provides utilities to intercept and mock IPC communication
 * between main and renderer processes during integration tests.
 */

import { vi } from 'vitest';

export interface IPCMessage {
  channel: string;
  args: any[];
  requestId?: string;
}

export interface IPCResponse {
  success: boolean;
  data?: any;
  error?: string;
}

export class ElectronIpcInterceptor {
  private interceptedMessages: IPCMessage[] = [];
  private mockResponses = new Map<string, IPCResponse>();
  private isInitialized = false;

  /**
   * Initialize the IPC interceptor
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // Mock Electron's ipcRenderer and ipcMain
    this.mockIPCSend();
    this.mockIPCReceive();

    this.isInitialized = true;
  }

  /**
   * Dispose of the IPC interceptor
   */
  async dispose(): Promise<void> {
    this.interceptedMessages = [];
    this.mockResponses.clear();
    this.isInitialized = false;
  }

  /**
   * Get all intercepted messages
   */
  getInterceptedMessages(): IPCMessage[] {
    return [...this.interceptedMessages];
  }

  /**
   * Get messages for a specific channel
   */
  getMessagesForChannel(channel: string): IPCMessage[] {
    return this.interceptedMessages.filter(msg => msg.channel === channel);
  }

  /**
   * Set a mock response for a channel
   */
  setMockResponse(channel: string, response: IPCResponse): void {
    this.mockResponses.set(channel, response);
  }

  /**
   * Clear mock responses
   */
  clearMockResponses(): void {
    this.mockResponses.clear();
  }

  /**
   * Mock IPC send functionality
   */
  private mockIPCSend(): void {
    // Mock window.electronAPI methods that send IPC messages
    if (window.electronAPI) {
      // Wrap each domain method to intercept calls
      const domains = ['chat', 'learning', 'knowledge', 'analytics', 'agents', 'content', 'settings'] as const;

      domains.forEach(domain => {
        const domainAPI = (window.electronAPI as any)[domain];
        if (domainAPI && typeof domainAPI === 'object') {
          Object.keys(domainAPI).forEach(methodName => {
            const originalMethod = domainAPI[methodName];
            if (typeof originalMethod === 'function') {
              domainAPI[methodName] = vi.fn().mockImplementation(async (...args: any[]) => {
                const message: IPCMessage = {
                  channel: `${domain}.${methodName}`,
                  args,
                  requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
                };

                this.interceptedMessages.push(message);

                // Return mock response if available, otherwise call original
                if (this.mockResponses.has(message.channel)) {
                  return this.mockResponses.get(message.channel);
                }

                // Call the original mock implementation
                return originalMethod(...args);
              });
            }
          });
        }
      });
    }
  }

  /**
   * Mock IPC receive functionality
   */
  private mockIPCReceive(): void {
    // Mock event listeners for IPC messages from main process
    const mockEventEmitter = {
      on: vi.fn(),
      off: vi.fn(),
      once: vi.fn(),
      removeAllListeners: vi.fn()
    };

    // Add mock event emitter to window.electronAPI if it exists
    if (window.electronAPI) {
      (window.electronAPI as any).onAgentEvent = vi.fn();
      (window.electronAPI as any).onChatEvent = vi.fn();
      (window.electronAPI as any).onLearningEvent = vi.fn();
    }
  }

  /**
   * Create a mock progress event for streaming operations
   */
  createMockProgressEvent(type: string, data: any): any {
    return {
      type,
      data,
      timestamp: Date.now(),
      id: `progress_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  /**
   * Simulate a streaming response
   */
  async simulateStreamResponse(
    channel: string,
    chunks: Array<{ type: string; data: any; delay?: number }>
  ): Promise<void> {
    for (const chunk of chunks) {
      await new Promise(resolve => setTimeout(resolve, chunk.delay || 10));

      const event = this.createMockProgressEvent(chunk.type, chunk.data);

      // Emit the event through the appropriate domain
      if (window.electronAPI) {
        const domain = channel.split('.')[0];
        const eventEmitter = (window.electronAPI as any)[`on${domain.charAt(0).toUpperCase() + domain.slice(1)}Event`];
        if (typeof eventEmitter === 'function') {
          eventEmitter(event);
        }
      }
    }
  }

  /**
   * Wait for a specific IPC message
   */
  async waitForMessage(
    channel: string,
    timeout: number = 5000
  ): Promise<IPCMessage | null> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const message = this.interceptedMessages.find(msg => msg.channel === channel);
      if (message) {
        return message;
      }
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    return null;
  }

  /**
   * Assert that a specific IPC message was sent
   */
  assertMessageSent(channel: string, args?: any[]): void {
    const messages = this.getMessagesForChannel(channel);
    if (messages.length === 0) {
      throw new Error(`No messages sent on channel: ${channel}`);
    }

    if (args) {
      const matchingMessage = messages.find(msg =>
        JSON.stringify(msg.args) === JSON.stringify(args)
      );
      if (!matchingMessage) {
        throw new Error(`Message sent on ${channel} but with different args. Expected: ${JSON.stringify(args)}, Got: ${JSON.stringify(messages.map(m => m.args))}`);
      }
    }
  }

  /**
   * Get message statistics
   */
  getMessageStats(): Record<string, number> {
    const stats: Record<string, number> = {};

    this.interceptedMessages.forEach(message => {
      stats[message.channel] = (stats[message.channel] || 0) + 1;
    });

    return stats;
  }
}