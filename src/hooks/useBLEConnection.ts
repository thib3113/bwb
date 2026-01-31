import { useContext } from 'react';
import { BLEContext } from '../context/Contexts';

export const useBLEConnection = () => {
  const context = useContext(BLEContext);
  if (!context) {
    throw new Error('useBLEConnection must be used within a BLEProvider');
  }
  return context;
};
