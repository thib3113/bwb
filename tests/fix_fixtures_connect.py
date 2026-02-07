import sys

with open('tests/fixtures.ts', 'r') as f:
    content = f.read()

# Locate the end of the onboarding if block
search_str = """            // Wait for navigation
            await page.waitForURL(/.*\/codes/);
          }
        }"""

# Add else block for header connection
replace_str = """            // Wait for navigation
            await page.waitForURL(/.*\/codes/);
          }
        } else {
          // Onboarding not visible (device known). Connect via Header if disconnected.
          const disconnectedIcon = page.getByTestId('BluetoothDisabledIcon');
          if (await disconnectedIcon.count() > 0 && await disconnectedIcon.first().isVisible()) {
             console.log('[Simulator Fixture] Connecting via Header...');
             await page.getByRole('button', { name: /connect/i }).first().click();
             await page.waitForTimeout(2000);
          }
        }"""

if search_str in content:
    content = content.replace(search_str, replace_str)
    print("Updated connect logic in fixtures.ts")
else:
    print("Could not find block to patch in fixtures.ts")

with open('tests/fixtures.ts', 'w') as f:
    f.write(content)
