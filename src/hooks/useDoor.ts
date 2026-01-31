import { useContext } from 'react';
import { BoksContext } from '../context/Contexts';

export const useDoor = () => {
  const context = useContext(BoksContext);
  if (!context) {
    throw new Error('useDoor must be used within a BoksProvider');
  }
  return context;
};
