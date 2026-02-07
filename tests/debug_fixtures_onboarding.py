import sys

with open('tests/fixtures.ts', 'r') as f:
    content = f.read()

search_str = """        // Click Connect if in Onboarding
        if (await onboarding.isVisible()) {"""

replace_str = """        // Click Connect if in Onboarding
        const isOnboarding = await onboarding.isVisible();
        console.log('[Simulator Fixture] Onboarding visible:', isOnboarding);
        if (isOnboarding) {"""

if search_str in content:
    content = content.replace(search_str, replace_str)
    print("Added onboarding debug log to fixtures.ts")
else:
    print("Could not find block to patch in fixtures.ts")

with open('tests/fixtures.ts', 'w') as f:
    f.write(content)
