import React from 'react';
import { FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { LANGUAGES, THEME_MODES, STORAGE_KEYS } from '../../../utils/constants';

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
  const isMatrixUnlocked = localStorage.getItem(STORAGE_KEYS.MATRIX_UNLOCKED) === 'true';

  return (
    <>
      <FormControl fullWidth margin="normal">
        <InputLabel>{t('language.select')}</InputLabel>
        <Select
          value={language}
          onChange={(e) => onLanguageChange(e.target.value as string)}
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
          onChange={(e) => onThemeChange(e.target.value as string)}
          label={t('settings:theme.label')}
        >
          <MenuItem value={THEME_MODES.SYSTEM}>{t('settings:theme.system')}</MenuItem>
          <MenuItem value={THEME_MODES.LIGHT}>{t('settings:theme.light')}</MenuItem>
          <MenuItem value={THEME_MODES.DARK}>{t('settings:theme.dark')}</MenuItem>
          {isMatrixUnlocked && <MenuItem value={THEME_MODES.MATRIX}>Matrix</MenuItem>}
        </Select>
      </FormControl>
    </>
  );
};
