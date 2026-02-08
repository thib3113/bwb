import { useState } from 'react';
import { Box, Grid, Paper, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { Route, Routes } from 'react-router-dom';
import { CodeManager } from '../codes/CodeManager';
import { LogViewer } from '../log/LogViewer';
import { SettingsContent } from '../settings/SettingsContent';
import { useDevice } from '../../hooks/useDevice';

interface DesktopViewProps {
  showNotification: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  hideNotification: () => void;
  isConnected: boolean;
}

export const DesktopView = ({
  showNotification,
  hideNotification,
  isConnected
}: DesktopViewProps) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const { t } = useTranslation(['common', 'logs', 'settings']);
  const { activeDevice } = useDevice();

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      <Grid container spacing={3}>
        {/* Left Panel - Code Manager or Settings */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper
            elevation={2}
            sx={{
              p: 3,
              height: '100%',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <Routes>
              <Route
                path="/codes"
                element={
                  <CodeManager
                    showAddForm={showAddForm}
                    setShowAddForm={setShowAddForm}
                    showNotification={showNotification}
                    hideNotification={hideNotification}
                  />
                }
              />
              <Route path="/settings" element={<SettingsContent />} />
              {/* Default route */}
              <Route
                path="/"
                element={
                  <CodeManager
                    showAddForm={showAddForm}
                    setShowAddForm={setShowAddForm}
                    showNotification={showNotification}
                    hideNotification={hideNotification}
                  />
                }
              />
            </Routes>
          </Paper>
        </Grid>

        {/* Right Panel - Log Viewer */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper
            elevation={2}
            sx={{
              p: 3,
              height: '100%',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <Routes>
              <Route
                path="/logs"
                element={
                  isConnected || activeDevice ? (
                    <LogViewer
                      showNotification={showNotification}
                      hideNotification={hideNotification}
                    />
                  ) : (
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        height: '100%'
                      }}
                    >
                      <Typography variant="h6" color="textSecondary">
                        {t('logs:connect_to_view')}
                      </Typography>
                    </Box>
                  )
                }
              />
              <Route
                path="/settings"
                element={
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      height: '100%'
                    }}
                  >
                    <Typography variant="h6" color="textSecondary">
                      {t('settings:title')}
                    </Typography>
                  </Box>
                }
              />
              {/* Default and /codes routes show logs */}
              <Route
                path="*"
                element={
                  isConnected || activeDevice ? (
                    <LogViewer
                      showNotification={showNotification}
                      hideNotification={hideNotification}
                    />
                  ) : (
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        height: '100%'
                      }}
                    >
                      <Typography variant="h6" color="textSecondary">
                        {t('logs:connect_to_view')}
                      </Typography>
                    </Box>
                  )
                }
              />
            </Routes>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};
