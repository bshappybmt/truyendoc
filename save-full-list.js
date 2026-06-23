/**
 * Quick save of all 419 story URLs + slugs to JSON
 */
const { chromium } = require('playwright');
const path = '/home/paws/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome';
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: path });
  const page = await browser.newPage();
  const allStories = [];
  const seen = new Set();
  
  for (let p = 1; p <= 14; p++) {
    const url = p === 1 ? 'https://vietmanhwa.com/danh-sach' : `https://vietmanhwa.com/danh-sach?page=${p}`;
    console.log(`Page ${p}...`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);
    for (let i = 0; i < 10; i++) {
      await page.evaluate(() => window.scrollBy(0, 800));
      await page.waitForTimeout(100);
    }
    await page.waitForTimeout(1000);
    
    const items = await page.evaluate(() => {
      const s = new Set();
      return Array.from(document.querySelectorAll('a[href*="/manhwa-18/"]'))
        .filter(a => {
          const h = a.href; if (s.has(h)) return false; s.add(h); return true;
        })
        .map(a => {
          const slug = a.href.split('/manhwa-18/')[1]?.split('?')[0] || '';
          const title = (a.innerText || a.title || '').trim().split('\n')[0].trim().substring(0, 120);
          const img = a.querySelector('img');
          return { slug, title, thumbnail: img?.src || '' };
        });
    });
    
    items.forEach(item => {
      if (!seen.has(item.slug)) {
        seen.add(item.slug);
        allStories.push(item);
      }
    });
    console.log(`  → ${items.length} links (cumulative: ${allStories.length})`);
  }
  
  const list = allStories.map((s, i) => ({ id: i + 1, title: s.title, slug: s.slug, thumbnail: s.thumbnail }));
  fs.writeFileSync('/home/paws/truyendoc/data/full-list.json', JSON.stringify(list, null, 2));
  
  // Also save checklist CSV
  const csv = 'ID,Title,Slug,Thumbnail,Status\n' + 
    list.map(s => `${s.id},"${s.title.replace(/"/g,'""')}",${s.slug},${s.thumbnail || ''},pending`).join('\n');
  fs.writeFileSync('/home/paws/truyendoc/data/full-checklist.csv', csv);
  
  console.log(`\n=== SAVED ${list.length} stories ===`);
  console.log('JSON: /home/paws/truyendoc/data/full-list.json');
  console.log('CSV: /home/paws/truyendoc/data/full-checklist.csv');
  
  await browser.close();
})();
