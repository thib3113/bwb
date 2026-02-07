import sys

with open('tests/fixtures.ts', 'r') as f:
    content = f.read()

search_str = """          const disconnectedIcon = page.locator('svg[data-testid="BluetoothDisabledIcon"]');
          if (await disconnectedIcon.isVisible()) {"""

replace_str = """          const disconnectedIcon = page.locator('svg[data-testid="BluetoothDisabledIcon"]');
          const count = await disconnectedIcon.count();
          const visible = count > 0 && await disconnectedIcon.first().isVisible();
          console.log();
          if (visible) {"""

if search_str in content:
    content = content.replace(search_str, replace_str)
    print("Added icon debug log to fixtures.ts")
else:
    print("Could not find block to patch in fixtures.ts")

with open('tests/fixtures.ts', 'w') as f:
    f.write(content)
