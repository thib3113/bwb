import { useDevice } from './useDevice';
import { checkDeviceVersion, DeviceVersionStatus } from '../utils/version';

export const useVersionCheck = (): DeviceVersionStatus => {
  const { activeDevice } = useDevice();
  return checkDeviceVersion(activeDevice);
};
