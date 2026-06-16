const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('https://erickwendel.github.io/vanilla-js-web-app-example/');

  const selectors = {
    titleById: await page.locator('#title').count(),
    urlById: await page.locator('#imageUrl').count(),
    submitById: await page.locator('#btnSubmit').count(),
    cardByClass: await page.locator('div.card').count(),
    cardTitleByClass: await page.locator('.card-title').count(),
    titleByPlaceholder: await page.locator('input[placeholder="Image Title"]').count(),
    urlByPlaceholder: await page.locator('input[placeholder="https://img.com/erick.png"]').count(),
    submitByType: await page.locator('input[type="submit"]').count(),
  };

  console.log('selectors=', selectors);
  await browser.close();
})();
