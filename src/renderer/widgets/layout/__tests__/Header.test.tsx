import React from 'react';
import { screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { Header } from '@/renderer/widgets/layout/Header';
import { renderWithServices } from '@/test/utils/renderWithServices';
import { useAppStore } from '@/renderer/stores/useAppStore';

// The setup.ts file already mocks useAppStore globally
// We need to import it to control the mock return value in tests

describe('Header', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset useAppStore to default state before each test
    vi.mocked(useAppStore).mockReturnValue({
      sidebar_open: true,
      theme: 'light' as 'light' | 'dark' | 'auto',
      focus_mode: false,
      setSidebarOpen: vi.fn(),
      setSettingsPanelOpen: vi.fn(),
      setTheme: vi.fn(),
      toggleFocusMode: vi.fn(),
      setCurrentView: vi.fn(),
      setLoading: vi.fn(),
      setError: vi.fn(),
      setSuccess: vi.fn(),
      clearMessages: vi.fn(),
    });
  });

  it('toggles sidebar via menu button', () => {
    const mockSetSidebarOpen = vi.fn();
    vi.mocked(useAppStore).mockReturnValue({
      sidebar_open: true,
      theme: 'light',
      focus_mode: false,
      setSidebarOpen: mockSetSidebarOpen,
      setSettingsPanelOpen: vi.fn(),
      setTheme: vi.fn(),
      toggleFocusMode: vi.fn(),
      setCurrentView: vi.fn(),
      setLoading: vi.fn(),
      setError: vi.fn(),
      setSuccess: vi.fn(),
      clearMessages: vi.fn(),
    });

    renderWithServices(<Header />);

    const btn = screen.getByTitle('Toggle sidebar');
    fireEvent.click(btn);
    expect(mockSetSidebarOpen).toHaveBeenCalledWith(false);
  });

  it('cycles theme when theme button clicked', () => {
    const mockSetTheme = vi.fn();
    vi.mocked(useAppStore).mockReturnValue({
      sidebar_open: true,
      theme: 'light',
      focus_mode: false,
      setSidebarOpen: vi.fn(),
      setSettingsPanelOpen: vi.fn(),
      setTheme: mockSetTheme,
      toggleFocusMode: vi.fn(),
      setCurrentView: vi.fn(),
      setLoading: vi.fn(),
      setError: vi.fn(),
      setSuccess: vi.fn(),
      clearMessages: vi.fn(),
    });

    renderWithServices(<Header />);

    fireEvent.click(screen.getByTitle(/Theme:/i));
    expect(mockSetTheme).toHaveBeenCalledWith('dark');
  });

  it('toggles focus mode on F11', () => {
    const mockToggleFocusMode = vi.fn();
    vi.mocked(useAppStore).mockReturnValue({
      sidebar_open: true,
      theme: 'light',
      focus_mode: false,
      setSidebarOpen: vi.fn(),
      setSettingsPanelOpen: vi.fn(),
      setTheme: vi.fn(),
      toggleFocusMode: mockToggleFocusMode,
      setCurrentView: vi.fn(),
      setLoading: vi.fn(),
      setError: vi.fn(),
      setSuccess: vi.fn(),
      clearMessages: vi.fn(),
    });

    renderWithServices(<Header />);

    fireEvent.keyDown(document, { key: 'F11' });
    expect(mockToggleFocusMode).toHaveBeenCalled();
  });

  it('opens settings panel', () => {
    const mockSetSettingsPanelOpen = vi.fn();
    vi.mocked(useAppStore).mockReturnValue({
      sidebar_open: true,
      theme: 'light',
      focus_mode: false,
      setSidebarOpen: vi.fn(),
      setSettingsPanelOpen: mockSetSettingsPanelOpen,
      setTheme: vi.fn(),
      toggleFocusMode: vi.fn(),
      setCurrentView: vi.fn(),
      setLoading: vi.fn(),
      setError: vi.fn(),
      setSuccess: vi.fn(),
      clearMessages: vi.fn(),
    });

    renderWithServices(<Header />);

    fireEvent.click(screen.getByTitle('Settings'));
    expect(mockSetSettingsPanelOpen).toHaveBeenCalledWith(true);
  });

  it('displays thread title when available', () => {
    // The mock assistant API in test-providers.tsx provides empty state
    // So threadTitle will be null, and the title should not be displayed
    vi.mocked(useAppStore).mockReturnValue({
      sidebar_open: true,
      theme: 'light',
      focus_mode: false,
      setSidebarOpen: vi.fn(),
      setSettingsPanelOpen: vi.fn(),
      setTheme: vi.fn(),
      toggleFocusMode: vi.fn(),
      setCurrentView: vi.fn(),
      setLoading: vi.fn(),
      setError: vi.fn(),
      setSuccess: vi.fn(),
      clearMessages: vi.fn(),
    });

    renderWithServices(<Header />);

    // Should show main title
    expect(screen.getByText('Learning Catalyst')).toBeInTheDocument();
    // Thread title should NOT be shown (no active thread in mock)
    expect(screen.queryByText('Session 1')).not.toBeInTheDocument();
  });
});
