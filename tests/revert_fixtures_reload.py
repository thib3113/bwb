import sys

with open('tests/fixtures.ts', 'r') as f:
    content = f.read()

search_str = """                // Force reload to ensure DB state is picked up
                console.log('[Simulator Fixture] Reloading page to ensure state consistency...');
                await page.reload();
                await page.waitForTimeout(2000);"""

replace_str = ""

if search_str in content:
    content = content.replace(search_str, replace_str)
    print("Removed reload from fixture")
else:
    print("Could not find reload block in fixtures.ts")

with open('tests/fixtures.ts', 'w') as f:
    f.write(content)
