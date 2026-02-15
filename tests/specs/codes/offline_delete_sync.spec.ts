import { test, expect, BLEOpcode } from '../../fixtures';
import { PacketFactory } from '../../../src/ble/packets/PacketFactory';
import {
    CreateMasterCodePacket,
    DeleteMasterCodePacket
} from '../../../src/ble/packets/PinManagementPackets';

test.describe('Codes - Offline Delete Sync', () => {
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

  test('Offline: Delete & Sync', async ({ page, simulator }) => {
    await simulator.connect();

    await page.getByTestId('add-code-button').click();
    await page.getByTestId('code-type-select').click();
    await page.getByTestId('option-master').click();

    await page.getByTestId('code-pin-input').fill('666666');
    await page.getByTestId('code-name-input').fill('Delete Offline');
    const indexInput = page.getByTestId('code-index-input');
    const index = await indexInput.inputValue();
    await page.getByTestId('save-code-button').click();
    await simulator.waitForTxOpcode(BLEOpcode.CREATE_MASTER_CODE);

    await expect(page.getByTestId('code-item-666666')).toBeVisible({ timeout: 10000 });

    await page.getByTestId('connection-button').click();
    await expect(page.getByTestId('status-icon-disconnected')).toBeVisible();
    await simulator.clearTxEvents();

    const item = page.getByTestId('code-item-666666');
    await expect(item).toBeVisible();

    await item.click(); await page.getByTestId('delete-code-666666').click();

    await page.getByTestId('connection-button').click();

    await simulator.waitForTxOpcode(BLEOpcode.DELETE_MASTER_CODE);

    const events = await simulator.getTxEvents();
    const deleteEvent = events.find((e: any) => e.opcode === BLEOpcode.DELETE_MASTER_CODE);

    expect(deleteEvent).toBeDefined();

    const deletePacket = parsePacket(BLEOpcode.DELETE_MASTER_CODE, deleteEvent.payload) as DeleteMasterCodePacket;
    expect(deletePacket).toBeInstanceOf(DeleteMasterCodePacket);
    expect(deletePacket.index).toBe(parseInt(index));
    expect(deletePacket.configKey).toHaveLength(8);
  });
});
