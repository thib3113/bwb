import sys

with open('tests/screenshot_demo.spec.ts', 'r') as f:
    content = f.read()

# Replace manual connect with simulator.connect()
search_str = """  // 3. Connect via Simulator
  const disabledIcon = page.locator('svg[data-testid="BluetoothDisabledIcon"]');
  await page
    .getByRole('button', { name: /connect/i })
    .filter({ hasText: /^Connect$|^$/ })
    .first()
    .click();
  await expect(disabledIcon).not.toBeVisible({ timeout: 15000 });
  await expect(page.getByText('%')).toBeVisible({ timeout: 10000 });"""

replace_str = """  // 3. Connect via Simulator
  await simulator.connect();"""

if search_str in content:
    content = content.replace(search_str, replace_str)
    print("Updated screenshot_demo.spec.ts to use simulator.connect()")
else:
    print("Could not find manual connect block in screenshot_demo.spec.ts")
    # Debug
    start = content.find("// 3. Connect via Simulator")
    if start != -1:
        print(content[start:start+500])

with open('tests/screenshot_demo.spec.ts', 'w') as f:
    f.write(content)
