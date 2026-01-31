import { useTranslation } from 'react-i18next';
import { FormControl, MenuItem, Select, SelectChangeEvent } from '@mui/material';
import { LANGUAGES } from '../utils/constants';

export const LanguageSelector = () => {
  const { i18n } = useTranslation();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return (
    <FormControl size="small">
      <Select
        value={i18n.resolvedLanguage || i18n.language}
        onChange={(e: SelectChangeEvent) => changeLanguage(e.target.value)}
        sx={{ minWidth: 120 }}
      >
        <MenuItem value={LANGUAGES.EN}>English</MenuItem>
        <MenuItem value={LANGUAGES.FR}>Français</MenuItem>
      </Select>
    </FormControl>
  );
};
