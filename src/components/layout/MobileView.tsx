import React, { useState } from 'react';
import {
  BottomNavigation,
  BottomNavigationAction,
  Box,
  Button,
  Paper,
  Typography
} from '@mui/material';
import { Code, History, Settings } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { CodeManager } from '../codes/CodeManager';
import { LogViewer } from '../log/LogViewer';
import { SettingsContent } from '../settings/SettingsContent';
import { useDevice } from '../../hooks/useDevice';
import { SettingsConfig } from '../settings/types';

interface MobileViewProps {
  showNotification: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  hideNotification: () => void;
  isConnected: boolean;
}

export const MobileView = ({
  showNotification,
  hideNotification,
  isConnected
}: MobileViewProps) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const { t } = useTranslation(['common', 'codes', 'logs', 'settings']);
  const { activeDevice } = useDevice();
  const location = useLocation();
  const navigate = useNavigate();

  // Determine active tab based on current route
  const getActiveTab = () => {
    switch (location.pathname) {
      case '/logs':
        return 1;
      case '/settings':
        return 2;
      default:
        return 0; // Default to codes
    }
  };

  const activeTab = getActiveTab();

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    switch (newValue) {
      case 0:
        navigate('/codes');
        break;
      case 1:
        navigate('/logs');
        break;
      case 2:
        navigate('/settings');
        break;
      default:
        navigate('/codes');
    }
  };

  // Handler for saving settings on mobile
  const handleSettingsSave = (config: SettingsConfig) => {
    console.log('Settings saved on mobile:', config);
    showNotification(t('settings:saved'), 'success');
    // Stay on settings page after saving
  };

  // Handler for canceling settings on mobile
  const handleSettingsCancel = () => {
    navigate('/codes');
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Main Content */}
      <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
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
              <Box sx={{ pb: 8 }}>
                {' '}
                {/* Add padding bottom for the fixed action bar */}
                <SettingsContent
                  onSave={handleSettingsSave}
                  onCancel={handleSettingsCancel}
                  isModal={false} // Render as a full page, not a modal
                />
                {/* Fixed Action Bar for Settings */}
                <Paper
                  elevation={3}
                  sx={{
                    position: 'fixed',
                    bottom: 53, // Adjusted for 3px alignment
                    left: 0,
                    right: 0,
                    p: 2,
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: 1,
                    bgcolor: 'background.paper',
                    zIndex: 1
                  }}
                >
                  <Button onClick={handleSettingsCancel}>{t('cancel')}</Button>
                  <Button
                    onClick={() => {
                      // We need to access the handleSave function from SettingsContent
                      // Since it's not directly accessible, we'll trigger a custom event
                      // The SettingsContent component will listen for this event
                      window.dispatchEvent(new CustomEvent('mobileSettingsSave'));
                    }}
                    variant="contained"
                  >
                    {t('save')}
                  </Button>
                </Paper>
              </Box>
            }
          />
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
      </Box>

      {/* Bottom Navigation */}
      <BottomNavigation
        value={activeTab}
        onChange={handleTabChange}
        sx={{
          width: '100%',
          borderTop: '1px solid rgba(0, 0, 0, 0.12)',
          position: 'sticky',
          bottom: 0,
          '& .MuiBottomNavigationAction-root.Mui-selected': {
            border: 'none',
            outline: 'none'
          },
          '& .MuiBottomNavigationAction-root:focus': {
            border: 'none',
            outline: 'none'
          }
        }}
      >
        <BottomNavigationAction label={t('codes:title')} icon={<Code />} />
        <BottomNavigationAction label={t('logs:title')} icon={<History />} />
        <BottomNavigationAction label={t('settings:title')} icon={<Settings />} />
      </BottomNavigation>
    </Box>
  );
};
