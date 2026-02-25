import { Box, Typography } from '@mui/material';

export const BluetoothDebugger = () => {
  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6">Bluetooth Debugger</Typography>
      <Typography>
        This tool is currently disabled due to SDK integration. Please use the official Boks SDK
        tools or logs for debugging.
      </Typography>
    </Box>
  );
};
