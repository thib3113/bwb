// Utility functions for parsing BLE payload content
import { BLEOpcode } from './bleConstants';
import { ParsedPayload, GenericPayload } from './payloads/base';
import { NotifyDoorStatusPayload } from './payloads/NotifyDoorStatusPayload';
import { AnswerDoorStatusPayload } from './payloads/AnswerDoorStatusPayload';
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
import { TestBatteryPayload } from './payloads/TestBatteryPayload';
import { NotifyLogsCountPayload } from './payloads/NotifyLogsCountPayload';
import { ErrorCrcPayload } from './payloads/ErrorCrcPayload';
import { ErrorUnauthorizedPayload } from './payloads/ErrorUnauthorizedPayload';
import { ErrorBadRequestPayload } from './payloads/ErrorBadRequestPayload';
import { ErrorCommandNotSupportedPayload } from './payloads/ErrorCommandNotSupportedPayload';
import { CodeOperationSuccessPayload } from './payloads/CodeOperationSuccessPayload';
import { CodeOperationErrorPayload } from './payloads/CodeOperationErrorPayload';
import { ValidOpenCodePayload } from './payloads/ValidOpenCodePayload';
import { InvalidOpenCodePayload } from './payloads/InvalidOpenCodePayload';
import { NotifyCodesCountPayload } from './payloads/NotifyCodesCountPayload';

// Export all payload types for external use
export type { ParsedPayload };
export {
  GenericPayload,
  NotifyDoorStatusPayload,
  AnswerDoorStatusPayload,
  BleValidLogPayload,
  KeyValidLogPayload,
  BleInvalidLogPayload,
  KeyInvalidLogPayload,
  NfcOpeningLogPayload,
  NfcRegisteringLogPayload,
  DoorCloseLogPayload,
  DoorOpenLogPayload,
  LogEndLogPayload,
  LogEraseLogPayload,
  PowerOffLogPayload,
  BlockResetLogPayload,
  PowerOnLogPayload,
  BleRebootLogPayload,
  ScaleMeasureLogPayload,
  KeyOpeningLogPayload,
  ErrorLogPayload,
  TestBatteryPayload,
  NotifyLogsCountPayload,
  NotifyCodesCountPayload,
  ErrorCrcPayload,
  ErrorUnauthorizedPayload,
  ErrorBadRequestPayload,
  ErrorCommandNotSupportedPayload,
  CodeOperationSuccessPayload,
  CodeOperationErrorPayload,
  ValidOpenCodePayload,
  InvalidOpenCodePayload,
};

// Factory function to parse payload based on opcode
export function parsePayload(opcode: number, payload: Uint8Array, raw: Uint8Array): ParsedPayload {
  switch (opcode) {
    // Door status
    case BLEOpcode.NOTIFY_DOOR_STATUS:
      return new NotifyDoorStatusPayload(opcode, payload, raw);
    case BLEOpcode.ANSWER_DOOR_STATUS:
      return new AnswerDoorStatusPayload(opcode, payload, raw);

    // Code count
    case BLEOpcode.NOTIFY_CODES_COUNT:
      return new NotifyCodesCountPayload(opcode, payload, raw);

    // Code operation
    case BLEOpcode.CODE_OPERATION_SUCCESS:
      return new CodeOperationSuccessPayload(opcode, payload, raw);
    case BLEOpcode.CODE_OPERATION_ERROR:
      return new CodeOperationErrorPayload(opcode, payload, raw);

    // Code validation
    case BLEOpcode.VALID_OPEN_CODE:
      return new ValidOpenCodePayload(opcode, payload, raw);
    case BLEOpcode.INVALID_OPEN_CODE:
      return new InvalidOpenCodePayload(opcode, payload, raw);

    // Code Log
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

    case BLEOpcode.LOG_EVENT_NFC_OPENING:
      return new NfcOpeningLogPayload(opcode, payload, raw);
    case BLEOpcode.LOG_EVENT_NFC_REGISTERING:
      return new NfcRegisteringLogPayload(opcode, payload, raw);

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

    // Logs count
    case BLEOpcode.NOTIFY_LOGS_COUNT:
      return new NotifyLogsCountPayload(opcode, payload, raw);

    // Battery
    case BLEOpcode.TEST_BATTERY:
      return new TestBatteryPayload(opcode, payload, raw);

    // Errors
    case BLEOpcode.ERROR_CRC:
      return new ErrorCrcPayload(opcode, payload, raw);
    case BLEOpcode.ERROR_UNAUTHORIZED:
      return new ErrorUnauthorizedPayload(opcode, payload, raw);
    case BLEOpcode.ERROR_BAD_REQUEST:
      return new ErrorBadRequestPayload(opcode, payload, raw);
    case BLEOpcode.ERROR_COMMAND_NOT_SUPPORTED:
      return new ErrorCommandNotSupportedPayload(opcode, payload, raw);

    // Generic fallback
    default:
      return new GenericPayload(opcode, payload, raw);
  }
}
