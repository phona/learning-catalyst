/**
 * Catalyst Service - Renderer IPC Interface
 *
 * Provides the renderer-side interface to the main process CatalystService
 * through IPC communication following the intended architecture pattern.
 */

import type { CatalystRequest, CatalystResponse } from '@/shared/types/electron-api';

export interface ChatOptions {
  sessionId?: string;
  agentId?: string;
  message?: string;
}

export interface ChatStreamOptions {
  sessionId?: string;
  agentId?: string;
}

export interface StreamChunk {
  type: 'thinking' | 'content' | 'error' | 'complete' | 'data';
  content: string | object;
  timestamp: number;
}

/**
 * Renderer-side CatalystService that communicates with main process via IPC
 */
class CatalystService {
  /**
   * Send a chat message via IPC
   */
  async sendChat(message: string, options: ChatOptions = {}): Promise<{
    success: boolean;
    messageId?: string;
    response?: string;
    error?: string;
  }> {
    try {
      if (!window.electronAPI?.catalyst) {
        throw new Error('Catalyst API not available');
      }

      const response = await window.electronAPI.catalyst.sendChat({
        message,
        sessionId: options.sessionId,
        agentId: options.agentId
      } as CatalystRequest);

      return response as CatalystResponse;
    } catch (error) {
      console.error('CatalystService.sendChat error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Send a chat message with streaming response via IPC
   */
  async sendChatStream(
    message: string,
    options: ChatStreamOptions = {},
    onChunk: (chunk: StreamChunk) => void
  ): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
  }> {
    try {
      if (!window.electronAPI?.catalyst) {
        throw new Error('Catalyst API not available');
      }

      const response = await window.electronAPI.catalyst.sendChatStream({
        message,
        sessionId: options.sessionId,
        agentId: options.agentId,
        onChunk
      } as CatalystRequest);

      return response as CatalystResponse;
    } catch (error) {
      console.error('CatalystService.sendChatStream error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get available agents via IPC
   */
  async getAvailableAgents(): Promise<{
    success: boolean;
    agents?: Array<{
      id: string;
      name: string;
      description: string;
      capabilities: string[];
    }>;
    error?: string;
  }> {
    try {
      if (!window.electronAPI?.catalyst) {
        throw new Error('Catalyst API not available');
      }

      const response = await window.electronAPI.catalyst.getAvailableAgents({
      } as CatalystRequest);

      return response as CatalystResponse;
    } catch (error) {
      console.error('CatalystService.getAvailableAgents error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get session via IPC
   */
  async getSession(sessionId: string): Promise<{
    success: boolean;
    session?: any;
    error?: string;
  }> {
    try {
      if (!window.electronAPI?.catalyst) {
        throw new Error('Catalyst API not available');
      }

      const response = await window.electronAPI.catalyst.getSession({
        sessionId
      } as CatalystRequest);

      return response as CatalystResponse;
    } catch (error) {
      console.error('CatalystService.getSession error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Cancel execution via IPC
   */
  async cancelExecution(executionId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      if (!window.electronAPI?.catalyst) {
        throw new Error('Catalyst API not available');
      }

      const response = await window.electronAPI.catalyst.cancelExecution({
        executionId
      } as CatalystRequest);

      return response as CatalystResponse;
    } catch (error) {
      console.error('CatalystService.cancelExecution error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

export const catalystService = new CatalystService();