import { chromium } from '@playwright/test';
import fs from 'fs';

const URL = 'https://udacha.kdnfx.space/';
const DIR = '/tmp/plan10-screens2';
fs.mkdirSync(DIR, { recursive: true });

console.log('=== TEST A: Desktop view (1280x800) → popup flow ===');
{
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: 1280, height: 800 }
  });
  const page = await ctx.newPage();

  const reqs = [];
  page.on('request', r => {
    const u = r.url();
    if (u.includes('oauth.yandex.ru') || u.includes('listAuthMethods') || u.includes('auth-methods')) {
      reqs.push(r.method() + ' ' + u.substring(0, 200));
    }
  });

  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${DIR}/01-desktop-login.png`, fullPage: true });

  // Click Yandex button
  const yandexBtn = await page.$('button:has-text("Яндекс")');
  if (yandexBtn) {
    console.log('  Clicking Yandex button (desktop)...');
    await yandexBtn.click().catch(e => console.log('  click err:', e.message));

    // Wait for either: oauth.yandex.ru request OR auth-methods OR a popup
    await page.waitForTimeout(5000);
    await page.screenshot({ path: `${DIR}/02-desktop-after-yandex.png`, fullPage: true });

    console.log('  Requests captured:');
    reqs.forEach(r => console.log('    -', r));

    // If popup was opened, list pages
    const pages = ctx.pages();
    console.log('  Pages in context:', pages.length);
    if (pages.length > 1) {
      const popup = pages[1];
      console.log('  Popup URL:', popup.url());
      await popup.screenshot({ path: `${DIR}/03-popup.png` }).catch(() => {});
    }
  } else {
    console.log('  ❌ Yandex button not found');
  }

  await browser.close();
}

console.log('\n=== TEST B: Mobile view (414x896) → redirect flow ===');
{
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: 414, height: 896 }
  });
  const page = await ctx.newPage();

  const reqs = [];
  page.on('request', r => {
    const u = r.url();
    if (u.includes('oauth.yandex.ru') || u.includes('auth-methods')) {
      reqs.push(r.method() + ' ' + u.substring(0, 250));
    }
  });

  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(2000);

  // Click Yandex button — should trigger listAuthMethods then redirect
  const yandexBtn = await page.$('button:has-text("Яндекс")');
  if (yandexBtn) {
    console.log('  Clicking Yandex button (mobile)...');
    await yandexBtn.click().catch(e => console.log('  click err:', e.message));

    // Wait for navigation or requests
    await page.waitForTimeout(4000);

    try {
      await page.waitForURL(u => u.includes('oauth.yandex.ru'), { timeout: 5000 });
      console.log('  ✅ Navigated to Yandex OAuth!');
      const finalUrl = page.url();
      console.log('  URL:', finalUrl.substring(0, 200));
      const u = new URL(finalUrl);
      console.log('  client_id:', u.searchParams.get('client_id'));
      console.log('  redirect_uri:', u.searchParams.get('redirect_uri'));
      console.log('  state:', u.searchParams.get('state'));
      await page.screenshot({ path: `${DIR}/04-mobile-yandex-redirect.png`, fullPage: true });
    } catch (e) {
      console.log('  Did not navigate to Yandex in time.');
      console.log('  Current URL:', page.url());
      console.log('  Requests captured:');
      reqs.forEach(r => console.log('    -', r));
      await page.screenshot({ path: `${DIR}/04-mobile-after-click.png`, fullPage: true });
    }
  }

  await browser.close();
}

console.log('\n=== Screenshots ===');
fs.readdirSync(DIR).forEach(f => {
  const stat = fs.statSync(`${DIR}/${f}`);
  console.log(`  ${f} (${Math.round(stat.size / 1024)} KB)`);
});
console.log('\n=== DONE ===');
