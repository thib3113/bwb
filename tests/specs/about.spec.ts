import { expect, test } from '../fixtures';

test.describe('About Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/about');
  });

  test('should display about page content', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /À propos/i }).or(page.getByRole('heading', { name: /About/i }))).toBeVisible();
    await expect(page.getByText(/client non officiel/i).or(page.getByText(/unofficial client/i))).toBeVisible();
  });

  test('should have links to GitHub', async ({ page }) => {
    const githubLink = page.getByRole('link', { name: /GitHub/i }).first();
    await expect(githubLink).toBeVisible();
    await expect(githubLink).toHaveAttribute('href', /github\.com/);
  });
});
