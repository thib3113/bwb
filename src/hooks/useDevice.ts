import { useContext } from 'react';
import { DeviceContext } from '../context/Contexts';
import { DeviceContextType } from '../context/types';

export const useDevice = (): DeviceContextType => {
  const context = useContext(DeviceContext);
  if (context === undefined) {
    throw new Error('useDevice must be used within a DeviceProvider');
  }
  return context;
};
