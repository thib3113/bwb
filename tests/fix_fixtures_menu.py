import sys

with open('tests/fixtures.ts', 'r') as f:
    content = f.read()

search_str = """                console.log('[Simulator Fixture] Redirected to My Boks. Navigating back...');
                await page.goBack();
                await page.waitForTimeout(1000);

                // If still on my-boks (e.g. replace was used or history weirdness), force via Menu
                if (page.url().includes('my-boks')) {
                    console.log('[Simulator Fixture] goBack failed. Using Menu...');
                    await page.getByLabel('menu').click();
                    await expect(page.getByText('Home')).toBeVisible();
                    await page.getByText('Home').click();
                    await page.waitForURL(/.*\/codes/);
                }"""

replace_str = """                console.log('[Simulator Fixture] Redirected to My Boks. Navigating back via Menu...');
                // Ensure drawer is openable
                const menuBtn = page.getByLabel('menu');
                await expect(menuBtn).toBeVisible();
                await menuBtn.click();

                // Click Home
                const homeLink = page.getByText('Home');
                await expect(homeLink).toBeVisible();
                await homeLink.click();

                // Wait for navigation
                await page.waitForURL(/.*\/codes/);"""

if search_str in content:
    content = content.replace(search_str, replace_str)
    print("Updated fixture to use Menu navigation")
else:
    print("Could not find block to patch in fixtures.ts")
    # Debug
    start = content.find("if (options.skipReturnToHome)")
    if start != -1:
        print("Block found:", content[start:start+800])

with open('tests/fixtures.ts', 'w') as f:
    f.write(content)
