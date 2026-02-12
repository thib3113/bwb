import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  ButtonGroup,
  Card,
  CardContent,
  Divider,
  FormControlLabel,
  MenuItem,
  Slider,
  Switch,
  TextField,
  Typography
} from '@mui/material';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import LockIcon from '@mui/icons-material/Lock';
import BatteryStdIcon from '@mui/icons-material/BatteryStd';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import LogIcon from '@mui/icons-material/BugReport';
import { useTranslation } from 'react-i18next';
import { BoksSimulator, BoksState, LogEntry } from '../../ble/simulator/BoksSimulator';
import { useBLE } from '../../hooks/useBLE';
import { PCB_VERSIONS } from '../../utils/version';

export const SimulatorDebugger = () => {
  const { t } = useTranslation(['settings']);
  const { toggleSimulator, disconnect } = useBLE();
  const [simulator, setSimulator] = useState<BoksSimulator | null>(
    () => (window.boksSimulator as BoksSimulator) || null
  );
  const [state, setState] = useState<BoksState | null>(null);
  const [isEnabled, setIsEnabled] = useState(
    () => localStorage.getItem('BOKS_SIMULATOR_ENABLED') === 'true'
  );
  const [isSimulatorRunning, setIsSimulatorRunning] = useState(() => !!window.boksSimulator);

  const [fwRev, setFwRev] = useState('10/125');
  const [swRev, setSwRev] = useState('4.1.14');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const controller = window.boksSimulator as BoksSimulator;
    if (controller) {
      const interval = setInterval(() => {
        setState(controller.getPublicState());
      }, 500);
      return () => clearInterval(interval);
    }
  }, []);

  useEffect(() => {
    if (state && !loaded) {
      setFwRev(state.firmwareRevision);
      setSwRev(state.softwareRevision);
      setLoaded(true);
    }
  }, [state, loaded]);

  const handleSimulatorToggle = (_event: React.ChangeEvent<HTMLInputElement>, checked: boolean) => {
    setIsEnabled(checked);
    if (toggleSimulator) {
      toggleSimulator(checked);
      // Wait a bit for the simulator to initialize if enabled
      if (checked) {
        setTimeout(() => {
          const controller = window.boksSimulator as BoksSimulator;
          if (controller) {
            setSimulator(controller);
            setIsSimulatorRunning(true);
            // Trigger state update loop if needed
          }
        }, 500);
      } else {
        setIsSimulatorRunning(false);
        setSimulator(null);
      }
    } else {
      // Fallback if toggleSimulator is not available (should not happen with new context)
      if (checked) {
        localStorage.setItem('BOKS_SIMULATOR_ENABLED', 'true');
      } else {
        localStorage.removeItem('BOKS_SIMULATOR_ENABLED');
      }
      window.location.reload();
    }
  };

  return (
    <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="h6" gutterBottom>
        {t('settings:developer.simulator.title')}
      </Typography>

      <Card variant="outlined" sx={{ mb: 1 }}>
        <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
          <FormControlLabel
            control={<Switch checked={isEnabled} onChange={handleSimulatorToggle} />}
            label={t('settings:developer.simulator.enable_simulator')}
          />
        </CardContent>
      </Card>

      {!isSimulatorRunning && (
        <Alert severity="warning">{t('settings:developer.simulator.not_active')}</Alert>
      )}

      {isSimulatorRunning && state && (
        <>
          <Card variant="outlined">
            <CardContent>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 2
                }}
              >
                <Typography
                  variant="subtitle1"
                  sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                >
                  {state.isOpen ? <LockOpenIcon color="warning" /> : <LockIcon color="success" />}
                  {t('settings:developer.simulator.status', {
                    status: state.isOpen
                      ? t('settings:developer.simulator.open')
                      : t('settings:developer.simulator.closed')
                  })}
                </Typography>
                <FormControlLabel
                  control={
                    <Switch
                      checked={state.chaosMode}
                      onChange={(_e, checked) => simulator?.setChaosMode(checked)}
                      color="secondary"
                    />
                  }
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <AutoFixHighIcon fontSize="small" />{' '}
                      {t('settings:developer.simulator.chaos_mode')}
                    </Box>
                  }
                />
              </Box>

              <Divider sx={{ my: 1 }} />

              <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mt: 1 }}>
                {t('settings:developer.simulator.manual_triggers')}
              </Typography>
              <ButtonGroup fullWidth variant="contained" size="small">
                <Button
                  onClick={() => simulator?.triggerDoorOpen('ble')}
                  disabled={state.isOpen}
                  startIcon={<LockOpenIcon />}
                >
                  {t('settings:developer.simulator.ble_open')}
                </Button>
                <Button
                  onClick={() => simulator?.triggerDoorOpen('nfc')}
                  disabled={state.isOpen}
                  color="info"
                >
                  {t('settings:developer.simulator.nfc_open')}
                </Button>
                <Button
                  onClick={() => simulator?.triggerDoorOpen('button')}
                  disabled={state.isOpen}
                  color="warning"
                >
                  {t('settings:developer.simulator.button_open')}
                </Button>
              </ButtonGroup>

              <Button
                fullWidth
                variant="outlined"
                size="small"
                sx={{ mt: 1 }}
                onClick={() => simulator?.triggerDoorClose()}
                disabled={!state.isOpen}
                startIcon={<LockIcon />}
              >
                {t('settings:developer.simulator.force_close')}
              </Button>
            </CardContent>
          </Card>

          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle2" gutterBottom>
                Device Versions
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <TextField
                  select
                  label="Hardware / Firmware"
                  value={fwRev}
                  onChange={(e) => setFwRev(e.target.value)}
                  size="small"
                  fullWidth
                >
                  {Object.entries(PCB_VERSIONS).map(([fw, hw]) => (
                    <MenuItem key={fw} value={fw}>
                      HW {hw} (FW {fw})
                    </MenuItem>
                  ))}
                  <MenuItem value="custom">Custom...</MenuItem>
                </TextField>
                <TextField
                  label="Software Revision"
                  value={swRev}
                  onChange={(e) => setSwRev(e.target.value)}
                  size="small"
                  fullWidth
                />
              </Box>
              <Button
                variant="contained"
                size="small"
                onClick={() => {
                  simulator?.setVersion(swRev, fwRev);
                  disconnect();
                }}
              >
                Update & Reconnect
              </Button>
            </CardContent>
          </Card>

          <Card variant="outlined">
            <CardContent>
              <Typography
                variant="subtitle2"
                sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}
              >
                <BatteryStdIcon />{' '}
                {t('settings:developer.simulator.battery_level', { level: state.batteryLevel })}
              </Typography>
              <Slider
                value={state.batteryLevel}
                onChange={(_, val) => simulator?.setBatteryLevel(val as number)}
                valueLabelDisplay="auto"
                min={0}
                max={100}
                size="small"
              />
            </CardContent>
          </Card>

          <Card variant="outlined">
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography
                  variant="subtitle2"
                  sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                >
                  <LogIcon />{' '}
                  {t('settings:developer.simulator.logs_count', { count: state.logs.length })}
                </Typography>
                <Button
                  size="small"
                  variant="text"
                  color="error"
                  onClick={() => simulator?.reset()}
                >
                  {t('settings:developer.simulator.reset')}
                </Button>
              </Box>
              <Box
                sx={{
                  mt: 1,
                  maxHeight: 150,
                  overflow: 'auto',
                  fontSize: '0.75rem',
                  fontFamily: 'monospace',
                  bgcolor: 'rgba(0,0,0,0.03)',
                  p: 1,
                  borderRadius: 1
                }}
              >
                {state.logs.length === 0
                  ? t('settings:developer.simulator.no_logs')
                  : [...state.logs].reverse().map((l: LogEntry, i: number) => (
                      <div key={i}>
                        [{new Date(l.timestamp).toLocaleTimeString()}] Op: 0x
                        {l.opcode.toString(16).toUpperCase()}
                      </div>
                    ))}
              </Box>
            </CardContent>
          </Card>
        </>
      )}
    </Box>
  );
};
