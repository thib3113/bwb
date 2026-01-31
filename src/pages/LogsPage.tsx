import { Container } from '@mui/material';
import { LogViewer } from '../components/log/LogViewer';

interface LogsPageProps {
  showNotification: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  hideNotification: () => void;
}

export const LogsPage = ({ showNotification, hideNotification }: LogsPageProps) => {
  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <LogViewer showNotification={showNotification} hideNotification={hideNotification} />
    </Container>
  );
};
