import sys

with open('tests/fixtures.ts', 'r') as f:
    content = f.read()

dup_str = """                // Ensure dashboard is ready
                await expect(page.getByTestId('main-nav')).toBeVisible({ timeout: 10000 });
                // Ensure dashboard is ready
                await expect(page.getByTestId('main-nav')).toBeVisible({ timeout: 10000 });"""

clean_str = """                // Ensure dashboard is ready
                await expect(page.getByTestId('main-nav')).toBeVisible({ timeout: 10000 });"""

if dup_str in content:
    content = content.replace(dup_str, clean_str)
    print("Cleaned up duplicate expect")
else:
    print("Duplicate not found")

with open('tests/fixtures.ts', 'w') as f:
    f.write(content)
