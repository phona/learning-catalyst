import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useDebouncedSave } from '@/renderer/hooks/useDebouncedSave';

describe('useDebouncedSave', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllTimers();
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useDebouncedSave());

    expect(result.current.isSaving).toBe(false);
    expect(result.current.saveStatus).toBe('idle');
    expect(typeof result.current.save).toBe('function');
    expect(typeof result.current.cancel).toBe('function');
  });

  it('should not call onSave immediately', () => {
    const mockOnSave = vi.fn();
    const delay = 100;

    const { result } = renderHook(() =>
      useDebouncedSave({
        delay,
        onSave: mockOnSave,
      })
    );

    act(() => {
      result.current.save({ test: 'data' });
    });

    // Should not call onSave immediately
    expect(mockOnSave).not.toHaveBeenCalled();
    expect(result.current.isSaving).toBe(false);
    expect(result.current.saveStatus).toBe('idle');
  });

  it('should schedule save after delay', () => {
    const mockOnSave = vi.fn().mockResolvedValue(undefined);
    const delay = 100;

    const { result } = renderHook(() =>
      useDebouncedSave({
        delay,
        onSave: mockOnSave,
      })
    );

    act(() => {
      result.current.save({ test: 'data' });
    });

    // Fast-forward time - onSave should be called
    act(() => {
      vi.advanceTimersByTime(delay);
    });

    expect(mockOnSave).toHaveBeenCalledWith({ test: 'data' });
  });

  it('should cancel pending save', () => {
    const mockOnSave = vi.fn();
    const delay = 100;

    const { result } = renderHook(() =>
      useDebouncedSave({
        delay,
        onSave: mockOnSave,
      })
    );

    act(() => {
      result.current.save({ test: 'data1' });
    });

    // Cancel before delay completes
    act(() => {
      result.current.cancel();
      vi.advanceTimersByTime(delay);
    });

    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it('should only save the latest call when multiple calls are made', () => {
    const mockOnSave = vi.fn().mockResolvedValue(undefined);
    const delay = 100;

    const { result } = renderHook(() =>
      useDebouncedSave({
        delay,
        onSave: mockOnSave,
      })
    );

    act(() => {
      result.current.save({ test: 'data1' });
    });

    act(() => {
      result.current.save({ test: 'data2' });
    });

    act(() => {
      result.current.save({ test: 'data3' });
    });

    act(() => {
      vi.advanceTimersByTime(delay);
    });

    expect(mockOnSave).toHaveBeenCalledTimes(1);
    expect(mockOnSave).toHaveBeenCalledWith({ test: 'data3' });
  });

  it('should handle missing onSave gracefully', () => {
    const { result } = renderHook(() => useDebouncedSave());

    act(() => {
      result.current.save({ test: 'data' });
    });

    act(() => {
      vi.advanceTimersByTime(100);
    });

    // Should not throw error when onSave is not provided
    expect(result.current.isSaving).toBe(false);
    expect(result.current.saveStatus).toBe('idle');
  });

  it('should cleanup on unmount', () => {
    const mockOnSave = vi.fn();

    const { result, unmount } = renderHook(() =>
      useDebouncedSave({
        onSave: mockOnSave,
        delay: 100,
      })
    );

    act(() => {
      result.current.save({ test: 'data' });
    });

    // Unmount before save completes
    unmount();

    act(() => {
      vi.advanceTimersByTime(100);
    });

    // Should not call onSave after unmount
    expect(mockOnSave).not.toHaveBeenCalled();
  });
});
