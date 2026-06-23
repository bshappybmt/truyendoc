/**
 * Get thumbnail for SMNA from chapter 1
 */
const { chromium } = require('playwright');
const path = '/home/paws/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome';

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: path });
  const page = await browser.newPage();
  
  await page.goto('https://vietmanhwa.com/manhwa-18/su-menh-nguoi-anh/1', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await new Promise(r => setTimeout(r, 2000));
  
  await page.evaluate(() => {
    document.querySelectorAll('img[loading="lazy"]').forEach(img => { img.loading = 'eager'; });
  });
  const imgElements = await page.$$('img');
  for (const img of imgElements) {
    try { await img.scrollIntoViewIfNeeded(); await new Promise(r => setTimeout(r, 30)); } catch(e) {}
  }
  await new Promise(r => setTimeout(r, 2000));
  
  const urls = await page.evaluate(() => {
    const seen = new Set();
    return Array.from(document.querySelectorAll('img'))
      .filter(i => {
        if (!i.src || !i.src.startsWith('http')) return false;
        if (!i.src.includes('vinahentai.cloud')) return false;
        if (seen.has(i.src)) return false;
        seen.add(i.src);
        return true;
      })
      .map(i => i.src);
  });
  
  if (urls.length > 0) {
    console.log('THUMB:' + urls[0]);
  } else {
    console.log('No images found');
  }
  
  await browser.close();
})();
