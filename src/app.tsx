import { useTranslation } from 'react-i18next';
import { MainLayout } from './components/layout/MainLayout';
import { lazy, Suspense, useEffect, useState } from 'react';
import { StorageService } from './services/StorageService';
import { db } from './db/db'; // Import DB to expose it
import { Alert, Box, Button, CircularProgress, Paper, Snackbar, Typography } from '@mui/material';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { useTaskConsistency } from './hooks/useTaskConsistency';
import { useDevice } from './hooks/useDevice';

// Lazy loading pages
const HomePage = lazy(() =>
  import('./pages/HomePage').then((module) => ({ default: module.HomePage }))
);
const AboutPage = lazy(() =>
  import('./pages/AboutPage').then((module) => ({ default: module.AboutPage }))
);
const MyBoksPage = lazy(() =>
  import('./pages/MyBoksPage').then((module) => ({ default: module.MyBoksPage }))
);
const DebugWizardPage = lazy(() =>
  import('./pages/DebugWizardPage').then((module) => ({ default: module.DebugWizardPage }))
);
const DebugView = lazy(() =>
  import('./components/DebugView').then((module) => ({ default: module.DebugView }))
);
const MaintenancePage = lazy(() =>
  import('./pages/MaintenancePage').then((module) => ({ default: module.MaintenancePage }))
);
const DeveloperPage = lazy(() =>
  import('./pages/DeveloperPage').then((module) => ({ default: module.DeveloperPage }))
);
const DfuUpdatePage = lazy(() =>
  import('./pages/DfuUpdatePage').then((module) => ({ default: module.DfuUpdatePage }))
);

// Lazy loading tab components
const CodeManagerWrapper = lazy(() =>
  import('./components/codes/CodeManagerWrapper').then((module) => ({
    default: module.CodeManagerWrapper
  }))
);
const LogViewerWrapperComponent = lazy(() =>
  import('./components/log/LogViewerWrapper').then((module) => ({
    default: module.LogViewerWrapper
  }))
);
const SettingsContentWrapper = lazy(() =>
  import('./components/settings/SettingsContentWrapper').then((module) => ({
    default: module.SettingsContentWrapper
  }))
);

const LoadingFallback = () => (
  <Box
    sx={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100%',
      minHeight: '50vh'
    }}
  >
    <CircularProgress />
  </Box>
);

