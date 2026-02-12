import { expect, test } from '../fixtures';

test.describe('Maintenance Page - Stop Script', () => {
  test.beforeEach(async ({ page, simulator }) => {
    // 1. Ensure page is loaded
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 2. Use the robust connection helper from the fixture
    await simulator.connect();
  });

  test('should allow stopping a running script', async ({
    page
  }) => {
    // 1. Open Menu (if not already open/visible, assume we are on dashboard or codes page)
    // simulator.connect() might leave us on Codes page.
    const menuBtn = page.getByRole('button', { name: 'menu' });
    if (await menuBtn.isVisible()) {
        await menuBtn.click();
    }

    // 2. Click Maintenance
    await page.getByText('Maintenance').click();

    // 3. Verify Page Title
    await expect(page.getByRole('heading', { name: 'Maintenance' })).toBeVisible();

    // 4. Verify Script Card exists
    await expect(page.getByText('Clean Master Codes')).toBeVisible();

    // 5. Run Script
    await page.evaluate(() => {
      if (window.boksSimulator) {
        window.boksSimulator.setResponseDelay(500); // 500ms delay per packet
      }
    });
    await page.getByRole('button', { name: 'Run' }).click();

    // 6. Wait for script to start (Stop button appears)
    const stopBtn = page.getByRole('button', { name: 'Stop' });
    await expect(stopBtn).toBeVisible({ timeout: 10000 });

    // 7. Click Stop
    await stopBtn.click();

    // 8. Assert script status is 'stopped' using attribute
    const scriptCard = page.getByTestId('script-card-clean_master_codes');
    await expect(scriptCard).toHaveAttribute('data-status', 'stopped', { timeout: 15000 });

    // 9. Run button should reappear
    await expect(page.getByRole('button', { name: 'Run' })).toBeVisible();
  });
});
