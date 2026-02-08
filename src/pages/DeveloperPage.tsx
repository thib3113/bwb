import React, { useEffect, useState } from 'react';
import { Box, Button, Card, CardContent, Container, Tab, Tabs, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDeveloperContext } from '../context/DeveloperContextTypes';
import { DBEditor } from '../components/developer/DBEditor';
import { BluetoothDebugger } from '../components/developer/BluetoothDebugger';
import { ServiceWorkerDebugger } from '../components/developer/ServiceWorkerDebugger';
import { SimulatorDebugger } from '../components/developer/SimulatorDebugger';
import { StorageService } from '../services/StorageService';

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
  const [tabValue, setTabValue] = useState(0);

  useEffect(() => {
    // Redirect if not developer
    if (!isDeveloperMode) {
      navigate('/');
    }
  }, [isDeveloperMode, navigate]);

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

  return (
    <Container maxWidth="md" sx={{ py: 2 }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4">{t('settings:developer.page_title')}</Typography>
        <Button variant="outlined" color="error" onClick={handleDisable}>
          {t('settings:developer.disable_mode')}
        </Button>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="developer tabs">
          <Tab label={t('settings:developer.tabs.general')} />
          <Tab label={t('settings:developer.tabs.database')} />
          <Tab label={t('settings:developer.tabs.bluetooth')} />
          <Tab label={t('settings:developer.tabs.simulator')} />
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
    </Container>
  );
};
