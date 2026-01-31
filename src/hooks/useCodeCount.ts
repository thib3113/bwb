import { useContext } from 'react';
import { DeviceContext } from '../context/Contexts';

export const useCodeCount = () => {
  const context = useContext(DeviceContext);
  if (context === undefined) {
    throw new Error('useCodeCount must be used within a DeviceProvider');
  }
  return {
    codeCount: context.codeCount,
    refreshCodeCount: context.refreshCodeCount,
  };
};
