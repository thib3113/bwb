import { useBLE } from './useBLE';

export const useBLEEvents = () => {
  const { addListener, removeListener } = useBLE();
  return { addListener, removeListener };
};
