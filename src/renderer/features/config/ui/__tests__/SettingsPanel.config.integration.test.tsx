import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, waitFor as rtlWaitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithServices, screen, waitFor, fireEvent } from "@/test/utils/renderWithServices";
import { SettingsPanel } from "../SettingsPanel";
import { useConfigStore, setConfigurationService } from "@/renderer/stores/useConfigStore";
import { makeEmptyConfig, makeProviderConfig } from "@/test/utils/fixtures/config";
import type { AppConfig } from "@/shared/types";

const buildConfigService = (saveConfig = vi.fn().mockResolvedValue(undefined)) => ({
  saveConfig,
  getConfig: vi.fn().mockResolvedValue(makeEmptyConfig()),
  setConfig: vi.fn(),
  configureProvider: vi.fn(),
  validateProvider: vi.fn().mockResolvedValue({ success: true }),
  getAvailableProviders: vi.fn(),
  getProviderModels: vi.fn().mockResolvedValue(["gpt-4", "gpt-3.5-turbo"]),
});

const setStoreConfig = (config: AppConfig | null) => {
  useConfigStore.setState((state) => ({ ...state, config }));
};

describe("SettingsPanel provider + model wiring", () => {
  beforeEach(() => {
    setStoreConfig(null);
  });

  afterEach(() => {
    useConfigStore.setState((state) => ({ ...state, config: undefined as any }));
    setConfigurationService(null);
  });

  it("saves a newly validated provider and persists the api key", async () => {
    const saveConfig = vi.fn().mockResolvedValue(undefined);
    const configService = buildConfigService(saveConfig);
    const now = vi.spyOn(Date, "now").mockReturnValue(1_700_000_000_000);
    setConfigurationService(configService as any);

    renderWithServices(<SettingsPanel />, { serviceOverrides: { configService } });

    await screen.findByText("Preferences");
    const modelsToggle = screen.getByRole("button", { name: /AI Models/i });
    if (modelsToggle.getAttribute("aria-expanded") === "false") {
      await userEvent.click(modelsToggle);
    }

    const [providerSelect] = screen.getAllByRole("combobox");
    await userEvent.selectOptions(providerSelect, "openai");
    const apiKey = screen.getByPlaceholderText("Enter API key...");
    fireEvent.change(apiKey, { target: { value: "sk-updated" } });

    await userEvent.click(screen.getByRole("button", { name: "Validate" }));
    await waitFor(() => expect(configService.validateProvider).toHaveBeenCalled());

    const saveProviderBtn = screen.getByRole("button", { name: "Save Configuration" });
    await waitFor(() => expect(saveProviderBtn).toBeEnabled());
    await userEvent.click(saveProviderBtn);

    // Manual save is required to persist changes
    await userEvent.click(screen.getByRole("button", { name: /Save Changes/i }));
    const dialog = screen.queryByTestId("confirm-dialog");
    if (dialog) {
      await userEvent.click(screen.getByTestId("confirm-dialog-confirm"));
    }

    await waitFor(() => expect(saveConfig).toHaveBeenCalled(), { timeout: 3000 });
    const payload = saveConfig.mock.calls.at(-1)?.[0];
    expect(payload.ai.providers["openai-1700000000000"].apiKey).toBe("sk-updated");
    expect(payload.ai.providers["openai-1700000000000"].providerType).toBe("openai");
    expect(screen.getByText(/Configured Providers/i)).toBeInTheDocument();

    now.mockRestore();
  });

  it("hydrates model assignments from existing app config before saving", async () => {
    const config: AppConfig = makeEmptyConfig({
      ai: {
        providers: {
          "openai-main": makeProviderConfig({
            providerType: "openai",
            apiKey: "sk-existing",
            models: ["gpt-3.5-turbo", "gpt-4"],
          }),
        },
        modelTypes: {
          chat: { provider: "openai-main", model: "gpt-4" } as any,
        },
      },
    });

    const saveConfig = vi.fn().mockResolvedValue(undefined);
    const configService = {
      ...buildConfigService(saveConfig),
      getConfig: vi.fn().mockResolvedValue(config),
    };
    setConfigurationService(configService as any);
    renderWithServices(<SettingsPanel />, {
      serviceOverrides: { configService },
      preloadedConfig: config,
    });
    act(() => setStoreConfig(config));

    await screen.findByText("Preferences");
    act(() => setStoreConfig(config));
    const modelsToggle = screen.getByRole("button", { name: /AI Models/i });
    if (modelsToggle.getAttribute("aria-expanded") === "false") {
      await userEvent.click(modelsToggle);
    }

    await userEvent.click(screen.getByRole("button", { name: /Save Changes/i }));
    const dialog = screen.queryByTestId("confirm-dialog");
    if (dialog) {
      await userEvent.click(screen.getByTestId("confirm-dialog-confirm"));
    }
    await waitFor(() => expect(saveConfig).toHaveBeenCalled());
    const saved = saveConfig.mock.calls.at(-1)?.[0];
    // debug
    console.log("saved modelTypes chat", saved.ai.modelTypes);
    expect(saved.ai.modelTypes?.chat?.provider).toBe("openai-main");
    expect(saved.ai.modelTypes?.chat?.model).toBe("gpt-4");
  });

  it("preserves custom model ids in assignments", async () => {
    const config: AppConfig = makeEmptyConfig({
      ai: {
        providers: {
          "openai-main": makeProviderConfig({
            providerType: "openai",
            apiKey: "sk-custom",
            models: ["text-embedding-3-small", "custom-embed-id"],
          }),
        },
        modelTypes: {
          embedding: { provider: "openai-main", model: "custom-embed-id" } as any,
        },
      },
    });

    const saveConfig = vi.fn().mockResolvedValue(undefined);
    const configService = {
      ...buildConfigService(saveConfig),
      getConfig: vi.fn().mockResolvedValue(config),
    };
    setConfigurationService(configService as any);
    renderWithServices(<SettingsPanel />, {
      serviceOverrides: { configService },
      preloadedConfig: config,
    });
    act(() => setStoreConfig(config));

    await screen.findByText("Preferences");
    const modelsToggle = screen.getByRole("button", { name: /AI Models/i });
    if (modelsToggle.getAttribute("aria-expanded") === "false") {
      await userEvent.click(modelsToggle);
    }

    await userEvent.click(screen.getByRole("button", { name: /Save Changes/i }));
    const dialog2 = screen.queryByTestId("confirm-dialog");
    if (dialog2) {
      await userEvent.click(screen.getByTestId("confirm-dialog-confirm"));
    }
    await waitFor(() => expect(saveConfig).toHaveBeenCalled());
    const saved = saveConfig.mock.calls.at(-1)?.[0];
    // debug
    console.log("saved modelTypes embedding", saved.ai.modelTypes);
    expect(saved.ai.modelTypes?.embedding?.model).toBe("custom-embed-id");
  });
});
