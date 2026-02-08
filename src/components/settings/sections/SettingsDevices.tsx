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
  Typography
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { BoksDevice, UserRole } from '../../../types';

interface SettingsDevicesProps {
  devices: BoksDevice[];
  deviceNames: Record<string, string>;
  configurationKeys: Record<string, string>;
  doorPinCodes: Record<string, string>;
  onDeviceNameChange: (deviceId: string, value: string) => void;
  onConfigKeyChange: (deviceId: string, value: string) => void;
  onDoorPinCodeChange: (deviceId: string, value: string) => void;
  onRemoveDevice: (deviceId: string) => void;
}

export const SettingsDevices: React.FC<SettingsDevicesProps> = ({
  devices,
  deviceNames,
  configurationKeys,
  doorPinCodes,
  onDeviceNameChange,
  onConfigKeyChange,
  onDoorPinCodeChange,
  onRemoveDevice
}) => {
  const { t } = useTranslation(['common', 'settings']);
  const [visibleFields, setVisibleFields] = useState<Record<string, boolean>>({});

  const toggleFieldVisibility = (fieldId: string) => {
    setVisibleFields((prev) => ({
      ...prev,
      [fieldId]: !prev[fieldId]
    }));
  };

  if (devices.length === 0) return null;

  return (
    <Box sx={{ my: 2 }}>
      <Typography variant="subtitle1" gutterBottom>
        {t('devices.title')}
      </Typography>
      <Divider sx={{ mb: 2 }} />

      {devices.map((device) => (
        <Card key={device.id} sx={{ mb: 2 }}>
          <CardContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label={t('devices.device_name')}
                value={deviceNames[device.id] || ''}
                onChange={(e) => onDeviceNameChange(device.id, e.currentTarget.value)}
                fullWidth
                size="small"
              />
              {device.role === UserRole.Admin && (
                <TextField
                  label={t('settings:configuration_key.label')}
                  value={configurationKeys[device.id] || ''}
                  onChange={(e) => onConfigKeyChange(device.id, e.currentTarget.value)}
                  fullWidth
                  size="small"
                  type={visibleFields[`${device.id}_key`] ? 'text' : 'password'}
                  helperText={t('settings:configuration_key.helper')}
                  slotProps={{
                    input: {
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            aria-label={t('settings:toggle_key_visibility')}
                            onClick={() => toggleFieldVisibility(`${device.id}_key`)}
                            edge="end"
                            size="small"
                          >
                            {visibleFields[`${device.id}_key`] ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      )
                    }
                  }}
                />
              )}
              <TextField
                label={t('settings:door_pin_code')}
                value={doorPinCodes[device.id] || ''}
                onChange={(e) => onDoorPinCodeChange(device.id, e.currentTarget.value)}
                fullWidth
                size="small"
                type={visibleFields[`${device.id}_pin`] ? 'text' : 'password'}
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label={t('settings:toggle_pin_visibility')}
                          onClick={() => toggleFieldVisibility(`${device.id}_pin`)}
                          edge="end"
                          size="small"
                        >
                          {visibleFields[`${device.id}_pin`] ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    )
                  }
                }}
              />
              <Button
                size="small"
                color="error"
                variant="outlined"
                onClick={() => onRemoveDevice(device.id)}
              >
                {t('devices.forget')}
              </Button>
            </Box>
          </CardContent>
        </Card>
      ))}
    </Box>
  );
};
