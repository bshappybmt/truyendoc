/**
 * Step 1: Get all chapter URLs + thumbnail from vietmanhwa
 * Outputs to stdout:
 *   CHAPTERS:105
 *   1,https://...
 *   2,https://...
 *   ...
 *   THUMB:https://cdn.../...jpg
 */
const { chromium } = require('playwright');
const path = '/home/paws/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome';

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: path });
  const page = await browser.newPage();
  
  await page.goto('https://vietmanhwa.com/manhwa-18/nhat-ky-o-tro-khong-che', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2000));
  
  // Click Xem thêm up to 5 times
  for (let i = 0; i < 5; i++) {
    const btn = await page.$('button:has-text("Xem thêm")');
    if (!btn) break;
    await btn.click();
    await new Promise(r => setTimeout(r, 800));
  }
  await new Promise(r => setTimeout(r, 2000));
  
  // Get all chapter links
  const chapters = await page.evaluate(() => {
    const seen = new Set();
    return Array.from(document.querySelectorAll('a'))
      .map(a => ({ href: a.href, text: (a.innerText || '').trim().split('\n')[0].trim() }))
      .filter(a => {
        if (!a.text || ['Đọc từ đầu', 'Đọc mới nhất', ''].includes(a.text)) return false;
        return a.href.match(/\/(\d+)chapter-/) || a.href.match(/\/chap-?\d*$/);
      })
      .filter(a => {
        if (seen.has(a.href)) return false;
        seen.add(a.href);
        return true;
      });
  });
  
  // Extract chapter number
  chapters.forEach(c => {
    const m = c.href.match(/\/(\d+)chapter-/);
    if (m) c.num = parseInt(m[1]);
    else {
      const m2 = c.href.match(/\/chap-(\d+)\/?$/);
      if (m2) c.num = parseInt(m2[1]);
      else if (c.href.match(/\/chap\/?$/)) c.num = 999;
      else c.num = 0;
    }
  });
  
  // Sort oldest first
  chapters.sort((a, b) => a.num - b.num);
  
  // Output chapters
  console.log('CHAPTERS:' + chapters.length);
  for (const c of chapters) {
    // Get the clean slug/ID
    const parts = c.href.split('/');
    const slug = parts[parts.length - 1] || parts[parts.length - 2];
    console.log(c.num + ',' + (slug || ''));
  }
  
  // Get thumbnail from chapter 1
  const ch1 = chapters.find(c => c.num === 1);
  if (ch1) {
    try {
      await page.goto(ch1.href, { waitUntil: 'domcontentloaded', timeout: 20000 });
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
      
      if (urls.length > 0) {
        console.log('THUMB:' + urls[0]);
      }
    } catch (e) {
      console.error('Thumbnail error: ' + e.message);
    }
  }
  
  await browser.close();
})();
