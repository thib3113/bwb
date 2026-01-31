import { useContext } from 'react';
import { DeviceLogContext } from '../context/Contexts';

export const useDeviceLogContext = () => {
  const context = useContext(DeviceLogContext);
  if (context === undefined) {
    throw new Error('useDeviceLogContext must be used within a DeviceLogProvider');
  }
  return context;
};
