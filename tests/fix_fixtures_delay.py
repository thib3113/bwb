import sys

with open('tests/fixtures.ts', 'r') as f:
    content = f.read()

search_str = """        // Click Connect if in Onboarding
        const isOnboarding = await onboarding.isVisible();
        console.log('[Simulator Fixture] Onboarding visible:', isOnboarding);
        if (isOnboarding) {
          await onboarding.getByRole('button', { name: /connect/i }).click();
          await page.waitForTimeout(2000);

          // Handle potential redirect for new devices
          console.log('[Simulator Fixture] Waiting for redirect or dashboard...');"""

# The logic already has waitForTimeout(2000) inside the IF block in my mental model/previous cat,
# but let's verify if I removed it or if race condition replaced it.
# In "fix_fixtures_race.py", I replaced the block starting with "await page.waitForTimeout(4000);" with race.
# But "await page.waitForTimeout(2000);" was BEFORE that block?
# Let's check the current content via cat first to be precise.

with open('tests/fixtures.ts', 'r') as f:
    current_content = f.read()

if "await page.waitForTimeout(2000);" in current_content:
    print("Wait 2000 is present.")
else:
    print("Wait 2000 is MISSING.")

# If missing, add it.
if "await page.waitForTimeout(2000);" not in current_content:
    # Insert it before race logic
    target = "console.log('[Simulator Fixture] Waiting for redirect or dashboard...');"
    if target in current_content:
        new_content = current_content.replace(target, "await page.waitForTimeout(3000); // Wait for potential redirect logic (1.5s delay)\n          " + target)
        with open('tests/fixtures.ts', 'w') as f:
            f.write(new_content)
        print("Added wait 3000.")
    else:
        print("Could not find target to insert wait.")
