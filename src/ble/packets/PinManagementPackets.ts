import { BoksTXPacket } from './BoksTXPacket';
import { BLEOpcode } from '../../utils/bleConstants';

export class CreateMasterCodePacket extends BoksTXPacket {
  readonly opcode = BLEOpcode.CREATE_MASTER_CODE;

  constructor(
    private configKey: string,
    private index: number,
    private code: string
  ) {
    super();
  }

  toPayload(): Uint8Array {
    return new Uint8Array([
      ...this.stringToBytes(this.configKey),
      this.index,
      ...this.stringToBytes(this.code),
    ]);
  }
}

export class CreateSingleUseCodePacket extends BoksTXPacket {
  readonly opcode = BLEOpcode.CREATE_SINGLE_USE_CODE;

  constructor(
    private configKey: string,
    private code: string
  ) {
    super();
  }

  toPayload(): Uint8Array {
    return new Uint8Array([
      ...this.stringToBytes(this.configKey),
      ...this.stringToBytes(this.code),
    ]);
  }
}

export class CreateMultiUseCodePacket extends BoksTXPacket {
  readonly opcode = BLEOpcode.CREATE_MULTI_USE_CODE;

  constructor(
    private configKey: string,
    private code: string
  ) {
    super();
  }

  toPayload(): Uint8Array {
    return new Uint8Array([
      ...this.stringToBytes(this.configKey),
      ...this.stringToBytes(this.code),
    ]);
  }
}

export class DeleteMasterCodePacket extends BoksTXPacket {
  readonly opcode = BLEOpcode.DELETE_MASTER_CODE;

  constructor(
    private configKey: string,
    private index: number
  ) {
    super();
  }

  toPayload(): Uint8Array {
    return new Uint8Array([
      ...this.stringToBytes(this.configKey),
      this.index,
    ]);
  }
}

export class DeleteSingleUseCodePacket extends BoksTXPacket {
  readonly opcode = BLEOpcode.DELETE_SINGLE_USE_CODE;

  constructor(
    private configKey: string,
    private code: string
  ) {
    super();
  }

  toPayload(): Uint8Array {
    return new Uint8Array([
      ...this.stringToBytes(this.configKey),
      ...this.stringToBytes(this.code),
    ]);
  }
}

export class DeleteMultiUseCodePacket extends BoksTXPacket {
  readonly opcode = BLEOpcode.DELETE_MULTI_USE_CODE;

  constructor(
    private configKey: string,
    private code: string
  ) {
    super();
  }

  toPayload(): Uint8Array {
    return new Uint8Array([
      ...this.stringToBytes(this.configKey),
      ...this.stringToBytes(this.code),
    ]);
  }
}
