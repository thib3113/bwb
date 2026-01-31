import { useBLE } from './useBLE';

export const useBLEEvents = () => {
  const { addListener, removeListener, registerCallback, unregisterCallback } = useBLE();

  return {
    addListener,
    removeListener,
    registerCallback,
    unregisterCallback,
  };
};
