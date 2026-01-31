import { useContext } from 'react';
import { LogContext } from '../context/Contexts';

export const useLogContext = () => {
  const context = useContext(LogContext);
  if (context === undefined) {
    throw new Error('useLogContext must be used within a LogProvider');
  }
  return context;
};
