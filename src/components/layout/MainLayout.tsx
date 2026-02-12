import { useEffect, useState } from 'react';
import { Box } from '@mui/material';
import { Header } from './Header';
import { SettingsModal } from '../settings/SettingsModal';
import { useError } from '../../hooks/useError';
import { Outlet } from 'react-router-dom';
import { SettingsConfig } from '../settings/types';
import { VersionBanner } from '../common/VersionBanner';

interface MainLayoutProps {
  showNotification: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  hideNotification: () => void;
}

export const MainLayout = ({ showNotification, hideNotification }: MainLayoutProps) => {
  const [showSettings, setShowSettings] = useState(false);
  const { lastError, clearError } = useError();

  useEffect(() => {
    if (lastError) {
      showNotification(lastError, 'error');
      clearError();
    }
  }, [lastError, showNotification, clearError]);

  const handleSettingsSave = (config: SettingsConfig) => {
    console.log('Settings saved:', config);
    showNotification('Settings saved successfully', 'success');
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Header */}
      <Header
        onSettingsClick={() => setShowSettings(true)}
        showNotification={showNotification}
        hideNotification={hideNotification}
      />

      {/* Version Banner - Non-blocking warning */}
      <VersionBanner />

      {/* Main Content */}
      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        <Outlet context={{ showNotification, hideNotification }} />
      </Box>
      {/* Settings Modal */}
      <SettingsModal
        open={showSettings}
        onClose={() => setShowSettings(false)}
        onSave={handleSettingsSave}
      />
    </Box>
  );
};
