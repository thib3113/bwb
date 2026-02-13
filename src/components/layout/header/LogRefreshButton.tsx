import React, { useState } from 'react';
import { IconButton, CircularProgress } from '@mui/material';
import { Refresh } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useBLEConnection } from '../../../hooks/useBLEConnection';
import { useBLELogs } from '../../../hooks/useBLELogs';
import { runTask } from '../../../utils/uiUtils';

interface LogRefreshButtonProps {
  showNotification: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  hideNotification: () => void;
}

export const LogRefreshButton = ({ showNotification, hideNotification }: LogRefreshButtonProps) => {
  const { t } = useTranslation('logs');
  const { isConnected } = useBLEConnection();
  const { isSyncingLogs, requestLogs } = useBLELogs();
  const [isRefreshingLogs, setIsRefreshingLogs] = useState(false);

  if (!isConnected) {
    return null;
  }

  const handleRefreshLogs = async () => {
    setIsRefreshingLogs(true);
    await runTask(requestLogs, {
      showNotification,
      hideNotification,
      loadingMsg: t('refresh_started'),
      successMsg: t('refresh_success'),
      errorMsg: t('refresh_failed')
    });
    setIsRefreshingLogs(false);
  };

  return (
    <IconButton
      color="inherit"
      onClick={handleRefreshLogs}
      disabled={isRefreshingLogs || isSyncingLogs}
      size="small"
      sx={{ mr: 0.5 }}
      data-testid="refresh-logs-button"
    >
      {isRefreshingLogs || isSyncingLogs ? (
        <CircularProgress size={20} color="inherit" />
      ) : (
        <Refresh />
      )}
    </IconButton>
  );
};
