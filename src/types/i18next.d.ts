import 'i18next';
import common from '../locales/fr/common.json';
import codes from '../locales/fr/codes.json';
import settings from '../locales/fr/settings.json';
import wizard from '../locales/fr/wizard.json';
import logs from '../locales/fr/logs.json';
import header from '../locales/fr/header.json';

export const resources = {
  common,
  codes,
  settings,
  wizard,
  logs,
  header,
} as const;

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common';
    resources: typeof resources;
  }
}
