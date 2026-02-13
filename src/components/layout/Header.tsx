import React from 'react';
import {
  AppBar,
  Box,
  IconButton,
  Toolbar,
  Typography,
  useMediaQuery
} from '@mui/material';
import { Settings as SettingsIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import { useDevice } from '../../hooks/useDevice';

// Sub-components
import { NavigationDrawer } from './header/NavigationDrawer';
import { DeviceSelector } from './header/DeviceSelector';
import { BatteryIndicator } from './header/BatteryIndicator';
import { ConnectionButton } from './header/ConnectionButton';
import { DoorControlButton } from './header/DoorControlButton';
import { LogRefreshButton } from './header/LogRefreshButton';

interface HeaderProps {
  onSettingsClick?: () => void;
  showNotification: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  hideNotification: () => void;
}

export const Header = ({ showNotification, hideNotification }: HeaderProps) => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { knownDevices } = useDevice();

  const handleSettingsClick = (e: React.MouseEvent<HTMLElement>) => {
    (e.currentTarget as HTMLElement).blur();
    navigate('/settings');
  };

  return (
    <AppBar position="static">
      <Toolbar>
        {/* Navigation Drawer (includes Menu Button) */}
        <NavigationDrawer showNotification={showNotification} />

        {/* Title - show only if single device */}
        {knownDevices.length <= 1 && (
          <Typography
            variant="h6"
            component="div"
            sx={{ flexGrow: 1 }}
            data-testid="app-header-title"
          >
            Boks BLE
          </Typography>
        )}

        {/* Spacer if title is hidden (multiple devices) to push items to right */}
        {knownDevices.length > 1 && <Box sx={{ flexGrow: 1 }} />}

        {/* Device Selector (handles its own visibility) */}
        <DeviceSelector />

        {/* Battery Indicator */}
        <BatteryIndicator />

        {/* Door Control */}
        <DoorControlButton showNotification={showNotification} />

        {/* Connection Button */}
        <ConnectionButton
          showNotification={showNotification}
          hideNotification={hideNotification}
        />

        {/* Log Refresh Button */}
        <LogRefreshButton
          showNotification={showNotification}
          hideNotification={hideNotification}
        />

        {/* Settings Button - only show on desktop */}
        {!isMobile && (
          <IconButton color="inherit" onClick={handleSettingsClick} size="small">
            <SettingsIcon />
          </IconButton>
        )}
      </Toolbar>
    </AppBar>
  );
};
