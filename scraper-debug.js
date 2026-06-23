const { chromium } = require('playwright');
const path = '/home/paws/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome';

(async () => {
  console.error('=== Phase 1: Get all chapters ===');
  
  const browser = await chromium.launch({ headless: true, executablePath: path });
  const page = await browser.newPage();
  
  await page.goto('https://vietmanhwa.com/manhwa-18/nhat-ky-o-tro-khong-che', { 
    waitUntil: 'domcontentloaded', timeout: 30000 
  });
  await new Promise(r => setTimeout(r, 2000));
  
  for (let i = 0; i < 5; i++) {
    const btn = await page.$("button:has-text('Xem thêm'), button:has-text('xem thêm')");
    if (!btn) break;
    await btn.click();
    await new Promise(r => setTimeout(r, 800));
    console.error('Clicked Xem thêm #' + (i+1));
  }
  
  await new Promise(r => setTimeout(r, 2000));
  
  const allChapters = await page.evaluate(() => {
    const seen = new Set();
    return Array.from(document.querySelectorAll('a'))
      .map(a => ({ href: a.href, text: a.innerText.trim().split('\n')[0].trim() }))
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
  
  console.error('Total: ' + allChapters.length);
  console.error('First URL: ' + allChapters[0].href);
  console.error('Last URL: ' + allChapters[allChapters.length - 1].href);
  
  await browser.close();
  
  // Phase 2: Try to fetch chapter 1
  console.error('\n=== Phase 2: Thumbnail ===');
  const browser2 = await chromium.launch({ headless: true, executablePath: path });
  const page2 = await browser2.newPage();
  
  const ch1 = allChapters.find(c => c.href.match(/1chapter-/));
  console.error('Chapter 1 URL: ' + (ch1 ? ch1.href : 'NOT FOUND'));
  
  try {
    await page2.goto(ch1.href, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await new Promise(r => setTimeout(r, 2000));
    console.error('Page loaded, trying to collect images...');
    
    await page2.evaluate(() => {
      document.querySelectorAll('img[loading="lazy"]').forEach(img => { img.loading = 'eager'; });
    });
    
    const imgs = await page2.$$('img.w-full, div.relative img');
    console.error('Found ' + imgs.length + ' img elements');
    
    for (const img of imgs) {
      try { await img.scrollIntoViewIfNeeded(); await new Promise(r => setTimeout(r, 30)); } catch(e) {}
    }
    await new Promise(r => setTimeout(r, 2000));
    
    const urls = await page2.evaluate(() => {
      const seen = new Set();
      return Array.from(document.querySelectorAll('img'))
        .filter(img => {
          const src = img.src || '';
          if (!src.startsWith('http')) return false;
          if (!src.includes('vinahentai.cloud/manga-images/')) return false;
          if (seen.has(src)) return false;
          seen.add(src);
          return true;
        })
        .map(img => img.src);
    });
    
    console.error('Collected ' + urls.length + ' image URLs');
    if (urls.length > 0) console.error('First URL: ' + urls[0]);
    
  } catch(e) {
    console.error('ERROR in Phase 2: ' + e.message);
  }
  
  await browser2.close();
  console.error('DONE');
})();
