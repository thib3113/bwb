import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// French
import frCommon from './locales/fr/common.json';
import frCodes from './locales/fr/codes.json';
import frSettings from './locales/fr/settings.json';
import frWizard from './locales/fr/wizard.json';
import frLogs from './locales/fr/logs.json';
import frHeader from './locales/fr/header.json';
import frMaintenance from './locales/fr/maintenance.json';
import frDfu from './locales/fr/dfu.json';

// English
import enCommon from './locales/en/common.json';
import enCodes from './locales/en/codes.json';
import enSettings from './locales/en/settings.json';
import enWizard from './locales/en/wizard.json';
import enLogs from './locales/en/logs.json';
import enHeader from './locales/en/header.json';
import enMaintenance from './locales/en/maintenance.json';
import enDfu from './locales/en/dfu.json';

const resources = {
  fr: {
    common: frCommon,
    codes: frCodes,
    settings: frSettings,
    wizard: frWizard,
    logs: frLogs,
    header: frHeader,
    maintenance: frMaintenance,
    dfu: frDfu
  },
  en: {
    common: enCommon,
    codes: enCodes,
    settings: enSettings,
    wizard: enWizard,
    logs: enLogs,
    header: enHeader,
    maintenance: enMaintenance,
    dfu: enDfu
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'fr',
    supportedLngs: ['en', 'fr'],
    load: 'languageOnly',
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng'
    },
    ns: ['common', 'codes', 'settings', 'wizard', 'logs', 'header', 'maintenance', 'dfu'],
    defaultNS: 'common',
    interpolation: {
      escapeValue: false
    },
    saveMissing: true,
    missingKeyHandler: (lng, ns, key) => {
      console.warn(`Missing translation: lng=${lng}, ns=${ns}, key=${key}`);
    }
  });

export default i18n;
