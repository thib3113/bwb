import sys

with open('tests/fixtures.ts', 'r') as f:
    content = f.read()

# Update Interface
if "connect(): Promise<void>;" in content:
    content = content.replace("connect(): Promise<void>;", "connect(options?: { skipReturnToHome?: boolean }): Promise<void>;")

# Update connect implementation signature
if "connect: async () => {" in content:
    content = content.replace("connect: async () => {", "connect: async (options = {}) => {")

# Update redirect logic
search_str = """          if (page.url().includes('my-boks')) {
            console.log('[Simulator Fixture] Redirected to My Boks. Navigating to Codes via Menu...');
            // Open Menu
            await page.getByLabel('menu').click();
            // Click Home (which redirects to /codes)
            await page.getByText('Home').click();
            // Wait for navigation
            await page.waitForURL(/.*\/codes/);
          }"""

replace_str = """          if (page.url().includes('my-boks')) {
            if (options.skipReturnToHome) {
                console.log('[Simulator Fixture] Redirected to My Boks. Staying there as requested.');
            } else {
                console.log('[Simulator Fixture] Redirected to My Boks. Navigating to Codes via Menu...');
                // Open Menu
                await page.getByLabel('menu').click();
                // Click Home (which redirects to /codes)
                await page.getByText('Home').click();
                // Wait for navigation
                await page.waitForURL(/.*\/codes/);
                // Ensure dashboard is ready
                await expect(page.getByTestId('main-nav')).toBeVisible({ timeout: 10000 });
            }
          }"""

if search_str in content:
    content = content.replace(search_str, replace_str)
    print("Updated fixture logic")
else:
    print("Could not find fixture logic block")

# Fix console.log empty
if "console.log();" in content:
    content = content.replace("console.log();", "console.log('[Simulator Fixture] Checking status...');")

with open('tests/fixtures.ts', 'w') as f:
    f.write(content)
