import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AppBar,
  Badge,
  Box,
  CircularProgress,
  Divider,
  Drawer,
  FormControl,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Select,
  SelectChangeEvent,
  Toolbar,
  Tooltip,
  Typography,
  useMediaQuery
} from '@mui/material';
import {
  BatteryAlert,
  BatteryFull,
  BatteryStd,
  Bluetooth,
  BluetoothDisabled,
  BugReport as BugReportIcon,
  Build as BuildIcon,
  DeveloperMode as DeveloperIcon,
  Handyman as MaintenanceIcon,
  Home as HomeIcon,
  Info as InfoIcon,
  MeetingRoom as MeetingRoomIcon,
  Menu as MenuIcon,
  Refresh,
  Settings as SettingsIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import pkg from '../../../package.json';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import { useDevice } from '../../hooks/useDevice';
import { useBLEConnection } from '../../hooks/useBLEConnection';
import { useDoor } from '../../hooks/useDoor';
import { useBLELogs } from '../../hooks/useBLELogs';
import { useCodeLogic } from '../../hooks/useCodeLogic';
import { useDeveloperContext } from '../../context/DeveloperContextTypes';

import { runTask } from '../../utils/uiUtils';
import { translateBLEError } from '../../utils/bleUtils';

interface HeaderProps {
  onSettingsClick?: () => void;
  showNotification: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  hideNotification: () => void;
}

export const Header = ({ showNotification, hideNotification }: HeaderProps) => {
  const { t } = useTranslation(['header', 'common', 'logs', 'settings', 'wizard', 'codes']);
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const { isDeveloperMode, enableDeveloperMode } = useDeveloperContext();
  const [devClickCount, setDevClickCount] = useState(0);
  const devClickTimerRef = useRef<NodeJS.Timeout | null>(null);

  const { isConnected, isConnecting, device, connect, disconnect, getBatteryInfo } =
    useBLEConnection();

  const { openDoor, doorStatus, isOpening } = useDoor();

  const { isSyncingLogs, requestLogs } = useBLELogs();

  const { activeDevice, knownDevices, setActiveDevice, updateDeviceBatteryLevel } = useDevice();
  const { codes } = useCodeLogic(showNotification, hideNotification);

  // Use either activeDevice (from DB) or device (from BLE service) battery level
  const displayBatteryLevel = activeDevice?.battery_level ?? device?.battery_level;

  // Debug log for E2E
  useEffect(() => {
    if (isConnected) {
      console.log('[Header Debug] Connected', {
        hasActiveDevice: !!activeDevice,
        activeBattery: activeDevice?.battery_level,
        hasDevice: !!device,
        deviceBattery: device?.battery_level,
        displayBatteryLevel
      });
    }
  }, [isConnected, activeDevice, device, displayBatteryLevel]);

  const [isRefreshingLogs, setIsRefreshingLogs] = useState(false);
  const [waitingForClose, setWaitingForClose] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleVersionClick = (e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    if (isDeveloperMode) return;

    const newCount = devClickCount + 1;
    setDevClickCount(newCount);

    if (devClickTimerRef.current) {
      clearTimeout(devClickTimerRef.current);
    }

    if (newCount >= 7) {
      enableDeveloperMode();
      showNotification(t('settings:developer.enabled_success'), 'success');
      setDevClickCount(0);
    } else {
      devClickTimerRef.current = setTimeout(() => {
        setDevClickCount(0);
      }, 3000);
    }
  };

  // Calculate percentage for visual feedback (0 to 100%)
  // Clicks 1 to 7 map to ~14% to 100%
  const devProgress = Math.min(100, (devClickCount / 7) * 100);

  // Calculate count of codes with pending_add or pending_delete status
  const pendingCodesCount = useMemo(() => {
    return codes.filter((code) => code.status === 'pending_add' || code.status === 'pending_delete')
      .length;
  }, [codes]);

  const toggleDrawer =
    (open: boolean) =>
    (event: React.KeyboardEvent<HTMLElement> | React.MouseEvent<HTMLElement>) => {
      if (event.type === 'keydown') {
        const kbEvent = event as React.KeyboardEvent<HTMLElement>;
        if (kbEvent.key === 'Tab' || kbEvent.key === 'Shift') {
          return;
        }
      }
      setDrawerOpen(open);
    };

  const handleNavigation = (path: string) => (e: React.MouseEvent<HTMLElement>) => {
    (e.currentTarget as HTMLElement).blur();
    navigate(path);
    setDrawerOpen(false);
  };

  // Monitor door status for closing event
  useEffect(() => {
    if (waitingForClose && doorStatus === 'closed') {
      // Defer state update to next tick to avoid cascading renders error
      setTimeout(() => {
        setWaitingForClose(false);
        showNotification(t('door_closed'), 'success');

        // Get battery info after door closes
        getBatteryInfo()
          .then(async (info) => {
            if (info) {
              const level = info.getUint8(0);
              showNotification(t('battery_level', { level }), 'info');

              if (activeDevice?.id) {
                try {
                  await updateDeviceBatteryLevel(activeDevice.id, level);
                } catch (err) {
                  console.error('Failed to update device battery level:', err);
                }
              }
            }
          })
          .catch((err) => {
            console.error('Failed to get battery info:', err);
          });
      }, 0);
    }
  }, [
    doorStatus,
    waitingForClose,
    getBatteryInfo,
    showNotification,
    t,
    activeDevice?.id,
    updateDeviceBatteryLevel
  ]);

  const handleConnectClick = async () => {
    if (isConnected) {
      disconnect();
    } else {
      try {
        await connect();
        showNotification(t('common:ble.connected'), 'success');
      } catch (error: unknown) {
        const errorKey = translateBLEError(error);
        const finalMessage = errorKey.startsWith('errors.') ? t(errorKey as string) : errorKey;
        showNotification(`${t('common:ble.connection_failed')}: ${finalMessage}`, 'error');
      }
    }
  };

  const handleOpenDoor = async () => {
    // Get the master code from active device
    const masterCode = activeDevice?.door_pin_code || '';

    if (!masterCode) {
      showNotification(t('master_code_required'), 'error');
      return;
    }

    try {
      await openDoor(masterCode);
      showNotification(t('door_opening'), 'info');
      setWaitingForClose(true);
    } catch (error: unknown) {
      if (error instanceof Error) {
        showNotification(t('door_open_failed') + ': ' + error.message, 'error');
      } else {
        showNotification(t('door_open_failed') + ': ' + String(error), 'error');
      }
      setWaitingForClose(false);
    }
  };

  const handleRefreshLogs = async () => {
    if (!isConnected) {
      showNotification(t('logs:not_connected'), 'error');
      return;
    }

    setIsRefreshingLogs(true);
    await runTask(requestLogs, {
      showNotification,
      hideNotification,
      loadingMsg: t('logs:refresh_started'),
      successMsg: t('logs:refresh_success'),
      errorMsg: t('logs:refresh_failed')
    });
    setIsRefreshingLogs(false);
  };

  const handleSettingsClick = (e: React.MouseEvent<HTMLElement>) => {
    (e.currentTarget as HTMLElement).blur();
    navigate('/settings');
  };

  return (
    <AppBar position="static">
      <Toolbar>
        <IconButton
          edge="start"
          color="inherit"
          aria-label="menu"
          onClick={toggleDrawer(true)}
          sx={{ mr: 2 }}
        >
          <MenuIcon />
        </IconButton>

        {knownDevices.length <= 1 && (
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Boks BLE
          </Typography>
        )}

        {/* Spacer if title is hidden to push items to right */}
        {knownDevices.length > 1 && <Box sx={{ flexGrow: 1 }} />}

        <Drawer anchor="left" open={drawerOpen} onClose={toggleDrawer(false)}>
          <Box
            sx={{ width: 250, display: 'flex', flexDirection: 'column', height: '100%' }}
            role="presentation"
            onClick={toggleDrawer(false)}
            onKeyDown={toggleDrawer(false)}
          >
            <List sx={{ flexGrow: 1 }}>
              <ListItem disablePadding>
                <ListItemButton onClick={handleNavigation('/')}>
                  <ListItemIcon>
                    <HomeIcon />
                  </ListItemIcon>
                  <ListItemText primary="Home" />
                </ListItemButton>
              </ListItem>
              <ListItem disablePadding>
                <ListItemButton onClick={handleNavigation('/my-boks')}>
                  <ListItemIcon>
                    <MeetingRoomIcon />
                  </ListItemIcon>
                  <ListItemText primary={t('common:my_boks', { count: knownDevices.length })} />
                </ListItemButton>
              </ListItem>
              <Divider />
              <ListItem disablePadding>
                <ListItemButton onClick={handleNavigation('/debug-wizard')}>
                  <ListItemIcon>
                    <BuildIcon />
                  </ListItemIcon>
                  <ListItemText primary={t('wizard:title')} />
                </ListItemButton>
              </ListItem>
              <ListItem disablePadding>
                <ListItemButton onClick={handleNavigation('/debug-view')}>
                  <ListItemIcon>
                    <BugReportIcon />
                  </ListItemIcon>
                  <ListItemText primary="Packet Logger" />
                </ListItemButton>
              </ListItem>
              <ListItem disablePadding>
                <ListItemButton onClick={handleNavigation('/maintenance')}>
                  <ListItemIcon>
                    <MaintenanceIcon />
                  </ListItemIcon>
                  <ListItemText primary={t('header:maintenance')} />
                </ListItemButton>
              </ListItem>
              <Divider />
              <ListItem disablePadding>
                <ListItemButton onClick={handleNavigation('/settings')}>
                  <ListItemIcon>
                    <SettingsIcon />
                  </ListItemIcon>
                  <ListItemText primary={t('settings:title')} />
                </ListItemButton>
              </ListItem>
              <ListItem disablePadding>
                <ListItemButton onClick={handleNavigation('/about')}>
                  <ListItemIcon>
                    <InfoIcon />
                  </ListItemIcon>
                  <ListItemText primary={t('settings:about.title')} />
                </ListItemButton>
              </ListItem>
              {isDeveloperMode && (
                <>
                  <Divider />
                  <ListItem disablePadding>
                    <ListItemButton onClick={handleNavigation('/developer')}>
                      <ListItemIcon>
                        <DeveloperIcon />
                      </ListItemIcon>
                      <ListItemText primary={t('settings:developer.menu_title')} />
                    </ListItemButton>
                  </ListItem>
                </>
              )}
            </List>
            <Divider />
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Typography
                variant="caption"
                color="text.secondary"
                display="block"
                onClick={handleVersionClick}
                sx={{
                  cursor: isDeveloperMode ? 'default' : 'pointer',
                  userSelect: 'none',
                  WebkitTapHighlightColor: 'transparent',
                  outline: 'none',
                  display: 'inline-block',
                  background:
                    devClickCount > 0
                      ? `linear-gradient(90deg, ${theme.palette.primary.main} ${devProgress}%, ${theme.palette.text.secondary} ${devProgress}%)`
                      : 'inherit',
                  backgroundClip: devClickCount > 0 ? 'text' : 'border-box',
                  WebkitBackgroundClip: devClickCount > 0 ? 'text' : 'border-box',
                  color: devClickCount > 0 ? 'transparent' : 'inherit',
                  transition: 'background 0.2s ease'
                }}
              >
                v{pkg.version}-{__COMMIT_HASH__}
              </Typography>
            </Box>
          </Box>
        </Drawer>

        {/* Device Selector - only show if there are multiple devices */}
        {knownDevices.length > 1 && (
          <FormControl sx={{ minWidth: 120, mr: 2, maxWidth: 150 }} size="small">
            <Select
              value={activeDevice?.id || ''}
              onChange={(e: SelectChangeEvent<string>) => setActiveDevice(e.target.value)}
              displayEmpty
              sx={{
                color: 'white',
                '& .MuiSelect-icon': { color: 'white' },
                '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255, 255, 255, 0.3)' },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(255, 255, 255, 0.7)'
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'white' }
              }}
            >
              {knownDevices.map((device) => (
                <MenuItem key={device.id} value={device.id}>
                  {device.friendly_name || device.id}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        {/* Connection Status & Battery */}
        <Box
          data-testid="connection-status-indicator"
          sx={{ display: 'flex', alignItems: 'center', mr: 1 }}
        >
          {isConnected ? (
            <Bluetooth data-testid="status-icon-connected" />
          ) : (
            <BluetoothDisabled data-testid="status-icon-disconnected" />
          )}

          {displayBatteryLevel !== undefined && (
            <Tooltip title={t('battery_level', { level: displayBatteryLevel })}>
              <Box sx={{ display: 'flex', alignItems: 'center', ml: 0.5 }}>
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 'medium' }}
                  data-testid="battery-level-text"
                >
                  {displayBatteryLevel}%
                </Typography>
                {displayBatteryLevel < 20 ? (
                  <BatteryAlert color="error" fontSize="small" sx={{ ml: 0.25 }} />
                ) : displayBatteryLevel > 90 ? (
                  <BatteryFull color="inherit" fontSize="small" sx={{ ml: 0.25 }} />
                ) : (
                  <BatteryStd color="inherit" fontSize="small" sx={{ ml: 0.25 }} />
                )}
              </Box>
            </Tooltip>
          )}
        </Box>

        {/* Open Door Button - always show, disabled when disconnected */}
        <Tooltip title={isConnected ? t('open_door') : t('connect_to_open_door')}>
          <span>
            <IconButton
              aria-label="open door"
              color="inherit"
              onClick={handleOpenDoor}
              disabled={isOpening || !isConnected}
              size="small"
              sx={{
                mr: 0.5,
                opacity: isConnected ? 1 : 0.5
              }}
            >
              {isOpening ? (
                <CircularProgress size={20} sx={{ color: 'white' }} />
              ) : (
                <MeetingRoomIcon
                  sx={doorStatus === 'open' ? { color: 'success.main' } : undefined}
                />
              )}
            </IconButton>
          </span>
        </Tooltip>

        {/* Connection Button */}
        <IconButton
          aria-label="connect"
          data-testid="connection-button"
          color="inherit"
          onClick={handleConnectClick}
          disabled={isConnecting}
          size="small"
          sx={{ mr: 0.5 }}
        >
          {isConnecting ? (
            <CircularProgress size={20} sx={{ color: 'white' }} />
          ) : (
            <Badge
              variant="dot"
              color="warning"
              overlap="circular"
              anchorOrigin={{
                vertical: 'top',
                horizontal: 'right'
              }}
              invisible={pendingCodesCount === 0}
            >
              {isConnected ? (
                <Bluetooth data-testid="bluetooth-connected-icon" />
              ) : (
                <BluetoothDisabled data-testid="bluetooth-disabled-icon" />
              )}
            </Badge>
          )}
        </IconButton>

        {/* Refresh Logs Button - only show when connected */}
        {isConnected && (
          <IconButton
            color="inherit"
            onClick={handleRefreshLogs}
            disabled={isRefreshingLogs || isSyncingLogs}
            size="small"
            sx={{ mr: 0.5 }}
          >
            {isRefreshingLogs || isSyncingLogs ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              <Refresh />
            )}
          </IconButton>
        )}

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
