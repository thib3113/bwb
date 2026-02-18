import Dexie, { Table } from 'dexie';
import { PacketLog } from '../types/db';

export class PacketLogDatabase extends Dexie {
  packet_logs!: Table<PacketLog, number>;

  constructor() {
    super('boks_packet_logs');

    // Schema version 1
    this.version(1).stores({
      packet_logs: '++id, device_id, timestamp'
    });
  }
}

export const logDb = new PacketLogDatabase();
