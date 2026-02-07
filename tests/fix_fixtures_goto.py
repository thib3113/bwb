import sys

with open('tests/fixtures.ts', 'r') as f:
    content = f.read()

search_str = """                console.log('[Simulator Fixture] Redirected to My Boks. Navigating to Codes via Menu...');
                // Open Menu
                await page.getByLabel('menu').click();
                // Click Home (which redirects to /codes)
                await page.getByText('Home').click();
                // Wait for navigation
                await page.waitForURL(/.*\/codes/);"""

replace_str = """                console.log('[Simulator Fixture] Redirected to My Boks. Forcing navigation to Codes...');
                await page.goto('/codes');"""

if search_str in content:
    content = content.replace(search_str, replace_str)
    print("Updated fixture to use page.goto")
else:
    print("Could not find block to patch in fixtures.ts")
    # Debug: print logic block
    start = content.find("if (options.skipReturnToHome)")
    if start != -1:
        print("Block found:", content[start:start+500])

with open('tests/fixtures.ts', 'w') as f:
    f.write(content)
