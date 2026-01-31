import { useContext } from 'react';
import { BLEContext, LogContext } from '../context/Contexts';
import { BLEContextType, LogContextType } from '../context/types';

export const useBLE = (): BLEContextType & LogContextType => {
  const bleContext = useContext(BLEContext);
  const logContext = useContext(LogContext);

  if (bleContext === undefined) {
    throw new Error('useBLE must be used within a BLEProvider');
  }

  if (logContext === undefined) {
    throw new Error('useBLE must be used within a LogProvider');
  }

  return { ...bleContext, ...logContext };
};
