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
import { useDeveloperContext } from '../context/DeveloperContext';
import { DBEditor } from '../components/developer/DBEditor';
import { StorageService } from '../services/StorageService';

export const DeveloperPage = () => {
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
      if (confirm('This will wipe existing data for the mock device. Continue?')) {
        await StorageService.mockData();
        alert('Mock data loaded successfully. You may need to refresh.');
      }
    } catch (e) {
      console.error(e);
      alert('Failed to load mock data');
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 2 }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4">Developer Options</Typography>
        <Button variant="outlined" color="error" onClick={handleDisable}>
          Disable Dev Mode
        </Button>
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardHeader title="Simulators & Tools" />
        <Divider />
        <CardContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControlLabel
              control={<Switch checked={simulatorEnabled} onChange={handleSimulatorToggle} />}
              label="Enable Bluetooth Simulator (Reloads Page)"
            />

            <Box>
                <Button variant="contained" onClick={handleMockData}>
                Load Mock Data
                </Button>
                <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 1 }}>
                    Resets DB and loads test data for 'Mock Boks'.
                </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      <Card>
        <CardHeader title="Database Editor" subheader="View and inspect local IndexedDB data" />
        <Divider />
        <CardContent>
          <DBEditor />
        </CardContent>
      </Card>
    </Container>
  );
};
