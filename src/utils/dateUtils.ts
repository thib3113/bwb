/**
 * Format a date as a relative time string (e.g., "2 days ago", "yesterday").
 * @param date - The date to format.
 * @param locale - The locale to use (default: 'en').
 * @returns The formatted relative time string.
 */
export function formatRelativeTime(date: Date, locale: string = 'en'): string {
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  const diffInSeconds = (date.getTime() - Date.now()) / 1000;

  // Handle seconds
  if (Math.abs(diffInSeconds) < 60) {
    return formatter.format(Math.round(diffInSeconds), 'second');
  }

  // Handle minutes
  const diffInMinutes = diffInSeconds / 60;
  if (Math.abs(diffInMinutes) < 60) {
    return formatter.format(Math.round(diffInMinutes), 'minute');
  }

  // Handle hours
  const diffInHours = diffInMinutes / 60;
  if (Math.abs(diffInHours) < 24) {
    return formatter.format(Math.round(diffInHours), 'hour');
  }

  // Handle days
  const diffInDays = diffInHours / 24;
  if (Math.abs(diffInDays) < 30) {
    return formatter.format(Math.round(diffInDays), 'day');
  }

  // Handle months
  const diffInMonths = diffInDays / 30;
  if (Math.abs(diffInMonths) < 12) {
    return formatter.format(Math.round(diffInMonths), 'month');
  }

  // Handle years
  const diffInYears = diffInDays / 365;
  return formatter.format(Math.round(diffInYears), 'year');
}
