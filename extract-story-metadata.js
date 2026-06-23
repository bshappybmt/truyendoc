/**
 * Extract metadata + chapter URLs for specific stories (fitness first)
 * Usage: node extract-story-metadata.js <slug1> <slug2> ...
 * Saves to data/stories-meta/<slug>.json
 */
const { chromium } = require('playwright');
const path = '/home/paws/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome';
const fs = require('fs');

const slugs = process.argv.slice(2);
if (slugs.length === 0) {
  console.error('Usage: node extract-story-metadata.js <slug1> <slug2> ...');
  process.exit(1);
}

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: path });
  const page = await browser.newPage();
  
  fs.mkdirSync('data/stories-meta', { recursive: true });
  
  for (const slug of slugs) {
    const url = `https://vietmanhwa.com/manhwa-18/${slug}`;
    console.log(`\n=== ${slug} ===`);
    
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(3000);
      
      // Scroll to load lazy chapters
      for (let s = 0; s < 10; s++) {
        await page.evaluate(() => window.scrollBy(0, 3000));
        await page.waitForTimeout(200);
      }
      await page.waitForTimeout(1000);
      
      const info = await page.evaluate((s) => {
        const titleEl = document.querySelector('h1');
        const title = titleEl ? titleEl.innerText.trim() : s;
        
        const descEl = document.querySelector('[class*="description"] p, p.text-sm, .content p, p');
        const description = descEl ? descEl.innerText.trim().substring(0, 500) : '';
        
        // Find best poster image
        const imgs = Array.from(document.querySelectorAll('img'));
        const poster = imgs.find(i => i.className?.includes('poster') || (i.alt && title && i.alt.includes(title.substring(0,10))));
        const thumbnail = poster?.src || imgs[3]?.src || '';
        
        // Get ALL chapter links with dedup
        const seen = new Map();
        const chapters = [];
        Array.from(document.querySelectorAll('a[href*="/manhwa-18/"]'))
          .forEach(a => {
            const fullHref = a.href;
            const slugPart = fullHref.split('/manhwa-18/')[1];
            if (!slugPart || !slugPart.includes('/')) return;
            const pathPart = slugPart.split('/')[1]?.split('?')[0] || '';
            if (!pathPart) return;
            
            const key = pathPart;
            if (seen.has(key)) return;
            seen.set(key, true);
            
            const numMatch = pathPart.match(/(\d+)/);
            const num = numMatch ? parseInt(numMatch[1]) : 0;
            
            chapters.push({
              path: pathPart,
              num: num,
              text: a.innerText.trim().substring(0, 100)
            });
          });
        
        // Sort by number
        chapters.sort((a, b) => a.num - b.num);
        
        return { title, description, thumbnail, chapters, totalChapters: chapters.length };
      }, slug);
      
      console.log(`Title: ${info.title}`);
      console.log(`Chapters: ${info.totalChapters}`);
      console.log(`Thumbnail: ${info.thumbnail}`);
      console.log(`Sample paths: ${info.chapters.slice(0, 3).map(c => c.path).join(', ')}`);
      
      // Save metadata
      const meta = {
        slug, url,
        title: info.title,
        description: info.description,
        thumbnail: info.thumbnail,
        totalChapters: info.totalChapters,
        chapters: info.chapters.map(c => c.path),
        chapterNums: info.chapters.map(c => c.num),
        urlPattern: info.chapters.length > 0 ? 
          info.chapters[0].path.replace(/\d+/g, '<num>') : 'unknown'
      };
      
      fs.writeFileSync(`data/stories-meta/${slug}.json`, JSON.stringify(meta, null, 2));
      console.log(`Saved: data/stories-meta/${slug}.json`);
      
    } catch(e) {
      console.log(`ERROR: ${e.message?.substring(0, 100)}`);
    }
  }
  
  await browser.close();
  console.log('\n=== DONE ===');
})();
