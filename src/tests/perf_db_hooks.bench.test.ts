import { describe, it, beforeEach, afterEach, expect } from 'vitest';
import { db } from '../db/db';
import { BoksLog } from '../types';

describe('DB Hook Performance', () => {
  const DEVICE_ID = 'test-device-id';
  const LOG_COUNT = 500;

  beforeEach(async () => {
    await db.logs.clear();
    await db.devices.clear();
    await db.devices.add({
      id: DEVICE_ID,
      ble_name: 'Test Device',
      role: 'owner',
      updated_at: 0
    });
  });

  afterEach(async () => {
    await db.logs.clear();
    await db.devices.clear();
  });

  it('benchmarks bulk insertion with cascading updates', async () => {
    const logs: BoksLog[] = [];
    const now = Date.now();

    for (let i = 0; i < LOG_COUNT; i++) {
      logs.push({
        id: `log-${i}`,
        device_id: DEVICE_ID,
        timestamp: new Date(now - i * 1000).toISOString(),
        event: 'TEST_EVENT',
        type: 'info',
        synced: false,
        opcode: 0,
        payload: new Uint8Array([]),
        raw: new Uint8Array([])
      });
    }

    console.time('bulkAdd');
    await db.logs.bulkAdd(logs);
    console.timeEnd('bulkAdd');

    // Wait a bit for the cascading updates to finish since they are triggered on transaction complete
    // and might still be running if they are many separate updates.
    // However, Dexie's update returns a promise. The hook doesn't wait for it.

    // To properly measure, we might need to poll for the device updated_at or
    // just hope console.timeEnd captures enough.
    // Actually, bulkAdd finishes when the logs are added.
    // The cascading updates happen AFTER bulkAdd transaction completes.

    // Let's measure how long it takes for the device updated_at to actually be updated LOG_COUNT times (effectively)
    // Or just measure the bulkAdd and then a small delay.

    await new Promise(resolve => setTimeout(resolve, 1000));

    const device = await db.devices.get(DEVICE_ID);
    expect(device?.updated_at).toBeGreaterThan(0);
  });
});
