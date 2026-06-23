/**
 * Extract metadata from a single story page on vietmanhwa.com
 * Test on Huấn Luyện Viên Thể Hình
 */
const { chromium } = require('playwright');
const path = '/home/paws/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome';

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: path });
  const page = await browser.newPage();
  
  // Test: Huấn Luyện Viên Thể Hình
  const stories = [
    { id: 86, slug: 'huan-luyen-vien-the-hinh', title: 'Huấn Luyện Viên Thể Hình' }
  ];
  
  for (const story of stories) {
    const url = `https://vietmanhwa.com/manhwa-18/${story.slug}`;
    console.log(`\n=== ${story.title} ===`);
    console.log(`URL: ${url}`);
    
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(3000);
      
      const info = await page.evaluate(() => {
        const titleEl = document.querySelector('h1');
        const title = titleEl ? titleEl.innerText.trim() : '';
        
        const descEl = document.querySelector('[class*="description"], p.text-sm');
        const description = descEl ? descEl.innerText.trim() : '';
        
        // Find poster/thumbnail
        const imgs = Array.from(document.querySelectorAll('img'));
        const poster = imgs.find(i => i.className?.includes('poster') || i.alt?.includes(title.substring(0,20)));
        const thumbnail = poster?.src || imgs[3]?.src || '';
        
        // Chapter list - scroll to load
        let prevCount = 0;
        for (let s = 0; s < 5; s++) {
          window.scrollBy(0, 3000);
        }
        
        return new Promise(resolve => {
          setTimeout(() => {
            const seen = new Set();
            const chapters = Array.from(document.querySelectorAll('a'))
              .filter(a => {
                const m = a.href.match(/\/manhwa-18\/[^/]+\/./);
                if (!m) return false;
                if (seen.has(a.href)) return false;
                seen.add(a.href);
                return true;
              })
              .map(a => ({
                href: a.href,
                text: a.innerText.trim().substring(0, 100)
              }));
            
            // Determine URL pattern
            const patterns = [];
            chapters.forEach(c => {
              if (c.href.match(/chapter-\d+/)) patterns.push('chapter-<num>');
              else if (c.href.match(/\/\d+$/)) patterns.push('plain-<num>');
              else if (c.href.match(/chap-\d+/i)) patterns.push('chap-<num>');
            });
            const uniquePatterns = [...new Set(patterns)];
            
            resolve({ title, description: description.substring(0, 300), thumbnail, chapterCount: chapters.length, urlPatterns: uniquePatterns });
          }, 2000);
        });
      });
      
      console.log(`Title: ${info.title}`);
      console.log(`Description: ${(info.description || '(none)').substring(0, 200)}`);
      console.log(`Thumbnail: ${info.thumbnail}`);
      console.log(`Chapter Count: ${info.chapterCount}`);
      console.log(`URL Patterns: ${info.urlPatterns?.join(', ') || 'unknown'}`);
      
      // Get first and last chapter URLs to identify pattern
      await page.waitForTimeout(1000);
      
      const chLinks = await page.evaluate(() => {
        const seen = new Set();
        const links = Array.from(document.querySelectorAll('a[href*="/manhwa-18/"]'))
          .filter(a => {
            const m = a.href.match(/\/manhwa-18\/[^/]+\/(.+)/);
            if (!m) return false;
            if (seen.has(a.href)) return false;
            seen.add(a.href);
            return true;
          })
          .map(a => a.href.split('/').pop());
        return { first: links[0], last: links[links.length-1], all: links.slice(0, 5) };
      });
      
      console.log(`Sample URLs: ${chLinks.all?.join(', ') || 'none'}`);
      console.log(`First: ${chLinks.first}, Last: ${chLinks.last}`);
      
    } catch(e) {
      console.log(`ERROR: ${e.message}`);
    }
  }
  
  await browser.close();
})();
