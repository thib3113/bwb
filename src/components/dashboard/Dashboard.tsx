import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Card, CardContent, Grid, Typography, useTheme } from '@mui/material';
import {
  Add as AddIcon,
  History as HistoryIcon,
  MeetingRoom as MeetingRoomIcon,
  Settings as SettingsIcon,
  VpnKey as VpnKeyIcon,
} from '@mui/icons-material';
import { useDevice } from '../../hooks/useDevice';
import { useBLEConnection } from '../../hooks/useBLEConnection';
import { useDoor } from '../../hooks/useDoor';
import { AddCodeDialog } from '../codes/AddCodeDialog';
import { CodeCreationData } from '../../types';

export const Dashboard = () => {
  const { t } = useTranslation(['common', 'codes']);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tAny = t as any;
  const theme = useTheme();
  const navigate = useNavigate();

  const { activeDevice } = useDevice();
  const { isConnected } = useBLEConnection();
  const { openDoor, isOpening } = useDoor();

  const [showAddCodeDialog, setShowAddCodeDialog] = useState(false);

  const handleOpenDoor = async () => {
    if (activeDevice?.door_pin_code) {
      try {
        await openDoor(activeDevice.door_pin_code);
      } catch (error) {
        console.error('Failed to open door:', error);
      }
    }
  };

  const handleSaveCode = (codeData: CodeCreationData) => {
    // In a real implementation, this would save the code
    console.log('Saving code:', codeData);
    setShowAddCodeDialog(false);
  };

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      <Grid container spacing={3}>
        {/* Status Card */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card elevation={2}>
            <CardContent>
              <Typography variant="h5" component="h2" gutterBottom>
                {tAny('common:status')}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Box
                  sx={{
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    backgroundColor: isConnected
                      ? theme.palette.success.main
                      : theme.palette.error.main,
                    mr: 1,
                  }}
                />
                <Typography variant="body1">
                  {isConnected ? tAny('common:connected') : tAny('common:disconnected')}
                </Typography>
              </Box>
              {activeDevice && (
                <Typography variant="body2" color="textSecondary">
                  {tAny('common:device')}: {activeDevice.friendly_name || activeDevice.ble_name}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Quick Actions Card */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card elevation={2}>
            <CardContent>
              <Typography variant="h5" component="h2" gutterBottom>
                {tAny('common:quick_actions')}
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Button
                  variant="contained"
                  startIcon={<MeetingRoomIcon />}
                  onClick={handleOpenDoor}
                  disabled={!isConnected || isOpening}
                  sx={{ minWidth: 120 }}
                >
                  {tAny('common:open_door')}
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={() => setShowAddCodeDialog(true)}
                  disabled={!isConnected}
                  sx={{ minWidth: 120 }}
                >
                  {tAny('codes:add_new')}
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Navigation Links */}
        <Grid size={{ xs: 12 }}>
          <Card elevation={2}>
            <CardContent>
              <Typography variant="h5" component="h2" gutterBottom>
                {tAny('common:navigation')}
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<HistoryIcon />}
                    onClick={() => navigate('/logs')}
                    sx={{ justifyContent: 'flex-start', p: 2 }}
                  >
                    {tAny('common:view_all_logs')}
                  </Button>
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<VpnKeyIcon />}
                    onClick={() => navigate('/codes')}
                    sx={{ justifyContent: 'flex-start', p: 2 }}
                  >
                    {tAny('common:manage_codes')}
                  </Button>
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<SettingsIcon />}
                    onClick={() => navigate('/my-boks?tab=settings')}
                    sx={{ justifyContent: 'flex-start', p: 2 }}
                  >
                    {tAny('common:settings')}
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Add Code Dialog */}
      <AddCodeDialog
        open={showAddCodeDialog}
        onClose={() => setShowAddCodeDialog(false)}
        onSave={handleSaveCode}
        editingCode={null}
      />
    </Box>
  );
};
