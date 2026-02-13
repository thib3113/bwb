import React from 'react';
import { FormControl, Select, MenuItem, SelectChangeEvent } from '@mui/material';
import { useDevice } from '../../../hooks/useDevice';

export const DeviceSelector = () => {
  const { activeDevice, knownDevices, setActiveDevice } = useDevice();

  if (knownDevices.length <= 1) {
    return null;
  }

  const handleChange = (event: SelectChangeEvent<string>) => {
    setActiveDevice(event.target.value);
  };

  return (
    <FormControl sx={{ minWidth: 120, mr: 2, maxWidth: 150 }} size="small">
      <Select
        value={activeDevice?.id || ''}
        onChange={handleChange}
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
        inputProps={{ 'data-testid': 'device-selector' }}
      >
        {knownDevices.map((device) => (
          <MenuItem key={device.id} value={device.id}>
            {device.friendly_name || device.id}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};
