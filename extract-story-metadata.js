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
        
        // Get ALL chapter links with dedup by chapter number
        // When multiple paths have the same number, prefer the shorter one
        const byNum = new Map();
        Array.from(document.querySelectorAll('a[href*="/manhwa-18/"]'))
          .forEach(a => {
            const fullHref = a.href;
            const slugPart = fullHref.split('/manhwa-18/')[1];
            if (!slugPart || !slugPart.includes('/')) return;
            const pathPart = slugPart.split('/')[1]?.split('?')[0] || '';
            if (!pathPart) return;
            
            // Decode URL-encoded characters first, then extract last number
            let decoded = pathPart;
            try { decoded = decodeURIComponent(pathPart); } catch(e) {}
            const numMatch = decoded.match(/(\d+)/g);
            const chapterNum = numMatch ? parseInt(numMatch[numMatch.length - 1]) : 0;
            
            // Prefer shorter path (less likely an alternate format like `1chapter-N` vs `chapter-N`)
            if (!byNum.has(chapterNum) || pathPart.length < byNum.get(chapterNum).path.length) {
              byNum.set(chapterNum, { path: pathPart, num: chapterNum });
            }
          });
        
        // Convert to sorted array
        const chapters = Array.from(byNum.values())
          .sort((a, b) => a.num - b.num)
          .map(c => c.path);
        
        // Filter out outliers: paths with numbers > 3x the median chapter number
        // These are usually links to related stories in the sidebar, not actual chapters
        if (chapters.length > 5) {
          const nums = chapters.map(p => {
            let d = p; try { d = decodeURIComponent(p); } catch(e) {}
            const n = (d.match(/(\d+)/g) || ['0']).slice(-1)[0];
            return parseInt(n);
          });
          nums.sort((a,b) => a-b);
          const median = nums[Math.floor(nums.length / 2)];
          const threshold = Math.max(median * 3, 200); // at least 3x median, min 200
          const filtered = chapters.filter((p, i) => nums[i] <= threshold);
          if (filtered.length !== chapters.length) {
            console.log(`  Filtered out ${chapters.length - filtered.length} outlier chapters`);
          }
          return { title, description, thumbnail, chapters: filtered, totalChapters: filtered.length };
        }
        
        return { title, description, thumbnail, chapters, totalChapters: chapters.length };
      }, slug);
      
      console.log(`Title: ${info.title}`);
      console.log(`Chapters: ${info.totalChapters}`);
      console.log(`Thumbnail: ${info.thumbnail}`);
      console.log(`Sample paths: ${info.chapters.slice(0, 3).join(', ')}`);
      
      // Save metadata
      const meta = {
        slug, url,
        title: info.title,
        description: info.description,
        thumbnail: info.thumbnail,
        totalChapters: info.totalChapters,
        chapters: info.chapters,
        urlPattern: info.chapters.length > 0 ? 
          info.chapters[0].replace(/\d+/g, '<num>') : 'unknown'
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
