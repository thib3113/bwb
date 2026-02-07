import sys

with open('tests/fixtures.ts', 'r') as f:
    content = f.read()

search_str = """          // Handle potential redirect for new devices
          if (page.url().includes('my-boks')) {
            console.log('[Simulator Fixture] Redirected to My Boks. Navigating to Codes...');
            await page.goto('/codes');
          }"""

replace_str = r"""          // Handle potential redirect for new devices
          // Wait extra time for redirect to trigger
          await page.waitForTimeout(2000);
          if (page.url().includes('my-boks')) {
            console.log('[Simulator Fixture] Redirected to My Boks. Navigating to Codes via Menu...');
            // Open Menu
            await page.getByLabel('menu').click();
            // Click Home (which redirects to /codes)
            await page.getByText('Home').click();
            // Wait for navigation
            await page.waitForURL(/.*\/codes/);
          }"""

if search_str in content:
    content = content.replace(search_str, replace_str)
    print("Updated navigation in fixtures.ts")
else:
    print("Could not find navigation block in fixtures.ts")

with open('tests/fixtures.ts', 'w') as f:
    f.write(content)
