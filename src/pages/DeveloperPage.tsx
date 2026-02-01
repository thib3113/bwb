import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Container,
  Divider,
  FormControlLabel,
  Switch,
  Typography,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDeveloperContext } from '../context/DeveloperContext';
import { DBEditor } from '../components/developer/DBEditor';
import { StorageService } from '../services/StorageService';

export const DeveloperPage = () => {
  const { t } = useTranslation(['settings']);
  const navigate = useNavigate();
  const { isDeveloperMode, disableDeveloperMode } = useDeveloperContext();
  const [simulatorEnabled, setSimulatorEnabled] = useState(false);

  useEffect(() => {
    // Redirect if not developer
    if (!isDeveloperMode) {
      navigate('/');
    }

    // Check local storage for simulator
    const sim = localStorage.getItem('BOKS_SIMULATOR_ENABLED') === 'true';
    setSimulatorEnabled(sim);
  }, [isDeveloperMode, navigate]);

  const handleDisable = () => {
    disableDeveloperMode();
    navigate('/');
  };

  const handleSimulatorToggle = (event: React.ChangeEvent<HTMLInputElement>) => {
    const checked = event.target.checked;
    setSimulatorEnabled(checked);
    if (checked) {
      localStorage.setItem('BOKS_SIMULATOR_ENABLED', 'true');
    } else {
      localStorage.removeItem('BOKS_SIMULATOR_ENABLED');
    }
    // Reload to apply changes
    window.location.reload();
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

  return (
    <Container maxWidth="md" sx={{ py: 2 }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4">{t('settings:developer.page_title')}</Typography>
        <Button variant="outlined" color="error" onClick={handleDisable}>
          {t('settings:developer.disable_mode')}
        </Button>
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardHeader title={t('settings:developer.simulators_tools')} />
        <Divider />
        <CardContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControlLabel
              control={<Switch checked={simulatorEnabled} onChange={handleSimulatorToggle} />}
              label={t('settings:developer.enable_simulator')}
            />

            <Box>
              <Button variant="contained" onClick={handleMockData}>
                {t('settings:developer.load_mock_data')}
              </Button>
              <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 1 }}>
                {t('settings:developer.mock_data_helper')}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      <Card>
        <CardHeader
          title={t('settings:developer.db_editor')}
          subheader={t('settings:developer.db_editor_helper')}
        />
        <Divider />
        <CardContent>
          <DBEditor />
        </CardContent>
      </Card>
    </Container>
  );
};
