import sys

with open('tests/fixtures.ts', 'r') as f:
    content = f.read()

search_str = """          // Handle potential redirect for new devices
          // Wait extra time for redirect to trigger
          await page.waitForTimeout(4000);
          console.log('[Simulator Fixture] Checking URL for redirect:', page.url());
          if (page.url().includes('my-boks')) {"""

replace_str = """          // Handle potential redirect for new devices
          console.log('[Simulator Fixture] Waiting for redirect or dashboard...');
          try {
            await Promise.race([
                page.waitForURL(/.*\/my-boks.*/, { timeout: 10000 }),
                page.waitForSelector('[data-testid="main-nav"]', { timeout: 10000 })
            ]);
          } catch (e) {
            console.log('[Simulator Fixture] Timeout waiting for stable state.');
          }

          if (page.url().includes('my-boks')) {"""

if search_str in content:
    content = content.replace(search_str, replace_str)
    print("Updated fixture to use race condition")
else:
    print("Could not find block to patch in fixtures.ts")
    # Debug
    start = content.find("if (isOnboarding)")
    if start != -1:
        print("Block found:", content[start:start+1000])

with open('tests/fixtures.ts', 'w') as f:
    f.write(content)
