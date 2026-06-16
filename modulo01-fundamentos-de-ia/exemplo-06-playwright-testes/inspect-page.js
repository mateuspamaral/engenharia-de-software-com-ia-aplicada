const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('https://erickwendel.github.io/vanilla-js-web-app-example/');
  console.log('title=', await page.title());
  console.log('inputs=', await page.$$eval('input', els => els.map(e => ({ id: e.id, placeholder: e.placeholder, type: e.type, label: e.labels?.[0]?.innerText || '', value: e.value }))));
  console.log('buttons=', await page.$$eval('button', els => els.map(e => ({ text: e.innerText, id: e.id, ariaLabel: e.getAttribute('aria-label'), className: e.className }))));
  console.log('formAction=', await page.$eval('form', el => el.getAttribute('action') || 'none'));
  console.log('listElements=', await page.$$eval('ul li, ol li, .list-group-item, .card', els => els.map(e => ({ tag: e.tagName, text: e.innerText.trim().slice(0,100) })).slice(0,20)));
  await browser.close();
})();
