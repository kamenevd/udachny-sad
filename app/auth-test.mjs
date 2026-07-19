import { chromium } from '@playwright/test';

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  ignoreHTTPSErrors: true,
  viewport: { width: 1280, height: 800 }
});
const page = await ctx.newPage();

const yandexRequests = [];
page.on('request', r => {
  const u = r.url();
  if (u.includes('oauth.yandex.ru') || u.includes('passport.yandex')) {
    yandexRequests.push(r.method() + ' ' + u.substring(0, 200));
  }
});
page.on('framenavigated', f => {
  const u = f.url();
  if (u.includes('yandex.ru') && f === page.mainFrame()) {
    console.log('  → navigated to:', u.substring(0, 250));
  }
});

console.log('=== 1. Load login ===');
await page.goto('https://udacha.kdnfx.space/', { waitUntil: 'domcontentloaded', timeout: 15000 });
await page.waitForTimeout(2000);

console.log('=== 2. Click Yandex button (redirect flow) ===');
await page.getByRole('button', { name: /Яндекс/i }).click();

// Ждём 5 секунд на navigation
await page.waitForTimeout(5000);

const finalUrl = page.url();
console.log('Final URL:', finalUrl.substring(0, 250));

if (finalUrl.includes('yandex.ru')) {
  console.log('\n✅ REDIRECT FLOW РАБОТАЕТ — браузер ушёл на Яндекс');
  // Парсим redirect_uri из URL
  const m = finalUrl.match(/redirect_uri=([^&]+)/) ||
            decodeURIComponent(finalUrl).match(/redirect_uri=([^&]+)/);
  if (m) {
    const decoded = decodeURIComponent(decodeURIComponent(m[1]));
    console.log('redirect_uri (decoded):', decoded);
    console.log('✅ /auth/yandex/callback:', decoded.includes('/auth/yandex/callback'));
    console.log('✅ udacha.kdnfx.space:', decoded.includes('udacha.kdnfx.space'));
  } else {
    // может быть в retpath
    const retpath = new URL(finalUrl).searchParams.get('retpath');
    if (retpath) {
      console.log('retpath decoded:', decodeURIComponent(retpath).substring(0, 300));
      const m2 = retpath.match(/redirect_uri=([^&]+)/);
      if (m2) {
        console.log('redirect_uri from retpath:', decodeURIComponent(decodeURIComponent(m2[1])));
      }
    }
  }
  await page.screenshot({ path: '/tmp/auth-test-yandex.png' });
} else {
  console.log('❌ Не ушёл на Яндекс. Запросы:');
  yandexRequests.forEach(r => console.log('  ', r));
  await page.screenshot({ path: '/tmp/auth-test-no-nav.png' });
}

await browser.close();
console.log('\n=== DONE ===');
