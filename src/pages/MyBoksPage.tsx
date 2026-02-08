import { useEffect, useState } from 'react';
import { Box, Button, List, ListItem, ListItemText, Tab, Tabs, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useDevice } from '../hooks/useDevice';
import { useBLEConnection } from '../hooks/useBLEConnection';
import { DeviceSettings } from '../components/my-boks/DeviceSettings';
import { NfcTagsTab } from '../components/my-boks/NfcTagsTab';
import { useLocation, useOutletContext } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { compareVersions } from '../utils/version';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`my-boks-tabpanel-${index}`}
      aria-labelledby={`my-boks-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `my-boks-tab-${index}`,
    'aria-controls': `my-boks-tabpanel-${index}`
  };
}

interface OutletContextType {
  showNotification: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

export const MyBoksPage = () => {
  const { t } = useTranslation(['common', 'codes', 'logs', 'settings']);
  const { activeDevice, knownDevices, setActiveDevice } = useDevice();
  const { isConnected } = useBLEConnection();
  const { showNotification } = useOutletContext<OutletContextType>();
  const location = useLocation();
  const [value, setValue] = useState(0);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);

  // Set initial tab based on query parameter
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const tab = searchParams.get('tab');

    const timer = setTimeout(() => {
      switch (tab) {
        case 'settings':
          setValue(0);
          break;
        case 'users':
          setValue(1);
          break;
        default:
          setValue(0);
          break;
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [location.search]);

  // When knownDevices changes, reset selection if activeDevice is null or not in the list
  useEffect(() => {
    if (!activeDevice || !knownDevices.some((d) => d.id === activeDevice.id)) {
      if (selectedDeviceId !== null) {
        setTimeout(() => setSelectedDeviceId(null), 0);
      }
    }
  }, [activeDevice, knownDevices, selectedDeviceId]);

  const isFwCompatible = (minVersion: string) => {
    return activeDevice?.software_revision
      ? compareVersions(activeDevice.software_revision, minVersion) >= 0
      : false;
  };
  const isHwCompatible = (minVersion: string) => {
    return activeDevice?.hardware_version
      ? compareVersions(activeDevice.hardware_version, minVersion) >= 0
      : false;
  };

  const isNfcFwCompatible = isFwCompatible('4.3.3');
  const isNfcHwCompatible = isHwCompatible('4.0');
  const isNfcCompatible = isNfcFwCompatible && isNfcHwCompatible;

  const handleChange = (_event: unknown, newValue: number) => {
    if (newValue === 2) {
      // NFC Tab
      if (!isNfcHwCompatible) {
        showNotification('Version Hardware 4.0 required', 'warning');
        return;
      }
      if (!isNfcFwCompatible) {
        showNotification('Version Firmware 4.3.3 required', 'warning');
        return;
      }
    }
    setValue(newValue);
  };

  const handleDeviceSelect = (deviceId: string) => {
    setSelectedDeviceId(deviceId);
    setActiveDevice(deviceId);
  };

  const handleBackToList = () => {
    setSelectedDeviceId(null);
    setActiveDevice(null);
  };

  // Determine if we should show the list view
  const showListView = knownDevices.length > 1 && !selectedDeviceId && !activeDevice;

  // Determine the title
  let title = t('common:my_boks'); // Default to plural
  if (activeDevice && knownDevices.length === 1) {
    title = activeDevice.friendly_name || activeDevice.ble_name;
  } else if (activeDevice && knownDevices.length > 1) {
    title = activeDevice.friendly_name || activeDevice.ble_name;
  } else if (!activeDevice && knownDevices.length === 1) {
    title = knownDevices[0].friendly_name || knownDevices[0].ble_name;
  }

  // List View
  if (showListView) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>
          {t('common:my_boks')}
        </Typography>

        <List>
          {knownDevices.map((device) => (
            <ListItem
              key={device.id}
              onClick={() => handleDeviceSelect(device.id)}
              sx={{ cursor: 'pointer' }}
            >
              <ListItemText
                primary={device.friendly_name || device.ble_name}
                secondary={device.ble_name}
              />
            </ListItem>
          ))}
        </List>
      </Box>
    );
  }

  // Detail View
  const deviceForDetail =
    activeDevice ||
    knownDevices.find((d) => d.id === selectedDeviceId) ||
    (knownDevices.length === 1 ? knownDevices[0] : null);

  if (!deviceForDetail) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h5">{t('common:my_boks')}</Typography>
        <Typography variant="body1" color="textSecondary">
          {t('common:no_active_device')}
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      {/* Header with device name and connection status */}
      <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider' }}>
        {knownDevices.length > 1 && (
          <Button startIcon={<ArrowBackIcon />} onClick={handleBackToList} sx={{ mb: 1 }}>
            {t('common:back_to_list')}
          </Button>
        )}
        <Typography variant="h4" component="h1" gutterBottom>
          {title}
        </Typography>
        <Typography variant="subtitle1" color="textSecondary">
          {isConnected ? t('common:connected') : t('common:disconnected')}
        </Typography>
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={value} onChange={handleChange} aria-label="my boks tabs">
          <Tab data-testid="tab-settings" label={t('settings:title')} {...a11yProps(0)} />
          <Tab data-testid="tab-users" label={t('common:users.title')} {...a11yProps(1)} />
          <Tab
            data-testid="tab-nfc"
            label="Tags NFC"
            {...a11yProps(2)}
            sx={{ opacity: isNfcCompatible ? 1 : 0.5 }}
          />
        </Tabs>
      </Box>

      {/* Tab Panels */}
      <TabPanel value={value} index={0}>
        <DeviceSettings deviceId={activeDevice?.id || ''} />
      </TabPanel>
      <TabPanel value={value} index={1}>
        <Box sx={{ p: 3 }}>
          <Typography variant="h6">{t('common:users.title')}</Typography>
          <Typography variant="body1" color="textSecondary">
            {t('common:coming_soon')}
          </Typography>
        </Box>
      </TabPanel>
      <TabPanel value={value} index={2}>
        {isNfcCompatible ? <NfcTagsTab /> : <Box sx={{ p: 3 }}>Feature Unavailable</Box>}
      </TabPanel>
    </Box>
  );
};
