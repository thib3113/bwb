import sys

with open('tests/fixtures.ts', 'r') as f:
    content = f.read()

# Replace the else block we added previously
search_str = """        } else {
          // Onboarding not visible (device known). Connect via Header if disconnected.
          const disconnectedIcon = page.getByTestId('BluetoothDisabledIcon');
          if (await disconnectedIcon.count() > 0 && await disconnectedIcon.first().isVisible()) {
             console.log('[Simulator Fixture] Connecting via Header...');
             await page.getByRole('button', { name: /connect/i }).first().click();
             await page.waitForTimeout(2000);
          }
        }"""

replace_str = """        } else {
          // Onboarding not visible. We are on Dashboard.
          // Try to ensure connection.
          console.log('[Simulator Fixture] Onboarding not visible. checking connection status...');

          // Wait for either connected or disconnected icon
          try {
             await page.waitForSelector('svg[data-testid="BluetoothDisabledIcon"], svg[data-testid="BluetoothConnectedIcon"]', { timeout: 5000 });
          } catch (e) {
             console.log('[Simulator Fixture] Could not find any bluetooth icon. Are we on the right page?');
          }

          const disconnectedIcon = page.locator('svg[data-testid="BluetoothDisabledIcon"]');
          if (await disconnectedIcon.isVisible()) {
             console.log('[Simulator Fixture] Disconnected. Connecting via Header...');
             await page.getByRole('button', { name: /connect/i }).first().click();
             await page.waitForTimeout(2000);
          } else {
             console.log('[Simulator Fixture] Already connected (or icon not found).');
          }
        }"""

if search_str in content:
    content = content.replace(search_str, replace_str)
    print("Updated robust connection logic in fixtures.ts")
else:
    print("Could not find block to patch in fixtures.ts")
    # Debug: print content around the area
    start = content.find("waitForURL")
    if start != -1:
        print("Content around waitForURL:")
        print(content[start:start+500])

with open('tests/fixtures.ts', 'w') as f:
    f.write(content)
