export const STORAGE_KEYS = {
  DATABASE_NAME: 'BoksDatabase',
  I18NEXT_LNG: 'i18nextLng',
  LANGUAGE: 'boks-language',
  BATTERY_LEVEL: 'boks-battery-level',
  THEME_MODE: 'themeMode'
} as const;

export const LANGUAGES = {
  EN: 'en',
  FR: 'fr'
} as const;

export const THEME_MODES = {
  SYSTEM: 'system',
  LIGHT: 'light',
  DARK: 'dark'
} as const;

export const IMPORT_EXPORT_MODES = {
  EXPORT: 'export',
  IMPORT: 'import'
} as const;

export const APP_DEFAULTS = {
  AUTHOR_ID: 'local-user'
} as const;

export const APP_EVENTS = {
  MOBILE_SETTINGS_SAVE: 'mobileSettingsSave'
};

export const GITHUB_REPO_URL = 'https://github.com/thib3113/boks-web-ble';
export const GITHUB_ISSUES_URL = `${GITHUB_REPO_URL}/issues`;
export const GITHUB_NEW_ISSUE_URL = `${GITHUB_ISSUES_URL}/new`;

export const SNACKBAR_SEVERITY = {
  SUCCESS: 'success',
  ERROR: 'error',
  INFO: 'info',
  WARNING: 'warning'
} as const;

export const MIN_FIRMWARE_VERSION = "4.1.14"