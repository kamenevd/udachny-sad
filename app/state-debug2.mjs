import { chromium } from '@playwright/test';

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();

await page.goto('https://udacha.kdnfx.space/', { waitUntil: 'domcontentloaded', timeout: 15000 });
await page.waitForTimeout(2000);

// Перехватываем запрос к Яндексу ПЕРЕД тем как он уйдёт — в этот момент код уже выполнен
let localStorageSnapshot = null;
await page.route('**/oauth.yandex.ru/**', async (route) => {
  // Читаем localStorage ПЕРЕД навигацией (запрос ещё не ушёл)
  try {
    localStorageSnapshot = await page.evaluate(() => JSON.stringify(localStorage));
  } catch(e) {
    localStorageSnapshot = 'ERR: ' + e.message;
  }
  console.log('=== localStorage В МОМЕНТ запроса к Яндексу ===');
  console.log(localStorageSnapshot);
  await route.continue();
});

console.log('Click Yandex...');
await page.getByRole('button', { name: /Яндекс/i }).click();
await page.waitForTimeout(3000);

console.log('Final URL:', page.url().substring(0, 150));

// Теперь симулируем возврат с правильным state (берём его из URL)
if (localStorageSnapshot && localStorageSnapshot !== '{}') {
  const ls = JSON.parse(localStorageSnapshot);
  if (ls['udacha_yandex_oauth']) {
    const stored = JSON.parse(ls['udacha_yandex_oauth']);
    console.log('\n=== Симулируем callback с правильным state ===');
    console.log('State:', stored.state);
    const callbackUrl = `https://udacha.kdnfx.space/auth/yandex/callback?state=${stored.state}&code=FAKE_CODE_FOR_TEST`;
    console.log('Callback URL:', callbackUrl);

    // Идём на callback — PKCE state должен совпасть, exchange пойдёт к PB
    await page.goto(callbackUrl, { waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(2000);
    const text = await page.evaluate(() => document.body.innerText);
    console.log('\nCallback screen:');
    console.log(text.substring(0, 500));
  } else {
    console.log('❌ localStorage всё ещё пустой!');
  }
} else {
  console.log('❌ localStorage не записан');
}

await browser.close();
