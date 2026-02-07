import sys

with open('tests/fixtures.ts', 'r') as f:
    content = f.read()

search_str = """        // Click Connect if in Onboarding
        if (await onboarding.isVisible()) {
          await onboarding.getByRole('button', { name: /connect/i }).click();
          await page.waitForTimeout(2000);
        }"""

replace_str = """        // Click Connect if in Onboarding
        if (await onboarding.isVisible()) {
          await onboarding.getByRole('button', { name: /connect/i }).click();
          await page.waitForTimeout(2000);

          // Handle potential redirect for new devices
          if (page.url().includes('my-boks')) {
            console.log('[Simulator Fixture] Redirected to My Boks. Navigating to Codes...');
            await page.goto('/codes');
          }
        }"""

if search_str in content:
    content = content.replace(search_str, replace_str)
    print("Updated fixtures.ts successfully")
else:
    print("Could not find connect logic in fixtures.ts")

with open('tests/fixtures.ts', 'w') as f:
    f.write(content)
