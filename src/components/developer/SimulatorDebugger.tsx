import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  ButtonGroup,
  Card,
  CardContent,
  Chip,
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
import LocalPostOfficeIcon from '@mui/icons-material/LocalPostOffice';
import { useTranslation } from 'react-i18next';
import { BoksHardwareSimulator, SimulatorLog } from '@thib3113/boks-sdk/simulator';
import { BoksOpenSource } from '@thib3113/boks-sdk';
import { useBLE } from '../../hooks/useBLE';
import { PCB_VERSIONS } from '../../utils/version';

interface BoksPublicState {
    isOpen: boolean;
    batteryLevel: number;
    softwareVersion: string;
    firmwareVersion: string;
    packetLossProbability: number;
    responseDelayMs: number;
    chaosMode: boolean;
    pinsCount: number;
    logsCount: number;
    configKey: string;
    // laPosteActivated might be missing in getPublicState type or need check
}

export const SimulatorDebugger = () => {
  const { t } = useTranslation(['settings']);
  const { toggleSimulator, disconnect } = useBLE();
  const [simulator, setSimulator] = useState<BoksHardwareSimulator | null>(
    () => (window as any).boksSimulator || null
  );

  // Use a simplified state object that matches what we display
  const [state, setState] = useState<BoksPublicState | null>(null);

  const [isEnabled, setIsEnabled] = useState(
    () => localStorage.getItem('BOKS_SIMULATOR_ENABLED') === 'true'
  );
  const [isSimulatorRunning, setIsSimulatorRunning] = useState(() => !!(window as any).boksSimulator);

  const [fwRev, setFwRev] = useState('10/125');
  const [swRev, setSwRev] = useState('4.3.3');

  // Fetch state loop
  useEffect(() => {
    if (simulator) {
      const updateState = () => {
          const s = simulator.getPublicState();
          setState(s as BoksPublicState);

          // Sync form
          if (s.firmwareVersion) setFwRev(s.firmwareVersion);
          if (s.softwareVersion) setSwRev(s.softwareVersion);
      };

      updateState();
      const interval = setInterval(updateState, 500);
      return () => clearInterval(interval);
    } else {
      setState(null);
    }
  }, [simulator]);

  const handleSimulatorToggle = (_event: React.ChangeEvent<HTMLInputElement>, checked: boolean) => {
    setIsEnabled(checked);
    if (toggleSimulator) {
      toggleSimulator(checked);
      if (checked) {
        setTimeout(() => {
          const sim = (window as any).boksSimulator as BoksHardwareSimulator;
          if (sim) {
            setSimulator(sim);
            setIsSimulatorRunning(true);
          }
        }, 500);
      } else {
        setIsSimulatorRunning(false);
        setSimulator(null);
      }
    } else {
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
                  onClick={() => simulator?.triggerDoorOpen(BoksOpenSource.Ble)}
                  disabled={state.isOpen}
                  startIcon={<LockOpenIcon />}
                >
                  {t('settings:developer.simulator.ble_open')}
                </Button>
                <Button
                  onClick={() => simulator?.triggerDoorOpen(BoksOpenSource.Nfc, '04:55:66:77:88:99:AA')}
                  disabled={state.isOpen}
                  color="info"
                >
                  {t('settings:developer.simulator.nfc_open')}
                </Button>
                <Button
                  onClick={() => simulator?.triggerDoorOpen(BoksOpenSource.Keypad)}
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
                onClick={() => simulator?.setDoorStatus(false)}
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
                {t('settings:developer.simulator.device_versions')}
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <TextField
                  select
                  label={t('settings:developer.simulator.hw_fw_label')}
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
                  <MenuItem value="custom">
                    {t('settings:developer.simulator.custom_version')}
                  </MenuItem>
                </TextField>
                <TextField
                  label={t('settings:developer.simulator.sw_revision')}
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
                {t('settings:developer.simulator.update_reconnect')}
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
                  Logs ({state.logsCount})
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </>
      )}
    </Box>
  );
};
