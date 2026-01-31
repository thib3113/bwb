import { useContext } from 'react';
import { BoksContext } from '../context/Contexts';

export const useBoks = () => {
  const context = useContext(BoksContext);
  if (context === undefined) {
    throw new Error('useBoks must be used within a BoksProvider');
  }
  return context;
};
