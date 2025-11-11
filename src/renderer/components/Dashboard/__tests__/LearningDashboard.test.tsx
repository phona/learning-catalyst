/**
 * LearningDashboard Component Tests
 *
 * Comprehensive tests for the LearningDashboard component focusing on:
 * - Real user workflows and journeys
 * - Multi-service integration testing
 * - Error handling and recovery
 * - Performance with realistic data
 * - Agent orchestration scenarios
 */

import React from 'react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LearningDashboard } from '../LearningDashboard';

// Mock the services used by the dashboard
vi.mock('../../../hooks/useServices', () => ({
  useCatalystService: vi.fn(),
  useAnalyticsService: vi.fn(),
}));

const mockCatalystService = {
  getAvailableAgents: vi.fn(),
  getActiveExecutions: vi.fn(),
  executeAgent: vi.fn(),
  cancelExecution: vi.fn(),
  listAgents: vi.fn(),
};

const mockAnalyticsService = {
  getRecentSessions: vi.fn(),
  getOverallStatistics: vi.fn(),
  getLearningTrends: vi.fn(),
  getStudyStreak: vi.fn(),
  getAchievements: vi.fn(),
  getProgressChart: vi.fn(),
};

// Update the mock implementations
const { useCatalystService, useAnalyticsService } = require('../../../hooks/useServices');

(useCatalystService as vi.Mock).mockReturnValue(mockCatalystService);
(useAnalyticsService as vi.Mock).mockReturnValue(mockAnalyticsService);

