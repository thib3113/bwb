import { test, expect, BLEOpcode } from '../../fixtures';
import { PacketFactory } from '../../../src/ble/packets/PacketFactory';
import {
    CreateMasterCodePacket,
    DeleteMasterCodePacket
} from '../../../src/ble/packets/PinManagementPackets';

test.describe('Codes - Online Create Master', () => {
  let stableConfigKey: string | null = null;

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(async () => {
      // @ts-ignore
      if (window.resetApp) await window.resetApp();
    });
    await page.reload();
  });

  const parsePacket = (opcode: number, payload: number[]) => {
    return PacketFactory.createTX(opcode, new Uint8Array(payload));
  };

  test('Online: Create Master Code (Expect Delete -> Create Sequence)', async ({ page, simulator }) => {
    await simulator.connect();

    await page.getByTestId('add-code-button').click();
    await page.getByTestId('code-pin-input').fill('111111');
    await page.getByTestId('code-name-input').fill('Master Online');
    const indexInput = page.getByTestId('code-index-input');
    const index = await indexInput.inputValue();
    await page.getByTestId('save-code-button').click();

    await simulator.waitForTxOpcode(BLEOpcode.CREATE_MASTER_CODE);

    const events = await simulator.getTxEvents();

    const deleteEvent = events.find((e: any) => e.opcode === BLEOpcode.DELETE_MASTER_CODE);
    const createEvent = events.find((e: any) => e.opcode === BLEOpcode.CREATE_MASTER_CODE);

    expect(deleteEvent).toBeDefined();
    expect(createEvent).toBeDefined();

    const deletePacket = parsePacket(BLEOpcode.DELETE_MASTER_CODE, deleteEvent.payload) as DeleteMasterCodePacket;
    expect(deletePacket).toBeInstanceOf(DeleteMasterCodePacket);
    expect(deletePacket.index).toBe(parseInt(index));

    if (!stableConfigKey) stableConfigKey = deletePacket.configKey;
    expect(deletePacket.configKey).toBe(stableConfigKey);

    const createPacket = parsePacket(BLEOpcode.CREATE_MASTER_CODE, createEvent.payload) as CreateMasterCodePacket;
    expect(createPacket).toBeInstanceOf(CreateMasterCodePacket);
    expect(createPacket.index).toBe(parseInt(index));
    expect(createPacket.code).toBe('111111');
    expect(createPacket.configKey).toBe(stableConfigKey);
  });
});
