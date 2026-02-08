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

type PayloadConstructor = {
  new (opcode: number, payload: Uint8Array, raw: Uint8Array): BasePayload;
  OPCODES: number[];
};

const PAYLOAD_CONSTRUCTORS: PayloadConstructor[] = [
  DoorStatusPayload,
  CodeOperationPayload,
  InvalidOpenCodePayload,
  NotifyLogsCountPayload,
  BleValidLogPayload,
  KeyValidLogPayload,
  BleInvalidLogPayload,
  KeyInvalidLogPayload,
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
  NfcOpeningLogPayload,
  NfcRegisteringLogPayload
];

export function parsePayload(opcode: number, payload: Uint8Array, raw: Uint8Array): BasePayload {
  for (const Constructor of PAYLOAD_CONSTRUCTORS) {
    if (Constructor.OPCODES.includes(opcode)) {
      return new Constructor(opcode, payload, raw);
    }
  }

  // Generic fallback
  return new (class extends BasePayload {})(opcode, payload, raw);
}

/**
 * Type guard for Log Payloads
 */
export function isLogPayload(payload: BasePayload): payload is BaseLogPayload {
  return payload instanceof BaseLogPayload;
}
