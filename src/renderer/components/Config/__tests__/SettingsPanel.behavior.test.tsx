import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { renderWithServices, screen, waitFor } from "@/test/utils/renderWithServices";
import { act } from "@testing-library/react";
import { useConfigStore } from "@/renderer/stores/useConfigStore";
import type { AppConfig } from "@/shared/types";
import { SettingsPanel } from "../SettingsPanel";

vi.mock("@/renderer/utils/toast", () => ({
  settingsToasts: {
    providerError: vi.fn(),
    providerSuccess: vi.fn(),
  },
}));

const getSettingsToasts = async () => {
  const mod = await import("@/renderer/utils/toast");
  return mod.settingsToasts as { providerError: ReturnType<typeof vi.fn> };
};

const baseConfig: AppConfig = {
  ai: { providers: {}, modelTypes: {} },
  ui: {
    theme: "light",
    showTokenUsage: false,
    displayFormat: "detailed",
    sessionDuration: 25,
    fontSize: "medium",
    sidebarWidth: 300,
    autoSave: true,
    autoScroll: true,
    showLineNumbers: false,
    enableMarkdown: true,
    enableSyntaxHighlighting: true,
    compactMode: false,
  },
  learning: {
    autoSave: true,
    sessionTimeoutMinutes: 60,
    difficulty: "intermediate",
    learningStyle: "visual",
    personalizationEnabled: true,
    checkpointInterval: 15,
    maxSessionHistory: 100,
    enableAnalytics: false,
    preferredExplanationLength: "detailed",
  },
  privacy: {
    storeConversations: true,
    retentionDays: 90,
    anonymousAnalytics: false,
    crashReporting: true,
    encryptLocalStorage: false,
    autoCleanup: true,
    exportFormat: "json",
  },
  performance: {
    cacheSizeMb: 100,
    enableCaching: true,
    maxConcurrentRequests: 5,
    requestTimeout: 30,
    memoryLimitMb: 512,
    gpuAcceleration: false,
    backgroundProcessing: true,
    preloadModels: false,
  },
};

const prepareConfigStore = () => {
  const store = useConfigStore.getState();
  store.config = { ...baseConfig };
  store.setConfig = (cfg: AppConfig) => {
    store.config = cfg;
  };
  store.loadConfig = vi.fn().mockResolvedValue(store.config);
  return store;
};

describe("SettingsPanel behavior", () => {
  beforeEach(() => {
    localStorage.clear();
    prepareConfigStore();
  });

  const openSection = async (label: RegExp | string) => {
    const button = screen.getByRole("button", { name: label });
    if (button.getAttribute("aria-expanded") !== "true") {
      await userEvent.click(button);
    }
    return button;
  };

  it("saves updated UI theme via configService", async () => {
    const saveConfig = vi.fn().mockResolvedValue(undefined);
    const configService = {
      saveConfig,
      getConfig: vi.fn().mockResolvedValue(baseConfig),
      setConfig: vi.fn(),
      configureProvider: vi.fn(),
      getAvailableProviders: vi.fn().mockResolvedValue({ providers: [], summary: { total: 0, connected: 0, configured: 0 } }),
      validateProvider: vi.fn(),
      getProviderModels: vi.fn(),
    } as any;

    renderWithServices(<SettingsPanel />, {
      serviceOverrides: { configService },
    });

    await screen.findByText("Preferences");

    await openSection(/Interface/i);
    const themeSelect = await screen.findByLabelText("Theme");
    await userEvent.selectOptions(themeSelect, "dark");

    await userEvent.click(screen.getByRole("button", { name: /Save Changes/i }));

    await waitFor(() => {
      expect(saveConfig).toHaveBeenCalled();
      const payload = saveConfig.mock.calls.at(-1)?.[0];
      expect(payload.ui.theme).toBe("dark");
    });
  });

  it("shows save failure state when configService.saveConfig rejects", async () => {
    const saveConfig = vi.fn().mockRejectedValue(new Error("disk full"));
    const configService = {
      saveConfig,
      getConfig: vi.fn().mockResolvedValue(baseConfig),
      setConfig: vi.fn(),
      configureProvider: vi.fn(),
      getAvailableProviders: vi.fn().mockResolvedValue({ providers: [], summary: { total: 0, connected: 0, configured: 0 } }),
      validateProvider: vi.fn(),
      getProviderModels: vi.fn(),
    } as any;

    renderWithServices(<SettingsPanel />, { serviceOverrides: { configService } });

    await screen.findByText("Preferences");
    await openSection(/Interface/i);
    const themeSelect = await screen.findByLabelText("Theme");
    await userEvent.selectOptions(themeSelect, "dark");

    await userEvent.click(screen.getByRole("button", { name: /Save Changes/i }));

    const { providerError } = await getSettingsToasts();

    await waitFor(() => {
      expect(saveConfig).toHaveBeenCalled();
      expect(providerError).toHaveBeenCalled();
    });
  });

  it("debounces multiple UI changes into a single save", async () => {
    const saveConfig = vi.fn().mockResolvedValue(undefined);
    const configService = {
      saveConfig,
      getConfig: vi.fn().mockResolvedValue(baseConfig),
      setConfig: vi.fn(),
      configureProvider: vi.fn(),
      getAvailableProviders: vi.fn().mockResolvedValue({ providers: [], summary: { total: 0, connected: 0, configured: 0 } }),
      validateProvider: vi.fn(),
      getProviderModels: vi.fn(),
    } as any;

    renderWithServices(<SettingsPanel />, { serviceOverrides: { configService } });

    await screen.findByText("Preferences");
    await openSection(/Interface/i);

    // Flip two toggles quickly
    await userEvent.click(screen.getByRole("switch", { name: "Auto Scroll" }));
    await userEvent.click(screen.getByRole("switch", { name: "Compact Mode" }));

    // No autosave: nothing is persisted until the user clicks Save Changes
    expect(saveConfig).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: /Save Changes/i }));

    await waitFor(() => {
      expect(saveConfig).toHaveBeenCalledTimes(1);
      const payload = saveConfig.mock.calls.at(-1)?.[0];
      expect(payload.ui.autoScroll).toBe(false); // default true, toggled once -> false
      expect(payload.ui.compactMode).toBe(true); // default false, toggled once -> true
    });
  });
});
