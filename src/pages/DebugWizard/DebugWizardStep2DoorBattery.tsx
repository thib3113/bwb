import React from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import BatteryFullIcon from '@mui/icons-material/BatteryFull';
import { DebugWizardState } from '../../context/types';
import { BatteryAnalysis, BatteryData } from '../../hooks/useBatteryDiagnostics';

interface DebugWizardStep2DoorBatteryProps {
  pinCode: string;
  updateDebugWizardState: (updates: Partial<DebugWizardState>) => void;
  onOpenDoor: () => Promise<void>;
  isOpening: boolean;
  isConnected: boolean;
  openDoorSuccess: boolean;
  openDoorError: string | null;
  batteryData: BatteryData | null;
  waitingForClose: boolean;
  isReadingBattery: boolean;
  isPreparing: boolean;
  analysis: BatteryAnalysis | null;
}

export const DebugWizardStep2DoorBattery: React.FC<DebugWizardStep2DoorBatteryProps> = ({
  pinCode,
  updateDebugWizardState,
  onOpenDoor,
  isOpening,
  isConnected,
  openDoorSuccess,
  openDoorError,
  batteryData,
  waitingForClose,
  isReadingBattery,
  isPreparing,
  analysis,
}) => {
  const { t } = useTranslation();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tAny = t as any;

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="h6" gutterBottom>
        {tAny('wizard:door.title')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {tAny('wizard:door.desc')}
      </Typography>

      <Stack spacing={3}>
        {/* Open Door Section */}
        <Card variant="outlined">
          <CardContent>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
              <MeetingRoomIcon color="primary" />
              <Typography variant="h6">{tAny('wizard:door.open')}</Typography>
            </Stack>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label={tAny('codes:pin_label')}
                variant="outlined"
                size="small"
                value={pinCode || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const val = e.currentTarget.value.toUpperCase();
                  // Only allow 0-9, A, B
                  if (/^[0-9AB]*$/.test(val) && val.length <= 6) {
                    updateDebugWizardState({ pinCode: val });
                  }
                }}
                placeholder={tAny('wizard:door.pin_placeholder')}
                type="text"
                fullWidth
                inputProps={{ maxLength: 6 }}
              />

              <Button
                variant="contained"
                onClick={onOpenDoor}
                disabled={isOpening || !isConnected}
                startIcon={
                  isOpening ? <CircularProgress size={20} color="inherit" /> : <MeetingRoomIcon />
                }
              >
                {isOpening ? tAny('wizard:door.opening') : tAny('wizard:door.open')}
              </Button>

              {openDoorSuccess && !openDoorError && (
                <Alert severity="success">{tAny('wizard:door.success')}</Alert>
              )}

              {openDoorError && <Alert severity="error">{openDoorError}</Alert>}
            </Box>
          </CardContent>
        </Card>

        {/* Battery Section */}
        <Card variant="outlined">
          <CardContent>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
              <BatteryFullIcon color="primary" />
              <Typography variant="h6">{tAny('battery_level')}</Typography>
            </Stack>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {!batteryData && !waitingForClose && !isReadingBattery && !isPreparing && (
                <Alert severity="info">{tAny('wizard:battery.wait')}</Alert>
              )}

              {waitingForClose && (
                <Alert severity="info" icon={<CircularProgress size={20} />}>
                  {tAny('wizard:battery.waiting_close')}
                </Alert>
              )}

              {(isReadingBattery || isPreparing) && (
                <Alert severity="info" icon={<CircularProgress size={20} />}>
                  {tAny('wizard:battery.analyzing')}
                </Alert>
              )}

              {batteryData && (
                <Box
                  sx={{
                    mt: 2,
                    p: 2,
                    bgcolor: 'background.paper',
                    borderRadius: 1,
                    border: 1,
                    borderColor: 'divider',
                  }}
                >
                  {/* Standard Level */}
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="body2" color="text.primary">
                      {tAny('wizard:battery.standard_level')}:
                    </Typography>
                    <Typography variant="body2" fontWeight="bold" color="text.primary">
                      {batteryData.standardLevel !== null ? `${batteryData.standardLevel}%` : 'N/A'}
                    </Typography>
                  </Box>

                  {/* Proprietary Data */}
                  {batteryData.parsed && (
                    <>
                      <Divider sx={{ my: 1 }} />
                      <Typography variant="subtitle2" gutterBottom color="text.primary">
                        {tAny('wizard:battery.proprietary_data')} ({batteryData.parsed.format})
                      </Typography>

                      {/* Display Level if available (Format 1 & 4 bytes) */}
                      {batteryData.parsed.level !== undefined && (
                        <Box display="flex" justifyContent="space-between">
                          <Typography variant="body2" color="text.primary">
                            {tAny('battery_level')} (Proprietary):
                          </Typography>
                          <Typography variant="body2" fontWeight="bold" color="text.primary">
                            {batteryData.parsed.level}%
                          </Typography>
                        </Box>
                      )}
                      {/* Display all available voltage metrics */}
                      {batteryData.parsed.first_mV !== undefined && (
                        <Box display="flex" justifyContent="space-between">
                          <Typography variant="body2" color="text.primary">
                            Voltage (First):
                          </Typography>
                          <Typography variant="body2" fontWeight="bold" color="text.primary">
                            {batteryData.parsed.first_mV !== null
                              ? `${(batteryData.parsed.first_mV / 1000).toFixed(2)} V`
                              : 'N/A'}
                          </Typography>
                        </Box>
                      )}
                      {batteryData.parsed.min_mV !== undefined && (
                        <Box display="flex" justifyContent="space-between">
                          <Typography variant="body2" color="text.primary">
                            Voltage (Min):
                          </Typography>
                          <Typography variant="body2" fontWeight="bold" color="text.primary">
                            {batteryData.parsed.min_mV !== null
                              ? `${(batteryData.parsed.min_mV / 1000).toFixed(2)} V`
                              : 'N/A'}
                          </Typography>
                        </Box>
                      )}
                      {batteryData.parsed.mean_mV !== undefined && (
                        <Box display="flex" justifyContent="space-between">
                          <Typography variant="body2" color="text.primary">
                            Voltage (Mean):
                          </Typography>
                          <Typography variant="body2" fontWeight="bold" color="text.primary">
                            {batteryData.parsed.mean_mV !== null
                              ? `${(batteryData.parsed.mean_mV / 1000).toFixed(2)} V`
                              : 'N/A'}
                          </Typography>
                        </Box>
                      )}
                      {batteryData.parsed.max_mV !== undefined && (
                        <Box display="flex" justifyContent="space-between">
                          <Typography variant="body2" color="text.primary">
                            Voltage (Max):
                          </Typography>
                          <Typography variant="body2" fontWeight="bold" color="text.primary">
                            {batteryData.parsed.max_mV !== null
                              ? `${(batteryData.parsed.max_mV / 1000).toFixed(2)} V`
                              : 'N/A'}
                          </Typography>
                        </Box>
                      )}
                      {batteryData.parsed.last_mV !== undefined && (
                        <Box display="flex" justifyContent="space-between">
                          <Typography variant="body2" color="text.primary">
                            {tAny('wizard:battery.voltage_last')}:
                          </Typography>
                          <Typography variant="body2" fontWeight="bold" color="text.primary">
                            {batteryData.parsed.last_mV !== null
                              ? `${(batteryData.parsed.last_mV / 1000).toFixed(2)} V`
                              : 'N/A'}
                          </Typography>
                        </Box>
                      )}

                      {/* Display T1/T5 if available */}
                      {batteryData.parsed.t1 !== undefined && (
                        <Box display="flex" justifyContent="space-between">
                          <Typography variant="body2" color="text.primary">
                            T1:
                          </Typography>
                          <Typography variant="body2" fontWeight="bold" color="text.primary">
                            {batteryData.parsed.t1}
                          </Typography>
                        </Box>
                      )}
                      {batteryData.parsed.t5 !== undefined && (
                        <Box display="flex" justifyContent="space-between">
                          <Typography variant="body2" color="text.primary">
                            T5:
                          </Typography>
                          <Typography variant="body2" fontWeight="bold" color="text.primary">
                            {batteryData.parsed.t5}
                          </Typography>
                        </Box>
                      )}

                      {batteryData.parsed.temp_C !== undefined && (
                        <Box display="flex" justifyContent="space-between">
                          <Typography variant="body2" color="text.primary">
                            {tAny('wizard:battery.temperature')}:
                          </Typography>
                          <Typography variant="body2" fontWeight="bold" color="text.primary">
                            {batteryData.parsed.temp_C !== null
                              ? `${batteryData.parsed.temp_C}°C`
                              : 'N/A'}
                          </Typography>
                        </Box>
                      )}

                      {/* Analysis Result */}
                      {analysis && (
                        <Box
                          sx={{
                            mt: 2,
                            p: 1,
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: 1,
                            bgcolor: 'background.paper',
                          }}
                        >
                          <Typography variant="caption" display="block" color="text.secondary">
                            {tAny('wizard:battery.analysis')}:
                          </Typography>
                          <Typography variant="body2" gutterBottom color="text.primary">
                            {tAny('wizard:battery.detected_type')}:{' '}
                            <strong>{analysis.detectedText}</strong>
                          </Typography>
                          <Typography
                            variant="body2"
                            color={
                              analysis.consistencyStatus === 'success'
                                ? 'success.main'
                                : analysis.consistencyStatus === 'error'
                                  ? 'error.main'
                                  : 'warning.main'
                            }
                            fontWeight="medium"
                          >
                            {analysis.consistencyText}
                          </Typography>
                        </Box>
                      )}
                    </>
                  )}

                  {batteryData.error && (
                    <Alert severity="warning" sx={{ mt: 1 }}>
                      {batteryData.error}
                    </Alert>
                  )}
                </Box>
              )}
            </Box>
          </CardContent>
        </Card>
      </Stack>
    </Box>
  );
};
