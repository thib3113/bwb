import sys

with open('tests/fixtures.ts', 'r') as f:
    content = f.read()

search_str = """                // Wait for navigation
                await page.waitForURL(/.*\/codes/);"""

replace_str = """                // Wait for navigation
                await page.waitForURL(/.*\/codes/);

                // Force reload to ensure DB state is picked up
                console.log('[Simulator Fixture] Reloading page to ensure state consistency...');
                await page.reload();
                await page.waitForTimeout(2000);"""

if search_str in content:
    content = content.replace(search_str, replace_str)
    print("Added page.reload to fixture")
else:
    print("Could not find block to patch in fixtures.ts")

with open('tests/fixtures.ts', 'w') as f:
    f.write(content)
