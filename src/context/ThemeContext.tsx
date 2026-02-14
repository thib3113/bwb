import { ReactNode, useEffect, useMemo, useState } from 'react';
import { useMediaQuery } from '@mui/material';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { createAppTheme } from '../theme';
import { ThemeContext } from './Contexts';
import { STORAGE_KEYS, THEME_MODES } from '../utils/constants';

interface AppThemeProviderProps {
  children: ReactNode;
}

export const AppThemeProvider = ({ children }: AppThemeProviderProps) => {
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  const [mode, setMode] = useState(
    () => localStorage.getItem(STORAGE_KEYS.THEME_MODE) || THEME_MODES.SYSTEM
  );

  const isDarkMode = mode === THEME_MODES.DARK || (mode === THEME_MODES.SYSTEM && prefersDarkMode);

  const themeModeParam = useMemo(() => {
    if (mode === THEME_MODES.MATRIX) return 'matrix';
    return isDarkMode ? 'dark' : 'light';
  }, [mode, isDarkMode]);

  const theme = useMemo(
    () => createAppTheme(themeModeParam as 'light' | 'dark' | 'system' | 'matrix'),
    [themeModeParam]
  );

  const toggleTheme = () => {
    setMode((prevMode) => {
      // If we are in Matrix mode, return to system or light
      if (prevMode === THEME_MODES.MATRIX) return THEME_MODES.SYSTEM;

      if (prevMode === THEME_MODES.LIGHT) return THEME_MODES.DARK;
      if (prevMode === THEME_MODES.DARK) return THEME_MODES.SYSTEM;
      return THEME_MODES.LIGHT;
    });
  };

  const setThemeMode = (newMode: string) => {
    setMode(newMode);
  };

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.THEME_MODE, mode);
  }, [mode]);

  return (
    <ThemeContext.Provider value={{ mode, toggleTheme, setThemeMode }}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};
