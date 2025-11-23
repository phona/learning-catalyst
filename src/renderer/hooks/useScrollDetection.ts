/**
 * Use Scroll Detection Hook
 *
 * React hook for detecting scroll position and triggering callbacks when user scrolls near bottom.
 * Provides debounced scroll detection for performance optimization.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import React, { useEffect, useRef, useCallback } from 'react';

interface ScrollDetectionOptions {
  /** Threshold for triggering the callback (0.0 to 1.0, default: 0.8) */
  threshold?: number;
  /** Debounce delay in milliseconds (default: 100) */
  debounceMs?: number;
  /** Whether to enable horizontal scroll detection (default: false) */
  horizontal?: boolean;
}

interface ScrollDetectionReturn {
  /** Ref to attach to the scrollable element */
  scrollRef: React.RefObject<HTMLDivElement>;
  /** Current scroll percentage (0.0 to 1.0) */
  scrollPercentage: number;
  /** Whether user has scrolled near the bottom (above threshold) */
  isNearBottom: boolean;
  /** Whether user is currently scrolling */
  isScrolling: boolean;
  /** Callback function to trigger when near bottom */
  onNearBottom: (callback: () => void) => void;
}

export function useScrollDetection({
  threshold = 0.8,
  debounceMs = 100,
  horizontal = false,
}: ScrollDetectionOptions = {}): ScrollDetectionReturn {
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollPercentageRef = useRef(0);
  const isNearBottomRef = useRef(false);
  const isScrollingRef = useRef(false);
  const debounceTimerRef = useRef<number | null>(null);
  const scrollingTimerRef = useRef<number | null>(null);
  const nearBottomCallbackRef = useRef<(() => void) | null>(null);

  // Calculate scroll percentage
  const calculateScrollPercentage = useCallback(
    (element: HTMLElement): number => {
      if (horizontal) {
        const scrollLeft = element.scrollLeft;
        const scrollWidth = element.scrollWidth - element.clientWidth;
        return scrollWidth > 0 ? scrollLeft / scrollWidth : 0;
      } else {
        const scrollTop = element.scrollTop;
        const scrollHeight = element.scrollHeight - element.clientHeight;
        return scrollHeight > 0 ? scrollTop / scrollHeight : 0;
      }
    },
    [horizontal],
  );

  // Handle scroll events with debouncing
  const handleScroll = useCallback(() => {
    const element = scrollRef.current;
    if (!element) return;

    // Clear existing debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Mark as scrolling
    isScrollingRef.current = true;

    // Clear existing scrolling timer
    if (scrollingTimerRef.current) {
      clearTimeout(scrollingTimerRef.current);
    }

    // Set timer to mark scrolling as stopped
    scrollingTimerRef.current = window.setTimeout(() => {
      isScrollingRef.current = false;
    }, 150) as unknown as number;

    // Debounce the scroll calculation
    debounceTimerRef.current = window.setTimeout(() => {
      const percentage = calculateScrollPercentage(element);
      scrollPercentageRef.current = percentage;
      isNearBottomRef.current = percentage >= threshold;

      console.log(
        '[useScrollDetection] Scroll percentage:',
        percentage.toFixed(3),
        'threshold:',
        threshold,
        'isNearBottom:',
        isNearBottomRef.current,
      );

      // Trigger callback if near bottom and callback exists
      if (isNearBottomRef.current && nearBottomCallbackRef.current) {
        console.log('[useScrollDetection] Triggering near bottom callback');
        nearBottomCallbackRef.current();
      }
    }, debounceMs);
  }, [calculateScrollPercentage, threshold, debounceMs]);

  // Set up scroll event listener
  useEffect(() => {
    const element = scrollRef.current;
    console.log(
      '[useScrollDetection] Setting up scroll listener, element:',
      element ? 'found' : 'not found',
    );
    if (!element) return;

    // Check if element is actually scrollable
    const isScrollable =
      element.scrollHeight > element.clientHeight || element.scrollWidth > element.clientWidth;
    console.log('[useScrollDetection] Element scrollability check:', {
      scrollHeight: element.scrollHeight,
      clientHeight: element.clientHeight,
      scrollWidth: element.scrollWidth,
      clientWidth: element.clientWidth,
      isScrollable,
    });

    if (!isScrollable) {
      console.log('[useScrollDetection] Element is not scrollable, skipping scroll listener setup');
      return;
    }

    console.log('[useScrollDetection] Adding scroll event listener');
    element.addEventListener('scroll', handleScroll, { passive: true });

    // Initial check to see if we're already near bottom
    const initialPercentage = calculateScrollPercentage(element);
    scrollPercentageRef.current = initialPercentage;
    isNearBottomRef.current = initialPercentage >= threshold;
    console.log('[useScrollDetection] Initial scroll state:', {
      percentage: initialPercentage,
      threshold,
      isNearBottom: isNearBottomRef.current,
    });

    return () => {
      console.log('[useScrollDetection] Cleaning up scroll listener');
      element.removeEventListener('scroll', handleScroll);

      // Clean up timers
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (scrollingTimerRef.current) {
        clearTimeout(scrollingTimerRef.current);
      }
    };
  }, [handleScroll, calculateScrollPercentage, threshold]);

  // Function to set the near bottom callback
  const onNearBottom = useCallback((callback: () => void) => {
    console.log('[useScrollDetection] Setting near bottom callback');
    nearBottomCallbackRef.current = callback;
  }, []);

  return {
    scrollRef,
    scrollPercentage: scrollPercentageRef.current,
    isNearBottom: isNearBottomRef.current,
    isScrolling: isScrollingRef.current,
    onNearBottom,
  };
}
