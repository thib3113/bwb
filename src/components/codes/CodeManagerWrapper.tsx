import { useOutletContext } from 'react-router-dom';
import { CodeManager } from './CodeManager';
import { Box } from '@mui/material';

interface OutletContextType {
  showNotification: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  hideNotification: () => void;
}

export const CodeManagerWrapper = () => {
  const context = useOutletContext<OutletContextType>();

  if (!context) {
    return null;
  }

  const { showNotification, hideNotification } = context;

  return (
    <Box sx={{ p: 2 }}>
      <CodeManager showNotification={showNotification} hideNotification={hideNotification} />
    </Box>
  );
};
