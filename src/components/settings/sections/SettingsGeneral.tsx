import React from 'react';
import { FormControl, InputLabel, Select, MenuItem } from "@mui/material";
import { useTranslation } from 'react-i18next';
import { LANGUAGES, THEME_MODES } from '../../../utils/constants';

interface SettingsGeneralProps {
  language: string;
  theme: string;
  onLanguageChange: (value: string) => void;
  onThemeChange: (value: string) => void;
}

export const SettingsGeneral: React.FC<SettingsGeneralProps> = ({
  language,
  theme,
  onLanguageChange,
  onThemeChange
}) => {
  const { t } = useTranslation(['common', 'settings']);

  return (
    <>
      <FormControl fullWidth margin="normal">
        <InputLabel>{t('language.select')}</InputLabel>
        <Select
          value={language}
          onChange={(e) => onLanguageChange((e.target as HTMLInputElement).value)}
          label={t('language.select')}
        >
          <MenuItem value={LANGUAGES.EN}>{t('language.english')}</MenuItem>
          <MenuItem value={LANGUAGES.FR}>{t('language.french')}</MenuItem>
        </Select>
      </FormControl>
      <FormControl fullWidth margin="normal">
        <InputLabel>{t('settings:theme.label')}</InputLabel>
        <Select
          value={theme}
          onChange={(e) => onThemeChange((e.target as HTMLInputElement).value)}
          label={t('settings:theme.label')}
        >
          <MenuItem value={THEME_MODES.SYSTEM}>{t('settings:theme.system')}</MenuItem>
          <MenuItem value={THEME_MODES.LIGHT}>{t('settings:theme.light')}</MenuItem>
          <MenuItem value={THEME_MODES.DARK}>{t('settings:theme.dark')}</MenuItem>
        </Select>
      </FormControl>
    </>
  );
};
