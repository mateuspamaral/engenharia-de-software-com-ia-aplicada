import { test, expect } from '@playwright/test';

test.describe('Image form', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('https://erickwendel.github.io/vanilla-js-web-app-example/');
    await expect(page.locator('#title')).toBeVisible();
  });

  test('submits the form and updates the image list', async ({ page }) => {
    const titleInput = page.locator('#title');
    const urlInput = page.locator('#imageUrl');
    const submitButton = page.locator('#btnSubmit');
    const cardTitles = page.locator('.card-title');

    await expect(cardTitles).toHaveCount(3);
    await titleInput.fill('New Image');
    await urlInput.fill('https://example.com/image.png');
    await submitButton.click();

    await expect(cardTitles).toHaveCount(4);
    await expect(cardTitles.nth(3)).toHaveText('New Image');
  });

  test('shows validation feedback when title is missing', async ({ page }) => {
    const titleInput = page.locator('#title');
    const urlInput = page.locator('#imageUrl');
    const submitButton = page.locator('#btnSubmit');
    const titleFeedback = page.locator('#titleFeedback');

    await titleInput.fill('');
    await urlInput.fill('https://example.com/image.png');
    await submitButton.click();

    await expect(titleFeedback).toBeVisible();
    const titleValidity = await titleInput.evaluate(el => el.checkValidity());
    expect(titleValidity).toBe(false);
  });

  test('shows validation feedback when URL is invalid', async ({ page }) => {
    const titleInput = page.locator('#title');
    const urlInput = page.locator('#imageUrl');
    const submitButton = page.locator('#btnSubmit');
    const urlFeedback = page.locator('#urlFeedback');

    await titleInput.fill('New Image');
    await urlInput.fill('not-a-url');
    await submitButton.click();

    await expect(urlFeedback).toBeVisible();
    const urlValidity = await urlInput.evaluate(el => el.checkValidity());
    expect(urlValidity).toBe(false);
  });
});
