/**
 * Log Parser Utility
 * Inspired by Home Assistant Boks integration event.py
 * Parses raw Boks log entries into structured objects with event types, descriptions, and details
 */

import {BoksLog} from '../types';
import {parsePayload} from './payloadParser';
import {BLEOpcode, DIAGNOSTIC_ERROR_CODES, POWER_OFF_REASONS} from './bleConstants';

interface LogEventType {
  type: string;
  description: string;
}

// Event types mapping from BoksHistoryEvent enum
const LOG_EVENT_TYPES: Record<number, LogEventType> = {
  [BLEOpcode.VALID_OPEN_CODE]: { type: 'valid_open_code', description: 'events.valid_open_code' },
  [BLEOpcode.INVALID_OPEN_CODE]: { type: 'invalid_open_code', description: 'events.invalid_open_code' },
  [BLEOpcode.NOTIFY_DOOR_STATUS]: { type: 'notify_door_status', description: 'events.notify_door_status' },
  [BLEOpcode.ANSWER_DOOR_STATUS]: { type: 'answer_door_status', description: 'events.answer_door_status' },
  [BLEOpcode.LOG_CODE_BLE_VALID_HISTORY]: { type: 'code_ble_valid', description: 'events.code_ble_valid' },
  [BLEOpcode.LOG_CODE_KEY_VALID_HISTORY]: { type: 'code_key_valid', description: 'events.code_key_valid' },
  [BLEOpcode.LOG_CODE_BLE_INVALID_HISTORY]: { type: 'code_ble_invalid', description: 'events.code_ble_invalid' },
  [BLEOpcode.LOG_CODE_KEY_INVALID_HISTORY]: { type: 'code_key_invalid', description: 'events.code_key_invalid' },
  [BLEOpcode.LOG_DOOR_CLOSE_HISTORY]: { type: 'door_closed', description: 'events.door_closed' },
  [BLEOpcode.LOG_DOOR_OPEN_HISTORY]: { type: 'door_opened', description: 'events.door_opened' },
  [BLEOpcode.LOG_END_HISTORY]: { type: 'log_end_history', description: 'events.log_end_history' },
  [BLEOpcode.LOG_HISTORY_ERASE]: { type: 'history_erase', description: 'events.history_erase' },
  [BLEOpcode.POWER_OFF]: { type: 'power_off', description: 'events.power_off' },
  [BLEOpcode.BLOCK_RESET]: { type: 'block_reset', description: 'events.block_reset' },
  [BLEOpcode.POWER_ON]: { type: 'power_on', description: 'events.power_on' },
  [BLEOpcode.BLE_REBOOT]: { type: 'ble_reboot', description: 'events.ble_reboot' },
  [BLEOpcode.LOG_EVENT_SCALE_MEASURE]: { type: 'scale_continuous_measure', description: 'events.scale_continuous_measure' },
  [BLEOpcode.LOG_EVENT_KEY_OPENING]: { type: 'key_opening', description: 'events.key_opening' },
  [BLEOpcode.LOG_EVENT_ERROR]: { type: 'error', description: 'events.error' },
  [BLEOpcode.LOG_EVENT_NFC_OPENING]: { type: 'nfc_opening', description: 'events.nfc_opening' },
  [BLEOpcode.LOG_EVENT_NFC_REGISTERING]: { type: 'nfc_tag_registering_scan', description: 'events.nfc_tag_registering_scan' },
};

export interface ParsedLog extends BoksLog {
  eventType: string;
  description: string;
  details: Record<string, unknown>; // Use unknown instead of any
  hasDetails: boolean;
  raw: BoksLog; // Original raw log entry
}

/**
 * Parse a raw log entry into a structured object
 * @param {Object} logEntry - Raw log entry from database
 * @returns {Object} Parsed log object with eventType, description, details, and timestamp
 */
