export interface HardwareInference {
  version: string;
  battery: 'aaa' | 'lsh14' | 'unknown';
  label: string;
}

export function inferHardwareFromFirmware(firmwareRevision: string | null): HardwareInference {
  if (!firmwareRevision) return { version: 'Unknown', battery: 'unknown', label: 'Inconnu' };

  // Normalize string to handle potential encoding weirdness or case
  const rev = firmwareRevision.toLowerCase();

  if (rev.includes('10/125') || rev.includes('boks4')) {
    return { version: '4.0', battery: 'aaa', label: '8x AAA' };
  }
  if (rev.includes('10/cd') || rev.includes('boks3')) {
    return { version: '3.0', battery: 'lsh14', label: 'Saft LSH14' };
  }

  return { version: 'Unknown', battery: 'unknown', label: 'Inconnu' };
}

/**
 * Maps technical BLE error messages from the browser to translation keys.
 * @param error The error object or message string
 * @returns A translation key or the original message if no mapping found
 */
export function translateBLEError(error: unknown): string {
  const msg = (typeof error === 'string' ? error : (error as Error).message || '').toLowerCase();

  if (msg.includes('user cancelled') || msg.includes('chooser')) {
    return 'common:errors.browser.userCancelled';
  }
  if (msg.includes('bluetooth adapter not available') || msg.includes('bluetooth is disabled')) {
    return 'common:errors.browser.bluetoothDisabled';
  }
  if (msg.includes('no device selected')) {
    return 'common:errors.browser.noDeviceSelected';
  }

  return typeof error === 'string' ? error : (error as Error).message || '';
}
