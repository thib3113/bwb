import { BoksTXPacket } from './BoksTXPacket';
import { BLEOpcode } from '../../utils/bleConstants';

export class CreateMasterCodePacket extends BoksTXPacket {
  readonly opcode = BLEOpcode.CREATE_MASTER_CODE;

  constructor(
    public configKey: string = '',
    public index: number = 0,
    public code: string = ''
  ) {
    super();
  }

  toPayload(configKey?: string): Uint8Array {
    const key = configKey ?? this.configKey;
    if (!key) throw new Error("CreateMasterCodePacket: configKey is required");
    if (!this.code) throw new Error("CreateMasterCodePacket: code is required");
    // Index 0 is valid? Assuming yes.

    return new Uint8Array([
      ...this.stringToBytes(key),
      this.index,
      ...this.stringToBytes(this.code),
    ]);
  }

  parse(payload: Uint8Array): void {
    // Assume configKey is 8 chars/bytes
    const KEY_LEN = 8;
    if (payload.length < KEY_LEN + 1) return;

    this.configKey = String.fromCharCode(...payload.subarray(0, KEY_LEN));
    this.index = payload[KEY_LEN];
    this.code = String.fromCharCode(...payload.subarray(KEY_LEN + 1));
  }
}

export class CreateSingleUseCodePacket extends BoksTXPacket {
  readonly opcode = BLEOpcode.CREATE_SINGLE_USE_CODE;

  constructor(
    public configKey: string = '',
    public code: string = ''
  ) {
    super();
  }

  toPayload(configKey?: string): Uint8Array {
    const key = configKey ?? this.configKey;
    if (!key) throw new Error("CreateSingleUseCodePacket: configKey is required");
    if (!this.code) throw new Error("CreateSingleUseCodePacket: code is required");

    return new Uint8Array([
      ...this.stringToBytes(key),
      ...this.stringToBytes(this.code),
    ]);
  }

  parse(payload: Uint8Array): void {
    // Assume configKey is 8 chars/bytes
    const KEY_LEN = 8;
    if (payload.length < KEY_LEN) return;

    this.configKey = String.fromCharCode(...payload.subarray(0, KEY_LEN));
    this.code = String.fromCharCode(...payload.subarray(KEY_LEN));
  }
}

export class CreateMultiUseCodePacket extends BoksTXPacket {
  readonly opcode = BLEOpcode.CREATE_MULTI_USE_CODE;

  constructor(
    public configKey: string = '',
    public code: string = ''
  ) {
    super();
  }

  toPayload(configKey?: string): Uint8Array {
    const key = configKey ?? this.configKey;
    if (!key) throw new Error("CreateMultiUseCodePacket: configKey is required");
    if (!this.code) throw new Error("CreateMultiUseCodePacket: code is required");

    return new Uint8Array([
      ...this.stringToBytes(key),
      ...this.stringToBytes(this.code),
    ]);
  }

  parse(payload: Uint8Array): void {
    const KEY_LEN = 8;
    if (payload.length < KEY_LEN) return;
    this.configKey = String.fromCharCode(...payload.subarray(0, KEY_LEN));
    this.code = String.fromCharCode(...payload.subarray(KEY_LEN));
  }
}

export class DeleteMasterCodePacket extends BoksTXPacket {
  readonly opcode = BLEOpcode.DELETE_MASTER_CODE;

  constructor(
    public configKey: string = '',
    public index: number = 0
  ) {
    super();
  }

  toPayload(configKey?: string): Uint8Array {
    const key = configKey ?? this.configKey;
    if (!key) throw new Error("DeleteMasterCodePacket: configKey is required");

    return new Uint8Array([
      ...this.stringToBytes(key),
      this.index,
    ]);
  }

  parse(payload: Uint8Array): void {
    const KEY_LEN = 8;
    if (payload.length < KEY_LEN + 1) return;
    this.configKey = String.fromCharCode(...payload.subarray(0, KEY_LEN));
    this.index = payload[KEY_LEN];
  }
}

export class DeleteSingleUseCodePacket extends BoksTXPacket {
  readonly opcode = BLEOpcode.DELETE_SINGLE_USE_CODE;

  constructor(
    public configKey: string = '',
    public code: string = ''
  ) {
    super();
  }

  toPayload(configKey?: string): Uint8Array {
    const key = configKey ?? this.configKey;
    if (!key) throw new Error("DeleteSingleUseCodePacket: configKey is required");
    // Code is required to identify which one to delete? Or maybe just index?
    // Based on previous implementation: it used code.
    if (!this.code) throw new Error("DeleteSingleUseCodePacket: code is required");

    return new Uint8Array([
      ...this.stringToBytes(key),
      ...this.stringToBytes(this.code),
    ]);
  }

  parse(payload: Uint8Array): void {
    const KEY_LEN = 8;
    if (payload.length < KEY_LEN) return;
    this.configKey = String.fromCharCode(...payload.subarray(0, KEY_LEN));
    this.code = String.fromCharCode(...payload.subarray(KEY_LEN));
  }
}

export class DeleteMultiUseCodePacket extends BoksTXPacket {
  readonly opcode = BLEOpcode.DELETE_MULTI_USE_CODE;

  constructor(
    public configKey: string = '',
    public code: string = ''
  ) {
    super();
  }

  toPayload(configKey?: string): Uint8Array {
    const key = configKey ?? this.configKey;
    if (!key) throw new Error("DeleteMultiUseCodePacket: configKey is required");
    if (!this.code) throw new Error("DeleteMultiUseCodePacket: code is required");

    return new Uint8Array([
      ...this.stringToBytes(key),
      ...this.stringToBytes(this.code),
    ]);
  }

  parse(payload: Uint8Array): void {
    const KEY_LEN = 8;
    if (payload.length < KEY_LEN) return;
    this.configKey = String.fromCharCode(...payload.subarray(0, KEY_LEN));
    this.code = String.fromCharCode(...payload.subarray(KEY_LEN));
  }
}
