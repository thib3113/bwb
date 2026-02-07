import sys

with open('tests/fixtures.ts', 'r') as f:
    content = f.read()

search_str = """          // Wait extra time for redirect to trigger
          await page.waitForTimeout(2000);
          if (page.url().includes('my-boks')) {"""

replace_str = """          // Wait extra time for redirect to trigger
          await page.waitForTimeout(4000);
          console.log('[Simulator Fixture] Checking URL for redirect:', page.url());
          if (page.url().includes('my-boks')) {"""

if search_str in content:
    content = content.replace(search_str, replace_str)
    print("Updated fixtures.ts with debug log")
else:
    print("Could not find block to patch in fixtures.ts")

with open('tests/fixtures.ts', 'w') as f:
    f.write(content)
