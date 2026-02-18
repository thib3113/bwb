import { BoksBLEService, BLEServiceEvent } from './BoksBLEService';
import { db } from '../db/db';
import { PacketLog } from '../types/db';
import { BLEPacket } from '../utils/packetParser';

const BATCH_SIZE_LIMIT = 50;
const BATCH_INTERVAL_MS = 2000;
const MAX_LOGS_RETENTION = 10000;

class PacketLoggerService {
  private static instance: PacketLoggerService;
  private buffer: PacketLog[] = [];

  private flushInterval: number | null = null;
  private isProcessing = false;

  private constructor() {}

  static getInstance(): PacketLoggerService {
    if (!PacketLoggerService.instance) {
      PacketLoggerService.instance = new PacketLoggerService();
    }
    return PacketLoggerService.instance;
  }

  start() {
    console.log('[PacketLogger] Service started');
    const bleService = BoksBLEService.getInstance();

    bleService.on(BLEServiceEvent.PACKET_SENT, (packet: unknown) => {
      this.handlePacket(packet as BLEPacket, 'TX');
    });

    bleService.on(BLEServiceEvent.PACKET_RECEIVED, (packet: unknown) => {
      this.handlePacket(packet as BLEPacket, 'RX');
    });

    // Start periodic flush
    if (typeof window !== 'undefined') {
      this.flushInterval = window.setInterval(() => {
        this.flush();
      }, BATCH_INTERVAL_MS);
    }
  }

  private handlePacket(packet: BLEPacket, direction: 'TX' | 'RX') {
    const deviceId = BoksBLEService.getInstance().getDevice()?.id || 'unknown';

    // BLEPacket might have parsedPayload dynamically added
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const description = (packet as any).parsedPayload?.toString() || undefined;

    const log: PacketLog = {
      device_id: deviceId,
      timestamp: Date.now(),
      direction: direction,
      opcode: packet.opcode,
      payload_hex: this.toHex(packet.payload),
      raw_hex: this.toHex(packet.raw),
      description: description
    };

    this.buffer.push(log);

    if (this.buffer.length >= BATCH_SIZE_LIMIT) {
      this.flush();
    }
  }

  private toHex(data: Uint8Array): string {
    if (!data) return '';
    return Array.from(data)
      .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
      .join(' ');
  }

  private async flush() {
    if (this.buffer.length === 0 || this.isProcessing) return;

    this.isProcessing = true;
    const batch = [...this.buffer];
    this.buffer = []; // Clear buffer immediately

    try {
      await db.packet_logs.bulkAdd(batch);

      // Check retention policy occasionally (optimization: simple probability or just do it)
      // Since flush is throttled, doing it every time is probably okay if the query is fast.
      // We will perform pruning asynchronously.
      this.pruneLogs();
    } catch (error) {
      console.error('[PacketLogger] Failed to write logs:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  private async pruneLogs() {
    try {
      const count = await db.packet_logs.count();
      if (count > MAX_LOGS_RETENTION) {
        const deleteCount = count - MAX_LOGS_RETENTION;
        // Prune oldest
        const keysToDelete = await db.packet_logs.orderBy('id').limit(deleteCount).primaryKeys();
        if (keysToDelete.length > 0) {
          await db.packet_logs.bulkDelete(keysToDelete);
        }
      }
    } catch (e) {
      console.warn('[PacketLogger] Pruning failed:', e);
    }
  }

  async exportLogs(deviceId?: string): Promise<string> {
    await this.flush();
    let logs;
    if (deviceId) {
      logs = await db.packet_logs.where('device_id').equals(deviceId).toArray();
    } else {
      logs = await db.packet_logs.toArray();
    }
    return JSON.stringify(logs, null, 2);
  }

  async clearLogs(): Promise<void> {
    this.buffer = [];
    await db.packet_logs.clear();
    console.log('[PacketLogger] Logs cleared');
  }
}

export const packetLogger = PacketLoggerService.getInstance();
