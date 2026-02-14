import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useBLEConnection } from '../hooks/useBLEConnection';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useDevice } from '../hooks/useDevice';
import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  Tooltip,
  Typography,
  useMediaQuery
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import BatteryFullIcon from '@mui/icons-material/BatteryFull';
import BatteryAlertIcon from '@mui/icons-material/BatteryAlert';
import BluetoothConnectedIcon from '@mui/icons-material/BluetoothConnected';
import BluetoothDisabledIcon from '@mui/icons-material/BluetoothDisabled';
import BluetoothSearchingIcon from '@mui/icons-material/BluetoothSearching';

export const ConnectionManager = () => {
  const { t } = useTranslation();
  const { isConnected, isConnecting, device, connect, disconnect } = useBLEConnection();
  const { registerDevice } = useDevice();
  const [batteryLevel] = useLocalStorage<number | null>(
    'boks-battery-level',
    null,
    device?.id || 'default'
  );
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const registeredDeviceIdRef = useRef<string | null>(null);

  // Register device when connected
  useEffect(() => {
    if (isConnected && device) {
      // Prevent repeated registration for the same device ID
      if (registeredDeviceIdRef.current === device.id) {
        return;
      }

      registeredDeviceIdRef.current = device.id;
      registerDevice(device);
    } else if (!isConnected) {
      // Reset ref when disconnected to allow re-registration on new connection
      registeredDeviceIdRef.current = null;
    }
  }, [isConnected, device, registerDevice]);

  const handleConnectClick = async () => {
    if (isConnected) {
      disconnect();
    } else {
      try {
        await connect();
      } catch (error) {
        console.error('Connection failed:', error);
      }
    }
  };

  // Function to get battery level display
  const getBatteryDisplay = () => {
    if (batteryLevel === null) return 'N/A';
    if (batteryLevel < 20) return `⚠️ ${batteryLevel}%`;
    return `${batteryLevel}%`;
  };

  // Function to get battery icon
  const getBatteryIcon = () => {
    if (batteryLevel === null) return <BatteryFullIcon />;
    if (batteryLevel < 20) return <BatteryAlertIcon color="error" />;
    return <BatteryFullIcon color="success" />;
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }} data-testid="connection-status-box">
      <Tooltip title={isConnected ? t('connected') : t('disconnected')}>
        <IconButton size="small" color={isConnected ? 'success' : 'default'}>
          {isConnected ? <BluetoothConnectedIcon /> : <BluetoothDisabledIcon />}
        </IconButton>
      </Tooltip>

      {isMobile ? (
        <IconButton
          onClick={handleConnectClick}
          disabled={isConnecting}
          color={isConnected ? 'success' : 'primary'}
          size="small"
        >
          {isConnecting ? (
            <BluetoothSearchingIcon />
          ) : isConnected ? (
            <BluetoothDisabledIcon />
          ) : (
            <BluetoothConnectedIcon />
          )}
        </IconButton>
      ) : (
        <Button
          onClick={handleConnectClick}
          disabled={isConnecting}
          variant={isConnected ? 'outlined' : 'contained'}
          size="small"
        >
          {isConnected ? t('connection.disconnect') : t('connection.connect')}
          {isConnecting && <CircularProgress size={16} sx={{ ml: 1, color: 'inherit' }} />}
        </Button>
      )}

      {isConnected && batteryLevel !== null && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {getBatteryIcon()}
          <Typography variant="caption">{getBatteryDisplay()}</Typography>
        </Box>
      )}
    </Box>
  );
};
