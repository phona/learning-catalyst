/**
 * Cross-Process Communication Integration Tests
 *
 * Tests for IPC communication between renderer and main processes,
 * MessageChannelMain streaming, and error handling across process boundaries.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EventEmitter } from 'events';
import {
  setupIPCIntegrationTest,
  cleanupIPCIntegrationTest
} from '../setup/integration-setup';
import {
  mockMessageChannelMain,
  mockIPCRenderer,
  mockIPCMain,
  createMockStream
} from '../utils/mocks/mock-electron-main';
import type { IPCMessage, IPCStreamMessage } from '../../shared/types/ipc';

describe('Cross-Process Communication Integration Tests', () => {
  let mockMainProcess: any;
  let mockRendererProcess: any;
  let messageChannel: any;
  let ipcHandlers: Map<string, Function>;

  beforeEach(async () => {
    const testEnvironment = await setupIPCIntegrationTest();
    mockMainProcess = testEnvironment.mainProcess;
    mockRendererProcess = testEnvironment.rendererProcess;
    messageChannel = testEnvironment.messageChannel;
    ipcHandlers = testEnvironment.ipcHandlers;
  });

  afterEach(async () => {
    await cleanupIPCIntegrationTest();
  });

  describe('Basic IPC Communication', () => {
    it('should handle simple request-response communication', async () => {
      // Set up main process handler
      ipcHandlers.set('catalyst:process-input', async (event, request) => {
        return {
          success: true,
          result: {
            content: `Processed: ${request.message}`,
            sessionId: request.sessionId,
            metadata: { timestamp: Date.now() }
          }
        };
      });

      // Send request from renderer
      const request: IPCMessage = {
        channel: 'catalyst:process-input',
        data: {
          message: 'Explain React Hooks',
          sessionId: 'session-001',
          context: { conceptId: 'react-hooks' }
        }
      };

      const response = await mockRendererProcess.invoke(request.channel, request.data);

      expect(response.success).toBe(true);
      expect(response.result.content).toBe('Processed: Explain React Hooks');
      expect(response.result.sessionId).toBe('session-001');
      expect(response.result.metadata.timestamp).toBeDefined();
    });

    it('should handle async operations with proper timeout handling', async () => {
      // Set up handler with delay
      ipcHandlers.set('catalyst:async-operation', async (event, request) => {
        // Simulate async operation
        await new Promise(resolve => setTimeout(resolve, 100));
        return {
          success: true,
          result: { data: 'async result', processingTime: 100 }
        };
      });

      const request = {
        channel: 'catalyst:async-operation',
        data: { operation: 'complex-analysis' }
      };

      const startTime = Date.now();
      const response = await mockRendererProcess.invoke(request.channel, request.data);
      const endTime = Date.now();

      expect(endTime - startTime).toBeGreaterThanOrEqual(100);
      expect(response.success).toBe(true);
      expect(response.result.data).toBe('async result');
    });

    it('should handle error propagation across process boundary', async () => {
      // Set up handler that throws error
      ipcHandlers.set('catalyst:error-operation', async (event, request) => {
        throw new Error('Database connection failed');
      });

      const request = {
        channel: 'catalyst:error-operation',
        data: { operation: 'database-query' }
      };

      const response = await mockRendererProcess.invoke(request.channel, request.data);

      expect(response.success).toBe(false);
      expect(response.error).toContain('Database connection failed');
      expect(response.errorCode).toBeDefined();
      expect(response.timestamp).toBeDefined();
    });
  });

  describe('MessageChannelMain Streaming', () => {
    it('should handle bidirectional streaming communication', async () => {
      // Set up streaming handler in main process
      ipcHandlers.set('catalyst:start-stream', async (event, request) => {
        const { port1, port2 } = mockMessageChannelMain();

        // Send port2 back to renderer
        event.sender.postMessage('catalyst:stream-port', { port: port2 }, [port2]);

        // Start streaming on port1
        const streamData = [
          'Starting comprehensive explanation...',
          'React Hooks are functions that let you...',
          'The most commonly used hooks are useState and useEffect...',
          'They allow you to use state and lifecycle features...',
          'Completion: End of explanation'
        ];

        let index = 0;
        const streamInterval = setInterval(() => {
          if (index < streamData.length) {
            const message: IPCStreamMessage = {
              type: 'chunk',
              index,
              content: streamData[index],
              metadata: { timestamp: Date.now(), totalChunks: streamData.length }
            };
            port1.postMessage(message);
            index++;
          } else {
            port1.postMessage({ type: 'end', totalChunks: streamData.length });
            clearInterval(streamInterval);
            port1.close();
          }
        }, 50);

        return { success: true, streamId: `stream-${Date.now()}` };
      });

      // Start stream from renderer
      const streamRequest = {
        message: 'Provide comprehensive explanation of React Hooks',
        sessionId: 'session-stream-001'
      };

      const streamInitResponse = await mockRendererProcess.invoke('catalyst:start-stream', streamRequest);
      expect(streamInitResponse.success).toBe(true);

      // Wait for port message and handle stream
      const receivedChunks = [];
      const streamComplete = new Promise<void>((resolve) => {
        console.log('🔧 Setting up stream port listener...');
        mockRendererProcess.once('catalyst:stream-port', (event, { port }) => {
          console.log('📥 Received stream port event!', { port });
          port.on('message', (message: IPCStreamMessage) => {
            console.log('📨 Received port message:', message);
            if (message.type === 'chunk') {
              receivedChunks.push(message);
            } else if (message.type === 'end') {
              expect(receivedChunks).toHaveLength(5);
              expect(receivedChunks[0].content).toContain('Starting comprehensive explanation');
              expect(receivedChunks[4].content).toContain('Completion: End of explanation');
              console.log('✅ Stream completed!');
              resolve();
            }
          });
        });
      });

      await streamComplete;
    });

    it('should handle stream interruption and recovery', async () => {
      ipcHandlers.set('catalyst:interruptible-stream', async (event, request) => {
        const { port1, port2 } = mockMessageChannelMain();
        event.sender.postMessage('catalyst:stream-port', { port: port2 }, [port2]);

        let interrupted = false;
        const streamData = Array.from({ length: 20 }, (_, i) => `Chunk ${i}: Learning content part ${i}`);

        let index = 0;
        const streamInterval = setInterval(() => {
          if (interrupted) {
            port1.postMessage({ type: 'interrupted', atChunk: index });
            clearInterval(streamInterval);
            return;
          }

          if (index < streamData.length) {
            port1.postMessage({
              type: 'chunk',
              index,
              content: streamData[index],
              metadata: { timestamp: Date.now() }
            });
            index++;
          } else {
            port1.postMessage({ type: 'end', totalChunks: streamData.length });
            clearInterval(streamInterval);
            port1.close();
          }
        }, 25);

        // Listen for interruption
        port1.on('message', (message) => {
          if (message.type === 'interrupt') {
            interrupted = true;
          }
        });

        return { success: true, streamId: 'interruptible-stream-test' };
      });

      // Start stream and interrupt it
      const streamRequest = { message: 'Start long stream' };
      const streamInitResponse = await mockRendererProcess.invoke('catalyst:interruptible-stream', streamRequest);

      let streamPort: any;
      const receivedChunks = [];
      const streamInterrupted = new Promise<void>((resolve) => {
        mockRendererProcess.once('catalyst:stream-port', (event, { port }) => {
          streamPort = port;
          port.on('message', (message: IPCStreamMessage) => {
            if (message.type === 'chunk') {
              receivedChunks.push(message);
              // Interrupt after receiving 5 chunks
              if (receivedChunks.length === 5) {
                port.postMessage({ type: 'interrupt', reason: 'user_request' });
              }
            } else if (message.type === 'interrupted') {
              expect(message.atChunk).toBe(5);
              resolve();
            }
          });
        });
      });

      await streamInterrupted;

      // Resume stream
      const resumeResponse = await mockRendererProcess.invoke('catalyst:resume-stream', {
        streamId: streamInitResponse.streamId,
        fromChunk: 5
      });

      expect(resumeResponse.success).toBe(true);
    });

    it('should handle concurrent streams efficiently', async () => {
      // Set up multiple concurrent streams
      const streamCount = 5;
      const streamPromises = [];

      ipcHandlers.set('catalyst:concurrent-stream', async (event, request) => {
        const { port1, port2 } = mockMessageChannelMain();
        event.sender.postMessage(`catalyst:stream-port-${request.streamId}`, { port: port2 }, [port2]);

        const streamData = Array.from({ length: 10 }, (_, i) => `Stream ${request.streamId} - Chunk ${i}`);
        let index = 0;

        const streamInterval = setInterval(() => {
          if (index < streamData.length) {
            port1.postMessage({
              type: 'chunk',
              index,
              content: streamData[index],
              streamId: request.streamId,
              metadata: { timestamp: Date.now() }
            });
            index++;
          } else {
            port1.postMessage({ type: 'end', streamId: request.streamId, totalChunks: streamData.length });
            clearInterval(streamInterval);
            port1.close();
          }
        }, 30);

        return { success: true, streamId: request.streamId };
      });

      // Start multiple concurrent streams
      for (let i = 0; i < streamCount; i++) {
        const streamPromise = new Promise<void>((resolve) => {
          const streamId = `stream-${i}`;

          mockRendererProcess.invoke('catalyst:concurrent-stream', { streamId }).then(() => {
            const chunks = [];
            mockRendererProcess.once(`catalyst:stream-port-${streamId}`, (event, { port }) => {
              port.on('message', (message: IPCStreamMessage) => {
                if (message.type === 'chunk') {
                  chunks.push(message);
                } else if (message.type === 'end') {
                  expect(chunks).toHaveLength(10);
                  expect(chunks[0].streamId).toBe(streamId);
                  resolve();
                }
              });
            });
          });
        });

        streamPromises.push(streamPromise);
      }

      const startTime = Date.now();
      await Promise.all(streamPromises);
      const endTime = Date.now();

      // Verify concurrent performance
      expect(endTime - startTime).toBeLessThan(2000); // Should complete within 2 seconds
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle process disconnection gracefully', async () => {
      // Set up handler
      ipcHandlers.set('catalyst:disconnection-test', async (event, request) => {
        // Simulate processing delay
        await new Promise(resolve => setTimeout(resolve, 200));
        return { success: true, result: { processed: true } };
      });

      // Start request
      const requestPromise = mockRendererProcess.invoke('catalyst:disconnection-test', { test: true });

      // Simulate renderer disconnection
      setTimeout(() => {
        mockRendererProcess.disconnect();
      }, 100);

      // Should handle disconnection gracefully
      const response = await requestPromise;

      // Response might fail due to disconnection, but should not crash
      expect(typeof response).toBe('object');
    });

    it('should handle malformed messages safely', async () => {
      // Set up strict handler
      ipcHandlers.set('catalyst:strict-handler', async (event, request) => {
        if (!request || typeof request !== 'object') {
          throw new Error('Invalid message format');
        }
        if (!request.requiredField) {
          throw new Error('Missing required field: requiredField');
        }
        return { success: true, processed: request.requiredField };
      });

      // Test malformed messages
      const malformedRequests = [
        null,
        undefined,
        'string-instead-of-object',
        { missingRequiredField: 'value' },
        { requiredField: null }
      ];

      for (const malformedRequest of malformedRequests) {
        const response = await mockRendererProcess.invoke('catalyst:strict-handler', malformedRequest);

        expect(response.success).toBe(false);
        expect(response.error).toBeDefined();
      }

      // Test valid message
      const validResponse = await mockRendererProcess.invoke('catalyst:strict-handler', {
        requiredField: 'valid-value'
      });

      expect(validResponse.success).toBe(true);
      expect(validResponse.processed).toBe('valid-value');
    });

    it('should handle timeout scenarios appropriately', async () => {
      // Set up slow handler
      ipcHandlers.set('catalyst:slow-operation', async (event, request) => {
        await new Promise(resolve => setTimeout(resolve, 5000)); // 5 second delay
        return { success: true, result: 'slow-completed' };
      });

      // Test with timeout
      const startTime = Date.now();
      const response = await mockRendererProcess.invokeWithTimeout('catalyst:slow-operation', {}, 1000);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1500); // Should timeout within 1.5 seconds
      expect(response.success).toBe(false);
      expect(response.error).toContain('timeout');
    });
  });

  describe('Security and Validation', () => {
    it('should validate message size limits', async () => {
      // Set up handler with size validation
      ipcHandlers.set('catalyst:size-validation', async (event, request) => {
        const messageSize = JSON.stringify(request).length;
        if (messageSize > 1024 * 1024) { // 1MB limit
          throw new Error('Message size exceeds limit');
        }
        return { success: true, size: messageSize };
      });

      // Test normal size message
      const normalResponse = await mockRendererProcess.invoke('catalyst:size-validation', {
        data: 'normal-size-message'
      });
      expect(normalResponse.success).toBe(true);

      // Test oversized message
      const oversizedData = 'x'.repeat(2 * 1024 * 1024); // 2MB string
      const oversizedResponse = await mockRendererProcess.invoke('catalyst:size-validation', {
        data: oversizedData
      });
      expect(oversizedResponse.success).toBe(false);
      expect(oversizedResponse.error).toContain('size exceeds limit');
    });

    it('should sanitize sensitive data in messages', async () => {
      // Set up handler with sanitization
      ipcHandlers.set('catalyst:sanitize-data', async (event, request) => {
        const sanitized = { ...request };
        // Remove sensitive fields
        delete sanitized.apiKey;
        delete sanitized.password;
        delete sanitized.token;
        sanitized.apiKeyPresent = !!request.apiKey;
        return { success: true, sanitizedData: sanitized };
      });

      const requestWithSensitiveData = {
        message: 'Process user data',
        apiKey: 'sk-1234567890',
        password: 'secret-password',
        token: 'jwt-token-123',
        userId: 'user-123'
      };

      const response = await mockRendererProcess.invoke('catalyst:sanitize-data', requestWithSensitiveData);

      expect(response.success).toBe(true);
      expect(response.sanitizedData.apiKey).toBeUndefined();
      expect(response.sanitizedData.password).toBeUndefined();
      expect(response.sanitizedData.token).toBeUndefined();
      expect(response.sanitizedData.apiKeyPresent).toBe(true);
      expect(response.sanitizedData.userId).toBe('user-123');
    });

    it('should handle concurrent request queuing safely', async () => {
      // Set up handler with rate limiting
      let requestCount = 0;
      ipcHandlers.set('catalyst:rate-limited', async (event, request) => {
        requestCount++;
        if (requestCount > 5) {
          throw new Error('Rate limit exceeded');
        }
        await new Promise(resolve => setTimeout(resolve, 50));
        return { success: true, requestId: requestCount };
      });

      // Send concurrent requests
      const concurrentRequests = Array.from({ length: 10 }, (_, i) =>
        mockRendererProcess.invoke('catalyst:rate-limited', { id: i })
      );

      const responses = await Promise.allSettled(concurrentRequests);

      // First 5 should succeed, rest should fail
      const successfulResponses = responses.filter(r => r.status === 'fulfilled' && r.value.success);
      const failedResponses = responses.filter(r => r.status === 'rejected' || !r.value.success);

      expect(successfulResponses).toHaveLength(5);
      expect(failedResponses).toHaveLength(5);
    });
  });

  describe('Performance and Resource Management', () => {
    it('should manage memory efficiently during high-frequency communication', async () => {
      // Set up lightweight handler
      ipcHandlers.set('catalyst:lightweight-operation', async (event, request) => {
        return { success: true, echo: request.data, timestamp: Date.now() };
      });

      const initialMemory = process.memoryUsage().heapUsed;
      const requestCount = 1000;

      // Send many requests
      const promises = Array.from({ length: requestCount }, (_, i) =>
        mockRendererProcess.invoke('catalyst:lightweight-operation', { data: `request-${i}` })
      );

      await Promise.all(promises);

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (less than 50MB for 1000 requests)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });

    it('should handle large data transfer efficiently', async () => {
      // Set up data transfer handler
      ipcHandlers.set('catalyst:data-transfer', async (event, request) => {
        const largeData = Array.from({ length: 10000 }, (_, i) => ({
          id: i,
          name: `Item ${i}`,
          description: `Description for item ${i}`.repeat(10),
          metadata: { created: Date.now(), category: `category-${i % 100}` }
        }));

        return { success: true, data: largeData, itemCount: largeData.length };
      });

      const startTime = Date.now();
      const response = await mockRendererProcess.invoke('catalyst:data-transfer', { size: 'large' });
      const endTime = Date.now();

      expect(response.success).toBe(true);
      expect(response.data).toHaveLength(10000);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second

      // Verify data integrity
      expect(response.data[0]).toMatchObject({
        id: 0,
        name: 'Item 0',
        metadata: { category: 'category-0' }
      });
      expect(response.data[9999]).toMatchObject({
        id: 9999,
        name: 'Item 9999',
        metadata: { category: 'category-99' }
      });
    });
  });
});