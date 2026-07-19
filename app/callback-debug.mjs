import { chromium } from '@playwright/test';

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  ignoreHTTPSErrors: true,
  viewport: { width: 1280, height: 800 }
});
const page = await ctx.newPage();

// Ловим запросы к PocketBase
const pbRequests = [];
page.on('request', r => {
  const u = r.url();
  if (u.includes('pb.kdnfx.space') || u.includes('192.168.3.59:8090')) {
    pbRequests.push('REQ ' + r.method() + ' ' + u.substring(0, 200));
  }
});
page.on('response', async r => {
  const u = r.url();
  if (u.includes('pb.kdnfx.space') && (u.includes('oauth') || u.includes('auth') || u.includes('token') || u.includes('users'))) {
    let body = '';
    try { body = await r.text(); } catch {}
    pbRequests.push('RESP ' + r.status() + ' ' + u.substring(0, 150) + ' | body: ' + body.substring(0, 300));
  }
});

const consoleMsgs = [];
page.on('console', m => consoleMsgs.push(m.type() + ': ' + m.text()));
page.on('pageerror', e => consoleMsgs.push('PAGEERROR: ' + e.message));

console.log('=== 1. Открываем login, кликаем Яндекс ===');
await page.goto('https://udacha.kdnfx.space/', { waitUntil: 'domcontentloaded', timeout: 15000 });
await page.waitForTimeout(2000);
await page.getByRole('button', { name: /Яндекс/i }).click();

// Ждём ухода на Яндекс
await page.waitForURL(u => typeof u === 'string' && u.includes('yandex.ru') || (u.url && u.url().includes('yandex.ru')), { timeout: 10000 }).catch(() => {});
await page.waitForTimeout(1000);
console.log('После клика URL:', page.url().substring(0, 120));

// Симулируем колбэк — сразу подставляем фейковый code/state (как от Яндекса)
// Используем реальный state из localStorage (SDK его туда сохраняет)
const stored = await page.evaluate(() => localStorage.getItem('udacha_yandex_oauth'));
console.log('localStorage udacha_yandex_oauth:', stored);

if (!stored) {
  console.log('❌ Нет сохранённого PKCE-состояния в localStorage!');
  console.log('Это значит loginWithYandexRedirect не сохранил state/codeVerifier');
  console.log('Весь localStorage:');
  const allLs = await page.evaluate(() => JSON.stringify(localStorage));
  console.log(allLs);
}

// Идём на callback URL с фейковым code (увидим обмен)
console.log('\n=== 2. Симулируем callback (с фейковым code) ===');
await page.goto('https://udacha.kdnfx.space/auth/yandex/callback?state=fake&code=fake_code_for_test', { waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});
await page.waitForTimeout(3000);

const bodyText = await page.evaluate(() => document.body.innerText);
console.log('\n=== Callback screen text ===');
console.log(bodyText.substring(0, 800));

console.log('\n=== PB requests ===');
pbRequests.forEach(r => console.log(' ', r));

console.log('\n=== Console msgs ===');
consoleMsgs.slice(-15).forEach(m => console.log(' ', m));

await page.screenshot({ path: '/tmp/callback-test.png' });
await browser.close();
