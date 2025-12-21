import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import React from 'react';
import { UISettings } from '../UISettings';
import type { AppConfig } from '@/shared/types/config';

const baseConfig: AppConfig = {
  ai: { providers: {} },
  ui: {
    theme: 'light' as const,
    showTokenUsage: false,
    displayFormat: 'compact' as const,
    sessionDuration: 30,
    fontSize: 'medium' as const,
    sidebarWidth: 240,
    autoSave: false,
    autoScroll: false,
    showLineNumbers: true,
    enableMarkdown: true,
    enableSyntaxHighlighting: true,
    compactMode: false,
    documentHeadingDepth: 3,
  },
  learning: {
    autoSave: false,
    sessionTimeoutMinutes: 30,
    difficulty: 'beginner' as const,
    learningStyle: 'reading' as const,
    personalizationEnabled: false,
    checkpointInterval: 10,
    maxSessionHistory: 5,
    enableAnalytics: false,
    preferredExplanationLength: 'brief' as const,
  },
  privacy: {
    storeConversations: false,
    retentionDays: 30,
    anonymousAnalytics: false,
    crashReporting: false,
    encryptLocalStorage: false,
    autoCleanup: false,
    exportFormat: 'json' as const,
  },
  performance: {
    cacheSizeMb: 128,
    enableCaching: true,
    maxConcurrentRequests: 4,
    requestTimeout: 30,
    memoryLimitMb: 512,
    gpuAcceleration: false,
    backgroundProcessing: false,
    preloadModels: false,
  },
};

describe('UISettings depth', () => {
  it('shows included levels for default depth and updates on change', () => {
    let cfg: AppConfig = { ...baseConfig };
    const onConfigChange = (updates: Partial<AppConfig>) => {
      cfg = { ...cfg, ...updates, ui: { ...cfg.ui, ...(updates.ui || {}) } };
      rerender(<UISettings config={cfg} onConfigChange={onConfigChange} />);
    };
    const { rerender } = render(<UISettings config={cfg} onConfigChange={onConfigChange} />);
    const select = screen.getByLabelText('Max Title Depth');
    const chips = within(screen.getByLabelText('Included heading levels'));
    expect(chips.getByText('H1').className).toMatch('bg-blue-');
    expect(chips.getByText('H2').className).toMatch('bg-blue-');
    expect(chips.getByText('H3').className).toMatch('bg-blue-');
    expect(chips.getByText('H4').className).toMatch('bg-gray-');
    fireEvent.change(select, { target: { value: '2' } });
    expect(chips.getByText('H1').className).toMatch('bg-blue-');
    expect(chips.getByText('H2').className).toMatch('bg-blue-');
    expect(chips.getByText('H3').className).toMatch('bg-gray-');
  });
});
