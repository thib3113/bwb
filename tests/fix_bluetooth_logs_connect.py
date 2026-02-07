import sys

with open('tests/bluetooth_logs.spec.ts', 'r') as f:
    content = f.read()

# Replace manual connect with simulator.connect()
search_str = """    // 1. Connect
    const disabledIcon = page.locator('svg[data-testid="BluetoothDisabledIcon"]');
    await page
      .getByRole('button', { name: /connect/i })
      .filter({ hasText: /^Connect$|^$/ })
      .first()
      .click();
    await expect(disabledIcon).not.toBeVisible({ timeout: 15000 });
    await expect(page.getByText('%')).toBeVisible({ timeout: 10000 });"""

replace_str = """    // 1. Connect
    await simulator.connect();"""

if search_str in content:
    content = content.replace(search_str, replace_str)
    print("Updated bluetooth_logs.spec.ts to use simulator.connect()")
else:
    print("Could not find manual connect block in bluetooth_logs.spec.ts")

with open('tests/bluetooth_logs.spec.ts', 'w') as f:
    f.write(content)
