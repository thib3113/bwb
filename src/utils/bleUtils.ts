import {
  DEVICE_INFO_CHARS,
  BATTERY_LEVEL_CHAR_UUID,
  BATTERY_PROPRIETARY_CHAR_UUID,
  NOTIFY_CHAR_UUID,
  WRITE_CHAR_UUID,
} from './bleConstants';

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

/**
 * Resolves a Characteristic UUID to a human-readable name.
 */
export function getCharacteristicName(uuid: string): string {
  const lowerUuid = uuid.toLowerCase();

  // Check Device Info
  for (const [name, id] of Object.entries(DEVICE_INFO_CHARS)) {
    if (id.toLowerCase() === lowerUuid) return name;
  }

  // Check known UUIDs
  if (lowerUuid === BATTERY_LEVEL_CHAR_UUID.toLowerCase()) return 'Battery Level (Standard)';
  if (lowerUuid === BATTERY_PROPRIETARY_CHAR_UUID.toLowerCase())
    return 'Battery Level (Proprietary)';
  if (lowerUuid === NOTIFY_CHAR_UUID.toLowerCase()) return 'Boks Notify';
  if (lowerUuid === WRITE_CHAR_UUID.toLowerCase()) return 'Boks Write';

  return 'Unknown Characteristic';
}

/**
 * Parses the raw data of a characteristic based on its UUID.
 * Returns a formatted string representation of the value.
 */
export function parseCharacteristicValue(uuid: string, data: DataView): string {
  const lowerUuid = uuid.toLowerCase();

  // Device Info Characteristics are usually UTF-8 Strings
  const isDeviceInfo = Object.values(DEVICE_INFO_CHARS).some(
    (id) => id.toLowerCase() === lowerUuid
  );

  if (isDeviceInfo) {
    try {
      const decoder = new TextDecoder('utf-8');
      const text = decoder.decode(data);
      // Remove null terminators or weird chars
      return text.replace(/\0/g, '').trim();
    } catch {
      return 'Error decoding string';
    }
  }

  // Battery Level (Standard) - 1 byte percentage
  if (lowerUuid === BATTERY_LEVEL_CHAR_UUID.toLowerCase()) {
    const level = data.getUint8(0);
    return `${level}%`;
  }

  // Fallback: Hex representation
  const bytes = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
    .join(' ');
}
