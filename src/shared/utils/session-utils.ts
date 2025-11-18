/**
 * Session Utilities
 *
 * Shared utility functions for session management
 * Used by both main and renderer processes
 */

import { generateSessionId } from './helpers';

// Re-export for backward compatibility
export { generateSessionId };

/**
 * Generate a simple title based on message content
 *
 * @param message - The message content to generate title from
 * @param maxLength - Maximum length of the title (default: 50)
 * @returns Generated title
 */
export function generateSimpleTitle(message: string, maxLength = 50): string {
  const words = message
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .split(/\s+/) // Split by whitespace
    .filter(word => word.length > 2) // Remove very short words
    .slice(0, 4); // Take first 4 meaningful words

  if (words.length === 0) {
    const now = new Date();
    return `Learning Session ${now.toLocaleDateString()}`;
  }

  const title = words.map(word =>
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(' ');

  return title.length > maxLength ? title.substring(0, maxLength - 3) + '...' : title;
}


/**
 * Generate unique message ID
 *
 * @returns Unique message ID
 */
export function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Format session duration for display
 *
 * @param seconds - Duration in seconds
 * @returns Formatted duration string
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
}

/**
 * Format relative time for display
 *
 * @param date - Date to format
 * @returns Relative time string
 */
export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return 'just now';
  } else if (diffMinutes < 60) {
    return diffMinutes === 1 ? '1 min ago' : `${diffMinutes} mins ago`;
  } else if (diffHours < 24) {
    return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
  } else if (diffDays < 7) {
    return diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
  } else {
    return date.toLocaleDateString();
  }
}

/**
 * Extract topics from session content
 *
 * @param messages - Array of messages from the session
 * @returns Array of extracted topics
 */
export function extractTopics(messages: Array<{ content: string }>): string[] {
  const allText = messages.map(msg => msg.content).join(' ');

  // Simple keyword extraction - in a real implementation,
  // this would use NLP or AI to extract meaningful topics
  const keywords = allText
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 4)
    .filter(word => !isCommonWord(word));

  // Get unique keywords and limit to top 5
  const uniqueKeywords = [...new Set(keywords)]
    .slice(0, 5)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1));

  return uniqueKeywords;
}

/**
 * Check if a word is a common stop word
 *
 * @param word - Word to check
 * @returns True if it's a common word
 */
function isCommonWord(word: string): boolean {
  const commonWords = new Set([
    'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
    'by', 'from', 'up', 'about', 'into', 'through', 'during', 'before',
    'after', 'above', 'below', 'between', 'under', 'along', 'following',
    'across', 'behind', 'beyond', 'plus', 'except', 'but', 'yet', 'nor',
    'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'any',
    'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no',
    'only', 'own', 'same', 'so', 'than', 'too', 'very', 'can', 'will',
    'just', 'should', 'could', 'would', 'about', 'over', 'again', 'way',
    'how', 'its', 'who', 'may', 'get', 'him', 'has', 'her', 'his', 'how',
    'our', 'out', 'see', 'she', 'than', 'their', 'them', 'then', 'there',
    'these', 'they', 'think', 'time', 'very', 'when', 'more', 'more', 'most',
    'some', 'them', 'then', 'than', 'only', 'new', 'now', 'say', 'see', 'she',
    'should', 'so', 'take', 'than', 'that', 'their', 'them', 'then', 'there',
    'these', 'they', 'thing', 'think', 'this', 'those', 'though', 'thought',
    'three', 'through', 'thus', 'time', 'to', 'together', 'too', 'toward',
    'turn', 'two', 'under', 'until', 'upon', 'us', 'use', 'used', 'using',
    'various', 'very', 'via', 'want', 'was', 'way', 'we', 'well', 'went',
    'were', 'what', 'when', 'where', 'whether', 'which', 'while', 'who',
    'whole', 'whose', 'why', 'will', 'with', 'within', 'without', 'work',
    'world', 'would', 'write', 'year', 'yes', 'yet', 'you', 'young', 'your'
  ]);

  return commonWords.has(word);
}

/**
 * Validate session data
 *
 * @param data - Session data to validate
 * @returns Validation result with isValid flag and errors
 */
export function validateSessionData(data: {
  title?: string;
  description?: string;
  tags?: string[];
  difficulty?: string;
}): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (data.title && typeof data.title !== 'string') {
    errors.push('Title must be a string');
  }

  if (data.title && data.title.length > 200) {
    errors.push('Title must be less than 200 characters');
  }

  if (data.description && typeof data.description !== 'string') {
    errors.push('Description must be a string');
  }

  if (data.description && data.description.length > 1000) {
    errors.push('Description must be less than 1000 characters');
  }

  if (data.tags && !Array.isArray(data.tags)) {
    errors.push('Tags must be an array');
  }

  if (data.tags && data.tags.some(tag => typeof tag !== 'string')) {
    errors.push('All tags must be strings');
  }

  if (data.difficulty && !['easy', 'medium', 'hard', 'beginner', 'intermediate', 'advanced'].includes(data.difficulty)) {
    errors.push('Difficulty must be easy, medium, hard, beginner, intermediate, or advanced');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Estimate reading time for text content
 *
 * @param text - Text content to estimate reading time for
 * @returns Estimated reading time in minutes
 */
export function estimateReadingTime(text: string): number {
  const wordsPerMinute = 200; // Average reading speed
  const words = text.split(/\s+/).length;
  return Math.ceil(words / wordsPerMinute);
}

/**
 * Generate session statistics from messages
 *
 * @param messages - Array of messages
 * @returns Session statistics
 */
export function generateSessionStatistics(messages: Array<{
  role: string;
  content: string;
  timestamp: Date;
  tokens_used?: number;
}>): {
  totalMessages: number;
  userMessages: number;
  assistantMessages: number;
  totalTokensUsed: number;
  sessionDuration: number;
  averageResponseTime: number;
} {
  const userMessages = messages.filter(msg => msg.role === 'user').length;
  const assistantMessages = messages.filter(msg => msg.role === 'assistant').length;
  const totalTokensUsed = messages.reduce((sum, msg) => sum + (msg.tokens_used || 0), 0);

  let sessionDuration = 0;
  if (messages.length >= 2) {
    const firstMessage = messages[0].timestamp;
    const lastMessage = messages[messages.length - 1].timestamp;
    sessionDuration = Math.floor((lastMessage.getTime() - firstMessage.getTime()) / 1000);
  }

  // Calculate average response time (time between user message and assistant response)
  let totalResponseTime = 0;
  let responseCount = 0;

  for (let i = 0; i < messages.length - 1; i++) {
    const currentMessage = messages[i];
    const nextMessage = messages[i + 1];

    if (currentMessage.role === 'user' && nextMessage.role === 'assistant') {
      totalResponseTime += nextMessage.timestamp.getTime() - currentMessage.timestamp.getTime();
      responseCount++;
    }
  }

  const averageResponseTime = responseCount > 0 ? Math.floor(totalResponseTime / responseCount / 1000) : 0;

  return {
    totalMessages: messages.length,
    userMessages,
    assistantMessages,
    totalTokensUsed,
    sessionDuration,
    averageResponseTime
  };
}