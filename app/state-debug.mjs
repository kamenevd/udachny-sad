import { chromium } from '@playwright/test';

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  ignoreHTTPSErrors: true,
  viewport: { width: 1280, height: 800 }
});
const page = await ctx.newPage();

console.log('=== 1. Load login ===');
await page.goto('https://udacha.kdnfx.space/', { waitUntil: 'domcontentloaded', timeout: 15000 });
await page.waitForTimeout(2000);

console.log('\n=== 2. ДО клика — localStorage ===');
const ls1 = await page.evaluate(() => JSON.stringify(localStorage, null, 2));
console.log(ls1);

console.log('\n=== 3. Click Yandex ===');
// Перехватываем навигацию чтобы не уходить на Яндекс — посмотрим что сохранится
let navigationUrl = null;
page.on('framenavigated', async (frame) => {
  if (frame === page.mainFrame()) {
    const u = frame.url();
    if (u.includes('yandex.ru') && !navigationUrl) {
      navigationUrl = u;
      // Быстро читаем localStorage на udacha.kdnfx.space
      try {
        const ls2 = await page.evaluate(() => JSON.stringify(localStorage));
        console.log('localStorage В МОМЕНТ навигации:', ls2);
      } catch(e) {
        console.log('Не удалось прочитать localStorage (уже на Яндексе):', e.message);
      }
    }
  }
});

await page.getByRole('button', { name: /Яндекс/i }).click();
await page.waitForTimeout(3000);

console.log('\nnavigation URL:', navigationUrl?.substring(0, 200));

// Расшифровываем state из URL
if (navigationUrl) {
  const m = navigationUrl.match(/state=([^&]+)/);
  if (m) console.log('state в URL Яндекса:', m[1]);
}

// Читаем cookies на всякий случай
const cookies = await ctx.cookies('https://udacha.kdnfx.space');
console.log('\nCookies на udacha.kdnfx.space:', cookies.length);
cookies.forEach(c => console.log(' ', c.name, '=', c.value.substring(0, 30)));

await browser.close();
