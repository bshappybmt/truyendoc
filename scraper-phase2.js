/**
 * Step 2: Scrape images from a single chapter URL
 * Usage: node scraper-phase2.js <chapter-url>
 * Output: JSON array of image URLs to stdout
 */
const { chromium } = require('playwright');
const path = '/home/paws/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome';
const url = process.argv[2];

if (!url) { console.error('Usage: node scraper-phase2.js <url>'); process.exit(1); }

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: path });
  const page = await browser.newPage();
  
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await new Promise(r => setTimeout(r, 2000));
    
    // Force load all images
    await page.evaluate(() => {
      document.querySelectorAll('img[loading="lazy"]').forEach(img => { img.loading = 'eager'; });
    });
    
    const imgs = await page.$$('img.w-full, div.relative img');
    for (const img of imgs) {
      try { await img.scrollIntoViewIfNeeded(); await new Promise(r => setTimeout(r, 30)); } catch(e) {}
    }
    await new Promise(r => setTimeout(r, 2000));
    
    const urls = await page.evaluate(() => {
      const seen = new Set();
      return Array.from(document.querySelectorAll('img'))
        .filter(i => {
          if (!i.src || !i.src.startsWith('http')) return false;
          if (!i.src.includes('vinahentai.cloud/manga-images/')) return false;
          if (seen.has(i.src)) return false;
          seen.add(i.src);
          return true;
        })
        .map(i => i.src);
    });
    
    console.log(JSON.stringify(urls));
  } catch(e) {
    console.error('Error: ' + e.message);
    console.log(JSON.stringify([]));
  }
  
  await browser.close();
})();
