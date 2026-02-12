import { BoksDevice } from '../types';
import { MIN_FIRMWARE_VERSION } from './constants';

export const compareVersions = (v1: string, v2: string): number => {
  if (!v1 || !v2) return 0;
  // Remove non-numeric prefix/suffix if any (simple)
  const cleanV1 = v1.replace(/[^0-9.]/g, '');
  const cleanV2 = v2.replace(/[^0-9.]/g, '');

  const p1 = cleanV1.split('.').map(Number);
  const p2 = cleanV2.split('.').map(Number);

  for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
    const n1 = p1[i] || 0;
    const n2 = p2[i] || 0;
    if (n1 > n2) return 1;
    if (n1 < n2) return -1;
  }
  return 0;
};

export const PCB_VERSIONS: Record<string, string> = {
  '10/125': '4.0',
  '10/cd': '3.0'
};

export interface DeviceVersionStatus {
  isOldSoftware: boolean;
  isUnknownHardware: boolean;
  isRestricted: boolean;
  isValid: boolean;
}

export const checkDeviceVersion = (device: BoksDevice | null): DeviceVersionStatus => {
  if (!device) {
    return {
      isOldSoftware: false,
      isUnknownHardware: false,
      isRestricted: false,
      isValid: true
    };
  }

  // Check Software Version
  const isOldSoftware = !!(
    device.software_revision && compareVersions(device.software_revision, MIN_FIRMWARE_VERSION) < 0
  );

  // Check Hardware Version (Must be mapped if firmware is present)
  // Logic: If we have a firmware revision (meaning we read it), we MUST have a mapped hardware version.
  const isUnknownHardware = !!(device.firmware_revision && !device.hardware_version);

  const isRestricted = isOldSoftware || isUnknownHardware;

  return {
    isOldSoftware,
    isUnknownHardware,
    isRestricted,
    isValid: !isRestricted
  };
};
