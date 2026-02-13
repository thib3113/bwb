import React from 'react';
import { Box, Tooltip, Typography } from '@mui/material';
import { BatteryAlert, BatteryFull, BatteryStd } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useDevice } from '../../../hooks/useDevice';
import { useBLEConnection } from '../../../hooks/useBLEConnection';

export const BatteryIndicator = () => {
  const { t } = useTranslation('header');
  const { activeDevice } = useDevice();
  const { device } = useBLEConnection();

  // Use either activeDevice (from DB) or device (from BLE service) battery level
  const displayBatteryLevel = activeDevice?.battery_level ?? device?.battery_level;

  if (displayBatteryLevel === undefined) {
    return null;
  }

  return (
    <Box
      data-testid="connection-status-indicator"
      sx={{ display: 'flex', alignItems: 'center', mr: 1 }}
    >
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
            <BatteryAlert color="error" fontSize="small" sx={{ ml: 0.25 }} data-testid="battery-icon-alert" />
          ) : displayBatteryLevel > 90 ? (
            <BatteryFull color="inherit" fontSize="small" sx={{ ml: 0.25 }} data-testid="battery-icon-full" />
          ) : (
            <BatteryStd color="inherit" fontSize="small" sx={{ ml: 0.25 }} data-testid="battery-icon-std" />
          )}
        </Box>
      </Tooltip>
    </Box>
  );
};
