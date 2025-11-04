/**
 * LearningDashboard Component Tests - Renderer Process
 *
 * Comprehensive test suite for the enhanced LearningDashboard component with new Catalyst API
 * integration, agent status indicators, and performance metrics.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { LearningDashboard } from '@/renderer/components/Dashboard/LearningDashboard';
import { SimpleAnalyticsModule } from '@/shared/modules/analytics/simple-analytics';
import { catalystService } from '@/renderer/services/CatalystService';

// Mock analytics module
vi.mock('@/modules/analytics/simple-analytics', () => ({
  SimpleAnalyticsModule: vi.fn().mockImplementation(() => ({
    start: vi.fn().mockResolvedValue(true),
    getStudyMetrics: vi.fn().mockResolvedValue({
      totalStudyTime: 120, // 2 hours
      sessionsCompleted: 15,
      conceptsStudied: 25,
      accuracyRate: 0.85,
      streakDays: 5,
      lastStudyDate: new Date('2025-01-01'),
      averageSessionLength: 45,
      focusScore: 92,
      questionsAsked: 120,
      correctAnswers: 102,
    }),
  })),
}));

// Mock Catalyst service
vi.mock('@/services/CatalystService', () => ({
  catalystService: {
    getAvailableAgents: vi.fn(),
    getActiveExecutions: vi.fn(),
  },
}));

// Mock useAppServices hook
vi.mock('@/hooks/useAppServices', () => ({
  useService: vi.fn(),
}));

describe('LearningDashboard', () => {
  const mockAnalyticsService = new SimpleAnalyticsModule();
  const mockUseService = vi.fn(() => mockAnalyticsService);

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset useService mock
    vi.doMock('@/hooks/useAppServices', () => ({
      useService: mockUseService,
    }));

    // Mock Catalyst service responses
    vi.mocked(catalystService.getAvailableAgents).mockResolvedValue([
      {
        id: 'learning-agent',
        name: 'Learning Agent',
        type: 'learning',
        description: 'Specialized in educational content',
        enabled: true,
        capabilities: ['teaching', 'explanation', 'assessment'],
        model_config: {
          provider: 'openai',
          model: 'gpt-4',
        },
      },
      {
        id: 'practice-agent',
        name: 'Practice Agent',
        type: 'practice',
        description: 'Generates exercises and practice problems',
        enabled: false,
        capabilities: ['exercise-generation', 'feedback'],
        model_config: {
          provider: 'openai',
          model: 'gpt-3.5-turbo',
        },
      },
    ]);

    vi.mocked(catalystService.getActiveExecutions).mockResolvedValue([
      {
        id: 'exec-1',
        agentId: 'learning-agent',
        status: 'processing',
        startTime: new Date().toISOString(),
        progress: 65,
      },
    ]);

    // Mock performance timers
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Loading State', () => {
    it('should show loading state initially', () => {
      mockUseService.mockReturnValue(null);

      render(<LearningDashboard />);

      expect(screen.getByText('Loading Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Setting up your learning dashboard with AI agents...')).toBeInTheDocument();
    });

    it('should show loading state when analytics service is available but metrics are not loaded', () => {
      mockUseService.mockReturnValue(mockAnalyticsService);

      render(<LearningDashboard />);

      expect(screen.getByText('Loading Dashboard')).toBeInTheDocument();
    });

    it('should hide loading state when data is loaded', async () => {
      mockUseService.mockReturnValue(mockAnalyticsService);

      render(<LearningDashboard />);

      await waitFor(() => {
        expect(screen.queryByText('Loading Dashboard')).not.toBeInTheDocument();
      });
    });
  });

  describe('Dashboard Header', () => {
    it('should display dashboard title and description', async () => {
      mockUseService.mockReturnValue(mockAnalyticsService);

      render(<LearningDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Learning Dashboard')).toBeInTheDocument();
        expect(screen.getByText('Track your learning progress and achievements')).toBeInTheDocument();
      });
    });
  });

  describe('Overview Stats', () => {
    it('should display learning metrics correctly', async () => {
      mockUseService.mockReturnValue(mockAnalyticsService);

      render(<LearningDashboard />);

      await waitFor(() => {
        expect(screen.getByText('2h 0m')).toBeInTheDocument(); // Total Study Time
        expect(screen.getByText('15')).toBeInTheDocument(); // Sessions Completed
        expect(screen.getByText('25')).toBeInTheDocument(); // Concepts Studied
        expect(screen.getByText('85%')).toBeInTheDocument(); // Accuracy Rate
      });
    });

    it('should display agent status metrics', async () => {
      mockUseService.mockReturnValue(mockAnalyticsService);

      render(<LearningDashboard />);

      await waitFor(() => {
        expect(screen.getByText('1/2')).toBeInTheDocument(); // Active agents (enabled/total)
        expect(screen.getByText('1 active')).toBeInTheDocument(); // Active executions
      });
    });

    it('should handle empty agent list gracefully', async () => {
      mockUseService.mockReturnValue(mockAnalyticsService);
      vi.mocked(catalystService.getAvailableAgents).mockResolvedValue([]);
      vi.mocked(catalystService.getActiveExecutions).mockResolvedValue([]);

      render(<LearningDashboard />);

      await waitFor(() => {
        expect(screen.getByText('0/0')).toBeInTheDocument(); // No agents
        expect(screen.getByText('0 active')).toBeInTheDocument(); // No active executions
      });
    });
  });

  describe('Agent Status Section', () => {
    it('should display available agents with their information', async () => {
      mockUseService.mockReturnValue(mockAnalyticsService);

      render(<LearningDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Available AI Agents')).toBeInTheDocument();
        expect(screen.getByText('Learning Agent')).toBeInTheDocument();
        expect(screen.getByText('Practice Agent')).toBeInTheDocument();
        expect(screen.getByText('learning • Specialized in educational content')).toBeInTheDocument();
        expect(screen.getByText('practice • Generates exercises and practice problems')).toBeInTheDocument();
      });
    });

    it('should show agent model configuration', async () => {
      mockUseService.mockReturnValue(mockAnalyticsService);

      render(<LearningDashboard />);

      await waitFor(() => {
        expect(screen.getByText('openai • gpt-4')).toBeInTheDocument();
        expect(screen.getByText('openai • gpt-3.5-turbo')).toBeInTheDocument();
      });
    });

    it('should display agent capabilities as tags', async () => {
      mockUseService.mockReturnValue(mockAnalyticsService);

      render(<LearningDashboard />);

      await waitFor(() => {
        expect(screen.getByText('teaching')).toBeInTheDocument();
        expect(screen.getByText('explanation')).toBeInTheDocument();
        expect(screen.getByText('assessment')).toBeInTheDocument();
        expect(screen.getByText('exercise-generation')).toBeInTheDocument();
        expect(screen.getByText('feedback')).toBeInTheDocument();
      });
    });

    it('should show capability overflow indicator', async () => {
      const agentWithManyCapabilities = {
        id: 'complex-agent',
        name: 'Complex Agent',
        type: 'complex',
        description: 'Agent with many capabilities',
        enabled: true,
        capabilities: ['cap1', 'cap2', 'cap3', 'cap4', 'cap5'],
        model_config: {
          provider: 'openai',
          model: 'gpt-4',
        },
      };

      vi.mocked(catalystService.getAvailableAgents).mockResolvedValue([agentWithManyCapabilities]);
      mockUseService.mockReturnValue(mockAnalyticsService);

      render(<LearningDashboard />);

      await waitFor(() => {
        expect(screen.getByText('cap1')).toBeInTheDocument();
        expect(screen.getByText('cap2')).toBeInTheDocument();
        expect(screen.getByText('+3')).toBeInTheDocument(); // 5 capabilities - 2 shown = 3 overflow
      });
    });

    it('should show no agents message when list is empty', async () => {
      vi.mocked(catalystService.getAvailableAgents).mockResolvedValue([]);
      mockUseService.mockReturnValue(mockAnalyticsService);

      render(<LearningDashboard />);

      await waitFor(() => {
        expect(screen.getByText('No agents available')).toBeInTheDocument();
      });
    });

    it('should display enabled/disabled status correctly', async () => {
      mockUseService.mockReturnValue(mockAnalyticsService);

      render(<LearningDashboard />);

      await waitFor(() => {
        const enabledIndicator = screen.getByText('Learning Agent').closest('div')?.querySelector('.bg-green-500');
        const disabledIndicator = screen.getByText('Practice Agent').closest('div')?.querySelector('.bg-gray-400');

        expect(enabledIndicator).toBeInTheDocument();
        expect(disabledIndicator).toBeInTheDocument();
      });
    });
  });

  describe('Active Executions Section', () => {
    it('should display active executions with status', async () => {
      mockUseService.mockReturnValue(mockAnalyticsService);

      render(<LearningDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Active Executions')).toBeInTheDocument();
        expect(screen.getByText('learning-agent')).toBeInTheDocument();
        expect(screen.getByText('65%')).toBeInTheDocument();
      });
    });

    it('should show execution progress', async () => {
      mockUseService.mockReturnValue(mockAnalyticsService);

      render(<LearningDashboard />);

      await waitFor(() => {
        expect(screen.getByText('65%')).toBeInTheDocument();
      });
    });

    it('should show no executions message when none are active', async () => {
      vi.mocked(catalystService.getActiveExecutions).mockResolvedValue([]);
      mockUseService.mockReturnValue(mockAnalyticsService);

      render(<LearningDashboard />);

      await waitFor(() => {
        expect(screen.getByText('No active executions')).toBeInTheDocument();
      });
    });

    it('should handle execution without agent ID gracefully', async () => {
      vi.mocked(catalystService.getActiveExecutions).mockResolvedValue([
        {
          id: 'exec-1',
          status: 'processing',
          startTime: new Date().toISOString(),
          progress: 30,
        },
      ]);
      mockUseService.mockReturnValue(mockAnalyticsService);

      render(<LearningDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Unknown Agent')).toBeInTheDocument();
        expect(screen.getByText('30%')).toBeInTheDocument();
      });
    });
  });

  describe('Progress Overview', () => {
    it('should display progress charts', async () => {
      mockUseService.mockReturnValue(mockAnalyticsService);

      render(<LearningDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Learning Progress')).toBeInTheDocument();
        expect(screen.getByText('Study Goal')).toBeInTheDocument();
        expect(screen.getByText('Session Goal')).toBeInTheDocument();
        expect(screen.getByText('Mastery')).toBeInTheDocument();
      });
    });
  });

  describe('Learning Insights', () => {
    it('should display detailed learning metrics', async () => {
      mockUseService.mockReturnValue(mockAnalyticsService);

      render(<LearningDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Learning Insights')).toBeInTheDocument();
        expect(screen.getByText('45 minutes')).toBeInTheDocument(); // Average session length
        expect(screen.getByText('92/100')).toBeInTheDocument(); // Focus score
        expect(screen.getByText('120')).toBeInTheDocument(); // Questions asked
        expect(screen.getByText('102')).toBeInTheDocument(); // Correct answers
      });
    });
  });

  describe('Data Refresh', () => {
    it('should refresh agent status periodically', async () => {
      mockUseService.mockReturnValue(mockAnalyticsService);

      render(<LearningDashboard />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Available AI Agents')).toBeInTheDocument();
      });

      // Initial calls
      expect(catalystService.getAvailableAgents).toHaveBeenCalledTimes(1);
      expect(catalystService.getActiveExecutions).toHaveBeenCalledTimes(1);

      // Fast-forward 10 seconds
      vi.advanceTimersByTime(10000);

      await waitFor(() => {
        expect(catalystService.getAvailableAgents).toHaveBeenCalledTimes(2);
        expect(catalystService.getActiveExecutions).toHaveBeenCalledTimes(2);
      });
    });

    it('should not refresh when component is unmounted', async () => {
      mockUseService.mockReturnValue(mockAnalyticsService);

      const { unmount } = render(<LearningDashboard />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Available AI Agents')).toBeInTheDocument();
      });

      unmount();

      // Fast-forward 10 seconds
      vi.advanceTimersByTime(10000);

      // Should not have been called again
      expect(catalystService.getAvailableAgents).toHaveBeenCalledTimes(1);
      expect(catalystService.getActiveExecutions).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle analytics service errors gracefully', async () => {
      const errorService = {
        start: vi.fn().mockRejectedValue(new Error('Analytics failed')),
        getStudyMetrics: vi.fn().mockRejectedValue(new Error('Metrics failed')),
      };

      mockUseService.mockReturnValue(errorService);

      render(<LearningDashboard />);

      // Should show loading state but not crash
      await waitFor(() => {
        expect(screen.getByText('Loading Dashboard')).toBeInTheDocument();
      });
    });

    it('should handle Catalyst service errors gracefully', async () => {
      vi.mocked(catalystService.getAvailableAgents).mockRejectedValue(new Error('Agent service failed'));
      vi.mocked(catalystService.getActiveExecutions).mockRejectedValue(new Error('Execution service failed'));
      mockUseService.mockReturnValue(mockAnalyticsService);

      render(<LearningDashboard />);

      await waitFor(() => {
        // Should still show dashboard with learning metrics
        expect(screen.getByText('2h 0m')).toBeInTheDocument();
        expect(screen.getByText('15')).toBeInTheDocument();

        // Should show no agents/executions due to errors
        expect(screen.getByText('No agents available')).toBeInTheDocument();
        expect(screen.getByText('No active executions')).toBeInTheDocument();
      });
    });
  });

  describe('Component Integration', () => {
    it('should integrate with existing analytics components', async () => {
      mockUseService.mockReturnValue(mockAnalyticsService);

      render(<LearningDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Learning Trends')).toBeInTheDocument();
        expect(screen.getByText('Achievements')).toBeInTheDocument();
        expect(screen.getByText('Study Streak')).toBeInTheDocument();
      });
    });
  });
});