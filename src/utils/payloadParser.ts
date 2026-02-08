import { BLEOpcode } from './bleConstants';
import { BasePayload } from './payloads/BasePayload';
import { DoorStatusPayload } from './payloads/DoorStatusPayload';
import { CodeOperationPayload } from './payloads/CodeOperationPayload';
import { InvalidOpenCodePayload } from './payloads/InvalidOpenCodePayload';
import { NotifyLogsCountPayload } from './payloads/NotifyLogsCountPayload';

// Logs
import { BaseLogPayload } from './payloads/logs/BaseLogPayload';
import { BleValidLogPayload } from './payloads/logs/BleValidLogPayload';
import { KeyValidLogPayload } from './payloads/logs/KeyValidLogPayload';
import { BleInvalidLogPayload } from './payloads/logs/BleInvalidLogPayload';
import { KeyInvalidLogPayload } from './payloads/logs/KeyInvalidLogPayload';
import { NfcOpeningLogPayload } from './payloads/logs/NfcOpeningLogPayload';
import { NfcRegisteringLogPayload } from './payloads/logs/NfcRegisteringLogPayload';
import { DoorCloseLogPayload } from './payloads/logs/DoorCloseLogPayload';
import { DoorOpenLogPayload } from './payloads/logs/DoorOpenLogPayload';
import { LogEndLogPayload } from './payloads/logs/LogEndLogPayload';
import { LogEraseLogPayload } from './payloads/logs/LogEraseLogPayload';
import { PowerOffLogPayload } from './payloads/logs/PowerOffLogPayload';
import { BlockResetLogPayload } from './payloads/logs/BlockResetLogPayload';
import { PowerOnLogPayload } from './payloads/logs/PowerOnLogPayload';
import { BleRebootLogPayload } from './payloads/logs/BleRebootLogPayload';
import { ScaleMeasureLogPayload } from './payloads/logs/ScaleMeasureLogPayload';
import { KeyOpeningLogPayload } from './payloads/logs/KeyOpeningLogPayload';
import { ErrorLogPayload } from './payloads/logs/ErrorLogPayload';

export interface ParsedPayload {
  opcode: number;
  payload: Uint8Array;
  raw: Uint8Array;
  toString(): string;
  toDetails(): Record<string, unknown>;
}

export function parsePayload(opcode: number, payload: Uint8Array, raw: Uint8Array): BasePayload {
  switch (opcode) {
    case BLEOpcode.NOTIFY_DOOR_STATUS:
    case BLEOpcode.ANSWER_DOOR_STATUS:
      return new DoorStatusPayload(opcode, payload, raw);

    case BLEOpcode.CODE_OPERATION_SUCCESS:
    case BLEOpcode.CODE_OPERATION_ERROR:
      return new CodeOperationPayload(opcode, payload, raw);

    case BLEOpcode.INVALID_OPEN_CODE:
      return new InvalidOpenCodePayload(opcode, payload, raw);

    case BLEOpcode.NOTIFY_LOGS_COUNT:
      return new NotifyLogsCountPayload(opcode, payload, raw);

    // Logs
    case BLEOpcode.LOG_CODE_BLE_VALID:
      return new BleValidLogPayload(opcode, payload, raw);
    case BLEOpcode.LOG_CODE_KEY_VALID:
      return new KeyValidLogPayload(opcode, payload, raw);
    case BLEOpcode.LOG_CODE_BLE_INVALID:
      return new BleInvalidLogPayload(opcode, payload, raw);
    case BLEOpcode.LOG_CODE_KEY_INVALID:
      return new KeyInvalidLogPayload(opcode, payload, raw);
    case BLEOpcode.LOG_DOOR_CLOSE:
      return new DoorCloseLogPayload(opcode, payload, raw);
    case BLEOpcode.LOG_DOOR_OPEN:
      return new DoorOpenLogPayload(opcode, payload, raw);
    case BLEOpcode.LOG_END:
      return new LogEndLogPayload(opcode, payload, raw);
    case BLEOpcode.LOG_ERASE:
      return new LogEraseLogPayload(opcode, payload, raw);
    case BLEOpcode.POWER_OFF:
      return new PowerOffLogPayload(opcode, payload, raw);
    case BLEOpcode.BLOCK_RESET:
      return new BlockResetLogPayload(opcode, payload, raw);
    case BLEOpcode.POWER_ON:
      return new PowerOnLogPayload(opcode, payload, raw);
    case BLEOpcode.BLE_REBOOT:
      return new BleRebootLogPayload(opcode, payload, raw);
    case BLEOpcode.LOG_EVENT_SCALE_MEASURE:
      return new ScaleMeasureLogPayload(opcode, payload, raw);
    case BLEOpcode.LOG_EVENT_KEY_OPENING:
      return new KeyOpeningLogPayload(opcode, payload, raw);
    case BLEOpcode.LOG_EVENT_ERROR:
      return new ErrorLogPayload(opcode, payload, raw);
    case BLEOpcode.LOG_EVENT_NFC_OPENING:
      return new NfcOpeningLogPayload(opcode, payload, raw);
    case BLEOpcode.LOG_EVENT_NFC_REGISTERING:
      return new NfcRegisteringLogPayload(opcode, payload, raw);

    default:
      // Generic fallback
      return new (class extends BasePayload {})(opcode, payload, raw);
  }
}

/**
 * Type guard for Log Payloads
 */
export function isLogPayload(payload: BasePayload): payload is BaseLogPayload {
  return payload instanceof BaseLogPayload;
}