export function App() {
  const { activeDeviceId } = useDevice();
  useTaskConsistency(activeDeviceId);
  const navigate = useNavigate();

  const { t } = useTranslation();
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'info' as 'success' | 'error' | 'info' | 'warning'
  });

  useEffect(() => {
    // Expose StorageService for debugging
    if (globalThis.window) {
      window.boksDebug = {
        ...window.boksDebug,
        mockData: StorageService.mockData,
        StorageService: StorageService,
        db: db // Explicitly expose db
      };
      console.log('StorageService and DB exposed to window.boksDebug');
    }

    // Check for trampoline redirect from 404.html hack (GitHub Pages SPA)
    // Example: /?page=update&target_pcb=...
    const searchParams = new URLSearchParams(window.location.search);
    const redirectPage = searchParams.get('page');
    if (redirectPage === 'update') {
      // Remove 'page' param but keep others
      searchParams.delete('page');
      const newQuery = searchParams.toString();
      navigate(`/update${newQuery ? '?' + newQuery : ''}`, { replace: true });
    }
  }, [navigate]);

  // Check if user is on iOS
  const isIOS = () => {
    // noinspection JSDeprecatedSymbols
    const userAgent = navigator.userAgent || navigator.vendor || globalThis.window.opera || '';
    return /iPad|iPhone|iPod/.test(userAgent) && !globalThis.window.MSStream;
  };

  // Check if user is on Chrome
  const isChrome = () => {
    // noinspection JSDeprecatedSymbols
    const userAgent = navigator.userAgent || navigator.vendor || globalThis.window.opera || '';
    return /Chrome/.test(userAgent) && /Google Inc/.test(navigator.vendor);
  };

  // Check if Web BLE is supported
  const isWebBleSupported = () => {
    if (typeof window !== 'undefined') {
      if (
        window.BOKS_SIMULATOR_ENABLED ||
        localStorage.getItem('BOKS_SIMULATOR_ENABLED') === 'true'
      )
        return true;
    }

    return navigator.bluetooth !== undefined;
  };

  const showNotification = (
    message: string,
    severity: 'success' | 'error' | 'info' | 'warning' = 'info'
  ) => {
    setNotification({ open: true, message, severity });
  };

  const hideNotification = () => {
    setNotification((prev) => ({ ...prev, open: false }));
  };

  const handleCloseNotification = () => {
    setNotification({ ...notification, open: false });
  };

  const getCompatibilityMessage = () => {
    if (isIOS()) {
      return (
        <Box data-testid="ios-compatibility-message">
          <Typography variant="body1" component="p" gutterBottom>
            {t('common:web_ble_not_supported.ios_message')}
          </Typography>
          <Typography variant="body1" component="p" sx={{ fontWeight: 'bold' }}>
            {t('common:web_ble_not_supported.ios_action')}
          </Typography>
          <Button
            data-testid="bluefy-download-button"
            variant="contained"
            color="primary"
            sx={{ mt: 2 }}
            href="https://apps.apple.com/us/app/bluefy-web-ble-browser/id1492822055"
            target="_blank"
            rel="noopener noreferrer"
          >
            Télécharger Bluefy
          </Button>
        </Box>
      );
    }

    if (isChrome()) {
        return (
            <Box data-testid="chrome-compatibility-message">
              <Typography variant="body1" component="p">
                {t('common:web_ble_not_supported_message')}
              </Typography>
              <Typography variant="body2" component="p" sx={{ mt: 1, color: 'text.secondary' }}>
                {t('common:web_ble_not_supported.chrome_update')}
              </Typography>
            </Box>
        );
    }

    // Default for Firefox, Safari Desktop, etc.
    return (
        <Typography data-testid="generic-compatibility-message" variant="body1" component="p">
            {t('common:web_ble_not_supported_message')}
        </Typography>
    );
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {isWebBleSupported() ? (
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route
              element={
                <MainLayout
                  showNotification={showNotification}
                  hideNotification={hideNotification}
                />
              }
            >
              <Route path="/about" element={<AboutPage />} />
              <Route path="/my-boks" element={<MyBoksPage />} />
              {/* Debug routes kept for direct access if needed, but removed from navigation */}
              <Route path="/debug-wizard" element={<DebugWizardPage />} />
              <Route path="/debug-view" element={<DebugView />} />
              <Route path="/maintenance" element={<MaintenancePage />} />
              <Route path="/developer" element={<DeveloperPage />} />
              <Route path="/update" element={<DfuUpdatePage />} />
              <Route path="/" element={<HomePage />}>
                <Route index element={<Navigate to="/codes" replace />} />
                <Route
                  path="codes"
                  element={
                    <Suspense fallback={<LoadingFallback />}>
                      <CodeManagerWrapper />
                    </Suspense>
                  }
                />
                <Route
                  path="logs"
                  element={
                    <Suspense fallback={<LoadingFallback />}>
                      <LogViewerWrapperComponent />
                    </Suspense>
                  }
                />
                <Route
                  path="settings"
                  element={
                    <Suspense fallback={<LoadingFallback />}>
                      <SettingsContentWrapper />
                    </Suspense>
                  }
                />
              </Route>
            </Route>
            {/* Catch-all route for unknown paths */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      ) : (
        <Paper data-testid="web-ble-not-supported-card" sx={{ textAlign: 'center', p: 4, m: 2, color: 'error.main' }}>
          <Typography variant="h5" component="h1" gutterBottom>
            {t('common:web_ble_not_supported_title')}
          </Typography>
          {getCompatibilityMessage()}
        </Paper>
      )}

      {/* Global notification system */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleCloseNotification}
          severity={notification.severity}
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
