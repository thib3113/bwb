import sys

with open('tests/basic_flow.spec.ts', 'r') as f:
    content = f.read()

# First, revert the previous bad patch if possible, or just overwrite the bad block
# The previous script might have written bad regex.
# Let's search for the bad block first.

bad_block = """    if (page.url().includes('my-boks')) {
      console.log('Redirected to My Boks. Navigating back via Menu...');
      // Open Menu
      await page.getByLabel('menu').click();
      // Click Home (which redirects to /codes)
      await page.getByText('Home').click();
      // Wait for navigation
      await page.waitForURL(/.*/codes/);
    }"""

search_str = """    // Handle potential redirect
    if (page.url().includes('my-boks')) {
      await page.goto('/codes');
    }"""

# Correct replacement
replace_str = r"""    // Handle potential redirect
    if (page.url().includes('my-boks')) {
      console.log('Redirected to My Boks. Navigating back via Menu...');
      // Open Menu
      await page.getByLabel('menu').click();
      // Click Home (which redirects to /codes)
      await page.getByText('Home').click();
      // Wait for navigation
      await page.waitForURL(/.*\/codes/);
    }"""

if bad_block in content:
    # Replace the bad block directly
    content = content.replace(bad_block, replace_str)
    print("Fixed bad navigation block")
elif search_str in content:
    content = content.replace(search_str, replace_str)
    print("Updated navigation in basic_flow.spec.ts")
else:
    print("Could not find block to patch")

with open('tests/basic_flow.spec.ts', 'w') as f:
    f.write(content)
