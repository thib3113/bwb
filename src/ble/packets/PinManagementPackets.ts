import { BoksTXPacket } from './BoksTXPacket';
import { BLEOpcode } from '../../utils/bleConstants';
import { z } from 'zod';

export class CreateMasterCodePacket extends BoksTXPacket {
  static get opcode() {
    return BLEOpcode.CREATE_MASTER_CODE;
  }

  static schema = z.object({
    configKey: z.string().length(8, 'Config Key must be 8 characters'),
    index: z.coerce.number().min(0).max(255),
    code: z.string().min(4, 'Code too short').max(6, 'Code too long')
  });

  constructor(
    public configKey: string = '',
    public index: number = 0,
    public code: string = ''
  ) {
    super();
  }

  toPayload(configKey?: string): Uint8Array {
    const key = configKey ?? this.configKey;
    if (!key) throw new Error('CreateMasterCodePacket: configKey is required');
    if (!this.code) throw new Error('CreateMasterCodePacket: code is required');

    // Ensure code is 6 bytes (padded with 0 if necessary, or truncated)
    const codeBytes = this.stringToBytes(this.code);
    const fixedCodeBytes = new Uint8Array(6);
    fixedCodeBytes.set(codeBytes.slice(0, 6)); // Truncate if too long
    // If too short, remaining bytes are 0 by default in Uint8Array

    // Spec: Key(8) + Code(6) + Index(1)
    return new Uint8Array([...this.stringToBytes(key), ...fixedCodeBytes, this.index]);
  }

  parse(payload: Uint8Array): void {
    const KEY_LEN = 8;
    const CODE_LEN = 6;
    if (payload.length < KEY_LEN + CODE_LEN + 1) return;

    this.configKey = String.fromCharCode(...payload.subarray(0, KEY_LEN));
    // Code is at offset 8, length 6
    const codeBytes = payload.subarray(KEY_LEN, KEY_LEN + CODE_LEN);
    // Remove null padding for string representation
    this.code = String.fromCharCode(...codeBytes).replace(/\0/g, '');
    this.index = payload[KEY_LEN + CODE_LEN];
  }
}

export class CreateSingleUseCodePacket extends BoksTXPacket {
  static get opcode() {
    return BLEOpcode.CREATE_SINGLE_USE_CODE;
  }

  static schema = z.object({
    configKey: z.string().length(8, 'Config Key must be 8 characters'),
    code: z.string().min(4, 'Code too short').max(6, 'Code too long')
  });

  constructor(
    public configKey: string = '',
    public code: string = ''
  ) {
    super();
  }

  toPayload(configKey?: string): Uint8Array {
    const key = configKey ?? this.configKey;
    if (!key) throw new Error('CreateSingleUseCodePacket: configKey is required');
    if (!this.code) throw new Error('CreateSingleUseCodePacket: code is required');

    const codeBytes = this.stringToBytes(this.code);
    const fixedCodeBytes = new Uint8Array(6);
    fixedCodeBytes.set(codeBytes.slice(0, 6));

    return new Uint8Array([...this.stringToBytes(key), ...fixedCodeBytes]);
  }

  parse(payload: Uint8Array): void {
    const KEY_LEN = 8;
    const CODE_LEN = 6;
    if (payload.length < KEY_LEN + CODE_LEN) return;

    this.configKey = String.fromCharCode(...payload.subarray(0, KEY_LEN));
    const codeBytes = payload.subarray(KEY_LEN, KEY_LEN + CODE_LEN);
    this.code = String.fromCharCode(...codeBytes).replace(/\0/g, '');
  }
}

export class CreateMultiUseCodePacket extends BoksTXPacket {
  static get opcode() {
    return BLEOpcode.CREATE_MULTI_USE_CODE;
  }

  static schema = z.object({
    configKey: z.string().length(8, 'Config Key must be 8 characters'),
    code: z.string().min(4, 'Code too short').max(6, 'Code too long')
  });

  constructor(
    public configKey: string = '',
    public code: string = ''
  ) {
    super();
  }

  toPayload(configKey?: string): Uint8Array {
    const key = configKey ?? this.configKey;
    if (!key) throw new Error('CreateMultiUseCodePacket: configKey is required');
    if (!this.code) throw new Error('CreateMultiUseCodePacket: code is required');

    const codeBytes = this.stringToBytes(this.code);
    const fixedCodeBytes = new Uint8Array(6);
    fixedCodeBytes.set(codeBytes.slice(0, 6));

    return new Uint8Array([...this.stringToBytes(key), ...fixedCodeBytes]);
  }

