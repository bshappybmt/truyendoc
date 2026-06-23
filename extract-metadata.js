/**
 * Extract full metadata for ALL 419 stories from vietmanhwa.com
 * Visit each story page: title, thumbnail, description, genres, author, chapter count
 */
const { chromium } = require('playwright');
const path = '/home/paws/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome';
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: path });
  const page = await browser.newPage();
  
  // First: collect all story URLs from all 14 pages
  const allUrls = new Set();
  const allSlugs = [];
  
  for (let p = 1; p <= 14; p++) {
    const url = p === 1 ? 'https://vietmanhwa.com/danh-sach' : `https://vietmanhwa.com/danh-sach?page=${p}`;
    console.log(`Fetching page ${p}...`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);
    
    // Scroll
    for (let i = 0; i < 10; i++) {
      await page.evaluate(() => window.scrollBy(0, 800));
      await page.waitForTimeout(150);
    }
    await page.waitForTimeout(1000);
    
    const links = await page.evaluate(() => {
      const seen = new Set();
      return Array.from(document.querySelectorAll('a[href*="/manhwa-18/"]'))
        .filter(a => {
          const h = a.href;
          if (seen.has(h)) return false;
          seen.add(h);
          return true;
        })
        .map(a => ({
          url: a.href.split('?')[0],
          title: (a.innerText || '').trim().split('\n')[0].trim().substring(0, 100)
        }));
    });
    
    links.forEach(l => {
      if (!allUrls.has(l.url)) {
        allUrls.add(l.url);
        allSlugs.push({
          slug: l.url.split('/manhwa-18/')[1] || '',
          title: l.title,
          url: l.url
        });
      }
    });
    console.log(`  → ${links.length} links (total: ${allSlugs.length})`);
  }
  
  // Save raw list
  const listData = allSlugs.map((s, i) => ({
    id: i + 1,
    title: s.title,
    slug: s.slug,
    url: s.url
  }));
  
  fs.writeFileSync('/home/paws/truyendoc/data/full-list.json', JSON.stringify(listData, null, 2));
  console.log(`\n=== Saved ${listData.length} stories to full-list.json ===`);
  
  // Now extract metadata for each story (limit to avoid timeouts)
  // We'll do it in batches
  const metadata = [];
  const BATCH_SIZE = 10;
  let fitnessRelated = [];
  
  for (let i = 0; i < allSlugs.length; i++) {
    const s = allSlugs[i];
    console.log(`\n[${i+1}/${allSlugs.length}] ${s.title}`);
    
    try {
      await page.goto(s.url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.waitForTimeout(1500);
      
      const info = await page.evaluate(() => {
        const titleEl = document.querySelector('h1');
        const title = titleEl ? titleEl.innerText.trim() : '';
        
        const descEl = document.querySelector('[class*="description"], p.text-sm, .content p');
        const description = descEl ? descEl.innerText.trim().substring(0, 500) : '';
        
        const posters = Array.from(document.querySelectorAll('img[class*="poster"], img[alt*="' + (title || '') + '"], img:not([alt=""])'));
        const thumbnail = posters.length > 0 ? posters[0].src : '';
        
        // Chapter list
        const seen = new Set();
        const chapters = Array.from(document.querySelectorAll('a'))
          .filter(a => {
            const m = a.href.match(/\/manhwa-18\/[^/]+\/(\d+)/) || a.href.match(/\/manhwa-18\/[^/]+\/chap-/);
            if (!m) return false;
            if (seen.has(a.href)) return false;
            seen.add(a.href);
            return true;
          })
          .map(a => ({ href: a.href, text: a.innerText.trim().substring(0, 80) }));
        
        // Genre tags
        const genres = Array.from(document.querySelectorAll('a[href*="the-loai"], [class*="genre"] a, [class*="tag"] a, [class*="category"] a'))
          .map(a => a.innerText.trim())
          .filter(Boolean);
        
        return { title, description: description.substring(0, 300), thumbnail, chapterCount: chapters.length, genres: genres.slice(0, 10) };
      });
      
      metadata.push({ index: i+1, title: s.title, slug: s.slug, ...info });
      
      // Check fitness keywords
      const keywords = ['fitness', 'exercise', 'yoga', 'thể hình', 'thể dục', 'thể thao', 'thể chất', 'bóng đá', 'bóng chuyền', 'tennis', 'cầu lông'];
      const allText = (s.title + ' ' + (info.title || '') + ' ' + (info.description || '') + ' ' + (info.genres || []).join(' ')).toLowerCase();
      const matched = keywords.filter(k => allText.includes(k));
      if (matched.length > 0) {
        fitnessRelated.push({ id: i+1, title: s.title, slug: s.slug, matched, chapterCount: info.chapterCount });
        console.log(`  🏃 FITNESS: ${matched.join(', ')}`);
      }
      
      console.log(`  Chapters: ${info.chapterCount}, Genres: ${info.genres?.join(', ') || 'none'}`);
      
    } catch(e) {
      console.log(`  ERROR: ${e.message?.substring(0, 80)}`);
      metadata.push({ index: i+1, title: s.title, slug: s.slug, error: e.message?.substring(0, 100) });
    }
    
    // Save checkpoint every 10
    if ((i+1) % 10 === 0) {
      fs.writeFileSync('/home/paws/truyendoc/data/metadata-checkpoint.json', JSON.stringify(metadata, null, 2));
      console.log(`  Checkpoint saved (${metadata.length} stories)`);
    }
  }
  
  fs.writeFileSync('/home/paws/truyendoc/data/all-metadata.json', JSON.stringify(metadata, null, 2));
  fs.writeFileSync('/home/paws/truyendoc/data/fitness-stories.json', JSON.stringify(fitnessRelated, null, 2));
  
  console.log(`\n\n=== COMPLETE ===`);
  console.log(`Total stories: ${metadata.length}`);
  console.log(`Fitness-related: ${fitnessRelated.length}`);
  console.log(`\n=== FITNESS STORIES ===`);
  fitnessRelated.forEach(f => console.log(`${f.id}. ${f.title} (${f.chapterCount} ch) - ${f.matched.join(', ')}`));
  
  await browser.close();
})();
