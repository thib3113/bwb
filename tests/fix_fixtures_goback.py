import sys

with open('tests/fixtures.ts', 'r') as f:
    content = f.read()

search_str = """                console.log('[Simulator Fixture] Redirected to My Boks. Forcing navigation to Codes...');
                await page.goto('/codes');"""

replace_str = """                console.log('[Simulator Fixture] Redirected to My Boks. Navigating back...');
                await page.goBack();
                await page.waitForTimeout(1000);

                // If still on my-boks (e.g. replace was used or history weirdness), force via Menu
                if (page.url().includes('my-boks')) {
                    console.log('[Simulator Fixture] goBack failed. Using Menu...');
                    await page.getByLabel('menu').click();
                    await expect(page.getByText('Home')).toBeVisible();
                    await page.getByText('Home').click();
                    await page.waitForURL(/.*\/codes/);
                }

                // Ensure dashboard is ready
                await expect(page.getByTestId('main-nav')).toBeVisible({ timeout: 10000 });"""

if search_str in content:
    content = content.replace(search_str, replace_str)
    print("Updated fixture to use goBack + fallback")
else:
    print("Could not find block to patch in fixtures.ts")

with open('tests/fixtures.ts', 'w') as f:
    f.write(content)
