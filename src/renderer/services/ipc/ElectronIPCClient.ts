/**
 * Electron IPC Client
 *
 * Direct implementation of ICatalystIPCClient that uses window.electronAPI
 * for communication with the main process.
 */

import type {
  CatalystRequest,
  AgentDisplay,
  ActiveExecution,
  StreamChunk
} from '@/shared/types/electron-api';
import {
  ICatalystIPCClient,
  ChatResponse,
  AgentsResponse,
  SessionResponse,
  ExecutionCancelResponse
} from './ICatalystIPCClient';

/**
 * Direct IPC client implementation using window.electronAPI
 */
export class ElectronIPCClient implements ICatalystIPCClient {
  async sendChat(request: CatalystRequest): Promise<unknown> {
    if (!window.electronAPI?.catalyst?.executeAgent) {
      throw new Error('Electron API not available');
    }

    return await window.electronAPI.catalyst.executeAgent({
      agentId: request.agentId || 'default',
      input: request.message,
      context: {
        id: request.id || 'default',
        sessionId: request.sessionId || 'default',
        userId: 'user',
        timestamp: Date.now(),
        correlationId: request.id || 'default'
      },
      options: {
        stream: false,
        timeout: 30000
      }
    });
  }

  async sendChatStream(request: CatalystRequest): Promise<unknown> {
    if (!window.electronAPI?.catalyst?.executeAgentStream) {
      throw new Error('Electron API not available');
    }

    return await window.electronAPI.catalyst.executeAgentStream({
      agentId: request.agentId || 'default',
      input: request.message,
      onChunk: request.onChunk,
      context: {
        id: request.id || 'default',
        sessionId: request.sessionId || 'default',
        userId: 'user',
        timestamp: Date.now(),
        correlationId: request.id || 'default'
      },
      options: {
        stream: true,
        timeout: 30000
      }
    });
  }

  async getAvailableAgents(request: {}): Promise<unknown> {
    if (!window.electronAPI?.catalyst?.listAgents) {
      throw new Error('Electron API not available');
    }

    return await window.electronAPI.catalyst.listAgents();
  }

  async getSession(request: { sessionId: string }): Promise<unknown> {
    if (!window.electronAPI?.sessions?.get) {
      throw new Error('Electron API not available');
    }

    return await window.electronAPI.sessions.get(request.sessionId);
  }

  async cancelExecution(request: { executionId: string }): Promise<unknown> {
    if (!window.electronAPI?.catalyst?.cancelAgent) {
      throw new Error('Electron API not available');
    }

    return await window.electronAPI.catalyst.cancelAgent(request.executionId);
  }
}
