import React, { useEffect, useState, useContext } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Tab,
  Tabs,
  Typography,
  List,
  ListItem,
  ListItemText,
  Chip
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDeveloperContext } from '../context/DeveloperContextTypes';
import { ThemeContext } from '../context/Contexts';
import { THEME_MODES, STORAGE_KEYS } from '../utils/constants';
import { DBEditor } from '../components/developer/DBEditor';
import { BluetoothDebugger } from '../components/developer/BluetoothDebugger';
import { ServiceWorkerDebugger } from '../components/developer/ServiceWorkerDebugger';
import { SimulatorDebugger } from '../components/developer/SimulatorDebugger';
import { StorageService } from '../services/StorageService';
import { KONAMI_EVENT, KonamiUpdateDetail } from '../hooks/useKonamiCode';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function CustomTabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 2 }}>{children}</Box>}
    </div>
  );
}

export const DeveloperPage = () => {
  const { t } = useTranslation(['settings']);
  const navigate = useNavigate();
  const { isDeveloperMode, disableDeveloperMode } = useDeveloperContext();
  const themeContext = useContext(ThemeContext);
  const [tabValue, setTabValue] = useState(0);
  const [konamiState, setKonamiState] = useState<KonamiUpdateDetail | null>(null);

  useEffect(() => {
    // Redirect if not developer
    if (!isDeveloperMode) {
      navigate('/');
    }
  }, [isDeveloperMode, navigate]);

  useEffect(() => {
    const handleKonamiUpdate = (event: Event) => {
      const detail = (event as CustomEvent<KonamiUpdateDetail>).detail;
      setKonamiState(detail);
    };

    window.addEventListener(KONAMI_EVENT, handleKonamiUpdate);
    return () => {
      window.removeEventListener(KONAMI_EVENT, handleKonamiUpdate);
    };
  }, []);

  const handleDisable = () => {
    disableDeveloperMode();
    navigate('/');
  };

  const handleMockData = async () => {
    try {
      if (confirm(t('settings:developer.mock_data_confirm'))) {
        await StorageService.mockData();
        alert(t('settings:developer.mock_data_success'));
      }
    } catch (e) {
      console.error(e);
      alert(t('settings:developer.mock_data_failed'));
    }
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleResetTheme = () => {
    // Remove the unlocked status from storage
    localStorage.removeItem(STORAGE_KEYS.MATRIX_UNLOCKED);
    // Reset theme to system
    themeContext?.setThemeMode(THEME_MODES.SYSTEM);
  };

  const simulateKonamiCode = async () => {
    const sequence = ['UP', 'UP', 'DOWN', 'DOWN', 'LEFT', 'RIGHT', 'LEFT', 'RIGHT'];
    let index = 0;

    // Reset first
    window.dispatchEvent(
      new CustomEvent(KONAMI_EVENT, {
        detail: { direction: null, sequenceIndex: 0, expected: 'UP', status: 'reset' }
      })
    );

    // Helper for delay
    const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    await wait(500);

    for (const direction of sequence) {
      index++;
      const detail: KonamiUpdateDetail = {
        direction,
        sequenceIndex: index,
        expected: sequence[index] || 'NONE',
        status: index === sequence.length ? 'success' : 'progress'
      };
      window.dispatchEvent(new CustomEvent(KONAMI_EVENT, { detail }));
      await wait(300);
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 2 }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4">{t('settings:developer.page_title')}</Typography>
        <Button variant="outlined" color="error" onClick={handleDisable}>
          {t('settings:developer.disable_mode')}
        </Button>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          aria-label="developer tabs"
        >
          <Tab label={t('settings:developer.tabs.general')} />
          <Tab label={t('settings:developer.tabs.database')} />
          <Tab label={t('settings:developer.tabs.bluetooth')} />
          <Tab label={t('settings:developer.tabs.simulator')} />
          <Tab label="Easter Eggs" />
        </Tabs>
      </Box>

      <CustomTabPanel value={tabValue} index={0}>
        <ServiceWorkerDebugger />
      </CustomTabPanel>

      <CustomTabPanel value={tabValue} index={1}>
        <Card>
          <CardContent>
            <Box sx={{ mb: 4 }}>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button variant="contained" onClick={handleMockData}>
                  {t('settings:developer.load_mock_data')}
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  onClick={() => {
                    if (confirm(t('settings:developer.clear_db_confirm'))) {
                      StorageService.clearAllData();
                    }
                  }}
                >
                  {t('settings:developer.clear_db')}
                </Button>
              </Box>
              <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 1 }}>
                {t('settings:developer.mock_data_helper')}
              </Typography>
            </Box>

            <Typography variant="h6" gutterBottom>
              {t('settings:developer.db_editor')}
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              {t('settings:developer.db_editor_helper')}
            </Typography>
            <DBEditor />
          </CardContent>
        </Card>
      </CustomTabPanel>

      <CustomTabPanel value={tabValue} index={2}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Bluetooth Debugger
            </Typography>
            <BluetoothDebugger />
          </CardContent>
        </Card>
      </CustomTabPanel>

      <CustomTabPanel value={tabValue} index={3}>
        <SimulatorDebugger />
      </CustomTabPanel>

      <CustomTabPanel value={tabValue} index={4}>
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Matrix Mode
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Enter the Matrix. Or execute the Konami Code: ↑ ↑ ↓ ↓ ← → ← →
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                color={themeContext?.mode === THEME_MODES.MATRIX ? 'primary' : 'secondary'}
                onClick={() => themeContext?.setThemeMode(THEME_MODES.MATRIX)}
              >
                Activate Matrix Mode
              </Button>
              <Button variant="outlined" onClick={handleResetTheme}>
                Reset Theme (Lock Matrix)
              </Button>
            </Box>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Konami Code Debugger
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Visualize the Konami Code state. Note: The 'Simulate' button only updates the UI below
              (and the arrow indicator), it does not trigger the actual Easter Egg success
              (confetti) because that logic is tied to the gesture hook.
            </Typography>
            <Box sx={{ mb: 2 }}>
              <Button variant="outlined" onClick={simulateKonamiCode}>
                Simulate Sequence (Visual Only)
              </Button>
            </Box>

            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
              {['UP', 'UP', 'DOWN', 'DOWN', 'LEFT', 'RIGHT', 'LEFT', 'RIGHT'].map((dir, idx) => (
                <Chip
                  key={idx}
                  label={dir}
                  color={konamiState && idx < konamiState.sequenceIndex ? 'success' : 'default'}
                  variant={konamiState && idx === konamiState.sequenceIndex ? 'filled' : 'outlined'}
                />
              ))}
            </Box>
            {konamiState && (
              <List dense>
                <ListItem>
                  <ListItemText primary="Last Input" secondary={konamiState.direction || 'None'} />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Status" secondary={konamiState.status} />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Expected Next" secondary={konamiState.expected} />
                </ListItem>
              </List>
            )}
            <Typography variant="caption" color="text.secondary">
              Note: Ensure you are swiping clearly. On desktop, click and drag. On mobile, swipe.
            </Typography>
          </CardContent>
        </Card>
      </CustomTabPanel>
    </Container>
  );
};
