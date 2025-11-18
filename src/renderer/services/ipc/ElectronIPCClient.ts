/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable no-undef */
/* eslint-disable react/prop-types */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-non-null-asserted-optional-chain */
/* eslint-disable @typescript-eslint/no-non-null-asserted-access */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable @typescript-eslint/require-await */




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
