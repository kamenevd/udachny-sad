import { chromium } from '@playwright/test';

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();

await page.goto('https://udacha.kdnfx.space/', { waitUntil: 'domcontentloaded', timeout: 15000 });
await page.waitForTimeout(2000);

// Блокируем запрос к Яндексу — не даём уйти навигации
let blockedUrl = null;
await page.route('**/*', async (route) => {
  const u = route.request().url();
  if (u.includes('oauth.yandex.ru') || u.includes('passport.yandex.ru')) {
    blockedUrl = u;
    console.log('=== Заблокирован запрос к Яндексу ===');
    console.log(u.substring(0, 200));
    await route.abort();
    return;
  }
  await route.continue();
});

console.log('Click Yandex...');
try {
  await page.getByRole('button', { name: /Яндекс/i }).click({ timeout: 3000 });
} catch(e) { console.log('click err:', e.message.substring(0, 100)); }

await page.waitForTimeout(3000);

// Читаем localStorage ПОСЛЕ блокировки навигации
console.log('\n=== localStorage ПОСЛЕ клика (навигация заблокирована) ===');
const ls2 = await page.evaluate(() => JSON.stringify(localStorage));
console.log(ls2);

const ls = JSON.parse(ls2);
if (ls['udacha_yandex_oauth']) {
  const stored = JSON.parse(ls['udacha_yandex_oauth']);
  console.log('\n✅ localStorage записан!');
  console.log('state:', stored.state);
  console.log('codeVerifier:', stored.codeVerifier?.substring(0, 30) + '...');
  console.log('redirectUrl:', stored.redirectUrl);

  // Симулируем callback
  const cbUrl = `https://udacha.kdnfx.space/auth/yandex/callback?state=${stored.state}&code=FAKE_CODE`;
  await page.unroute('**/*');
  await page.goto(cbUrl, { waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(3000);
  const text = await page.evaluate(() => document.body.innerText);
  console.log('\n=== Callback screen ===');
  console.log(text.substring(0, 600));
} else {
  console.log('❌ localStorage ПУСТОЙ');
}

await browser.close();
