import sys

with open('tests/version_gating.spec.ts', 'r') as f:
    content = f.read()

# Replace connect calls
content = content.replace("await simulator.connect();", "await simulator.connect({ skipReturnToHome: true });")

# Remove redundant navigation since we are already there
# Search for the block:
# // Navigate via UI to avoid reload
# await page.getByLabel('menu').click();
# await page.getByText(/my boks/i).click();

redundant_nav = """    // Navigate via UI to avoid reload
    await page.getByLabel('menu').click();
    await page.getByText(/my boks/i).click();"""

content = content.replace(redundant_nav, """    // Already on My Boks page due to new device redirect""")

with open('tests/version_gating.spec.ts', 'w') as f:
    f.write(content)
