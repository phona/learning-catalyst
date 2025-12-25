import React from "react";
import { describe, it, expect, vi } from "vitest";
import { renderWithServices } from "@/test/utils/test-providers.helpers";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { ProgressPage } from "../ProgressPage";
import type { StudyMetrics, LearningTrends, Achievement } from "@/renderer/services/analytics/analytics-service";
import type { ActiveExecution } from "@/shared/types/electron-api/catalyst-api";

const makeAnalyticsService = () => {
  const metrics: StudyMetrics = {
    totalStudyTime: 120,
    sessionsCompleted: 5,
    conceptsStudied: 3,
    accuracyRate: 0.8,
    averageSessionLength: 24,
    streakDays: 2,
    lastStudyDate: new Date(),
    focusScore: 85,
    questionsAsked: 15,
    correctAnswers: 12,
  };

  const trends: LearningTrends = {
    sessionTypes: {},
    dailyStudyTime: [{ date: "2024-01-01", minutes: 30 }],
    masteryProgress: [{ date: "2024-01-01", avgMastery: 0.6 }],
  };

  const achievements: Achievement[] = [
    {
      id: "a1",
      title: "Starter",
      description: "Complete first session",
      category: "time",
      requirement: { target: 1, current: 0 },
      progress: 40,
      icon: "starter",
    },
  ];

  return {
    getStudyMetrics: vi.fn().mockResolvedValue(metrics),
    getLearningTrends: vi.fn().mockResolvedValue(trends),
    getAchievements: vi.fn().mockResolvedValue(achievements),
    getRecentSessions: vi.fn().mockResolvedValue([{ id: "s1", title: "Session 1", statistics: { sessionDuration: 20 }, agent: { provider: "mock", model: "m1" }, metadata: { topicsCovered: ["arrays"] } }]),
    getProgressChart: vi.fn(),
    getDashboard: vi.fn(),
    getSessionHistory: vi.fn(),
    checkAchievements: vi.fn(),
    getStudyStreak: vi.fn(),
    getTimeStats: vi.fn(),
    exportData: vi.fn(),
    importData: vi.fn(),
    trackSession: vi.fn(),
    updateSession: vi.fn(),
    getConceptProgress: vi.fn(),
    updateConceptProgress: vi.fn(),
    updateAchievementProgress: vi.fn(),
    getLearningInsights: vi.fn(),
    getSession: vi.fn(),
    trackEvent: vi.fn(),
  } as any;
};

const makeCatalystService = () => ({
  getAvailableAgents: vi.fn().mockResolvedValue({ success: true, agents: [{ id: "agent1", name: "Mock Agent" }] }),
  getActiveExecutions: vi.fn().mockResolvedValue({ success: true, executions: [{ id: "exec1", status: "running" } as ActiveExecution] }),
});

describe("ProgressPage behavior", () => {
  it("renders study metrics, agents, and active executions", async () => {
    const analyticsService = makeAnalyticsService();
    const catalystService = makeCatalystService();

    renderWithServices(<ProgressPage />, {
      serviceOverrides: { analyticsService, catalystService },
    });

    await waitFor(() => {
      expect(analyticsService.getStudyMetrics).toHaveBeenCalled();
      expect(screen.getByText(/sessions completed/i)).toBeInTheDocument();
      expect(screen.getByText(/Mock Agent/)).toBeInTheDocument();
    });
  });

  it("shows error state and retries when refresh clicked", async () => {
    const analyticsService = makeAnalyticsService();
    analyticsService.getStudyMetrics = vi.fn().mockRejectedValue(new Error("metrics down"));
    const catalystService = makeCatalystService();

    renderWithServices(<ProgressPage />, {
      serviceOverrides: { analyticsService, catalystService },
    });

    expect(await screen.findByText(/Error Loading Dashboard/i)).toBeInTheDocument();
    expect(screen.getByText(/metrics down/i)).toBeInTheDocument();

    // fix service and retry
    analyticsService.getStudyMetrics = vi.fn().mockResolvedValue(makeAnalyticsService().getStudyMetrics());
    await userEvent.click(screen.getByRole("button", { name: /Retry/i }));

    await waitFor(() => {
      expect(analyticsService.getStudyMetrics).toHaveBeenCalled();
    });
  });
});
