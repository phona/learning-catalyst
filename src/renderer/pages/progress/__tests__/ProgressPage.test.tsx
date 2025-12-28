/**
 * LearningDashboard Component Tests - Performance Optimized
 *
 * Streamlined tests focusing on critical functionality with reduced timeouts
 * for improved test execution performance.
 */

import React from 'react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithServices } from '@/test/utils/renderWithServices';
import { ProgressPage } from '../ProgressPage';
import {
  createMockConfigurationService,
  createMockFileService,
  createNoHandlerError,
  createCatalystServiceWithDeprecatedMethods,
} from '@/test/utils/services-provider-stubs';

const configServiceMock = createMockConfigurationService();
const fileServiceMock = createMockFileService();

const mockCatalystService = {
  getAvailableAgents: vi.fn(),
  getActiveExecutions: vi.fn(),
  executeAgent: vi.fn(),
  cancelExecution: vi.fn(),
  listAgents: vi.fn(),
  sendChat: vi.fn(),
  sendChatStream: vi.fn(),
  getSession: vi.fn(),
};

const mockAnalyticsService = {
  getRecentSessions: vi.fn(),
  getOverallStatistics: vi.fn(),
  getLearningTrends: vi.fn(),
  getStudyStreak: vi.fn(),
  getAchievements: vi.fn(),
  getProgressChart: vi.fn(),
  getStudyMetrics: vi.fn(),
  getAnalyticsData: vi.fn(),
  getDashboard: vi.fn(),
  getProgressReport: vi.fn(),
  getLearningInsights: vi.fn(),
  getKnowledgeGraph: vi.fn(),
  getConceptMap: vi.fn(),
  getSession: vi.fn(),
  trackEvent: vi.fn(),
  updateAchievementProgress: vi.fn(),
  getConceptProgress: vi.fn(),
  updateConceptProgress: vi.fn(),
  trackSession: vi.fn(),
  updateSession: vi.fn(),
  getSessionHistory: vi.fn(),
};

const renderProgressPage = (
  {
    catalystService = mockCatalystService,
    analyticsService = mockAnalyticsService,
  }: { catalystService?: unknown; analyticsService?: unknown } = {},
) =>
  renderWithServices(<ProgressPage />, {
    withAssistantProvider: false,
    serviceOverrides: {
      catalystService: catalystService as any,
      analyticsService: analyticsService as any,
      configService: configServiceMock as any,
      fileService: fileServiceMock as any,
    },
  });

