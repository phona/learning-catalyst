/**
 * End-to-End User Workflow Tests
 *
 * Tests for complete user journeys through the Learning Catalyst application,
 * from concept creation to mastery tracking and analytics.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

// Mock the complete application stack
const mockElectronAPI = {
  invoke: vi.fn(),
  // Database operations
  dbSetPath: vi.fn(),
  dbExecuteScript: vi.fn(),
  dbExecuteQuery: vi.fn(),
  dbFetchOne: vi.fn(),
  dbFetchAll: vi.fn(),
  // Vector database operations
  vectorAddDocument: vi.fn(),
  vectorSearch: vi.fn(),
  vectorDeleteDocument: vi.fn(),
  vectorGetDocument: vi.fn(),
  vectorListCollections: vi.fn(),
  vectorCreateCollection: vi.fn(),
  vectorDeleteCollection: vi.fn(),
  // AI operations
  aiSendMessage: vi.fn(),
  aiStreamResponse: vi.fn(),
  // Configuration
  configGet: vi.fn(),
  configSet: vi.fn(),
};

// Set up comprehensive mocks
beforeEach(() => {
  (window as any).electronAPI = mockElectronAPI;
  vi.clearAllMocks();

  // Setup default successful responses
  mockElectronAPI.invoke.mockResolvedValue('/mock/user/data');
  mockElectronAPI.dbSetPath.mockResolvedValue({ success: true });
  mockElectronAPI.dbExecuteScript.mockResolvedValue({ success: true });
  mockElectronAPI.dbExecuteQuery.mockResolvedValue({ success: true });
  mockElectronAPI.dbFetchOne.mockResolvedValue({ success: true, result: null });
  mockElectronAPI.dbFetchAll.mockResolvedValue({ success: true, result: [] });
  mockElectronAPI.vectorAddDocument.mockResolvedValue({ success: true });
  mockElectronAPI.vectorSearch.mockResolvedValue({ success: true, results: [] });
  mockElectronAPI.aiSendMessage.mockResolvedValue({
    success: true,
    result: { content: 'AI response', tokens: 50 }
  });
  mockElectronAPI.configGet.mockResolvedValue({ success: true, result: {} });
  mockElectronAPI.configSet.mockResolvedValue({ success: true });
});

describe('End-to-End User Workflows', () => {
  describe('New User Onboarding', () => {
    test('should guide new user through initial setup', async () => {
      // Mock fresh installation state
      mockElectronAPI.dbFetchOne.mockResolvedValue({ success: true, result: null });
      mockElectronAPI.dbFetchAll.mockResolvedValue({ success: true, result: [] });

      // Import and render the main application
      const { App } = await import('@/renderer/App');
      render(<App />);

      // Should show welcome screen
      expect(screen.getByText(/Welcome to Learning Catalyst/)).toBeInTheDocument();

      // Step 1: Configure AI provider
      const aiProviderSelect = screen.getByLabelText(/AI Provider/);
      await userEvent.selectOptions(aiProviderSelect, 'openai');

      const apiKeyInput = screen.getByLabelText(/API Key/);
      await userEvent.type(apiKeyInput, 'test-api-key');

      const continueButton = screen.getByRole('button', { name: /Continue/ });
      await userEvent.click(continueButton);

      // Should save configuration
      await waitFor(() => {
        expect(mockElectronAPI.configSet).toHaveBeenCalledWith(
          'ai.provider',
          'openai'
        );
        expect(mockElectronAPI.configSet).toHaveBeenCalledWith(
          'ai.openai.api_key',
          'test-api-key'
        );
      });

      // Step 2: Initialize learning profile
      expect(screen.getByText(/Set Your Learning Goals/)).toBeInTheDocument();

      const goalInput = screen.getByLabelText(/Primary Learning Goal/);
      await userEvent.type(goalInput, 'Master React development');

      const expertiseSelect = screen.getByLabelText(/Current Expertise Level/);
      await userEvent.selectOptions(expertiseSelect, 'intermediate');

      await userEvent.click(screen.getByRole('button', { name: /Complete Setup/ }));

      // Should save user profile
      await waitFor(() => {
        expect(mockElectronAPI.configSet).toHaveBeenCalledWith(
          'user.learning_goals',
          expect.arrayContaining(['Master React development'])
        );
        expect(mockElectronAPI.configSet).toHaveBeenCalledWith(
          'user.expertise_level',
          'intermediate'
        );
      });

      // Step 3: Show dashboard
      expect(screen.getByText(/Dashboard/)).toBeInTheDocument();
      expect(screen.getByText(/Start Your Learning Journey/)).toBeInTheDocument();
    });

    test('should handle first concept creation workflow', async () => {
      // Mock empty database state
      mockElectronAPI.dbFetchAll.mockResolvedValue({ success: true, result: [] });

      const { App } = await import('@/renderer/App');
      render(<App />);

      // Navigate to knowledge management
      const knowledgeNav = screen.getByRole('button', { name: /Knowledge/ });
      await userEvent.click(knowledgeNav);

      // Should show empty state
      expect(screen.getByText(/No concepts yet/)).toBeInTheDocument();

      // Start creating first concept
      const createButton = screen.getByRole('button', { name: /Create Concept/ });
      await userEvent.click(createButton);

      // Fill concept form
      const nameInput = screen.getByLabelText(/Concept Name/);
      await userEvent.type(nameInput, 'React Hooks');

      const descriptionInput = screen.getByLabelText(/Description/);
      await userEvent.type(descriptionInput, 'Understanding React Hooks for state management');

      const typeSelect = screen.getByLabelText(/Concept Type/);
      await userEvent.selectOptions(typeSelect, 'topic');

      const difficultySelect = screen.getByLabelText(/Difficulty Level/);
      await userEvent.selectOptions(difficultySelect, 'intermediate');

      const tagsInput = screen.getByLabelText(/Tags/);
      await userEvent.type(tagsInput, 'react, hooks, state-management');

      // Save concept
      await userEvent.click(screen.getByRole('button', { name: /Save Concept/ }));

      // Should save to database and vector database
      await waitFor(() => {
        expect(mockElectronAPI.dbExecuteQuery).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO concepts'),
          expect.arrayContaining([
            expect.stringMatching(/^concept_/),
            'React Hooks',
            expect.stringContaining('React Hooks'),
            'topic',
            3, // intermediate level
            0.0, // initial mastery
            expect.stringContaining('react'),
            expect.any(String),
            expect.any(String),
            expect.any(Number),
            expect.any(String)
          ])
        );

        expect(mockElectronAPI.vectorAddDocument).toHaveBeenCalledWith(
          'concepts',
          expect.objectContaining({
            content: expect.stringContaining('React Hooks'),
            metadata: expect.objectContaining({
              name: 'React Hooks',
              conceptType: 'topic',
              difficultyLevel: 3
            })
          })
        );
      });

      // Should show success message
      expect(screen.getByText(/Concept created successfully/)).toBeInTheDocument();

      // Should return to knowledge view with new concept
      await waitFor(() => {
        expect(screen.getByText('React Hooks')).toBeInTheDocument();
      });
    });
  });

  describe('Learning Session Workflow', () => {
    test('should handle complete learning session from start to completion', async () => {
      // Setup existing concepts
      const mockConcepts = [
        {
          id: 'concept_react_hooks',
          name: 'React Hooks',
          description: 'React hooks functionality',
          concept_type: 'topic',
          difficulty_level: 3,
          mastery_level: 0.3,
          tags: '["react","hooks"]',
          metadata: '{}'
        }
      ];

      mockElectronAPI.dbFetchAll.mockResolvedValue({ success: true, result: mockConcepts });

      // Mock AI responses
      mockElectronAPI.aiSendMessage.mockResolvedValue({
        success: true,
        result: {
          content: 'React Hooks are functions that let you use state and other React features in functional components. They allow you to use state without writing a class.',
          tokens: 35,
          model: 'gpt-3.5-turbo'
        }
      });

      const { App } = await import('@/renderer/App');
      render(<App />);

      // Start learning session
      const startLearningButton = screen.getByRole('button', { name: /Start Learning/ });
      await userEvent.click(startLearningButton);

      // Select concept to study
      await waitFor(() => {
        expect(screen.getByText('React Hooks')).toBeInTheDocument();
      });

      const conceptCard = screen.getByText('React Hooks');
      await userEvent.click(conceptCard);

      await userEvent.click(screen.getByRole('button', { name: /Study This Concept/ }));

      // Should create learning session
      await waitFor(() => {
        expect(mockElectronAPI.dbExecuteQuery).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO learning_sessions'),
          expect.arrayContaining([
            expect.stringMatching(/^session_/),
            expect.stringContaining('React Hooks'),
            expect.any(String),
            'study',
            3, // difficulty level
            expect.any(String)
          ])
        );
      });

      // Should show learning interface
      expect(screen.getByText(/Study Session: React Hooks/)).toBeInTheDocument();

      // User asks a question
      const questionInput = screen.getByPlaceholderText(/Ask a question about React Hooks/);
      await userEvent.type(questionInput, 'What are React Hooks and how do they work?');

      await userEvent.click(screen.getByRole('button', { name: /Send/ }));

      // Should call AI service
      await waitFor(() => {
        expect(mockElectronAPI.aiSendMessage).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'What are React Hooks and how do they work?',
            context: expect.objectContaining({
              concept: 'React Hooks',
              description: expect.stringContaining('React hooks functionality')
            })
          })
        );
      });

      // Should display AI response
      await waitFor(() => {
        expect(screen.getByText(/React Hooks are functions/)).toBeInTheDocument();
      });

      // User marks concept as understood
      await userEvent.click(screen.getByRole('button', { name: /Mark as Understood/ }));

      // Should update mastery level and session
      await waitFor(() => {
        expect(mockElectronAPI.dbExecuteQuery).toHaveBeenCalledWith(
          expect.stringContaining('UPDATE concepts SET'),
          expect.arrayContaining([0.6, expect.any(Number), 'concept_react_hooks']) // increased mastery
        );
      });

      // End session
      await userEvent.click(screen.getByRole('button', { name: /End Session/ }));

      // Should complete session tracking
      await waitFor(() => {
        expect(mockElectronAPI.dbExecuteQuery).toHaveBeenCalledWith(
          expect.stringContaining('UPDATE learning_sessions SET'),
          expect.arrayContaining([
            expect.any(Number), // end_time
            expect.any(Number), // duration
            expect.any(Number), // total_messages
            expect.any(String)  // session_id
          ])
        );
      });

      // Should show session summary
      expect(screen.getByText(/Session Complete/)).toBeInTheDocument();
      expect(screen.getByText(/Mastery improved/)).toBeInTheDocument();
    });

    test('should handle practice questions workflow', async () => {
      // Setup concept with practice questions
      const mockConcept = {
        id: 'concept_react_hooks',
        name: 'React Hooks',
        description: 'React hooks functionality',
        concept_type: 'topic',
        difficulty_level: 3,
        mastery_level: 0.5,
        tags: '["react","hooks"]',
        metadata: '{"practice_questions": [{"question": "What hook is used for state management?", "answer": "useState", "options": ["useEffect", "useState", "useContext", "useReducer"]}]}'
      };

      mockElectronAPI.dbFetchOne.mockResolvedValue({ success: true, result: mockConcept });

      const { App } = await import('@/renderer/App');
      render(<App />);

      // Navigate to practice
      const practiceButton = screen.getByRole('button', { name: /Practice/ });
      await userEvent.click(practiceButton);

      // Should show practice question
      await waitFor(() => {
        expect(screen.getByText('What hook is used for state management?')).toBeInTheDocument();
      });

      // User selects wrong answer
      const wrongOption = screen.getByText('useEffect');
      await userEvent.click(wrongOption);

      await userEvent.click(screen.getByRole('button', { name: /Submit Answer/ }));

      // Should show incorrect feedback
      expect(screen.getByText(/Incorrect/)).toBeInTheDocument();
      expect(screen.getByText(/The correct answer is useState/)).toBeInTheDocument();

      // User tries again with correct answer
      const correctOption = screen.getByText('useState');
      await userEvent.click(correctOption);

      await userEvent.click(screen.getByRole('button', { name: /Submit Answer/ }));

      // Should show correct feedback and update mastery
      await waitFor(() => {
        expect(screen.getByText(/Correct/)).toBeInTheDocument();
        expect(mockElectronAPI.dbExecuteQuery).toHaveBeenCalledWith(
          expect.stringContaining('UPDATE concepts SET'),
          expect.arrayContaining([0.6, expect.any(Number), 'concept_react_hooks'])
        );
      });

      // Move to next question or complete practice
      await userEvent.click(screen.getByRole('button', { name: /Next Question/ }));
    });
  });

  describe('Knowledge Discovery Workflow', () => {
    test('should handle semantic search and concept discovery', async () => {
      // Setup search results
      const mockSearchResults = [
        {
          id: 'concept_react_hooks',
          name: 'React Hooks',
          description: 'React hooks for state management',
          concept_type: 'topic',
          difficulty_level: 3,
          mastery_level: 0.0,
          tags: '["react","hooks"]',
          metadata: '{}'
        },
        {
          id: 'concept_vue_composition',
          name: 'Vue Composition API',
          description: 'Vue composition API for reactive programming',
          concept_type: 'topic',
          difficulty_level: 3,
          mastery_level: 0.0,
          tags: '["vue","composition"]',
          metadata: '{}'
        }
      ];

      // Mock vector search results
      mockElectronAPI.vectorSearch.mockResolvedValue({
        success: true,
        results: [
          { id: 'concept_react_hooks', score: 0.95 },
          { id: 'concept_vue_composition', score: 0.87 }
        ]
      });

      mockElectronAPI.dbFetchAll.mockResolvedValue({ success: true, result: mockSearchResults });

      const { App } = await import('@/renderer/App');
      render(<App />);

      // Navigate to discovery
      const discoveryNav = screen.getByRole('button', { name: /Discover/ });
      await userEvent.click(discoveryNav);

      // Should show search interface
      expect(screen.getByText(/Discover New Concepts/)).toBeInTheDocument();

      // User searches for React-related content
      const searchInput = screen.getByPlaceholderText(/Search for concepts/);
      await userEvent.type(searchInput, 'react hooks state management');

      await userEvent.click(screen.getByRole('button', { name: /Search/ }));

      // Should perform semantic search
      await waitFor(() => {
        expect(mockElectronAPI.vectorSearch).toHaveBeenCalledWith(
          'concepts',
          'react hooks state management',
          10
        );
      });

      // Should display search results with relevance scores
      await waitFor(() => {
        expect(screen.getByText('React Hooks')).toBeInTheDocument();
        expect(screen.getByText('95% match')).toBeInTheDocument();
        expect(screen.getByText('Vue Composition API')).toBeInTheDocument();
        expect(screen.getByText('87% match')).toBeInTheDocument();
      });

      // User clicks on React Hooks to learn more
      const reactHooksCard = screen.getByText('React Hooks');
      await userEvent.click(reactHooksCard);

      // Should show concept details
      await waitFor(() => {
        expect(screen.getByText(/React hooks for state management/)).toBeInTheDocument();
      });

      // Should show related concepts
      mockElectronAPI.dbFetchAll.mockResolvedValue({
        success: true,
        result: [
          {
            id: 'concept_javascript',
            name: 'JavaScript',
            description: 'JavaScript programming fundamentals',
            relationship_type: 'prerequisite',
            strength: 0.9
          }
        ]
      });

      await userEvent.click(screen.getByRole('button', { name: /View Related Concepts/ }));

      // Should display prerequisite relationships
      await waitFor(() => {
        expect(screen.getByText('JavaScript')).toBeInTheDocument();
        expect(screen.getByText(/Prerequisite/)).toBeInTheDocument();
        expect(screen.getByText('90% relevance')).toBeInTheDocument();
      });

      // User adds concept to learning plan
      await userEvent.click(screen.getByRole('button', { name: /Add to Learning Plan/ }));

      // Should add to user's learning queue
      await waitFor(() => {
        expect(mockElectronAPI.dbExecuteQuery).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO learning_queue'),
          expect.arrayContaining(['concept_react_hooks', expect.any(Number)])
        );
      });

      expect(screen.getByText(/Added to your learning plan/)).toBeInTheDocument();
    });

    test('should handle learning path generation', async () => {
      // Setup learning path data
      const mockPathData = [
        {
          id: 'concept_html',
          name: 'HTML Fundamentals',
          description: 'Basic HTML structure and elements',
          concept_type: 'topic',
          difficulty_level: 1,
          mastery_level: 1.0, // already mastered
          order: 1
        },
        {
          id: 'concept_css',
          name: 'CSS Styling',
          description: 'CSS styling and layout',
          concept_type: 'topic',
          difficulty_level: 2,
          mastery_level: 0.8, // in progress
          order: 2
        },
        {
          id: 'concept_javascript',
          name: 'JavaScript Programming',
          description: 'JavaScript fundamentals and programming concepts',
          concept_type: 'topic',
          difficulty_level: 3,
          mastery_level: 0.3, // just started
          order: 3
        },
        {
          id: 'concept_react',
          name: 'React Development',
          description: 'React library for building user interfaces',
          concept_type: 'topic',
          difficulty_level: 4,
          mastery_level: 0.0, // not started
          order: 4
        }
      ];

      mockElectronAPI.dbFetchAll.mockResolvedValue({ success: true, result: mockPathData });

      const { App } = await import('@/renderer/App');
      render(<App />);

      // Navigate to learning paths
      const pathsNav = screen.getByRole('button', { name: /Learning Paths/ });
      await userEvent.click(pathsNav);

      // Should show available learning paths
      await waitFor(() => {
        expect(screen.getByText(/Frontend Development Path/)).toBeInTheDocument();
        expect(screen.getByText(/4 concepts/)).toBeInTheDocument();
        expect(screen.getByText(/Estimated 8 hours/)).toBeInTheDocument();
      });

      // User starts the learning path
      await userEvent.click(screen.getByRole('button', { name: /Start Path/ }));

      // Should show path overview with progress
      await waitFor(() => {
        expect(screen.getByText('HTML Fundamentals')).toBeInTheDocument();
        expect(screen.getByText('✓ Completed')).toBeInTheDocument();

        expect(screen.getByText('CSS Styling')).toBeInTheDocument();
        expect(screen.getByText('80% Complete')).toBeInTheDocument();

        expect(screen.getByText('JavaScript Programming')).toBeInTheDocument();
        expect(screen.getByText('30% Complete')).toBeInTheDocument();

        expect(screen.getByText('React Development')).toBeInTheDocument();
        expect(screen.getByText('Not Started')).toBeInTheDocument();
      });

      // User focuses on next recommended concept
      await userEvent.click(screen.getByText('JavaScript Programming'));

      await userEvent.click(screen.getByRole('button', { name: /Study This Concept/ }));

      // Should start learning session for the path concept
      expect(screen.getByText(/Study Session: JavaScript Programming/)).toBeInTheDocument();
    });
  });

  describe('Analytics and Progress Tracking', () => {
    test('should display comprehensive learning analytics', async () => {
      // Setup analytics data
      const mockAnalytics = {
        totalSessions: 25,
        totalStudyTime: 1800, // 30 hours in minutes
        conceptsStudied: 15,
        averageMastery: 0.65,
        currentStreak: 7,
        longestStreak: 12,
        weeklyGoal: 5,
        recentSessions: [
          { date: '2024-01-15', duration: 45, conceptsStudied: 2, masteryGained: 0.15 },
          { date: '2024-01-14', duration: 30, conceptsStudied: 1, masteryGained: 0.10 },
          { date: '2024-01-13', duration: 60, conceptsStudied: 3, masteryGained: 0.20 }
        ]
      };

      mockElectronAPI.dbFetchAll
        .mockResolvedValueOnce({ success: true, result: [{ count: 25 }] }) // total sessions
        .mockResolvedValueOnce({ success: true, result: [{ total_minutes: 1800 }] }) // study time
        .mockResolvedValueOnce({ success: true, result: [{ count: 15 }] }) // concepts studied
        .mockResolvedValueOnce({ success: true, result: [{ avg_mastery: 0.65 }] }) // avg mastery
        .mockResolvedValueOnce({ success: true, result: [{ streak_days: 7, longest_streak: 12 }] }) // streaks
        .mockResolvedValueOnce({ success: true, result: mockAnalytics.recentSessions }); // recent sessions

      const { App } = await import('@/renderer/App');
      render(<App />);

      // Navigate to analytics
      const analyticsNav = screen.getByRole('button', { name: /Analytics/ });
      await userEvent.click(analyticsNav);

      // Should show comprehensive analytics dashboard
      await waitFor(() => {
        // Summary stats
        expect(screen.getByText('25 Sessions')).toBeInTheDocument();
        expect(screen.getByText('30 Hours')).toBeInTheDocument();
        expect(screen.getByText('15 Concepts')).toBeInTheDocument();
        expect(screen.getByText('65% Average Mastery')).toBeInTheDocument();

        // Streak information
        expect(screen.getByText('7 Day Streak')).toBeInTheDocument();
        expect(screen.getByText('Longest: 12 days')).toBeInTheDocument();

        // Recent activity
        expect(screen.getByText('Recent Learning Activity')).toBeInTheDocument();
        expect(screen.getByText('Jan 15, 2024')).toBeInTheDocument();
        expect(screen.getByText('45 minutes')).toBeInTheDocument();
        expect(screen.getByText('2 concepts')).toBeInTheDocument();
      });

      // Should show learning trends chart
      expect(screen.getByText(/Learning Trends/)).toBeInTheDocument();

      // Should show achievement badges
      expect(screen.getByText(/Achievements/)).toBeInTheDocument();
      expect(screen.getByText('Week Warrior')).toBeInTheDocument(); // 7 day streak
      expect(screen.getByText('Knowledge Seeker')).toBeInTheDocument(); // 25 sessions

      // User clicks on detailed session view
      await userEvent.click(screen.getByText('View All Sessions'));

      // Should show detailed session history
      await waitFor(() => {
        expect(screen.getByText(/Session History/)).toBeInTheDocument();
        expect(screen.getByText('Jan 15, 2024 - JavaScript Basics')).toBeInTheDocument();
        expect(screen.getByText('Jan 14, 2024 - React Components')).toBeInTheDocument();
      });

      // User exports learning data
      await userEvent.click(screen.getByRole('button', { name: /Export Data/ }));

      // Should trigger data export
      await waitFor(() => {
        expect(mockElectronAPI.invoke).toHaveBeenCalledWith('export-learning-data', {
          format: 'json',
          dateRange: expect.any(Object)
        });
      });
    });

    test('should provide personalized learning recommendations', async () => {
      // Setup recommendation data
      const mockRecommendations = [
        {
          id: 'concept_react_patterns',
          title: 'Advanced React Patterns',
          description: 'Learn advanced React patterns and best practices',
          type: 'concept',
          difficulty: 0.8,
          estimatedTime: 120,
          relevanceScore: 0.92,
          reason: 'Builds on your React knowledge'
        },
        {
          id: 'path_performance_optimization',
          title: 'Performance Optimization Path',
          description: 'Complete learning path for web performance optimization',
          type: 'path',
          difficulty: 0.7,
          estimatedTime: 480,
          relevanceScore: 0.88,
          reason: 'Related to your frontend development goals'
        }
      ];

      mockElectronAPI.dbFetchAll.mockResolvedValue({
        success: true,
        result: mockRecommendations
      });

      const { App } = await import('@/renderer/App');
      render(<App />);

      // Navigate to recommendations
      const recommendNav = screen.getByRole('button', { name: /For You/ });
      await userEvent.click(recommendNav);

      // Should show personalized recommendations
      await waitFor(() => {
        expect(screen.getByText(/Recommended for You/)).toBeInTheDocument();
        expect(screen.getByText('Advanced React Patterns')).toBeInTheDocument();
        expect(screen.getByText('Performance Optimization Path')).toBeInTheDocument();
        expect(screen.getByText('92% match')).toBeInTheDocument();
        expect(screen.getByText('Builds on your React knowledge')).toBeInTheDocument();
      });

      // User accepts recommendation
      await userEvent.click(screen.getByRole('button', { name: /Start Learning/ }));

      // Should add to learning plan and navigate to concept
      await waitFor(() => {
        expect(mockElectronAPI.dbExecuteQuery).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO learning_queue'),
          expect.arrayContaining(['concept_react_patterns', expect.any(Number)])
        );
      });

      expect(screen.getByText(/Study Session: Advanced React Patterns/)).toBeInTheDocument();
    });
  });

  describe('Error Recovery and Edge Cases', () => {
    test('should handle network connectivity issues gracefully', async () => {
      // Mock network failures
      mockElectronAPI.aiSendMessage.mockRejectedValue(new Error('Network timeout'));
      mockElectronAPI.dbExecuteQuery.mockRejectedValue(new Error('Database connection lost'));

      const { App } = await import('@/renderer/App');
      render(<App />);

      // User tries to start learning session during network issues
      const startLearningButton = screen.getByRole('button', { name: /Start Learning/ });
      await userEvent.click(startLearningButton);

      // Should show offline mode indicator
      await waitFor(() => {
        expect(screen.getByText(/Offline Mode/)).toBeInTheDocument();
        expect(screen.getByText(/Limited functionality available/)).toBeInTheDocument();
      });

      // Should still allow access to downloaded content
      expect(screen.getByText('Continue Studying Offline')).toBeInTheDocument();

      // User tries to access online-only features
      await userEvent.click(screen.getByRole('button', { name: /Ask AI Tutor/ }));

      // Should show appropriate error message
      await waitFor(() => {
        expect(screen.getByText(/AI assistance unavailable/)).toBeInTheDocument();
        expect(screen.getByText(/Please check your internet connection/)).toBeInTheDocument();
      });

      // Should provide retry mechanism
      await userEvent.click(screen.getByRole('button', { name: /Retry Connection/ }));

      // Mock connection recovery
      mockElectronAPI.aiSendMessage.mockResolvedValue({
        success: true,
        result: { content: 'Connection restored!', tokens: 10 }
      });

      await waitFor(() => {
        expect(screen.getByText(/Connection restored/)).toBeInTheDocument();
        expect(screen.queryByText(/Offline Mode/)).not.toBeInTheDocument();
      });
    });

    test('should handle data corruption scenarios', async () => {
      // Mock corrupted data response
      mockElectronAPI.dbFetchAll.mockResolvedValue({
        success: true,
        result: [{ id: 'corrupted', name: null, invalid_field: 'broken' }]
      });

      const { App } = await import('@/renderer/App');
      render(<App />);

      // Should detect data issues
      await waitFor(() => {
        expect(screen.getByText(/Data Integrity Check/)).toBeInTheDocument();
        expect(screen.getByText(/Some learning data may be corrupted/)).toBeInTheDocument();
      });

      // Should offer repair options
      expect(screen.getByText('Attempt Automatic Repair')).toBeInTheDocument();
      expect(screen.getByText('Restore from Backup')).toBeInTheDocument();

      // User chooses automatic repair
      await userEvent.click(screen.getByRole('button', { name: /Attempt Automatic Repair/ }));

      // Should attempt data repair
      await waitFor(() => {
        expect(mockElectronAPI.invoke).toHaveBeenCalledWith('repair-database', {
          strategy: 'automatic',
          backup: true
        });
      });

      // Mock successful repair
      mockElectronAPI.invoke.mockResolvedValue({ success: true, repaired: 5 });

      await waitFor(() => {
        expect(screen.getByText(/Successfully repaired 5 issues/)).toBeInTheDocument();
      });

      // Should return to normal operation
      await userEvent.click(screen.getByRole('button', { name: /Continue/ }));

      expect(screen.queryByText(/Data Integrity Check/)).not.toBeInTheDocument();
    });
  });
});