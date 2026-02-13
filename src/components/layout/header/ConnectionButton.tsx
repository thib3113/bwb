import React, { useMemo } from 'react';
import { IconButton, Badge, CircularProgress } from '@mui/material';
import { Bluetooth, BluetoothDisabled } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useBLEConnection } from '../../../hooks/useBLEConnection';
import { useCodeLogic } from '../../../hooks/useCodeLogic';
import { translateBLEError } from '../../../utils/bleUtils';

interface ConnectionButtonProps {
  showNotification: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  hideNotification: () => void;
}

export const ConnectionButton = ({ showNotification, hideNotification }: ConnectionButtonProps) => {
  const { t } = useTranslation(['common', 'header']);
  const { isConnected, isConnecting, connect, disconnect } = useBLEConnection();
  const { codes } = useCodeLogic(showNotification, hideNotification);

  // Calculate count of codes with pending_add or pending_delete status
  const pendingCodesCount = useMemo(() => {
    return codes.filter((code) => code.status === 'pending_add' || code.status === 'pending_delete')
      .length;
  }, [codes]);

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

  return (
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
            <Bluetooth data-testid="status-icon-connected" />
          ) : (
            <BluetoothDisabled data-testid="status-icon-disconnected" />
          )}
        </Badge>
      )}
    </IconButton>
  );
};
