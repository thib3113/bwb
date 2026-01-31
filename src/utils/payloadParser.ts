// Utility functions for parsing BLE payload content
import { BLEOpcode } from './bleConstants';
import { ParsedPayload, GenericPayload } from './payloads/base';
import { DoorStatusPayload } from './payloads/doorStatus';
import { CodeHistoryPayload } from './payloads/codeHistory';
import { BatteryPayload } from './payloads/battery';
import { LogsCountPayload } from './payloads/logsCount';
import { ErrorPayload } from './payloads/error';
import { CodeOperationPayload } from './payloads/codeOperation';
import { CodesCountPayload } from './payloads/codesCount';

// Export all payload types for external use
export type { ParsedPayload };
export { GenericPayload };
export { DoorStatusPayload };
export { CodeHistoryPayload };
export { BatteryPayload };
export { LogsCountPayload };
export { ErrorPayload };
export { CodeOperationPayload };
export { CodesCountPayload };

// Factory function to parse payload based on opcode
export function parsePayload(opcode: number, payload: Uint8Array, raw: Uint8Array): ParsedPayload {
  switch (opcode) {
    // Door status
    case BLEOpcode.NOTIFY_DOOR_STATUS:
    case BLEOpcode.ANSWER_DOOR_STATUS:
      return new DoorStatusPayload(opcode, payload, raw);

    // Code count
    case BLEOpcode.NOTIFY_CODES_COUNT:
      return new CodesCountPayload(opcode, payload, raw);

    // Code operation
    case BLEOpcode.CODE_OPERATION_SUCCESS:
    case BLEOpcode.CODE_OPERATION_ERROR:
      return new CodeOperationPayload(opcode, payload, raw);

    // Code validation
    case BLEOpcode.VALID_OPEN_CODE:
    case BLEOpcode.INVALID_OPEN_CODE:
      return new CodeOperationPayload(opcode, payload, raw); // Reuse for valid/invalid code

    // Code history
    case BLEOpcode.LOG_CODE_BLE_VALID_HISTORY:
    case BLEOpcode.LOG_CODE_KEY_VALID_HISTORY:
    case BLEOpcode.LOG_CODE_BLE_INVALID_HISTORY:
    case BLEOpcode.LOG_CODE_KEY_INVALID_HISTORY:
    case BLEOpcode.LOG_DOOR_CLOSE_HISTORY:
    case BLEOpcode.LOG_DOOR_OPEN_HISTORY:
    case BLEOpcode.LOG_END_HISTORY:
    case BLEOpcode.LOG_HISTORY_ERASE:
    case BLEOpcode.POWER_OFF:
    case BLEOpcode.BLOCK_RESET:
    case BLEOpcode.POWER_ON:
    case BLEOpcode.BLE_REBOOT:
    case BLEOpcode.LOG_EVENT_SCALE_MEASURE:
    case BLEOpcode.LOG_EVENT_KEY_OPENING:
    case BLEOpcode.LOG_EVENT_ERROR:
    case BLEOpcode.LOG_EVENT_NFC_OPENING:
    case BLEOpcode.LOG_EVENT_NFC_REGISTERING:
      return new CodeHistoryPayload(opcode, payload, raw);

    // Logs count
    case BLEOpcode.NOTIFY_LOGS_COUNT:
      return new LogsCountPayload(opcode, payload, raw);

    // Battery
    case BLEOpcode.TEST_BATTERY:
      return new BatteryPayload(opcode, payload, raw);

    // Errors
    case BLEOpcode.ERROR_CRC:
    case BLEOpcode.ERROR_UNAUTHORIZED:
    case BLEOpcode.ERROR_BAD_REQUEST:
    case BLEOpcode.ERROR_COMMAND_NOT_SUPPORTED:
      return new ErrorPayload(opcode, payload, raw);

    // Generic fallback
    default:
      return new GenericPayload(opcode, payload, raw);
  }
}
