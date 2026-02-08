import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDoor } from '../hooks/useDoor';
import { useBLEConnection } from '../hooks/useBLEConnection';
import { Box, Button, Paper, TextField, Typography } from '@mui/material';

export const DoorControls = () => {
  const { t } = useTranslation(['common', 'codes']);
  const { openDoor, isOpening } = useDoor();
  const { isConnected } = useBLEConnection();
  const [code, setCode] = useState('');

  const handleOpenDoor = async () => {
    if (code.length !== 6) {
      // alert(t('codes:code_length_error')); // Using alert is bad, but keeping simple for now
      // Or should I use a notification prop if available?
      // The component doesn't receive props in the file I read.
      console.warn('Code length error');
      return;
    }

    try {
      await openDoor(code);
      setCode('');
    } catch (err) {
      console.error('Error opening door', err);
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 3, mb: 2 }}>
      <Typography variant="h5" gutterBottom>
        {t('door.title')}
      </Typography>
      <Box sx={{ mb: 2 }}>
        <TextField
          label={t('codes:new_code_label')}
          id="openCode"
          value={code}
          onChange={(e) => setCode(e.currentTarget.value)}
          disabled={!isConnected || isOpening}
          placeholder="Enter 6-digit code"
          fullWidth
          slotProps={{
            htmlInput: { maxLength: 6 }
          }}
        />
      </Box>
      <Button
        variant="contained"
        onClick={handleOpenDoor}
        disabled={!isConnected || isOpening}
        fullWidth
      >
        {isOpening ? t('connecting') : t('door.open')}
      </Button>
    </Paper>
  );
};