export function parseLog(logEntry: BoksLog): ParsedLog {
  try {
    // Extract basic information
    const opcode = logEntry.opcode as number; // Type cast since we check mapping below
    const payload = logEntry.payload || logEntry.data; // Use logEntry.payload or logEntry.data

    // Get event type mapping
    const eventMapping = LOG_EVENT_TYPES[opcode] || {
      // Handle cases where opcode might be undefined or unmapped
      type: 'unknown',
      description: 'events.unknown',
    };

    // Convert payload to Uint8Array if needed
    let payloadBytes: Uint8Array | null = null;

    if (payload instanceof Uint8Array) {
      payloadBytes = payload;
    } else if (Array.isArray(payload)) {
      payloadBytes = new Uint8Array(payload);
    } else if (typeof payload === 'string') {
      // Convert hex string to Uint8Array
      const hex = (payload as string).replace(/\s/g, '');
      payloadBytes = new Uint8Array(hex.length / 2);
      for (let i = 0; i < hex.length; i += 2) {
        payloadBytes[i / 2] = parseInt(hex.substring(i, 2), 16);
      }
    } else if (
      typeof payload === 'object' &&
      payload !== null &&
      Object.keys(payload).every((k) => !isNaN(Number(k)))
    ) {
      // Handle object that looks like array (e.g. {0: 1, 1: 2})
      const values = Object.values(payload).map((v) => Number(v));
      payloadBytes = new Uint8Array(values);
    }

    // Parse payload using the new payload parser
    let details: Record<string, unknown> = {};
    if (payloadBytes && opcode !== undefined) {
      const rawPacket = new Uint8Array(2 + payloadBytes.length);
      rawPacket[0] = opcode;
      rawPacket[1] = payloadBytes.length;
      rawPacket.set(payloadBytes, 2);
      const parsedPayload = parsePayload(opcode, payloadBytes, rawPacket);
      details = parsedPayload.toDetails();
    }

    // Handle special cases that need additional parsing
    if (opcode === BLEOpcode.POWER_OFF) {
      // POWER_OFF
      if (details.reason !== undefined) {
        const reasonCode = Number(details.reason);
        details.reason = POWER_OFF_REASONS[reasonCode] || `unknown_reason_${reasonCode}`;
      }
    } else if (opcode === BLEOpcode.LOG_EVENT_ERROR) {
      // LOG_EVENT_ERROR (Diagnostic)
      if (details.errorCode !== undefined) {
        const errorCode = Number(details.errorCode);
        details.errorCode =
          DIAGNOSTIC_ERROR_CODES[errorCode] || `unknown_error_${errorCode.toString(16)}`;
      }
    }

    // Determine if this log has meaningful details to display
    const hasDetails = [
      BLEOpcode.LOG_CODE_BLE_VALID_HISTORY, // CODE_BLE_VALID_HISTORY (Code, MAC)
      BLEOpcode.LOG_CODE_KEY_VALID_HISTORY, // CODE_KEY_VALID_HISTORY (Code)
      BLEOpcode.LOG_CODE_BLE_INVALID_HISTORY, // CODE_BLE_INVALID_HISTORY (Code, MAC)
      BLEOpcode.LOG_CODE_KEY_INVALID_HISTORY, // CODE_KEY_INVALID_HISTORY (Code)
      BLEOpcode.POWER_OFF, // POWER_OFF (Reason)
      BLEOpcode.LOG_EVENT_ERROR, // LOG_EVENT_ERROR (Error code)
      BLEOpcode.LOG_EVENT_NFC_OPENING, // NFC_OPENING (UID)
      BLEOpcode.LOG_EVENT_NFC_REGISTERING, // NFC_TAG_REGISTERING_SCAN (Data)
      BLEOpcode.LOG_EVENT_SCALE_MEASURE, // SCALE_CONTINUOUS_MEASURE (Weight, Battery)
    ].includes(opcode);

    // Ensure we have all required fields
    return {
      ...logEntry,
      device_id: logEntry.device_id || logEntry.deviceId || 'unknown',
      event: eventMapping.description,
      type: eventMapping.type,
      eventType: eventMapping.type,
      description: eventMapping.description,
      details,
      timestamp: String(logEntry.timestamp || new Date().toISOString()),
      raw: logEntry, // Keep original for reference
      hasDetails,
      synced: logEntry.synced || false,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error parsing log entry:', errorMessage);
    const fallbackDeviceId = logEntry.deviceId || logEntry.device_id || 'unknown';
    return {
      ...logEntry,
      device_id: fallbackDeviceId,
      event: 'unknown',
      type: 'error',
      eventType: 'unknown',
      description: 'events.unknown',
      details: { error: errorMessage, raw: logEntry },
      timestamp: new Date().toISOString(),
      raw: logEntry,
      hasDetails: false,
      synced: logEntry.synced || false,
    };
  }
}

/**
 * Parse multiple log entries
 * @param {Array} logEntries - Array of raw log entries
 * @returns {Array} Array of parsed log objects
 */
export function parseLogs(logEntries: BoksLog[]): ParsedLog[] {
  if (!Array.isArray(logEntries)) {
    return [];
  }

  return logEntries.map(parseLog).filter((log) => log !== null && log !== undefined);
}

/**
 * Format details for display
 * @param {Object} details - Details object from parsed log
 * @returns {string} Formatted details string
 */
export function formatDetails(details: Record<string, unknown>): string {
  if (!details || typeof details !== 'object') {
    return '';
  }

  const parts: string[] = [];

  // Handle code events
  if (details.codeIndex !== undefined) {
    parts.push(`Index: ${details.codeIndex}`);
  }
  if (details.code) {
    parts.push(`Code: ${details.code}`);
  }

  // Handle battery level
  if (details.level !== undefined) {
    parts.push(`Level: ${details.level}%`);
  }

  // Handle weight
  if (details.weight !== undefined) {
    parts.push(`Weight: ${details.weight}g`);
  }

  // Handle error codes
  if (details.errorCode) {
    parts.push(`Error: ${details.errorCode}`);
  }

  // Handle reason
  if (details.reason) {
    parts.push(`Reason: ${details.reason}`);
  }

  // Handle NFC
  if (details.tag_uid) {
    parts.push(`UID: ${details.tag_uid}`);
    if (details.tag_type !== undefined) {
      parts.push(`Type: ${details.tag_type}`);
    }
  }

  // Handle payload if no specific fields found
  if (parts.length === 0 && details.payload) {
    parts.push(String(details.payload));
  }

  return parts.join(', ');
}
