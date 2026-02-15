import React from 'react';
import { FormControl, Select, MenuItem, SelectChangeEvent, useTheme } from '@mui/material';
import { useDevice } from '../../../hooks/useDevice';

export const DeviceSelector = () => {
  const { activeDevice, knownDevices, setActiveDevice } = useDevice();
  const theme = useTheme();

  // Detect Matrix mode by checking the primary color
  const isMatrix = theme.palette.primary.main === '#00FF00';

  if (knownDevices.length <= 1) {
    return null;
  }

  const handleChange = (event: SelectChangeEvent<string>) => {
    setActiveDevice(event.target.value);
  };

  // Styles based on theme mode
  const color = isMatrix ? '#00FF00' : 'white';
  const borderColor = isMatrix ? 'rgba(0, 255, 0, 0.5)' : 'rgba(255, 255, 255, 0.3)';
  const hoverBorderColor = isMatrix ? '#00FF00' : 'rgba(255, 255, 255, 0.7)';
  const focusedBorderColor = isMatrix ? '#00FF00' : 'white';

  return (
    <FormControl sx={{ minWidth: 120, mr: 2, maxWidth: 150 }} size="small">
      <Select
        value={activeDevice?.id || ''}
        onChange={handleChange}
        displayEmpty
        sx={{
          color: color,
          '& .MuiSelect-icon': { color: color },
          '& .MuiOutlinedInput-notchedOutline': { borderColor: borderColor },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: hoverBorderColor
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: focusedBorderColor }
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
