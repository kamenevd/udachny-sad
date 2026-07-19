import { chromium } from '@playwright/test';

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  ignoreHTTPSErrors: true,
  viewport: { width: 1280, height: 800 }
});
const page = await ctx.newPage();

// Ловим ВСЕ запросы к Яндексу
page.on('request', r => {
  const u = r.url();
  if (u.includes('yandex.ru') || u.includes('oauth.yandex')) {
    console.log('REQUEST:', r.method(), u);
  }
});
page.on('response', r => {
  const u = r.url();
  if (u.includes('yandex.ru') || u.includes('oauth.yandex')) {
    console.log('RESPONSE:', r.status(), u.substring(0, 200));
    if (r.status() >= 300 && r.status() < 500) {
      const location = r.headers()['location'];
      if (location) console.log('  → Location:', location);
    }
  }
});

await page.goto('https://udacha.kdnfx.space/', { waitUntil: 'domcontentloaded', timeout: 15000 });
await page.waitForTimeout(2000);

console.log('=== Click Yandex button ===');
const popupPromise = ctx.waitForEvent('page', { timeout: 5000 }).catch(() => null);
await page.getByRole('button', { name: /Яндекс/i }).click();
const popup = await popupPromise;

if (popup) {
  console.log('\nPopup opened, waiting for Yandex response...');
  await popup.waitForLoadState('domcontentloaded').catch(() => {});
  await popup.waitForTimeout(2000);
  console.log('Final popup URL:', popup.url());
  await popup.screenshot({ path: '/tmp/yandex-oauth-error.png', fullPage: true }).catch(() => {});
  const bodyText = await popup.evaluate(() => document.body.innerText.substring(0, 1500)).catch(() => '');
  console.log('\nPopup body text:');
  console.log(bodyText);
}

await browser.close();
