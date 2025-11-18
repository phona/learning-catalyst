/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable no-undef */
/* eslint-disable react/prop-types */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-non-null-asserted-optional-chain */
/* eslint-disable @typescript-eslint/no-non-null-asserted-access */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable @typescript-eslint/require-await */


import { useState, useEffect, useRef, useCallback } from 'react';

interface UseDebouncedSaveOptions<T> {
  delay?: number;
  onSave?: (data: T) => Promise<void>;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

interface UseDebouncedSaveReturn<T> {
  save: (data: T) => void;
  cancel: () => void;
  isSaving: boolean;
  saveStatus: 'idle' | 'success' | 'error';
}

/**
 * Custom hook for debounced saving functionality
 * Provides automatic debouncing with cleanup and status tracking
 */
export function useDebouncedSave<T = any>({
  delay = 1000,
  onSave,
  onSuccess,
  onError,
}: UseDebouncedSaveOptions<T> = {}): UseDebouncedSaveReturn<T> {
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const pendingDataRef = useRef<T | null>(null);

  const clearSuccessStatus = useCallback(() => {
    const timeout = setTimeout(() => setSaveStatus('idle'), 2000);
    return () => clearTimeout(timeout);
  }, []);

  const clearErrorStatus = useCallback(() => {
    const timeout = setTimeout(() => setSaveStatus('idle'), 3000);
    return () => clearTimeout(timeout);
  }, []);

  const performSave = useCallback(async (data: T) => {
    if (!onSave) return;

    setIsSaving(true);
    setSaveStatus('idle');

    try {
      await onSave(data);
      setSaveStatus('success');
      onSuccess?.();
      clearSuccessStatus();
    } catch (error) {
      console.error('Save failed:', error);
      setSaveStatus('error');
      onError?.(error instanceof Error ? error : new Error('Unknown save error'));
      clearErrorStatus();
    } finally {
      setIsSaving(false);
    }
  }, [onSave, onSuccess, onError, clearSuccessStatus, clearErrorStatus]);

  const save = useCallback((data: T) => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Store the latest data
    pendingDataRef.current = data;

    // Set new timeout for debounced save
    timeoutRef.current = setTimeout(() => {
      if (pendingDataRef.current !== null) {
        performSave(pendingDataRef.current);
        pendingDataRef.current = null;
      }
    }, delay);
  }, [delay, performSave]);

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = undefined;
    }
    pendingDataRef.current = null;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    save,
    cancel,
    isSaving,
    saveStatus,
  };
}