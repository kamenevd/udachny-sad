const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    ignoreHTTPSErrors: true
  });
  const page = await context.newPage();
  
  try {
    console.log('Navigating to http://localhost:4173...');
    await page.goto('http://localhost:4173', { 
      waitUntil: 'domcontentloaded',
      timeout: 15000 
    });
    
    await page.waitForTimeout(3000);
    
    await page.screenshot({ path: '/tmp/udacha-current-desktop.png', fullPage: false });
    console.log('Desktop screenshot saved');
    
    const title = await page.title();
    const bodyText = await page.evaluate(() => document.body?.innerText?.substring(0, 800) || 'no body');
    console.log('Title:', title);
    console.log('Body text:', bodyText);
    
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: '/tmp/udacha-current-mobile.png', fullPage: false });
    console.log('Mobile screenshot saved');
    
  } catch (err) {
    console.error('Error:', err.message);
    await page.screenshot({ path: '/tmp/udacha-current-error.png' }).catch(() => {});
  } finally {
    await browser.close();
  }
})();
