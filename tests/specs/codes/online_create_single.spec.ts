import { test, expect, BLEOpcode } from '../../fixtures';
import { PacketFactory } from '../../../src/ble/packets/PacketFactory';
import {
    CreateSingleUseCodePacket
} from '../../../src/ble/packets/PinManagementPackets';

test.describe('Codes - Online Create Single', () => {
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

  test('Online: Create Single Use Code', async ({ page, simulator }) => {
    await simulator.connect();

    await page.getByTestId('add-code-button').click();
    await page.getByTestId('code-type-select').click();
    await page.getByRole('option', { name: /Single[- ]?Use Code|Code à usage unique/i }).click();
    await page.getByTestId('code-pin-input').fill('222222');
    await page.getByTestId('code-name-input').fill('Single Online');
    await page.getByTestId('save-code-button').click();

    await simulator.waitForTxOpcode(BLEOpcode.CREATE_SINGLE_USE_CODE);

    const events = await simulator.getTxEvents();
    const createEvent = events.find((e: any) => e.opcode === BLEOpcode.CREATE_SINGLE_USE_CODE);
    expect(createEvent).toBeDefined();

    const createPacket = parsePacket(BLEOpcode.CREATE_SINGLE_USE_CODE, createEvent.payload) as CreateSingleUseCodePacket;
    expect(createPacket).toBeInstanceOf(CreateSingleUseCodePacket);
    expect(createPacket.code).toBe('222222');

    expect(createPacket.configKey).toHaveLength(8);
    if (stableConfigKey) expect(createPacket.configKey).toBe(stableConfigKey);
  });
});
