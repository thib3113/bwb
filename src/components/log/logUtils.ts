import { TFunction } from 'i18next';
import { ParsedLog } from '../../utils/logParser';

// Define a type for the log object as passed from LogViewer
export interface ParsedLogDisplay extends ParsedLog {
  fullDate: string;
}

/**
 * Format log date according to requirements:
 * - Day/Month Hour:Minute (e.g., 24/12 14:30)
 * - If older than 1 year, include year (e.g., 24/12/2024 14:30)
 * @param timestamp - The timestamp to format (number or string)
 * @param locale
 * @returns Formatted date string
 */
export function formatLogDate(timestamp: number | string, locale: string): string {
  const date = new Date(timestamp);
  const now = new Date();

  // Calculate if the date is older than 1 year
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(now.getFullYear() - 1);

  const isOlderThanYear = date < oneYearAgo;

  if (isOlderThanYear) {
    // Include year: Day/Month/Year Hour:Minute
    return date.toLocaleDateString(locale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } else {
    // Without year: Day/Month Hour:Minute
    return date.toLocaleDateString(locale, {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }
}

// Helper function to translate detail keys
export function translateKey(key: string, t: TFunction<'logs'>): string {
  const translations: Record<string, string> = {
    code_index: t('code_index'),
    code_value: t('code_value'),
    code: t('code_value'),
    method: t('method'),
    result: t('result'),
    reason: t('reason'),
    error_code: t('error_code'),
    weight: t('weight'),
    battery_level: t('battery_level'),
    tagId: t('tag_id'),
    tag_uid: t('tag_uid'),
    tag_type: t('tag_type'),
    initiatedBy: t('initiated_by'),
    bootReason: t('boot_reason'),
    payload: t('payload'),
  };

  return translations[key] || key;
}
