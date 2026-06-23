const { chromium } = require('playwright');
const path = '/home/paws/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome';

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: path });
  const page = await browser.newPage();
  
  // Check various path patterns
  const paths = [
    '/', '/danh-sach', '/the-loai', '/list',
    '/manhwa/', '/manhwa-18/',
    '/truyen/', '/truyen'
  ];
  
  for (const p of paths) {
    try {
      const url = `https://vietmanhwa.com${p}`;
      const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForTimeout(1500);
      
      const status = resp?.status() || 0;
      
      // Find all unique manhwa/manhwa-18 links
      const links = await page.evaluate(() => {
        const seen = new Set();
        return Array.from(document.querySelectorAll('a[href*="/manhwa"]'))
          .filter(a => {
            if (seen.has(a.href)) return false;
            seen.add(a.href);
            return true;
          })
          .map(a => a.href)
          .slice(0, 3);
      });
      
      console.log(`${status} ${p} → ${links.length > 0 ? links[0] : '(no links)'}`);
      if (links.length > 0) {
        // Count total
        const total = await page.evaluate(() => {
          const seen = new Set();
          return Array.from(document.querySelectorAll('a[href*="/manhwa"]'))
            .filter(a => { if (seen.has(a.href)) return false; seen.add(a.href); return true; })
            .length;
        });
        console.log(`   Total manhwa links: ${total}`);
      }
    } catch(e) {
      console.log(`ERR ${p}: ${e.message?.substring(0, 50)}`);
    }
  }
  
  await browser.close();
})();
