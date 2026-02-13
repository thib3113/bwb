import { describe, expect, it } from 'vitest';
import {
  createPacket,
  decodeStringPayload,
  encodeStringPayload,
  parsePacket,
  verifyChecksum
} from '../../utils/packetParser';

describe('packetParser', () => {
  describe('verifyChecksum', () => {
    it('should verify correct checksum', () => {
      // 0x01 + 0x01 + 0x41 = 0x43
      const data = new Uint8Array([0x01, 0x01, 0x41, 0x43]);
      expect(verifyChecksum(data)).toBe(true);
    });

    it('should fail on incorrect checksum', () => {
      const data = new Uint8Array([0x01, 0x01, 0x41, 0x00]);
      expect(verifyChecksum(data)).toBe(false);
    });
  });

  describe('parsePacket', () => {
    it('should parse a valid packet correctly with checksum', () => {
      // Opcode: 0x01, Len: 0x02, Payload: [0xAA, 0xBB], Checksum: 0x01+0x02+0xAA+0xBB = 0x168 -> 0x68
      const buffer = new Uint8Array([0x01, 0x02, 0xaa, 0xbb, 0x68]).buffer;
      const dataView = new DataView(buffer);
      const packet = parsePacket(dataView);

      expect(packet).not.toBeNull();
      expect(packet?.opcode).toBe(0x01);
      expect(packet?.payload).toEqual(new Uint8Array([0xaa, 0xbb]));
      expect(packet?.isValidChecksum).toBe(true);
    });

    it('should return null for too short packet', () => {
      const buffer = new Uint8Array([0x01]).buffer;
      const dataView = new DataView(buffer);
      const packet = parsePacket(dataView);

      expect(packet).toBeNull();
    });
  });

  describe('createPacket', () => {
    it('should create a packet with opcode, length, payload and checksum', () => {
      const opcode = 0x10;
      const payload = [0x01, 0x02];
      const packet = createPacket(opcode, payload);

      // 0x10 + 0x02 + 0x01 + 0x02 = 0x15
      expect(packet).toEqual(new Uint8Array([0x10, 0x02, 0x01, 0x02, 0x15]));
    });

    it('should create a packet with only opcode and checksum', () => {
      const opcode = 0x06;
      const packet = createPacket(opcode);

      // 0x06 + 0x00 = 0x06
      expect(packet).toEqual(new Uint8Array([0x06, 0x00, 0x06]));
    });
  });

  describe('decodeStringPayload', () => {
    it('should decode UTF-8 string from payload', () => {
      const payload = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]); // "Hello"
      const decoded = decodeStringPayload(payload);

      expect(decoded).toBe('Hello');
    });
  });

  describe('encodeStringPayload', () => {
    it('should encode string to UTF-8 payload', () => {
      const str = 'Hello';
      const encoded = encodeStringPayload(str);
      expect(Array.from(encoded)).toEqual([0x48, 0x65, 0x6c, 0x6c, 0x6f]);
    });
  });
});
