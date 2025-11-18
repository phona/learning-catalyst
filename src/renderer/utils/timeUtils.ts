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



/**
 * Time utility functions for Learning Catalyst UI
 * Uses date-fns for robust date formatting
 */

import { format, formatDistanceToNow } from 'date-fns';

/**
 * Formats a date as relative time (e.g., "2 hours ago", "5 minutes ago")
 * @param date The date to format
 * @returns Formatted relative time string
 */
export function formatRelativeTime(date: Date): string {
  return formatDistanceToNow(date, { addSuffix: true });
}

/**
 * Formats a timestamp for display with error handling
 * @param timestamp The timestamp to format (Date object, ISO string, or timestamp)
 * @returns Formatted time string or empty string if invalid
 */
export function formatTimestamp(timestamp?: Date | string | number): string {
  if (timestamp == null || timestamp === '') return '';

  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  // Check if the date is invalid
  if (isNaN(date.getTime())) {
    return '';
  }
  return format(date, 'h:mm a');  // e.g., "2:30 PM"
}

/**
 * Formats response time in human-readable format
 * @param ms Response time in milliseconds
 * @returns Formatted response time string
 */
export function formatResponseTime(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

/**
 * Formats tokens per second rate
 * @param tps Tokens per second
 * @returns Formatted tokens per second string
 */
export function formatTokensPerSecond(tps: number): string {
  return `${tps.toFixed(1)} tokens/s`;
}

/**
 * Formats a timestamp for use in HTML dateTime attributes
 * @param timestamp The timestamp to format
 * @returns ISO string for dateTime attribute or undefined if invalid
 */
export function formatDateTimeForHtml(timestamp?: Date | string): string | undefined {
  if (timestamp == null || timestamp === '') return undefined;

  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  // Check if the date is invalid
  if (isNaN(date.getTime())) {
    return undefined;
  }
  return date.toISOString();
}