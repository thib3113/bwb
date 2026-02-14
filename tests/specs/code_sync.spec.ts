import { BLEOpcode, expect, test } from '../fixtures';

test.describe('Code Synchronization', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('Sync: Create code while connected', async ({ page, simulator }) => {
    // 1. Connect
    await simulator.connect();

    // 2. Open Add Code Modal
    await page.getByTestId('add-code-button').click();
    await page.getByTestId('code-type-select').click();
    await page.getByTestId('option-master').click();

    // 3. Fill Form
    // Using direct input locator as getByLabel was ambiguous
    const nameInput = page.locator('input').filter({ hasText: '' }).nth(1); // Usually name is second
    // Better: use unique attributes if available, or placeholder/type
    const descInput = page.getByRole('textbox', { name: /Description/i }); // Matches label
    await descInput.fill('Sync Master');

    // PIN field is usually type=password (hidden) or text (visible)
    // The visibility toggle changes type. Default is password?
    // Let's use the one that is NOT description.
    const pinInput = page.locator('input').first(); // Usually first
    await pinInput.fill('112233');

    // 4. Save
    await page.getByTestId('save-code-button').click();

    // 5. Verify ADD_PIN_CODE (0x11)
    await simulator.waitForTxOpcode(BLEOpcode.CREATE_MASTER_CODE);
    const events = await simulator.getTxEvents();
    const addEvent = events.find((e: any) => e.opcode === BLEOpcode.CREATE_MASTER_CODE);

    expect(addEvent).toBeDefined();

    // 6. Verify UI
    await expect(page.getByText('Sync Master')).toBeVisible();
  });

  test('Async: Create code offline and sync on connection', async ({ page, simulator }) => {
    // 1. Connect to setup DB/Device context
    await simulator.connect();

    // 2. Disconnect
    await page.getByTestId('connection-button').click();
    await expect(page.getByTestId('status-icon-disconnected')).toBeVisible();

    // 3. Create Code Offline
    await page.getByTestId('add-code-button').click();
    await page.getByTestId('code-type-select').click();
    await page.getByTestId('option-master').click();

    const descInput = page.getByRole('textbox', { name: /Description/i });
    await descInput.fill('Async Master');

    const pinInput = page.locator('input').first();
    await pinInput.fill('445566');

    await page.getByTestId('save-code-button').click();

    // Verify it appears (pending state)
    await expect(page.getByText('Async Master')).toBeVisible();

    // 4. Clear events to ensure we capture NEW events
    await simulator.clearTxEvents();

    // 5. Connect
    // This should trigger sync
    await page.getByTestId('connection-button').click();
    await expect(page.getByTestId('status-icon-disconnected')).not.toBeVisible();

    // 6. Verify ADD_PIN_CODE (0x11) is sent automatically
    await simulator.waitForTxOpcode(BLEOpcode.CREATE_MASTER_CODE, 15000);

    const events = await simulator.getTxEvents();
    const addEvent = events.find((e: any) => e.opcode === BLEOpcode.CREATE_MASTER_CODE);
    expect(addEvent).toBeDefined();
  });
});
