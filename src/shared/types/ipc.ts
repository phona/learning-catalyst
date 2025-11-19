/**
 * IPC (Inter-Process Communication) Types
 *
 * Type definitions for IPC communication between main and renderer processes.
 * Ensures type safety across process boundaries.
 */

import type { EventEmitter } from 'events';

// Base IPC message structure
export interface IPCMessage {
  id: string;
  channel: string;
  data?: any;
  timestamp: number;
  type?: string;
  method?: string;
  success?: boolean;
  eventName?: string;
  streamId?: string;
  isComplete?: boolean;
}

// IPC Request/Response patterns
export interface IPCRequest extends IPCMessage {
  type: 'request';
  method: string;
  params?: any;
}

export interface IPCResponse extends IPCMessage {
  type: 'response';
  success: boolean;
  data?: any;
  error?: string;
}

// IPC Event types
export interface IPCEvent extends IPCMessage {
  type: 'event';
  eventName: string;
  eventData?: any;
}

// Stream message types
export interface IPCStreamMessage extends IPCMessage {
  type: 'chunk' | 'end' | 'interrupted' | 'interrupt';
  index?: number;
  content?: string;
  metadata?: any;
  totalChunks?: number;
  atChunk?: number;
  streamId?: string;
}

// Process types for testing
export type MockMainProcess = EventEmitter

export interface MockRendererProcess extends EventEmitter {
  invoke: (channel: string, data: any) => Promise<any>;
  invokeWithTimeout: (channel: string, data: any, timeout: number) => Promise<any>;
  disconnect: () => void;
}

// Message channel types
export interface IPCMessageChannel {
  port1: MessagePort;
  port2: MessagePort;
  close: () => void;
}

// IPC Handler types
export type IPCHandler = (event: any, data: any) => Promise<any>;

export interface IPCHandlerMap {
  [channel: string]: IPCHandler;
}

// Error types
import type { IPCError } from './ipc-error';

// Channel types for communication
export const IPC_CHANNELS = {
  // Catalyst service channels
  CATALYST_SEND_CHAT: 'catalyst:send-chat',
  CATALYST_SEND_CHAT_STREAM: 'catalyst:send-chat-stream',
  CATALYST_GET_AGENTS: 'catalyst:get-agents',
  CATALYST_CANCEL_EXECUTION: 'catalyst:cancel-execution',

  // Session management channels
  SESSION_CREATE: 'session:create',
  SESSION_GET: 'session:get',
  SESSION_LIST: 'session:list',
  SESSION_UPDATE: 'session:update',
  SESSION_DELETE: 'session:delete',

  // File system channels
  FILE_READ: 'file:read',
  FILE_WRITE: 'file:write',
  FILE_SELECT: 'file:select',
  FILE_LIST: 'file:list',

  // Configuration channels
  CONFIG_GET: 'config:get',
  CONFIG_SET: 'config:set',
  CONFIG_SAVE: 'config:save',

  // System channels
  SYSTEM_GET_INFO: 'system:get-info',
  SYSTEM_NOTIFICATION: 'system:notification',
} as const;

// Event names
export const IPC_EVENTS = {
  // Agent events
  AGENT_STARTED: 'agent:started',
  AGENT_STOPPED: 'agent:stopped',
  AGENT_ERROR: 'agent:error',
  AGENT_PROGRESS: 'agent:progress',

  // Chat events
  CHAT_MESSAGE_RECEIVED: 'chat:message-received',
  CHAT_STREAM_START: 'chat:stream-start',
  CHAT_STREAM_CHUNK: 'chat:stream-chunk',
  CHAT_STREAM_END: 'chat:stream-end',

  // System events
  SYSTEM_READY: 'system:ready',
  SYSTEM_ERROR: 'system:error',
  SYSTEM_SHUTDOWN: 'system:shutdown',
} as const;

// Type guards
export function isIPCMessage(obj: any): obj is IPCMessage {
  return obj && typeof obj === 'object' &&
         typeof obj.id === 'string' &&
         typeof obj.channel === 'string' &&
         typeof obj.timestamp === 'number';
}

export function isIPCRequest(obj: any): obj is IPCRequest {
  return isIPCMessage(obj) && obj.type === 'request' && typeof obj.method === 'string';
}

export function isIPCResponse(obj: any): obj is IPCResponse {
  return isIPCMessage(obj) && obj.type === 'response' && typeof obj.success === 'boolean';
}

export function isIPCEvent(obj: any): obj is IPCEvent {
  return isIPCMessage(obj) && obj.type === 'event' && typeof obj.eventName === 'string';
}

export function isIPCStreamMessage(obj: any): obj is IPCStreamMessage {
  return isIPCMessage(obj) &&
         obj.type === 'stream' &&
         typeof obj.streamId === 'string' &&
         typeof obj.isComplete === 'boolean';
}