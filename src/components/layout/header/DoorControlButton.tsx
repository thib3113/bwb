import React, { useState, useEffect } from 'react';
import { IconButton, Tooltip, CircularProgress } from '@mui/material';
import { MeetingRoom as MeetingRoomIcon } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useDoor } from '../../../hooks/useDoor';
import { useBLEConnection } from '../../../hooks/useBLEConnection';
import { useDevice } from '../../../hooks/useDevice';

interface DoorControlButtonProps {
  showNotification: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

export const DoorControlButton = ({ showNotification }: DoorControlButtonProps) => {
  const { t } = useTranslation('header');
  const { openDoor, doorStatus, isOpening } = useDoor();
  const { isConnected, getBatteryInfo } = useBLEConnection();
  const { activeDevice, updateDeviceBatteryLevel } = useDevice();

  const [waitingForClose, setWaitingForClose] = useState(false);

  // Monitor door status for closing event
  useEffect(() => {
    if (waitingForClose && doorStatus === 'closed') {
      // Defer state update to next tick to avoid cascading renders error
      setTimeout(() => {
        setWaitingForClose(false);
        showNotification(t('door_closed'), 'success');

        // Get battery info after door closes (Quirk: Battery/Temp update after open/close)
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

  return (
    <Tooltip title={isConnected ? t('open_door') : t('connect_to_open_door')}>
      <span>
        <IconButton
          aria-label="open door"
          data-testid="open-door-button"
          data-door-status={doorStatus}
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
  );
};
