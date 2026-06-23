/**
 * Quick test: check CDN for SMNA chapter 1
 */
const { chromium } = require('playwright');
const path = '/home/paws/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome';

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: path });
  const page = await browser.newPage();
  
  await page.goto('https://vietmanhwa.com/manhwa-18/su-menh-nguoi-anh/1', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise(r => setTimeout(r, 3000));
  
  await page.evaluate(() => {
    document.querySelectorAll('img[loading]').forEach(i => i.loading = 'eager');
  });
  
  const imgs = await page.$$('img');
  for (const img of imgs) {
    try { await img.scrollIntoViewIfNeeded(); } catch(e) {}
  }
  await new Promise(r => setTimeout(r, 2000));
  
  const urls = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('img'))
      .filter(i => i.src && i.src.startsWith('http'))
      .map(i => i.src);
  });
  
  console.log('Image count:', urls.length);
  if (urls.length > 0) {
    console.log('First:', urls[0]);
    console.log('Sample:', JSON.stringify(urls.slice(0, 3)));
    const cdnPattern = urls.some(u => u.includes('vinahentai.cloud/manga-images/'));
    console.log('Uses same CDN:', cdnPattern);
    if (!cdnPattern) {
      // Show the CDN domain
      const domains = urls.map(u => new URL(u).hostname);
      console.log('CDN domains:', [...new Set(domains)].join(', '));
    }
  }
  
  await browser.close();
})();
