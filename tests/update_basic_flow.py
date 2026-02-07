import sys

with open('tests/basic_flow.spec.ts', 'r') as f:
    content = f.read()

# Fix for first test case
search_str1 = """    // Wait for connection: Disabled icon should disappear
    await expect(disabledIcon).not.toBeVisible({ timeout: 15000 });

    // Check for battery percentage as confirmation of connection
    await expect(page.getByText('%')).toBeVisible({ timeout: 10000 });"""

replace_str1 = """    // Wait for connection: Disabled icon should disappear
    await expect(disabledIcon).not.toBeVisible({ timeout: 15000 });

    // Handle potential redirect
    if (page.url().includes('my-boks')) {
      await page.goto('/codes');
    }

    // Check for battery percentage as confirmation of connection
    await expect(page.getByText('%')).toBeVisible({ timeout: 10000 });"""

# Fix for second test case
search_str2 = """    // Check for battery percentage as confirmation of connection
    await expect(page.getByText('%')).toBeVisible({ timeout: 10000 });

    // Wait a bit for device context to settle
    await page.waitForTimeout(500);"""

replace_str2 = """    // Check for battery percentage as confirmation of connection
    await expect(page.getByText('%')).toBeVisible({ timeout: 10000 });

    // Handle potential redirect
    if (page.url().includes('my-boks')) {
      await page.goto('/codes');
    }

    // Wait a bit for device context to settle
    await page.waitForTimeout(500);"""

if search_str1 in content:
    content = content.replace(search_str1, replace_str1)
    print("Updated first test case in basic_flow.spec.ts")
else:
    print("Could not find first test case snippet")

if search_str2 in content:
    content = content.replace(search_str2, replace_str2)
    print("Updated second test case in basic_flow.spec.ts")
else:
    print("Could not find second test case snippet")

with open('tests/basic_flow.spec.ts', 'w') as f:
    f.write(content)
