import { test, expect } from '@playwright/test';

test('homepage loads and shows image form fields', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/TDD Frontend Example/);
  await expect(page.getByPlaceholder('Image Title')).toBeVisible();
  await expect(page.getByPlaceholder('Image URL')).toBeVisible();
});
