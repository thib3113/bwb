import sys

with open('tests/basic_flow.spec.ts', 'r') as f:
    content = f.read()

search_str = """    // Handle potential redirect
    if (page.url().includes('my-boks')) {"""

replace_str = """    // Wait for potential redirect logic to trigger (it has 1.5s delay)
    await page.waitForTimeout(2000);

    // Handle potential redirect
    if (page.url().includes('my-boks')) {"""

# Replace all occurrences (there are 2)
if search_str in content:
    content = content.replace(search_str, replace_str)
    print("Added wait before redirect check in basic_flow.spec.ts")
else:
    print("Could not find redirect check to patch")

with open('tests/basic_flow.spec.ts', 'w') as f:
    f.write(content)
