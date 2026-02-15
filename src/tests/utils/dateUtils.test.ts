import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { formatRelativeTime } from '../../utils/dateUtils';

describe('formatRelativeTime', () => {
  const now = new Date('2024-05-15T12:00:00Z');

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('formats seconds correctly', () => {
    const date = new Date(now.getTime() - 10 * 1000); // 10 seconds ago
    expect(formatRelativeTime(date, 'en')).toBe('10 seconds ago');
  });

  it('formats minutes correctly', () => {
    const date = new Date(now.getTime() - 2 * 60 * 1000); // 2 minutes ago
    expect(formatRelativeTime(date, 'en')).toBe('2 minutes ago');
  });

  it('formats hours correctly', () => {
    const date = new Date(now.getTime() - 3 * 60 * 60 * 1000); // 3 hours ago
    expect(formatRelativeTime(date, 'en')).toBe('3 hours ago');
  });

  it('formats days correctly', () => {
    const date = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000); // 5 days ago
    expect(formatRelativeTime(date, 'en')).toBe('5 days ago');
  });

  it('formats yesterday correctly', () => {
    const date = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 1 day ago
    expect(formatRelativeTime(date, 'en')).toBe('yesterday');
  });

  it('formats months correctly', () => {
    const date = new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000); // 40 days ago
    expect(formatRelativeTime(date, 'en')).toBe('last month');
  });
});
