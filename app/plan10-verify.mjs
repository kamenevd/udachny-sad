import { chromium } from '@playwright/test';
import fs from 'fs';

const URL = 'https://udacha.kdnfx.space/';
const SCREENSHOT_DIR = '/tmp/plan10-screens';
fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  ignoreHTTPSErrors: true,
  viewport: { width: 414, height: 896 } // iPhone-ish
});
const page = await ctx.newPage();

const errors = [];
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });
page.on('requestfailed', r => {
  const u = r.url();
  if (u.includes('192.168.3.59') || u.includes('convex')) {
    errors.push('REQFAIL: ' + u + ' — ' + r.failure().errorText);
  }
});

console.log('=== 1. Load login page ===');
await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 15000 });
await page.waitForTimeout(2500);
await page.screenshot({ path: `${SCREENSHOT_DIR}/01-login-mobile.png`, fullPage: true });

// Check what buttons are present
const buttons = await page.$$eval('button, a', els =>
  els.map(e => (e.innerText || '').trim().substring(0, 60)).filter(Boolean)
);
console.log('Buttons on page:');
buttons.forEach(b => console.log('  -', b));

console.log('\n=== 2. Yandex button click test ===');
const yandexBtn = await page.$('button:has-text("Яндекс")');
if (yandexBtn) {
  // Catch the navigation/request
  const yandexNavPromise = Promise.race([
    page.waitForRequest(r => r.url().includes('oauth.yandex.ru'), { timeout: 5000 })
      .then(r => ({ ok: true, url: r.url() }))
      .catch(e => ({ ok: false, err: e.message })),
    page.waitForTimeout(3000).then(() => ({ ok: false, err: 'no request in 3s' })),
  ]);
  await yandexBtn.click({ timeout: 3000 }).catch(e => errors.push('CLICK: ' + e.message));
  const result = await yandexNavPromise;
  console.log('Yandex click result:', JSON.stringify(result));
  if (result.ok) {
    const u = new URL(result.url);
    const redirectUri = u.searchParams.get('redirect_uri');
    console.log('  client_id:', u.searchParams.get('client_id'));
    console.log('  redirect_uri:', redirectUri);
    console.log('  state:', u.searchParams.get('state'));
    console.log('  redirect_uri NON-EMPTY:', !!redirectUri);
  }
} else {
  console.log('❌ Yandex button NOT FOUND');
  errors.push('YANDEX_BUTTON_MISSING');
}

// Navigate back to login
await page.goto(URL, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1500);

console.log('\n=== 3. Demo login test ===');
const demoBtn = await page.$('button:has-text("Демо")');
if (demoBtn) {
  await demoBtn.click({ timeout: 3000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/02-after-demo-login.png`, fullPage: true });
  const body = await page.evaluate(() => document.body.innerText.substring(0, 500));
  console.log('Body text after demo login (first 300):');
  console.log(body.substring(0, 300));
} else {
  console.log('Demo button NOT FOUND');
}

console.log('\n=== 4. Errors summary ===');
if (errors.length === 0) {
  console.log('✅ NO ERRORS');
} else {
  errors.forEach(e => console.log('  ⚠️', e));
}

// Final screenshot
await page.screenshot({ path: `${SCREENSHOT_DIR}/03-final.png`, fullPage: true });

// Also screenshot the login page on desktop view
const desktopCtx = await browser.newContext({
  ignoreHTTPSErrors: true,
  viewport: { width: 1280, height: 800 }
});
const desktopPage = await desktopCtx.newPage();
await desktopPage.goto(URL, { waitUntil: 'domcontentloaded' });
await desktopPage.waitForTimeout(2000);
await desktopPage.screenshot({ path: `${SCREENSHOT_DIR}/04-login-desktop.png`, fullPage: true });

console.log('\n=== Screenshots saved ===');
fs.readdirSync(SCREENSHOT_DIR).forEach(f => {
  const stat = fs.statSync(`${SCREENSHOT_DIR}/${f}`);
  console.log(`  ${f} (${Math.round(stat.size / 1024)} KB)`);
});

await browser.close();
console.log('\n=== DONE ===');
