import sys

with open('tests/fixtures.ts', 'r') as f:
    content = f.read()

# Replace the complicated race logic with simple wait
search_str = """          // Handle potential redirect for new devices
          console.log('[Simulator Fixture] Waiting for redirect or dashboard...');
          try {
            await Promise.race([
                page.waitForURL(/.*\/my-boks.*/, { timeout: 10000 }),
                page.waitForSelector('[data-testid="main-nav"]', { timeout: 10000 })
            ]);
          } catch (e) {
            console.log('[Simulator Fixture] Timeout waiting for stable state.');
          }"""

replace_str = """          // Handle potential redirect for new devices
          await page.waitForTimeout(3000); // Wait for potential redirect logic (1.5s delay)
          console.log('[Simulator Fixture] Checking URL for redirect:', page.url());"""

if search_str in content:
    content = content.replace(search_str, replace_str)
    print("Simplified fixture logic")
else:
    print("Could not find block to patch in fixtures.ts")
    # Search for "waitForTimeout(3000)" that I added previously?
    # Or "waitForTimeout(4000)"?
    # In "fix_fixtures_delay.py" I checked for 2000.
    # In "fix_fixtures_race.py" I added race.
    # Let's find the race block.
    if "Promise.race" in content:
        # manual replace via finding indices might be safer if string match fails due to whitespace
        start = content.find("// Handle potential redirect")
        end = content.find("if (page.url().includes('my-boks'))")
        if start != -1 and end != -1:
            content = content[:start] + replace_str + "\n\n          " + content[end:]
            print("Simplified fixture logic via index")
        else:
            print("Could not find start/end indices")

with open('tests/fixtures.ts', 'w') as f:
    f.write(content)
