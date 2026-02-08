import { createTheme } from '@mui/material/styles';

export const createAppTheme = (mode: 'light' | 'dark' | 'system') => {
  const isDarkMode = mode === 'dark';
  return createTheme({
    palette: {
      mode: isDarkMode ? 'dark' : 'light',
      primary: {
        main: '#1a73e8' // Original blue
      },
      secondary: {
        main: '#50e3c2' // Secondary color from custom.css
      },
      error: {
        main: '#e74c3c' // Danger color from custom.css
      },
      success: {
        main: '#2ecc71' // Success color from custom.css
      },
      warning: {
        main: '#f39c12' // Warning color from custom.css
      },
      background: {
        default: isDarkMode ? '#121212' : '#f8f9fa',
        paper: isDarkMode ? '#1e1e1e' : '#ffffff'
      }
    },
    typography: {
      fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
      h4: {
        fontWeight: 600
      },
      h5: {
        fontWeight: 600
      }
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none' // Disable uppercase transformation
          }
        }
      },
      MuiAppBar: {
        defaultProps: {
          enableColorOnDark: true
        }
      }
    }
  });
};

// Legacy hook for backward compatibility (not recommended for new code)
export const useAppTheme = () => {
  // This is a simplified version that doesn't rely on the context
  // It's better to use the ThemeContext directly in components
  console.warn('useAppTheme is deprecated. Use ThemeContext directly.');
  // We can't easily return a theme here without context or hooks if we want it to be reactive
  // But for legacy support we might just return a default
  return createAppTheme('light'); // Default to light mode
};
