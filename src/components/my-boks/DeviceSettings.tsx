import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  IconButton,
  InputAdornment,
  TextField,
  Typography,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useDevice } from '../../hooks/useDevice';
import { UserRole } from '../../types';

interface DeviceSettingsProps {
  deviceId: string;
}

export const DeviceSettings: React.FC<DeviceSettingsProps> = ({ deviceId }) => {
  const { t } = useTranslation(['common', 'settings']);
  const { activeDevice, updateDeviceDetails, removeDevice } = useDevice();
  const [visibleFields, setVisibleFields] = useState<Record<string, boolean>>({
    key: !activeDevice?.configuration_key,
    pin: !activeDevice?.door_pin_code,
  });
  const [deviceName, setDeviceName] = useState(activeDevice?.friendly_name || '');
  const [configurationKey, setConfigurationKey] = useState(activeDevice?.configuration_key || '');
  const [doorPinCode, setDoorPinCode] = useState(activeDevice?.door_pin_code || '');

  // Sync state with activeDevice changes (e.g. after loading from DB)
  React.useEffect(() => {
    if (activeDevice) {
      setDeviceName(activeDevice.friendly_name || '');
      setConfigurationKey(activeDevice.configuration_key || '');
      setDoorPinCode(activeDevice.door_pin_code || '');
    }
  }, [activeDevice]);

  const toggleFieldVisibility = (fieldId: string) => {
    setVisibleFields((prev) => ({
      ...prev,
      [fieldId]: !prev[fieldId],
    }));
  };

  const handleSave = async () => {
    if (activeDevice) {
      try {
        await updateDeviceDetails(deviceId, {
          friendly_name: deviceName,
          configuration_key: configurationKey,
          door_pin_code: doorPinCode,
        });
      } catch (error) {
        console.error('Failed to update device details:', error);
      }
    }
  };

  const handleRemoveDevice = async () => {
    if (activeDevice) {
      try {
        await removeDevice(deviceId);
      } catch (error) {
        console.error('Failed to remove device:', error);
      }
    }
  };

  const handleConfigKeyChange = (value: string) => {
    // Sanitize: trim, uppercase, keep only hex characters, take LAST 8 chars
    const sanitized = value
      .trim()
      .toUpperCase()
      .replace(/[^0-9A-F]/g, '');
    const finalValue = sanitized.slice(-8);
    setConfigurationKey(finalValue);
  };

  const handleDoorPinCodeChange = (value: string) => {
    // Sanitize: trim, uppercase
    const sanitized = value.trim().toUpperCase();
    setDoorPinCode(sanitized);
  };

  if (!activeDevice) return null;

  return (
    <Box sx={{ my: 2 }}>
      <Typography variant="subtitle1" gutterBottom>
        {t('devices.title')}
      </Typography>
      <Divider sx={{ mb: 2 }} />

      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label={t('devices.device_name')}
              value={deviceName}
              onChange={(e) => setDeviceName(e.currentTarget.value)}
              fullWidth
              size="small"
            />
            {activeDevice.role === UserRole.Admin && (
              <TextField
                label={t('settings:configuration_key.label')}
                value={configurationKey}
                onChange={(e) => handleConfigKeyChange(e.currentTarget.value)}
                fullWidth
                size="small"
                type={visibleFields[`key`] ? 'text' : 'password'}
                helperText={t('settings:configuration_key.helper')}
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label={t('settings:toggle_key_visibility')}
                          onClick={() => toggleFieldVisibility(`key`)}
                          edge="end"
                          size="small"
                        >
                          {visibleFields[`key`] ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
              />
            )}
            <TextField
              label={t('settings:door_pin_code')}
              value={doorPinCode}
              onChange={(e) => handleDoorPinCodeChange(e.currentTarget.value)}
              fullWidth
              size="small"
              type={visibleFields[`pin`] ? 'text' : 'password'}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label={t('settings:toggle_pin_visibility')}
                        onClick={() => toggleFieldVisibility(`pin`)}
                        edge="end"
                        size="small"
                      >
                        {visibleFields[`pin`] ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
              <Button size="small" color="error" variant="outlined" onClick={handleRemoveDevice}>
                {t('devices.forget')}
              </Button>
              <Button size="small" variant="contained" onClick={handleSave}>
                {t('save')}
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};
