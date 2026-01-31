import { useOutletContext } from 'react-router-dom';
import { LogViewer } from './LogViewer';

interface OutletContextType {
  showNotification: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  hideNotification: () => void;
}

export const LogViewerWrapper = () => {
  const context = useOutletContext<OutletContextType>();

  if (!context) {
    return null;
  }

  const { showNotification, hideNotification } = context;

  return <LogViewer showNotification={showNotification} hideNotification={hideNotification} />;
};
