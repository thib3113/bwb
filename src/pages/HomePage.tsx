import { useTranslation } from 'react-i18next';
import { BottomNavigation, BottomNavigationAction, Box } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useDevice } from '../hooks/useDevice';
import { OnboardingView } from '../components/layout/OnboardingView';
import { Outlet, useLocation, useNavigate, useOutletContext } from 'react-router-dom';
import {
  History as HistoryIcon,
  Settings as SettingsIcon,
  VpnKey as VpnKeyIcon,
} from '@mui/icons-material';

interface OutletContextType {
  showNotification: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  hideNotification: () => void;
}

export const HomePage = () => {
  const { t } = useTranslation(['common', 'codes', 'logs', 'settings']);
  const theme = useTheme();
  const { knownDevices } = useDevice();
  const { showNotification, hideNotification } = useOutletContext<OutletContextType>();
  const location = useLocation();
  const navigate = useNavigate();

  // Determine active tab based on current location
  const getActiveTab = () => {
    if (location.pathname.endsWith('/logs')) return 1;
    if (location.pathname.endsWith('/settings')) return 2;
    return 0; // default to codes tab
  };

  const activeTab = getActiveTab();

  if (knownDevices.length === 0) {
    return <OnboardingView showNotification={showNotification} />;
  }

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    switch (newValue) {
      case 0:
        navigate('/codes');
        break;
      case 1:
        navigate('/logs');
        break;
      case 2:
        navigate('/settings');
        break;
      default:
        navigate('/codes');
    }
  };

  return (
    <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Content Area */}
      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        <Outlet context={{ showNotification, hideNotification }} />
      </Box>

      {/* Bottom Navigation */}
      <BottomNavigation
        value={activeTab}
        onChange={handleTabChange}
        showLabels
        sx={{
          width: '100%',
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          backgroundColor: theme.palette.background.paper,
        }}
      >
        <BottomNavigationAction label={t('codes:title')} icon={<VpnKeyIcon />} />
        <BottomNavigationAction label={t('logs:title')} icon={<HistoryIcon />} />
        <BottomNavigationAction label={t('settings:title')} icon={<SettingsIcon />} />
      </BottomNavigation>
    </Box>
  );
};
