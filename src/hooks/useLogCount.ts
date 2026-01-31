import { useContext } from 'react';
import { DeviceContext } from '../context/Contexts';

export const useLogCount = () => {
  const context = useContext(DeviceContext);
  if (context === undefined) {
    throw new Error('useLogCount must be used within a DeviceProvider');
  }
  return {
    logCount: context.logCount,
  };
};
