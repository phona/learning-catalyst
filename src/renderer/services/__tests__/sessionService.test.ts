/**
 * Session Service Tests
 *
 * Comprehensive tests for session persistence functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { sessionService } from '@/renderer/services/sessionService';

// Mock Electron API
const mockElectronAPI = {
  executeQuery: vi.fn(),
  fetchOne: vi.fn(),
  fetchMany: vi.fn(),
  fetchAll: vi.fn(),
};

// Setup global mock
global.window = {
  electronAPI: mockElectronAPI
} as any;

describe('SessionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize successfully when database is available', async () => {
      mockElectronAPI.executeQuery.mockResolvedValue({ success: true });

      await sessionService.initialize();

      expect(mockElectronAPI.executeQuery).toHaveBeenCalledWith('SELECT 1');
    });

    it('should throw error when database is not available', async () => {
      mockElectronAPI.executeQuery.mockRejectedValue(new Error('Database not available'));

      await expect(sessionService.initialize()).rejects.toThrow('Database connection failed');
    });
  });

  describe('Session Creation', () => {
    beforeEach(async () => {
      mockElectronAPI.executeQuery.mockResolvedValue({ success: true, result: 'test-id' });
      await sessionService.initialize();
    });

    it('should create a new session with valid data', async () => {
      const sessionData = {
        title: 'Test Session',
        description: 'Test Description',
        tags: ['test', 'sample'],
        provider: 'openai',
        model: 'gpt-3.5-turbo',
      };

      // Mock the session retrieval after creation
      mockElectronAPI.fetchMany.mockResolvedValue([{
        id: 'test-id',
        title: 'Test Session',
        description: 'Test Description',
        metadata: JSON.stringify({
          title: 'Test Session',
          tags: ['test', 'sample'],
          provider: 'openai',
          model: 'gpt-3.5-turbo',
          archived: false,
          pinned: false
        }),
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T01:00:00.000Z'
      }]);

      const sessionId = await sessionService.createSession(sessionData);

      expect(sessionId).toBe('test-id');
      expect(mockElectronAPI.executeQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO learning_sessions'),
        expect.arrayContaining([
          expect.any(String), // id
          sessionData.title,
          sessionData.description,
          expect.stringContaining('"tags":["test","sample"]'), // metadata JSON
          expect.any(String), // start_time
          expect.any(String), // created_at
          expect.any(String)  // updated_at
        ])
      );
    });

    it('should create session with minimal required data', async () => {
      const sessionData = {
        title: 'Minimal Session'
      };

      await sessionService.createSession(sessionData);

      expect(mockElectronAPI.executeQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO learning_sessions'),
        expect.arrayContaining([
          expect.any(String),
          sessionData.title,
          null, // description
          expect.any(String), // metadata
          expect.any(String),
          expect.any(String),
          expect.any(String)
        ])
      );
    });
  });

  describe('Session Retrieval', () => {
    beforeEach(async () => {
      mockElectronAPI.executeQuery.mockResolvedValue({ success: true });
      await sessionService.initialize();
    });

    it('should retrieve session by ID with messages', async () => {
      const mockSessionData = {
        id: 'test-session-id',
        title: 'Test Session',
        description: 'Test Description',
        metadata: JSON.stringify({
          tags: ['test'],
          provider: 'openai',
          model: 'gpt-3.5-turbo',
          archived: false,
          pinned: false
        }),
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T01:00:00.000Z'
      };

      const mockMessageData = [
        {
          id: 'msg-1',
          session_id: 'test-session-id',
          role: 'user',
          content: 'Hello',
          timestamp: '2024-01-01T00:30:00.000Z',
          tokens_used: '{"total_tokens": 10}'
        },
        {
          id: 'msg-2',
          session_id: 'test-session-id',
          role: 'assistant',
          content: 'Hi there!',
          timestamp: '2024-01-01T00:31:00.000Z',
          thinking_content: 'Greeting the user',
          tokens_used: '{"total_tokens": 15}'
        }
      ];

      mockElectronAPI.fetchMany
        .mockResolvedValueOnce({ success: true, result: [mockSessionData] })
        .mockResolvedValueOnce({ success: true, result: mockMessageData });

      const session = await sessionService.getSessionById('test-session-id');

      expect(session.id).toBe('test-session-id');
      expect(session.title).toBe('Test Session');
      expect(session.messages).toHaveLength(2);
      expect(session.messages[0].role).toBe('user');
      expect(session.messages[1].thinking_content).toBe('Greeting the user');
      expect(session.context.current_provider).toBe('openai');
      expect(session.context.current_model).toBe('gpt-3.5-turbo');
    });

    it('should throw error when session not found', async () => {
      mockElectronAPI.fetchMany.mockResolvedValue({ success: true, result: [] });

      await expect(sessionService.getSessionById('non-existent-id')).rejects.toThrow('Session not found');
    });
  });

  describe('Session Updates', () => {
    beforeEach(async () => {
      mockElectronAPI.executeQuery.mockResolvedValue({ success: true });
      await sessionService.initialize();
    });

    it('should update session title and description', async () => {
      const updates = {
        title: 'Updated Title',
        description: 'Updated Description'
      };

      await sessionService.updateSession('test-id', updates);

      expect(mockElectronAPI.executeQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE learning_sessions'),
        expect.arrayContaining([
          updates.title,
          updates.description,
          expect.any(String), // updated_at
          'test-id'
        ])
      );
    });

    it('should update session tags and archived status', async () => {
      const updates = {
        tags: ['new-tag', 'updated'],
        archived: true
      };

      // Mock getting current session metadata
      const mockCurrentSession = {
        id: 'test-id',
        title: 'Test Session',
        description: 'Test Description',
        metadata: JSON.stringify({
          tags: ['old-tag'],
          provider: 'openai',
          model: 'gpt-3.5-turbo',
          archived: false
        }),
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T01:00:00.000Z'
      };

      mockElectronAPI.fetchMany.mockResolvedValue({ success: true, result: [mockCurrentSession] });
      mockElectronAPI.fetchOne.mockResolvedValue({ success: true, result: mockCurrentSession });

      await sessionService.updateSession('test-id', updates);

      expect(mockElectronAPI.executeQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE learning_sessions'),
        expect.arrayContaining([
          'Test Session',
          'Test Description',
          expect.stringContaining('"tags":["new-tag","updated"]'),
          expect.stringContaining('"archived":true'),
          expect.any(String),
          'test-id'
        ])
      );
    });
  });

  describe('Session Deletion', () => {
    beforeEach(async () => {
      mockElectronAPI.executeQuery.mockResolvedValue({ success: true });
      await sessionService.initialize();
    });

    it('should delete session by ID', async () => {
      await sessionService.deleteSession('test-id');

      expect(mockElectronAPI.executeQuery).toHaveBeenCalledWith(
        'DELETE FROM learning_sessions WHERE id = ?',
        ['test-id']
      );
    });
  });

  describe('Message Management', () => {
    beforeEach(async () => {
      mockElectronAPI.executeQuery.mockResolvedValue({ success: true });
      mockElectronAPI.fetchOne.mockResolvedValue({ success: true, result: { next_order: 0 } });
      await sessionService.initialize();
    });

    it('should add message to session', async () => {
      const messageData = {
        sessionId: 'test-session-id',
        role: 'user' as const,
        content: 'Hello world',
        provider: 'openai',
        model: 'gpt-3.5-turbo',
        tokens_used: 10,
        thinking_content: 'Some thinking'
      };

      await sessionService.addMessage(messageData);

      expect(mockElectronAPI.executeQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO messages'),
        expect.arrayContaining([
          expect.any(String), // id
          messageData.sessionId,
          messageData.role,
          messageData.content,
          messageData.thinking_content,
          messageData.provider,
          messageData.model,
          expect.stringContaining('"total_tokens":10'), // tokens_used JSON
          expect.any(String), // timestamp
          0, // message_order
          expect.any(String)  // created_at
        ])
      );
    });

    it('should get session messages in correct order', async () => {
      const mockMessages = [
        {
          id: 'msg-1',
          session_id: 'test-session-id',
          role: 'user',
          content: 'First message',
          message_order: 0,
          timestamp: '2024-01-01T00:30:00.000Z'
        },
        {
          id: 'msg-2',
          session_id: 'test-session-id',
          role: 'assistant',
          content: 'Second message',
          message_order: 1,
          timestamp: '2024-01-01T00:31:00.000Z'
        }
      ];

      mockElectronAPI.fetchMany.mockResolvedValue({ success: true, result: mockMessages });

      const messages = await sessionService.getSessionMessages('test-session-id');

      expect(messages).toHaveLength(2);
      expect(messages[0].id).toBe('msg-1');
      expect(messages[1].id).toBe('msg-2');
      expect(mockElectronAPI.fetchMany).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY message_order ASC'),
        ['test-session-id']
      );
    });
  });

  describe('Session Search', () => {
    beforeEach(async () => {
      mockElectronAPI.executeQuery.mockResolvedValue({ success: true });
      await sessionService.initialize();
    });

    it('should search sessions by title', async () => {
      const mockSearchResults = [
        {
          id: 'session-1',
          title: 'Python Basics',
          description: 'Learning Python fundamentals',
          metadata: JSON.stringify({ tags: ['python', 'programming'] }),
          message_count: 5
        }
      ];

      mockElectronAPI.fetchMany
        .mockResolvedValueOnce({ success: true, result: mockSearchResults })
        .mockResolvedValueOnce({ success: true, result: [{ total: 1 }] });

      const result = await sessionService.searchSessions({
        query: 'Python',
        limit: 10
      });

      expect(result.sessions).toHaveLength(1);
      expect(result.sessions[0].title).toBe('Python Basics');
      expect(result.total).toBe(1);
      expect(result.has_more).toBe(false);
    });

    it('should filter sessions by tags', async () => {
      mockElectronAPI.fetchMany
        .mockResolvedValueOnce({ success: true, result: [] })
        .mockResolvedValueOnce({ success: true, result: [{ total: 0 }] });

      const result = await sessionService.searchSessions({
        tags: ['javascript'],
        limit: 5
      });

      expect(mockElectronAPI.fetchMany).toHaveBeenCalledWith(
        expect.stringContaining('s.metadata LIKE ?'),
        expect.arrayContaining(['%javascript%', 5])
      );
    });

    it('should filter archived sessions', async () => {
      mockElectronAPI.fetchMany
        .mockResolvedValueOnce({ success: true, result: [] })
        .mockResolvedValueOnce({ success: true, result: [{ total: 0 }] });

      await sessionService.searchSessions({
        archived: false,
        limit: 10
      });

      expect(mockElectronAPI.fetchMany).toHaveBeenCalledWith(
        expect.stringContaining('s.metadata LIKE ?'),
        expect.arrayContaining(['%"archived":false%', 10])
      );
    });
  });

  describe('Session Export', () => {
    beforeEach(async () => {
      mockElectronAPI.executeQuery.mockResolvedValue({ success: true });
      await sessionService.initialize();
    });

    it('should export session as JSON', async () => {
      const mockSession = {
        id: 'test-session',
        title: 'Test Session',
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-01'),
        messages: [
          {
            id: 'msg-1',
            role: 'user' as const,
            content: 'Hello',
            timestamp: new Date('2024-01-01')
          }
        ],
        metadata: {
          title: 'Test Session',
          tags: ['test'],
          archived: false,
          pinned: false
        },
        context: {
          current_provider: 'openai',
          current_model: 'gpt-3.5-turbo',
          temperature: 0.7,
          max_tokens: 4096,
          enable_thinking: true,
          conversation_style: 'educational' as const,
          language: 'en',
          user_preferences: {
            learning_style: 'reading' as const,
            detail_level: 'detailed' as const,
            example_preference: 'all' as const,
            response_length: 'medium' as const,
            technical_level: 'intermediate' as const
          }
        },
        checkpoints: [],
        statistics: {
          total_messages: 1,
          user_messages: 1,
          assistant_messages: 0,
          total_tokens_used: 0,
          total_thinking_tokens: 0,
          session_duration: 0,
          average_response_time: 0,
          concepts_learned: 0,
          checkpoints_created: 0,
          productivity_score: 0,
          engagement_score: 0
        }
      };

      mockElectronAPI.fetchMany
        .mockResolvedValueOnce({ success: true, result: [{ ...mockSession, metadata: JSON.stringify(mockSession.metadata) }] })
        .mockResolvedValueOnce({ success: true, result: mockSession.messages });

      const exportData = await sessionService.exportSession('test-session', {
        format: 'json',
        include_metadata: true,
        include_thinking: true,
        include_statistics: true
      });

      const parsed = JSON.parse(exportData);
      expect(parsed.id).toBe('test-session');
      expect(parsed.title).toBe('Test Session');
      expect(parsed.messages).toHaveLength(1);
    });

    it('should export session as Markdown', async () => {
      const mockSession = {
        id: 'test-session',
        title: 'Test Session',
        description: 'Test Description',
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-01'),
        messages: [
          {
            id: 'msg-1',
            role: 'user' as const,
            content: 'Hello, how are you?',
            timestamp: new Date('2024-01-01')
          },
          {
            id: 'msg-2',
            role: 'assistant' as const,
            content: 'I\'m doing well, thank you!',
            timestamp: new Date('2024-01-01'),
            thinking_content: 'User is asking how I am, I should respond politely'
          }
        ],
        metadata: {
          title: 'Test Session',
          description: 'Test Description',
          tags: ['test'],
          archived: false,
          pinned: false
        },
        context: {
          current_provider: 'openai',
          current_model: 'gpt-3.5-turbo',
          temperature: 0.7,
          max_tokens: 4096,
          enable_thinking: true,
          conversation_style: 'educational' as const,
          language: 'en',
          user_preferences: {
            learning_style: 'reading' as const,
            detail_level: 'detailed' as const,
            example_preference: 'all' as const,
            response_length: 'medium' as const,
            technical_level: 'intermediate' as const
          }
        },
        checkpoints: [],
        statistics: {
          total_messages: 2,
          user_messages: 1,
          assistant_messages: 1,
          total_tokens_used: 0,
          total_thinking_tokens: 0,
          session_duration: 0,
          average_response_time: 0,
          concepts_learned: 0,
          checkpoints_created: 0,
          productivity_score: 0,
          engagement_score: 0
        }
      };

      mockElectronAPI.fetchMany
        .mockResolvedValueOnce({ success: true, result: [{ ...mockSession, metadata: JSON.stringify(mockSession.metadata) }] })
        .mockResolvedValueOnce({ success: true, result: mockSession.messages });

      const exportData = await sessionService.exportSession('test-session', {
        format: 'markdown',
        include_metadata: true,
        include_thinking: true,
        include_statistics: true
      });

      expect(exportData).toContain('# Test Session');
      expect(exportData).toContain('**Description:** Test Description');
      expect(exportData).toContain('## You');
      expect(exportData).toContain('Hello, how are you?');
      expect(exportData).toContain('## Assistant');
      expect(exportData).toContain('I\'m doing well, thank you!');
      expect(exportData).toContain('### Thinking Process');
      expect(exportData).toContain('User is asking how I am');
    });

    it('should export session as plain text', async () => {
      const mockSession = {
        id: 'test-session',
        title: 'Test Session',
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-01'),
        messages: [
          {
            id: 'msg-1',
            role: 'user' as const,
            content: 'Simple question',
            timestamp: new Date('2024-01-01')
          },
          {
            id: 'msg-2',
            role: 'assistant' as const,
            content: 'Simple answer',
            timestamp: new Date('2024-01-01')
          }
        ],
        metadata: {
          title: 'Test Session',
          tags: ['test'],
          archived: false,
          pinned: false
        },
        context: {
          current_provider: 'openai',
          current_model: 'gpt-3.5-turbo',
          temperature: 0.7,
          max_tokens: 4096,
          enable_thinking: true,
          conversation_style: 'educational' as const,
          language: 'en',
          user_preferences: {
            learning_style: 'reading' as const,
            detail_level: 'detailed' as const,
            example_preference: 'all' as const,
            response_length: 'medium' as const,
            technical_level: 'intermediate' as const
          }
        },
        checkpoints: [],
        statistics: {
          total_messages: 2,
          user_messages: 1,
          assistant_messages: 1,
          total_tokens_used: 0,
          total_thinking_tokens: 0,
          session_duration: 0,
          average_response_time: 0,
          concepts_learned: 0,
          checkpoints_created: 0,
          productivity_score: 0,
          engagement_score: 0
        }
      };

      mockElectronAPI.fetchMany
        .mockResolvedValueOnce({ success: true, result: [{ ...mockSession, metadata: JSON.stringify(mockSession.metadata) }] })
        .mockResolvedValueOnce({ success: true, result: mockSession.messages });

      const exportData = await sessionService.exportSession('test-session', {
        format: 'txt',
        include_metadata: true,
        include_thinking: false,
        include_statistics: true
      });

      expect(exportData).toContain('Test Session');
      expect(exportData).toContain('[USER]');
      expect(exportData).toContain('Simple question');
      expect(exportData).toContain('[ASSISTANT]');
      expect(exportData).toContain('Simple answer');
      expect(exportData).not.toContain('Thinking Process');
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      await sessionService.initialize();
    });

    it('should handle database errors gracefully', async () => {
      mockElectronAPI.executeQuery.mockRejectedValue(new Error('Database connection lost'));

      await expect(sessionService.createSession({
        title: 'Test Session'
      })).rejects.toThrow('Failed to create session');
    });

    it('should handle malformed JSON in metadata', async () => {
      mockElectronAPI.fetchMany.mockResolvedValue({
        success: true,
        result: [{
          id: 'test-session',
          title: 'Test Session',
          metadata: 'invalid json string',
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T01:00:00.000Z'
        }]
      });

      const session = await sessionService.getSessionById('test-session');
      expect(session.metadata).toEqual({});
    });
  });
});