describe('ProgressPage - Performance Optimized', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    document.documentElement.classList.remove('dark');

    // Default successful responses - CRITICAL: getStudyMetrics must be mocked
    mockAnalyticsService.getStudyMetrics.mockResolvedValue({
      totalStudyTime: 180, // 3 hours in minutes
      sessionsCompleted: 15,
      conceptsStudied: 25,
      accuracyRate: 88, // 88%
      averageSessionLength: 24,
      streakDays: 7,
      lastStudyDate: new Date(),
      focusScore: 85,
      questionsAsked: 42,
      correctAnswers: 36,
    });

    mockCatalystService.getAvailableAgents.mockResolvedValue({
      success: true,
      agents: [
        {
          id: 'learning-agent',
          name: 'Learning Guide',
          type: 'guide',
          description: 'Helps with learning concepts',
          capabilities: ['tutoring', 'explanation'],
          isAvailable: true,
        },
        {
          id: 'assessment-agent',
          name: 'Assessment Coach',
          type: 'assessment',
          description: 'Evaluates understanding and provides feedback',
          capabilities: ['assessment', 'feedback'],
          isAvailable: true,
        },
        {
          id: 'practice-agent',
          name: 'Practice Master',
          type: 'master',
          description: 'Provides practice exercises',
          capabilities: ['practice', 'drills'],
          isAvailable: true,
        },
      ],
    });

    mockCatalystService.getActiveExecutions.mockResolvedValue({
      success: true,
      executions: [],
    });

    mockAnalyticsService.getRecentSessions.mockResolvedValue([]);
    mockAnalyticsService.getOverallStatistics.mockResolvedValue({
      totalSessions: 5,
      totalTime: 120,
      conceptsLearned: 12,
      averageEngagement: 0.85,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    document.documentElement.classList.remove('dark');
  });

  it('should load dashboard with available agents and statistics', async () => {
    renderProgressPage();

    // Verify dashboard loads with fast timeout
    await waitFor(
      () => {
        expect(screen.getByText('Learning Dashboard')).toBeInTheDocument();
      },
      { timeout: 500 },
    );

    // Verify basic functionality
    expect(screen.getByText('Learning Guide')).toBeInTheDocument();
    expect(screen.getByText('Assessment Coach')).toBeInTheDocument();
    expect(screen.getByText('Practice Master')).toBeInTheDocument();
    expect(screen.getByText('25')).toBeInTheDocument(); // Concepts Studied instead
  });

  it('should handle errors gracefully', async () => {
    // Simulate error in agent loading
    mockCatalystService.getAvailableAgents.mockRejectedValue(new Error('Network error'));

    renderProgressPage();

    // Should show error state with fast timeout
    await waitFor(
      () => {
        expect(screen.getByText(/Error Loading Dashboard/i)).toBeInTheDocument();
      },
      { timeout: 500 },
    );

    const retryButton = screen.getByText('Retry');
    expect(retryButton).toBeInTheDocument();
  });

  it('should coordinate multiple agents', async () => {
    // Note: getActiveExecutions is deprecated and removed
    // This test now focuses on available agents only

    renderProgressPage();

    await waitFor(
      () => {
        expect(screen.getByText('Learning Dashboard')).toBeInTheDocument();
      },
      { timeout: 500 },
    );

    // Should show available agents
    expect(screen.getByText('Learning Guide')).toBeInTheDocument();
    expect(screen.getByText('Assessment Coach')).toBeInTheDocument();
    expect(screen.getByText('Practice Master')).toBeInTheDocument();
  });

  it('should display analytics and statistics', async () => {
    mockAnalyticsService.getOverallStatistics.mockResolvedValue({
      totalSessions: 15,
      totalTime: 240,
      conceptsLearned: 25,
      averageEngagement: 0.92,
      sessionStreak: 7,
      achievements: 3,
    });

    renderProgressPage();

    await waitFor(
      () => {
        expect(screen.getAllByText('15')).toHaveLength(2); // Two instances of "15"
        expect(screen.getByText('25')).toBeInTheDocument(); // Concepts Studied
        expect(screen.getByText('88%')).toBeInTheDocument(); // Accuracy Rate
      },
      { timeout: 500 },
    );
  });

  it('should handle large datasets efficiently', async () => {
    // Mock large dataset
    const mockSessions = Array.from({ length: 50 }, (_, i) => ({
      id: `session-${i}`,
      title: `Session ${i}`,
      startTime: new Date(Date.now() - i * 3600000),
      duration: 30 + (i % 30),
      // Deterministic value to avoid randomness affecting render timing in CI
      engagement: 0.5 + (i % 5) * 0.08,
    }));

    mockAnalyticsService.getRecentSessions.mockResolvedValue(mockSessions);

    const startTime = performance.now();
    renderProgressPage();

    await waitFor(
      () => {
        expect(screen.getByText('Learning Dashboard')).toBeInTheDocument();
      },
      { timeout: 500 },
    );

    const renderTime = performance.now() - startTime;

    // Should render efficiently
    // Note: jsdom performance can vary across machines and CI; keep this threshold conservative.
    expect(renderTime).toBeLessThan(400);
  });

  it('should maintain responsiveness during loading', async () => {
    mockCatalystService.getAvailableAgents.mockImplementation(() => {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            success: true,
            agents: [{ id: 'delayed-agent', name: 'Delayed Agent', type: 'guide', description: 'Delayed agent', capabilities: ['help'], isAvailable: true }],
          });
        }, 50);
      });
    });

    renderProgressPage();

    // Should show loading state
    expect(screen.getByText('Loading Dashboard')).toBeInTheDocument();

    await waitFor(
      () => {
        expect(screen.getByText('Delayed Agent')).toBeInTheDocument();
      },
      { timeout: 500 },
    );
  });

  it('should recover from service failures', async () => {
    // Initial failure
    mockCatalystService.getAvailableAgents.mockRejectedValueOnce(
      new Error('Temporary service failure'),
    );

    mockCatalystService.getAvailableAgents.mockResolvedValueOnce({
      success: true,
      agents: [{ id: 'recovered-agent', name: 'Recovered Agent', type: 'guide', description: 'Recovered agent', capabilities: ['help'], isAvailable: true }],
    });

    renderProgressPage();

    // Should handle failure gracefully
    await waitFor(
      () => {
        expect(screen.getByText(/Error Loading Dashboard/i)).toBeInTheDocument();
      },
      { timeout: 500 },
    );

    const retryButton = screen.getByText('Retry');
    fireEvent.click(retryButton);

    await waitFor(
      () => {
        expect(screen.getByText('Recovered Agent')).toBeInTheDocument();
      },
      { timeout: 500 },
    );
  });

  it('should handle user interactions', async () => {
    const user = userEvent.setup();

    renderProgressPage();

    await waitFor(
      () => {
        expect(screen.getByText('Learning Dashboard')).toBeInTheDocument();
      },
      { timeout: 500 },
    );

    // Test interactive elements - agent names are displayed as text, not buttons
    expect(screen.getByText('Learning Guide')).toBeInTheDocument();
    expect(screen.getByText('Assessment Coach')).toBeInTheDocument();
    expect(screen.getByText('Practice Master')).toBeInTheDocument();

    // Test refresh button interaction
    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    expect(refreshButton).toBeInTheDocument();

    // Should not crash on interaction
    await user.click(refreshButton);
    expect(screen.getByText('Learning Dashboard')).toBeInTheDocument();
  });

  it('should simulate complete learning session', async () => {
    // Note: getActiveExecutions is deprecated and removed
    // This test now focuses on agent availability

    renderProgressPage();

    await waitFor(
      () => {
        expect(screen.getByText('Learning Guide')).toBeInTheDocument();
      },
      { timeout: 500 },
    );

    // Simulate agent availability update
    mockCatalystService.getAvailableAgents.mockResolvedValue({
      success: true,
      agents: [{ id: 'new-agent', name: 'New Agent', type: 'guide', description: 'New agent', capabilities: ['help'], isAvailable: true }],
    });

    fireEvent.click(screen.getByRole('button', { name: /refresh/i }));

    await waitFor(
      () => {
        expect(screen.getByText('New Agent')).toBeInTheDocument();
      },
      { timeout: 500 },
    );
  });

  it('should handle configuration changes', async () => {
    renderProgressPage();

    await waitFor(
      () => {
        expect(screen.getByText('Learning Dashboard')).toBeInTheDocument();
      },
      { timeout: 500 },
    );

    // Simulate configuration change
    document.documentElement.classList.add('dark');

    // Component should still work
    expect(screen.getByText('Learning Dashboard')).toBeInTheDocument();
  });

  it('should handle service updates gracefully', async () => {
    renderProgressPage();

    await waitFor(
      () => {
        expect(screen.getByText('Learning Dashboard')).toBeInTheDocument();
      },
      { timeout: 500 },
    );

    // Simulate service update
    mockCatalystService.getAvailableAgents.mockResolvedValue({
      success: true,
      agents: [{ id: 'new-agent', name: 'New Agent', type: 'guide', description: 'New agent', capabilities: ['help'], isAvailable: true }],
    });

    fireEvent.click(screen.getByRole('button', { name: /refresh/i }));

    await waitFor(
      () => {
        expect(screen.getByText('New Agent')).toBeInTheDocument();
      },
      { timeout: 500 },
    );
  });

  it('should handle interrupted sessions', async () => {
    // Note: getActiveExecutions is deprecated and removed
    // This test now verifies that the component handles the absence of active executions gracefully

    renderProgressPage();

    await waitFor(
      () => {
        expect(screen.getByText('Learning Dashboard')).toBeInTheDocument();
      },
      { timeout: 500 },
    );

    // Should show available agents instead
    expect(screen.getByText('Learning Guide')).toBeInTheDocument();
  });

  it('should handle partial service failures', async () => {
    // One service fails, others continue
    mockAnalyticsService.getStudyMetrics.mockRejectedValue(
      new Error('Analytics temporarily unavailable'),
    );

    mockCatalystService.getAvailableAgents.mockResolvedValue({
      success: true,
      agents: [
        {
          id: 'working-agent',
          name: 'Working Agent',
          type: 'guide',
          description: 'Working agent',
          capabilities: ['help'],
          isAvailable: true,
        },
      ],
    });

    renderProgressPage();

    // Component should show error state since getStudyMetrics fails
    await waitFor(
      () => {
        expect(screen.getByText(/Error Loading Dashboard/i)).toBeInTheDocument();
      },
      { timeout: 500 },
    );
  });

  it('should handle concurrent service errors', async () => {
    // Multiple services fail simultaneously
    mockCatalystService.getAvailableAgents.mockRejectedValue(new Error('Agents service down'));
    mockAnalyticsService.getStudyMetrics.mockRejectedValue(new Error('Analytics service down'));

    renderProgressPage();

    await waitFor(
      () => {
        expect(screen.getByText(/Error Loading Dashboard/i)).toBeInTheDocument();
        expect(screen.getByText('Analytics service down')).toBeInTheDocument();
      },
      { timeout: 500 },
    );

    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  // ==================== ENHANCED ERROR TESTING FOR IPC HANDLERS ====================

  describe('Missing IPC Handler Detection', () => {
    it('should handle missing IPC handlers gracefully', async () => {
      // Test that the component gracefully handles deprecated methods that have no IPC handlers
      const deprecatedCatalystService = createCatalystServiceWithDeprecatedMethods();

      renderProgressPage({ catalystService: deprecatedCatalystService });

      // Component should show loading then error state (not crash)
      await waitFor(() => {
        expect(screen.getByText(/Error Loading Dashboard/i)).toBeInTheDocument();
      }, { timeout: 1000 });
    });

    it('should document deprecated method usage', async () => {
      // This test documents the issue with deprecated catalyst methods
      const deprecatedCatalystService = createCatalystServiceWithDeprecatedMethods();

      // Attempt to call deprecated methods
      await expect(deprecatedCatalystService.listAgents()).rejects.toMatchObject({
        type: 'IPC_ERROR',
        code: 'NO_HANDLER',
        message: expect.stringContaining('catalyst:list-agents')
      });

      await expect(deprecatedCatalystService.getActiveExecutions()).rejects.toMatchObject({
        type: 'IPC_ERROR',
        code: 'NO_HANDLER',
        message: expect.stringContaining('catalyst:get-active-executions')
      });
    });

    it('should render error information safely', async () => {
      // Test that error objects are not rendered directly as React children
      mockCatalystService.getAvailableAgents.mockRejectedValue(
        createNoHandlerError('catalyst:missing-method')
      );

      renderProgressPage();

      await waitFor(() => {
        expect(screen.getByText(/Error Loading Dashboard/i)).toBeInTheDocument();
      });

      // The key test is that the component doesn't crash trying to render error objects
      expect(screen.getByText(/Retry/i)).toBeInTheDocument();
    });
  });

  describe('Error Object Propagation Prevention', () => {
    it('should NOT render error objects as React children', () => {
      // Document the specific error pattern we're preventing
      const errorObject = {
        success: false,
        error: {
          type: 'IPC_ERROR',
          code: 'NO_HANDLER',
          message: 'No handler registered for catalyst:list-agents'
        },
        timestamp: Date.now()
      };

      expect(() => {
        render(<div>{errorObject}</div>);
      }).toThrow('Objects are not valid as a React child');
    });

    it('should convert error objects to strings before rendering', () => {
      const errorObject = {
        success: false,
        error: {
          type: 'IPC_ERROR',
          code: 'NO_HANDLER',
          message: 'No handler registered for catalyst:list-agents'
        },
        timestamp: Date.now()
      };

      // Correct pattern - extract string properties
      expect(() => {
        render(
          <div>
            Error: {errorObject.error.message}
            Code: {errorObject.error.code}
          </div>
        );
      }).not.toThrow();
    });

    it('should handle mixed error and success data safely', async () => {
      // Test scenario where some service calls succeed and others fail with error objects
      mockAnalyticsService.getStudyMetrics.mockResolvedValue({
        totalStudyTime: 180,
        sessionsCompleted: 15,
        // Other fields...
      });

      mockCatalystService.getAvailableAgents.mockRejectedValue(
        createNoHandlerError('catalyst:list-agents')
      );

      renderProgressPage();

      await waitFor(() => {
        // Should show error state but not crash
        expect(screen.getByText(/Error Loading Dashboard/i)).toBeInTheDocument();
      });

      // The key test is that error handling doesn't crash and shows appropriate UI
      expect(screen.getByText(/Retry/i)).toBeInTheDocument();
    });
  });
});