  parse(payload: Uint8Array): void {
    const KEY_LEN = 8;
    const CODE_LEN = 6;
    if (payload.length < KEY_LEN + CODE_LEN) return;
    this.configKey = String.fromCharCode(...payload.subarray(0, KEY_LEN));
    const codeBytes = payload.subarray(KEY_LEN, KEY_LEN + CODE_LEN);
    this.code = String.fromCharCode(...codeBytes).replace(/\0/g, '');
  }
}

export class DeleteMasterCodePacket extends BoksTXPacket {
  static get opcode() {
    return BLEOpcode.DELETE_MASTER_CODE;
  }

  static schema = z.object({
    configKey: z.string().length(8, 'Config Key must be 8 characters'),
    index: z.coerce.number().min(0).max(255)
  });

  constructor(
    public configKey: string = '',
    public index: number = 0
  ) {
    super();
  }

  toPayload(configKey?: string): Uint8Array {
    const key = configKey ?? this.configKey;
    if (!key) throw new Error('DeleteMasterCodePacket: configKey is required');

    return new Uint8Array([...this.stringToBytes(key), this.index]);
  }

  parse(payload: Uint8Array): void {
    const KEY_LEN = 8;
    if (payload.length < KEY_LEN + 1) return;
    this.configKey = String.fromCharCode(...payload.subarray(0, KEY_LEN));
    this.index = payload[KEY_LEN];
  }
}

export class DeleteSingleUseCodePacket extends BoksTXPacket {
  static get opcode() {
    return BLEOpcode.DELETE_SINGLE_USE_CODE;
  }

  static schema = z.object({
    configKey: z.string().length(8, 'Config Key must be 8 characters'),
    code: z.string().min(4, 'Code too short').max(6, 'Code too long')
  });

  constructor(
    public configKey: string = '',
    public code: string = ''
  ) {
    super();
  }

  toPayload(configKey?: string): Uint8Array {
    const key = configKey ?? this.configKey;
    if (!key) throw new Error('DeleteSingleUseCodePacket: configKey is required');
    if (!this.code) throw new Error('DeleteSingleUseCodePacket: code is required');

    // Spec: Key(8) + Code_Value(6)
    const codeBytes = this.stringToBytes(this.code);
    const fixedCodeBytes = new Uint8Array(6);
    fixedCodeBytes.set(codeBytes.slice(0, 6));

    return new Uint8Array([...this.stringToBytes(key), ...fixedCodeBytes]);
  }

  parse(payload: Uint8Array): void {
    const KEY_LEN = 8;
    const CODE_LEN = 6;
    if (payload.length < KEY_LEN + CODE_LEN) return;
    this.configKey = String.fromCharCode(...payload.subarray(0, KEY_LEN));
    const codeBytes = payload.subarray(KEY_LEN, KEY_LEN + CODE_LEN);
    this.code = String.fromCharCode(...codeBytes).replace(/\0/g, '');
  }
}

export class DeleteMultiUseCodePacket extends BoksTXPacket {
  static get opcode() {
    return BLEOpcode.DELETE_MULTI_USE_CODE;
  }

  static schema = z.object({
    configKey: z.string().length(8, 'Config Key must be 8 characters'),
    code: z.string().min(4, 'Code too short').max(6, 'Code too long')
  });

  constructor(
    public configKey: string = '',
    public code: string = ''
  ) {
    super();
  }

  toPayload(configKey?: string): Uint8Array {
    const key = configKey ?? this.configKey;
    if (!key) throw new Error('DeleteMultiUseCodePacket: configKey is required');
    if (!this.code) throw new Error('DeleteMultiUseCodePacket: code is required');

    const codeBytes = this.stringToBytes(this.code);
    const fixedCodeBytes = new Uint8Array(6);
    fixedCodeBytes.set(codeBytes.slice(0, 6));

    return new Uint8Array([...this.stringToBytes(key), ...fixedCodeBytes]);
  }

  parse(payload: Uint8Array): void {
    const KEY_LEN = 8;
    const CODE_LEN = 6;
    if (payload.length < KEY_LEN + CODE_LEN) return;
    this.configKey = String.fromCharCode(...payload.subarray(0, KEY_LEN));
    const codeBytes = payload.subarray(KEY_LEN, KEY_LEN + CODE_LEN);
    this.code = String.fromCharCode(...codeBytes).replace(/\0/g, '');
  }
}
