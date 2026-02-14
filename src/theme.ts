import { createTheme } from '@mui/material/styles';

export const createAppTheme = (mode: 'light' | 'dark' | 'system' | 'matrix') => {
  if (mode === 'matrix') {
    return createTheme({
      palette: {
        mode: 'dark',
        primary: {
          main: '#00FF00', // Matrix Green
          contrastText: '#000000'
        },
        secondary: {
          main: '#003300', // Darker Green
          contrastText: '#00FF00'
        },
        error: {
          main: '#FF0000',
          contrastText: '#000000'
        },
        success: {
          main: '#00FF00',
          contrastText: '#000000'
        },
        warning: {
          main: '#FFFF00',
          contrastText: '#000000'
        },
        background: {
          default: '#000000',
          paper: '#001100' // Very dark green
        },
        text: {
          primary: '#00FF00',
          secondary: '#00CC00'
        },
        divider: '#003300',
        action: {
          active: '#00FF00', // Default icon color
          hover: 'rgba(0, 255, 0, 0.08)',
          selected: 'rgba(0, 255, 0, 0.16)',
          disabled: 'rgba(0, 255, 0, 0.3)',
          disabledBackground: 'rgba(0, 255, 0, 0.12)'
        }
      },
      typography: {
        fontFamily: '"Courier New", "Courier", monospace',
        h4: {
          fontWeight: 600,
          textShadow: '0 0 5px #00FF00'
        },
        h5: {
          fontWeight: 600,
          textShadow: '0 0 5px #00FF00'
        },
        allVariants: {
          color: '#00FF00'
        }
      },
      components: {
        MuiButton: {
          styleOverrides: {
            root: {
              textTransform: 'none',
              borderRadius: 0, // Matrix style: blocky
              border: '1px solid #00FF00',
              '&:hover': {
                backgroundColor: '#003300',
                boxShadow: '0 0 10px #00FF00'
              }
            },
            contained: {
              backgroundColor: '#003300',
              color: '#00FF00',
              '&:hover': {
                backgroundColor: '#006600'
              }
            }
          }
        },
        MuiPaper: {
          styleOverrides: {
            root: {
              backgroundImage: 'none',
              border: '1px solid #003300'
            }
          }
        },
        MuiAppBar: {
          defaultProps: {
            enableColorOnDark: true
          },
          styleOverrides: {
            root: {
              backgroundColor: '#000000',
              borderBottom: '1px solid #00FF00'
            }
          }
        },
        // Override Icon colors explicitly to ensure they are green
        MuiSvgIcon: {
          styleOverrides: {
            root: {
              color: '#00FF00'
            }
          }
        },
        MuiListItemIcon: {
          styleOverrides: {
            root: {
              color: '#00FF00'
            }
          }
        },
        MuiIconButton: {
          styleOverrides: {
            root: {
              color: '#00FF00',
              '&:hover': {
                backgroundColor: 'rgba(0, 255, 0, 0.1)'
              }
            }
          }
        }
      }
    });
  }

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
