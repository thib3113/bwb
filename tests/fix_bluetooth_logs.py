import sys

with open('tests/bluetooth_logs.spec.ts', 'r') as f:
    content = f.read()

# Add wait for main-nav before clicking Logs
search_str = """    // 1.5. Navigate to Logs via Bottom Navigation
    await page.getByRole('button', { name: /Logs/i }).click();"""

replace_str = """    // 1.5. Navigate to Logs via Bottom Navigation
    // Ensure we are on the dashboard with bottom nav
    await expect(page.getByTestId('main-nav')).toBeVisible({ timeout: 15000 });
    await page.getByRole('button', { name: /Logs/i }).click();"""

if search_str in content:
    content = content.replace(search_str, replace_str)
    print("Updated bluetooth_logs.spec.ts")
else:
    print("Could not find block in bluetooth_logs.spec.ts")

with open('tests/bluetooth_logs.spec.ts', 'w') as f:
    f.write(content)
