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




import type {
  CatalystRequest,
  CatalystResponse
} from '@/shared/types/electron-api';
import {
  ICatalystIPCClient,
  ChatResponse,
  AgentsResponse,
  SessionResponse,
  ExecutionCancelResponse
} from './ICatalystIPCClient';

/**
 * Electron implementation of Catalyst IPC client
 * Communicates with main process through window.electronAPI
 */
export class ElectronCatalystIPCClient implements ICatalystIPCClient {
  private validateElectronAPI(): void {
    if (!window.electronAPI?.catalyst) {
      throw new Error('Catalyst API not available. Make sure preload script is properly loaded.');
    }
  }

  async sendChat(request: CatalystRequest): Promise<CatalystResponse> {
    try {
      this.validateElectronAPI();
      const response = await window.electronAPI!.catalyst!.sendChat(request);
      return this.validateResponse(response);
    } catch (error) {
      console.error('ElectronCatalystIPCClient.sendChat error:', error);
      return this.createErrorResponse(error);
    }
  }

  async sendChatStream(request: CatalystRequest): Promise<CatalystResponse> {
    try {
      this.validateElectronAPI();
      const response = await window.electronAPI!.catalyst!.sendChatStream(request);
      return this.validateResponse(response);
    } catch (error) {
      console.error('ElectronCatalystIPCClient.sendChatStream error:', error);
      return this.createErrorResponse(error);
    }
  }

  async getAvailableAgents(request: CatalystRequest): Promise<CatalystResponse> {
    try {
      this.validateElectronAPI();
      const response = await window.electronAPI!.catalyst!.getAvailableAgents(request);
      return this.validateResponse(response);
    } catch (error) {
      console.error('ElectronCatalystIPCClient.getAvailableAgents error:', error);
      return this.createErrorResponse(error);
    }
  }

  async getSession(request: CatalystRequest): Promise<CatalystResponse> {
    try {
      this.validateElectronAPI();
      const response = await window.electronAPI!.catalyst!.getSession(request);
      return this.validateResponse(response);
    } catch (error) {
      console.error('ElectronCatalystIPCClient.getSession error:', error);
      return this.createErrorResponse(error);
    }
  }

  async cancelExecution(request: CatalystRequest): Promise<CatalystResponse> {
    try {
      this.validateElectronAPI();
      const response = await window.electronAPI!.catalyst!.cancelExecution(request);
      return this.validateResponse(response);
    } catch (error) {
      console.error('ElectronCatalystIPCClient.cancelExecution error:', error);
      return this.createErrorResponse(error);
    }
  }

  /**
   * Validate response structure
   * @param response - Response from main process
   * @returns Validated response
   */
  private validateResponse(response: unknown): CatalystResponse {
    if (!response || typeof response !== 'object') {
      throw new Error('Invalid response received from main process');
    }

    const responseObj = response as Record<string, unknown>;

    // Ensure response has success property
    if (typeof responseObj.success !== 'boolean') {
      throw new Error('Response missing success property');
    }

    return response as CatalystResponse;
  }

  /**
   * Create standardized error response
   * @param error - Error that occurred
   * @returns Standardized error response
   */
  private createErrorResponse(error: unknown): CatalystResponse {
    return {
      success: false,
      error: error instanceof Error ? error.message : typeof error === 'string' ? error : 'Unknown error'
    };
  }
}