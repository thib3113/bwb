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
import { BoksHardwareSimulator } from '@thib3113/boks-sdk/simulator';
import { BoksOpenSource } from '@thib3113/boks-sdk';
import { useBLE } from '../../hooks/useBLE';
import { PCB_VERSIONS } from '../../utils/version';

// Enum polyfill if not exported correctly or visible
const OpenSource = {
  Ble: 0,
  PhysicalKey: 1,
  Nfc: 2,
  Unknown: 3
};

// Use BoksOpenSource from SDK if available, else fallback
const Source = (BoksOpenSource as any) || OpenSource;

export const SimulatorDebugger = () => {
  const { t } = useTranslation(['settings']);
  const { toggleSimulator, disconnect } = useBLE();
  const [simulator, setSimulator] = useState<BoksHardwareSimulator | null>(
    () => (window.boksSimulator as BoksHardwareSimulator) || null
  );

  // We use internal state for debugging view
  const [state, setState] = useState<any | null>(() => (simulator as any)?.getState() || null);
  const [publicState, setPublicState] = useState<any | null>(
    () => (simulator as any)?.getPublicState() || null
  );

  const [isEnabled, setIsEnabled] = useState(
    () =>
      typeof window !== 'undefined' &&
      (window.BOKS_SIMULATOR_ENABLED === true ||
        localStorage.getItem('BOKS_SIMULATOR_ENABLED') === 'true')
  );
  const [isSimulatorRunning, setIsSimulatorRunning] = useState(() => !!window.boksSimulator);

  const [fwRev, setFwRev] = useState('10/125');
  const [swRev, setSwRev] = useState('4.3.3');

  useEffect(() => {
    if (simulator) {
      const updateState = () => {
        if ((simulator as any).getState) setState((simulator as any).getState());
        if (simulator.getPublicState) {
          const ps = simulator.getPublicState();
          setPublicState(ps);
          setFwRev(ps.firmwareVersion); // handle naming diff
          setSwRev(ps.softwareVersion);
        }
      };

      updateState();
      const interval = setInterval(updateState, 500);
      return () => clearInterval(interval);
    } else {
// eslint-disable-next-line react-hooks/set-state-in-effect
      setState(null);
      setPublicState(null);
    }
  }, [simulator]);

  const handleSimulatorToggle = (_event: React.ChangeEvent<HTMLInputElement>, checked: boolean) => {
    setIsEnabled(checked);
    if (toggleSimulator) {
      toggleSimulator(checked);
      if (checked) {
        setTimeout(() => {
          const controller = window.boksSimulator as BoksHardwareSimulator;
          if (controller) {
            setSimulator(controller);
            setIsSimulatorRunning(true);
          }
        }, 500);
      } else {
        setIsSimulatorRunning(false);
        setSimulator(null);
      }
    }
  };

  const isOpen = publicState?.isOpen ?? false;
  const batteryLevel = publicState?.batteryLevel ?? 0;
  const chaosMode = publicState?.chaosMode ?? false;
  const laPosteActivated = publicState?.configuration?.laPosteEnabled ?? false; // check path
  const logs = state?.logs || [];

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

      {isSimulatorRunning && publicState && (
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
                  {isOpen ? <LockOpenIcon color="warning" /> : <LockIcon color="success" />}
                  {t('settings:developer.simulator.status', {
                    status: isOpen
                      ? t('settings:developer.simulator.open')
                      : t('settings:developer.simulator.closed')
                  })}
                </Typography>
                <FormControlLabel
                  control={
                    <Switch
                      checked={chaosMode}
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

              <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                {laPosteActivated && (
                  <Chip
                    icon={<LocalPostOfficeIcon />}
                    label="La Poste Active"
                    color="primary"
                    size="small"
                    variant="outlined"
                  />
                )}
              </Box>

              <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mt: 1 }}>
                {t('settings:developer.simulator.manual_triggers')}
              </Typography>
              <ButtonGroup fullWidth variant="contained" size="small">
                <Button
                  onClick={() => simulator?.triggerDoorOpen(Source.Ble)}
                  disabled={isOpen}
                  startIcon={<LockOpenIcon />}
                >
                  {t('settings:developer.simulator.ble_open')}
                </Button>
                <Button
                  onClick={() => simulator?.triggerDoorOpen(Source.Nfc, '04:55:66:77:88:99:AA')}
                  disabled={isOpen}
                  color="info"
                >
                  {t('settings:developer.simulator.nfc_open')}
                </Button>
                <Button
                  onClick={() => simulator?.triggerDoorOpen(Source.PhysicalKey)}
                  disabled={isOpen}
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
                disabled={!isOpen}
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
                {t('settings:developer.simulator.battery_level', { level: batteryLevel })}
              </Typography>
              <Slider
                value={batteryLevel}
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
                  <LogIcon /> {t('settings:developer.simulator.logs_count', { count: logs.length })}
                </Typography>
                <Button
                  size="small"
                  variant="text"
                  color="error"
                  onClick={() => {
                    // reset logic if needed
                  }}
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
                {logs.length === 0
                  ? t('settings:developer.simulator.no_logs')
                  : [...logs].reverse().map((l: any, i: number) => (
                      <div key={i}>
                        [{new Date(l.timestamp).toLocaleTimeString()}] Op: 0x
                        {l.opcode?.toString(16).toUpperCase()}
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