describe('LearningDashboard - Real User Workflows', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default successful responses
    mockCatalystService.getAvailableAgents.mockResolvedValue({
      success: true,
      agents: [
        { id: 'learning-agent', name: 'Learning Guide', status: 'active' },
        { id: 'assessment-agent', name: 'Assessment Coach', status: 'active' },
        { id: 'practice-agent', name: 'Practice Master', status: 'active' }
      ]
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
      averageEngagement: 0.85
    });
  });

  describe('Basic Dashboard Loading', () => {
    it('should load dashboard with available agents and statistics', async () => {
      render(<LearningDashboard />);
      
      // Verify loading state initially
      expect(screen.getByText(/loading/i)).toBeInTheDocument();
      
      // Verify dashboard loads successfully
      await waitFor(() => {
        expect(screen.getByText('Learning Dashboard')).toBeInTheDocument();
      });
      
      // Verify agent information is displayed
      expect(screen.getByText('Learning Guide')).toBeInTheDocument();
      expect(screen.getByText('Assessment Coach')).toBeInTheDocument();
      expect(screen.getByText('Practice Master')).toBeInTheDocument();
      
      // Verify statistics appear
      expect(screen.getByText(/total sessions/i)).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('should handle initial data loading errors gracefully', async () => {
      // Simulate error in agent loading
      mockCatalystService.getAvailableAgents.mockRejectedValue(
        new Error('Network error')
      );
      
      render(<LearningDashboard />);
      
      // Should show error state
      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeInTheDocument();
      });
      
      // Should provide retry option
      const retryButton = screen.getByText('Retry');
      expect(retryButton).toBeInTheDocument();
      
      // Retry should work
      mockCatalystService.getAvailableAgents.mockResolvedValue({
        success: true,
        agents: [{ id: 'test-agent', name: 'Test Agent', status: 'active' }]
      });
      
      fireEvent.click(retryButton);
      
      await waitFor(() => {
        expect(screen.getByText('Test Agent')).toBeInTheDocument();
      });
    });
  });

  describe('Multi-Agent Learning Workflow', () => {
    it('should coordinate multiple agents for comprehensive learning experience', async () => {
      const user = userEvent.setup();
      
      // Mock active executions that will be returned
      mockCatalystService.getActiveExecutions.mockResolvedValue({
        success: true,
        executions: [
          { 
            id: 'exec-1', 
            agentId: 'learning-agent', 
            status: 'active', 
            progress: 50,
            description: 'Explaining React concepts'
          }
        ]
      });
      
      render(<LearningDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('Learning Dashboard')).toBeInTheDocument();
      });
      
      // Verify multi-agent coordination
      expect(screen.getByText('50%')).toBeInTheDocument();
      expect(screen.getByText('Explaining React concepts')).toBeInTheDocument();
      
      // User can cancel active execution
      const cancelButton = screen.getByText('Cancel');
      expect(cancelButton).toBeInTheDocument();
      
      fireEvent.click(cancelButton);
      
      expect(mockCatalystService.cancelExecution).toHaveBeenCalledWith('exec-1');
    });

    it('should handle agent handoff scenarios', async () => {
      const user = userEvent.setup();
      
      // Mock sequence of agent responses
      let executionCount = 0;
      mockCatalystService.getActiveExecutions.mockImplementation(() => {
        executionCount++;
        if (executionCount === 1) {
          return Promise.resolve({
            success: true,
            executions: [
              { id: 'exec-1', agentId: 'learning-agent', status: 'complete', result: 'Basic explanation completed' }
            ]
          });
        } else {
          return Promise.resolve({
            success: true,
            executions: [
              { id: 'exec-2', agentId: 'practice-agent', status: 'active', progress: 0, description: 'Preparing practice exercises' }
            ]
          });
        }
      });
      
      render(<LearningDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('Preparing practice exercises')).toBeInTheDocument();
      });
      
      // Verify handoff from learning to practice agent occurred
      expect(screen.getByText('practice-agent')).toBeInTheDocument();
    });
  });

  describe('Analytics and Progress Tracking', () => {
    it('should display learning progress and statistics', async () => {
      mockAnalyticsService.getOverallStatistics.mockResolvedValue({
        totalSessions: 15,
        totalTime: 240,
        conceptsLearned: 25,
        averageEngagement: 0.92,
        sessionStreak: 7,
        achievements: 3
      });
      
      mockAnalyticsService.getLearningTrends.mockResolvedValue([
        { date: '2024-01-01', studyTime: 60, concepts: 5 },
        { date: '2024-01-02', studyTime: 90, concepts: 7 }
      ]);
      
      mockAnalyticsService.getStudyStreak.mockResolvedValue({
        currentStreak: 7,
        longestStreak: 14,
        daysStudied: 25
      });
      
      render(<LearningDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('15')).toBeInTheDocument(); // Total sessions
        expect(screen.getByText('240')).toBeInTheDocument(); // Total time
        expect(screen.getByText('25')).toBeInTheDocument(); // Concepts learned
        expect(screen.getByText('92%')).toBeInTheDocument(); // Engagement
      });
      
      // Verify trend chart appears
      expect(screen.getByText('Learning Trends')).toBeInTheDocument();
      expect(screen.getByText('Study Streak')).toBeInTheDocument();
    });

    it('should handle analytics loading errors gracefully', async () => {
      mockAnalyticsService.getOverallStatistics.mockRejectedValue(
        new Error('Analytics service unavailable')
      );
      
      render(<LearningDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('Learning Dashboard')).toBeInTheDocument();
      });
      
      // Should still render with error indicators for individual sections
      expect(screen.getByText('Statistics')).toBeInTheDocument();
      expect(screen.getByText('Analytics unavailable')).toBeInTheDocument();
    });
  });

  describe('Performance with Realistic Data', () => {
    it('should handle large number of sessions efficiently', async () => {
      // Mock large dataset
      const mockSessions = Array.from({ length: 100 }, (_, i) => ({
        id: `session-${i}`,
        title: `Session ${i}`,
        startTime: new Date(Date.now() - i * 3600000), // 1 hour apart
        duration: 30 + (i % 30), // Varying durations
        engagement: 0.5 + (Math.random() * 0.4) // 0.5-0.9
      }));
      
      mockAnalyticsService.getRecentSessions.mockResolvedValue(mockSessions);
      
      const startTime = performance.now();
      render(<LearningDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('Learning Dashboard')).toBeInTheDocument();
      });
      
      const renderTime = performance.now() - startTime;
      
      // Should render efficiently even with large datasets
      expect(renderTime).toBeLessThan(2000); // Less than 2 seconds
      
      // Should show pagination or virtual scrolling for large datasets
      expect(screen.getByText('Recent Sessions')).toBeInTheDocument();
    });

    it('should maintain responsiveness during data loading', async () => {
      // Mock delayed response to test loading states
      mockCatalystService.getAvailableAgents.mockImplementation(() => {
        return new Promise(resolve => {
          setTimeout(() => {
            resolve({
              success: true,
              agents: [{ id: 'delayed-agent', name: 'Delayed Agent', status: 'active' }]
            });
          }, 1000);
        });
      });
      
      render(<LearningDashboard />);
      
      // Should show loading state while data loads
      expect(screen.getByText(/loading/i)).toBeInTheDocument();
      
      // UI should remain responsive during loading
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      
      await waitFor(() => {
        expect(screen.getByText('Delayed Agent')).toBeInTheDocument();
      });
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should recover from service failures and continue functioning', async () => {
      const user = userEvent.setup();
      
      // Initial failure
      mockCatalystService.getAvailableAgents.mockRejectedValueOnce(
        new Error('Temporary service failure')
      );
      
      mockCatalystService.getAvailableAgents.mockResolvedValueOnce({
        success: true,
        agents: [{ id: 'recovered-agent', name: 'Recovered Agent', status: 'active' }]
      });
      
      render(<LearningDashboard />);
      
      // Should handle initial failure gracefully
      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeInTheDocument();
      });
      
      // User can retry
      const retryButton = screen.getByText('Retry');
      fireEvent.click(retryButton);
      
      // Should recover and show data
      await waitFor(() => {
        expect(screen.getByText('Recovered Agent')).toBeInTheDocument();
      });
    });

    it('should maintain user state during partial service failures', async () => {
      // One service fails, others continue
      mockAnalyticsService.getOverallStatistics.mockRejectedValue(
        new Error('Analytics temporarily unavailable')
      );
      
      // But agents still work
      mockCatalystService.getAvailableAgents.mockResolvedValue({
        success: true,
        agents: [{ id: 'working-agent', name: 'Working Agent', status: 'active' }]
      });
      
      render(<LearningDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('Learning Dashboard')).toBeInTheDocument();
      });
      
      // Should still show working components
      expect(screen.getByText('Working Agent')).toBeInTheDocument();
      
      // Should indicate which sections failed
      expect(screen.getByText('Statistics')).toBeInTheDocument();
      expect(screen.getByText('Analytics unavailable')).toBeInTheDocument();
    });

    it('should handle concurrent service errors gracefully', async () => {
      // Multiple services fail simultaneously
      mockCatalystService.getAvailableAgents.mockRejectedValue(
        new Error('Agents service down')
      );
      mockAnalyticsService.getRecentSessions.mockRejectedValue(
        new Error('Analytics service down')
      );
      
      render(<LearningDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText(/multiple services unavailable/i)).toBeInTheDocument();
      });
      
      // Should provide appropriate error handling for all failures
      expect(screen.getByText('Retry All')).toBeInTheDocument();
    });
  });

  describe('User Interaction Scenarios', () => {
    it('should respond to user actions while maintaining data integrity', async () => {
      const user = userEvent.setup();
      
      render(<LearningDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('Learning Dashboard')).toBeInTheDocument();
      });
      
      // User interacts with various components
      const agentCards = screen.getAllByRole('button', { name: /agent/i });
      expect(agentCards).toHaveLength(3);
      
      // Clicking an agent card should be handled properly
      await user.click(agentCards[0]);
      
      // Should not crash or lose state
      expect(screen.getByText('Learning Dashboard')).toBeInTheDocument();
    });

    it('should provide meaningful feedback for all user interactions', async () => {
      const user = userEvent.setup();
      
      render(<LearningDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('Learning Dashboard')).toBeInTheDocument();
      });
      
      // Test various interactive elements
      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      await user.click(refreshButton);
      
      // Verify that refresh action was processed
      expect(mockCatalystService.getAvailableAgents).toHaveBeenCalledTimes(2);
      expect(mockAnalyticsService.getRecentSessions).toHaveBeenCalledTimes(2);
    });
  });

  describe('Realistic Learning Session Scenarios', () => {
    it('should simulate complete learning session from start to finish', async () => {
      const user = userEvent.setup();
      
      // Mock a complete learning journey
      mockCatalystService.getAvailableAgents.mockResolvedValue({
        success: true,
        agents: [{ id: 'learning-agent', name: 'Learning Guide', status: 'active', capabilities: ['explanation', 'examples'] }]
      });
      
      mockCatalystService.getActiveExecutions.mockResolvedValue({
        success: true,
        executions: [
          { id: 'session-1', agentId: 'learning-agent', status: 'active', progress: 0, description: 'Starting learning session' }
        ]
      });
      
      render(<LearningDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('Starting learning session')).toBeInTheDocument();
      });
      
      // Simulate session progression
      mockCatalystService.getActiveExecutions.mockResolvedValue({
        success: true,
        executions: [
          { id: 'session-1', agentId: 'learning-agent', status: 'active', progress: 100, description: 'Session complete', result: 'Successfully learned concept' }
        ]
      });
      
      // Refresh to see updated progress
      fireEvent.click(screen.getByRole('button', { name: /refresh/i }));
      
      await waitFor(() => {
        expect(screen.getByText('Session complete')).toBeInTheDocument();
        expect(screen.getByText('100%')).toBeInTheDocument();
      });
      
      // Verify session was tracked
      expect(mockAnalyticsService.getRecentSessions).toHaveBeenCalled();
    });

    it('should handle interrupted learning sessions', async () => {
      const user = userEvent.setup();
      
      mockCatalystService.getActiveExecutions.mockResolvedValue({
        success: true,
        executions: [
          { id: 'session-1', agentId: 'learning-agent', status: 'active', progress: 60, description: 'In progress' }
        ]
      });
      
      render(<LearningDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('In progress')).toBeInTheDocument();
      });
      
      // User cancels the session
      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);
      
      expect(mockCatalystService.cancelExecution).toHaveBeenCalledWith('session-1');
      
      // Should handle cancellation gracefully
      expect(screen.queryByText('In progress')).not.toBeInTheDocument();
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });
});

