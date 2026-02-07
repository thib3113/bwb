import sys

with open('tests/bluetooth_pin_management.spec.ts', 'r') as f:
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

# Try searching for a smaller block if the above fails due to variations
search_str_fallback = """    const disabledIcon = page.locator('svg[data-testid="BluetoothDisabledIcon"]');
    await page
      .getByRole('button', { name: /connect/i })
      .filter({ hasText: /^Connect$|^$/ })
      .first()
      .click();
    await expect(disabledIcon).not.toBeVisible({ timeout: 15000 });"""

replace_str = """    // 1. Connect
    await simulator.connect();"""

if search_str in content:
    content = content.replace(search_str, replace_str)
    print("Updated bluetooth_pin_management.spec.ts to use simulator.connect()")
elif search_str_fallback in content:
    # Need to handle the extra lines manually or just replace the block found
    content = content.replace(search_str_fallback, replace_str)
    print("Updated bluetooth_pin_management.spec.ts using fallback block")
else:
    print("Could not find manual connect block in bluetooth_pin_management.spec.ts")
    # Read file content snippet
    start = content.find("test('should send CREATE_MASTER_CODE")
    if start != -1:
        print(content[start:start+500])

with open('tests/bluetooth_pin_management.spec.ts', 'w') as f:
    f.write(content)
