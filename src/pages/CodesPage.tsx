import { Box, Container } from '@mui/material';
import { CodeManager } from '../components/codes/CodeManager';

interface CodesPageProps {
  showNotification: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  hideNotification: () => void;
}

export const CodesPage = ({ showNotification, hideNotification }: CodesPageProps) => {
  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Box sx={{ width: '100%' }}>
        <CodeManager showNotification={showNotification} hideNotification={hideNotification} />
      </Box>
    </Container>
  );
};
