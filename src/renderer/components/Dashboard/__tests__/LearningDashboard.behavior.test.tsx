import React from "react";
import { describe, it, expect, vi } from "vitest";
import { renderWithServices, screen, waitFor } from "@/test/utils/renderWithServices";
import userEvent from "@testing-library/user-event";
import { LearningDashboard } from "../LearningDashboard";
import type { StudyMetrics, LearningTrends, Achievement } from "@/renderer/services/analytics/analytics-service";
import type { ActiveExecution } from "@/shared/types/electron-api/catalyst-api";

const makeAnalyticsService = () => {
  const metrics: StudyMetrics = {
    totalStudyTime: 120,
    sessionsCompleted: 5,
    conceptsStudied: 3,
    averageSessionLength: 24,
    streakDays: 2,
    sessionTypes: [],
    masteryProgress: [{ date: new Date().toISOString(), avgMastery: 0.6 }],
    dailyStudyTime: [],
  };

  const trends: LearningTrends = {
    sessionTypes: [],
    dailyStudyTime: [],
    masteryProgress: metrics.masteryProgress,
  };

  const achievements: Achievement[] = [
    {
      id: "a1",
      title: "Starter",
      description: "Complete first session",
      category: "progress",
      status: "in-progress",
      progress: 40,
      requirement: { target: 1, current: 0, unit: "session" },
      rewards: [],
      badge: "starter",
    },
  ];

  return {
    getStudyMetrics: vi.fn().mockResolvedValue(metrics),
    getLearningTrends: vi.fn().mockResolvedValue(trends),
    getAchievements: vi.fn().mockResolvedValue(achievements),
    getRecentSessions: vi.fn().mockResolvedValue([{ id: "s1", title: "Session 1", statistics: { sessionDuration: 20 }, agent: { provider: "mock", model: "m1" }, metadata: { topicsCovered: ["arrays"] } }]),
    getProgressChart: vi.fn(),
    getProgressReport: vi.fn(),
    updateAchievementProgress: vi.fn(),
    getConceptProgress: vi.fn(),
    updateConceptProgress: vi.fn(),
  } as any;
};

const makeCatalystService = () => ({
  getAvailableAgents: vi.fn().mockResolvedValue({ success: true, agents: [{ id: "agent1", name: "Mock Agent" }] }),
  getActiveExecutions: vi.fn().mockResolvedValue({ success: true, executions: [{ id: "exec1", status: "running" } as ActiveExecution] }),
});

describe("LearningDashboard behavior", () => {
  it("renders study metrics, agents, and active executions", async () => {
    const analyticsService = makeAnalyticsService();
    const catalystService = makeCatalystService();

    renderWithServices(<LearningDashboard />, {
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

    renderWithServices(<LearningDashboard />, {
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
