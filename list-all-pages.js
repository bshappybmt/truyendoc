/**
 * Extract ALL stories from ALL pages of vietmanhwa.com
 */
const { chromium } = require('playwright');
const browserPath = '/home/paws/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome';

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: browserPath });
  const page = await browser.newPage();
  
  await page.goto('https://vietmanhwa.com/danh-sach', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);
  
  // Find pagination
  const paginationInfo = await page.evaluate(() => {
    // Try to find any pagination elements
    const all = document.body.innerText;
    const pageMatch = all.match(/Trang\s*(\d+)\s*\/?\s*(\d+)/i);
    
    // Find page links/buttons
    const pageEls = Array.from(document.querySelectorAll('button, a, span, [class*="page"], nav a'))
      .filter(el => el.innerText?.trim().match(/^\d+$|Trang|page|>>|»|›/))
      .map(el => ({
        tag: el.tagName,
        text: el.innerText.trim().substring(0, 20),
        href: el.href || '',
        class: el.className?.substring(0, 50)
      }));
    
    return {
      pageText: pageMatch ? pageMatch[0] : null,
      totalPages: pageMatch ? parseInt(pageMatch[2]) : null,
      pageElements: pageEls.slice(0, 20)
    };
  });
  
  console.log('=== PAGINATION INFO ===');
  console.log(JSON.stringify(paginationInfo, null, 2));
  
  // Now extract stories from each page
  const allStories = new Set();
  
  for (let p = 1; p <= 14; p++) {
    console.log(`\n--- Page ${p} ---`);
    try {
      const url = p === 1 ? 'https://vietmanhwa.com/danh-sach' : `https://vietmanhwa.com/danh-sach?page=${p}`;
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(2000);
      
      // Scroll to bottom
      for (let i = 0; i < 10; i++) {
        await page.evaluate(() => window.scrollBy(0, 800));
        await page.waitForTimeout(200);
      }
      await page.waitForTimeout(1000);
      
      const stories = await page.evaluate((pg) => {
        const seen = new Set();
        return Array.from(document.querySelectorAll('a[href*="/manhwa-18/"]'))
          .filter(a => {
            if (seen.has(a.href)) return false;
            seen.add(a.href);
            return true;
          })
          .map(a => {
            const title = (a.querySelector('h2, h3, h4, .title, p')?.innerText || a.innerText || '').trim().split('\n')[0].trim().substring(0, 80);
            const img = a.querySelector('img');
            return {
              slug: a.href.split('/manhwa-18/')[1]?.split('?')[0] || '',
              title: title,
              imgAlt: img?.alt?.substring(0, 60) || ''
            };
          });
      }, p);
      
      console.log(`  Found: ${stories.length} stories`);
      
      stories.forEach(s => {
        const key = s.slug;
        if (!allStories.has(key)) {
          allStories.add(key);
          console.log(`  ${allStories.size}. ${s.title || s.imgAlt || s.slug}`);
        }
      });
    } catch(e) {
      console.log(`  ERROR on page ${p}: ${e.message.substring(0, 80)}`);
    }
  }
  
  console.log(`\n\n=== TOTAL: ${allStories.size} unique stories ===`);
  
  await browser.close();
})();