// Additional tests for specific dashboard features
describe('LearningDashboard - Advanced Features', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    mockCatalystService.getAvailableAgents.mockResolvedValue({
      success: true,
      agents: []
    });
    
    mockCatalystService.getActiveExecutions.mockResolvedValue({
      success: true,
      executions: []
    });
    
    mockAnalyticsService.getRecentSessions.mockResolvedValue([]);
  });

  it('should support configuration changes without state loss', async () => {
    render(<LearningDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Learning Dashboard')).toBeInTheDocument();
    });
    
    // Simulate configuration change (like theme switch)
    act(() => {
      document.documentElement.classList.add('dark');
    });
    
    // Component should still work after configuration change
    expect(screen.getByText('Learning Dashboard')).toBeInTheDocument();
  });

  it('should handle service updates gracefully', async () => {
    render(<LearningDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Learning Dashboard')).toBeInTheDocument();
    });
    
    // Simulate service update (new agent becomes available)
    mockCatalystService.getAvailableAgents.mockResolvedValue({
      success: true,
      agents: [
        { id: 'new-agent', name: 'New Agent', status: 'active' }
      ]
    });
    
    // Trigger refresh
    fireEvent.click(screen.getByRole('button', { name: /refresh/i }));
    
    await waitFor(() => {
      expect(screen.getByText('New Agent')).toBeInTheDocument();
    });
  });
});