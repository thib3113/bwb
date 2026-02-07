import sys

with open('tests/screenshot_demo.spec.ts', 'r') as f:
    content = f.read()

# Replace manual connect
search_str = """  // 2. Connect
  const connectBtn = page.getByRole('button', { name: /connect/i }).filter({ hasText: /^Connect$|^$/ }).first();
  await expect(connectBtn).toBeVisible({ timeout: 10000 });
  await connectBtn.click();

  // Wait for connection
  await expect(page.locator('svg[data-testid="BluetoothDisabledIcon"]')).not.toBeVisible({ timeout: 15000 });"""

replace_str = """  // 2. Connect
  await simulator.connect();"""

if search_str in content:
    content = content.replace(search_str, replace_str)
    print("Updated screenshot_demo.spec.ts to use simulator.connect()")
else:
    print("Could not find manual connect block in screenshot_demo.spec.ts")

with open('tests/screenshot_demo.spec.ts', 'w') as f:
    f.write(content)
