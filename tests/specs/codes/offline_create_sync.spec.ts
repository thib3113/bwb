import { test, expect, BLEOpcode } from '../../fixtures';
import { PacketFactory } from '../../../src/ble/packets/PacketFactory';
import {
    CreateMasterCodePacket,
    DeleteMasterCodePacket,
    CreateSingleUseCodePacket
} from '../../../src/ble/packets/PinManagementPackets';

test.describe('Codes - Offline Create Sync', () => {
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

  test('Offline: Create Codes & Sync on Connect', async ({ page, simulator }) => {
    await simulator.connect();

    const disconnectBtn = page.getByTestId('connection-button');
    await expect(disconnectBtn).toBeVisible();
    await disconnectBtn.click();
    await expect(page.getByTestId('status-icon-disconnected')).toBeVisible();

    await simulator.clearTxEvents();

    await page.getByTestId('add-code-button').click();
    await page.getByTestId('code-pin-input').fill('333333');
    await page.getByTestId('code-name-input').fill('Master Offline');
    const masterIndexInput = page.getByTestId('code-index-input');
    const masterIndex = await masterIndexInput.inputValue();
    await page.getByTestId('save-code-button').click();

    await page.getByTestId('add-code-button').click();
    await page.getByTestId('code-type-select').click();
    await page.getByRole('option', { name: /Single[- ]?Use Code|Code à usage unique/i }).click();
    await page.getByTestId('code-pin-input').fill('444444');
    await page.getByTestId('code-name-input').fill('Single Offline');
    await page.getByTestId('save-code-button').click();

    await page.getByTestId('connection-button').click();

    await simulator.waitForTxOpcodes([
        BLEOpcode.DELETE_MASTER_CODE,
        BLEOpcode.CREATE_MASTER_CODE,
        BLEOpcode.CREATE_SINGLE_USE_CODE
    ], 20000);

    const events = await simulator.getTxEvents();

    const createMasterEvent = events.find((e: any) => e.opcode === BLEOpcode.CREATE_MASTER_CODE && String.fromCharCode(...e.payload).includes('333333'));
    const deleteMasterEvent = events.find((e: any) => e.opcode === BLEOpcode.DELETE_MASTER_CODE && e.payload.includes(parseInt(masterIndex)));

    expect(createMasterEvent).toBeDefined();
    expect(deleteMasterEvent).toBeDefined();

    const createMasterPacket = parsePacket(BLEOpcode.CREATE_MASTER_CODE, createMasterEvent.payload) as CreateMasterCodePacket;
    expect(createMasterPacket.index).toBe(parseInt(masterIndex));
    expect(createMasterPacket.code).toBe('333333');

    const deleteMasterPacket = parsePacket(BLEOpcode.DELETE_MASTER_CODE, deleteMasterEvent.payload) as DeleteMasterCodePacket;
    expect(deleteMasterPacket.index).toBe(parseInt(masterIndex));

    expect(createMasterPacket.configKey).toBe(deleteMasterPacket.configKey);

    const createSingleEvent = events.find((e: any) => e.opcode === BLEOpcode.CREATE_SINGLE_USE_CODE && String.fromCharCode(...e.payload).includes('444444'));
    expect(createSingleEvent).toBeDefined();

    const createSinglePacket = parsePacket(BLEOpcode.CREATE_SINGLE_USE_CODE, createSingleEvent.payload) as CreateSingleUseCodePacket;
    expect(createSinglePacket.code).toBe('444444');
    expect(createSinglePacket.configKey).toBe(createMasterPacket.configKey);
  });
});
