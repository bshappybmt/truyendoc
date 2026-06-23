/**
 * Resume scraper: only scrapes failed chapters (0 images) in small batches
 * Usage: node resume-scrape.js <slug> [batchSize=15]
 */
const { chromium } = require('playwright');
const path = '/home/paws/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome';
const fs = require('fs');

const slug = process.argv[2];
const BATCH = parseInt(process.argv[3] || '15');

if (!slug) { console.error('Usage: node resume-scrape.js <slug> [batchSize=15]'); process.exit(1); }

// Load existing scraped data (try final, then tmp)
let existing = [];
for (const name of [`${slug}-scraped.json`, `${slug}-scrape-tmp.json`]) {
  const p = `data/stories-meta/${name}`;
  if (fs.existsSync(p)) { existing = JSON.parse(fs.readFileSync(p, 'utf-8')); break; }
}

// Load metadata for chapter paths
const meta = JSON.parse(fs.readFileSync(`data/stories-meta/${slug}.json`, 'utf-8'));
const allPaths = meta.chapters;

console.log(`Resume: ${slug}`);
console.log(`Existing: ${existing.length}/${allPaths.length} chapters`);
console.log(`Expected total: ${allPaths.length}`);

// Build map of existing results
const existingMap = new Map();
existing.forEach(r => existingMap.set(r.chapter, r));

// Find failed chapters (0 images or missing)
const failedChapters = allPaths.filter(p => {
  const ex = existingMap.get(p);
  return !ex || ex.images.length === 0;
});

console.log(`Failed chapters: ${failedChapters.length}`);

if (failedChapters.length === 0) {
  console.log('Nothing to resume!');
  process.exit(0);
}

// Process in small batches
let batchResults = [];

(async () => {
  for (let batchStart = 0; batchStart < failedChapters.length; batchStart += BATCH) {
    const batch = failedChapters.slice(batchStart, batchStart + BATCH);
    console.log(`\n--- Batch ${Math.floor(batchStart/BATCH)+1}: ${batch[0]} → ${batch[batch.length-1]} (${batch.length} chapters) ---`);
    
    const browser = await chromium.launch({ headless: true, executablePath: path });
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    
    for (let i = 0; i < batch.length; i++) {
      const chapPath = batch[i];
      const chapterUrl = `https://vietmanhwa.com/manhwa-18/${slug}/${chapPath}`;
      process.stdout.write(`  [${i+1}/${batch.length}] ${chapPath}... `);
      
      try {
        const page = await context.newPage();
        await page.goto(chapterUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await page.waitForTimeout(2000);
        
        // Scroll for lazy images
        for (let s = 0; s < 10; s++) {
          await page.evaluate(() => window.scrollBy(0, window.innerHeight));
          await page.waitForTimeout(100);
        }
        await page.waitForTimeout(500);
        
        const images = await page.evaluate(() => {
          return Array.from(document.querySelectorAll('img[src*="vinahentai.cloud/manga-images"]'))
            .map(i => i.src);
        });
        
        batchResults.push({ chapter: chapPath, images });
        console.log(`${images.length} images`);
        await page.close();
      } catch (e) {
        console.log(`ERROR: ${e.message?.substring(0, 60)}`);
        batchResults.push({ chapter: chapPath, images: [], error: e.message?.substring(0, 100) });
      }
    }
    
    await browser.close();
    
    // Save batch progress
    const final = [...existing];
    batchResults.forEach(r => {
      const idx = final.findIndex(e => e.chapter === r.chapter);
      if (idx >= 0) final[idx] = r;
      else final.push(r);
    });
    // Add any existing good results
    existing.forEach(e => {
      if (!final.find(f => f.chapter === e.chapter)) final.push(e);
    });
    
    fs.writeFileSync(`data/stories-meta/${slug}-scraped.json`, JSON.stringify(final, null, 2));
    console.log(`Saved progress: ${final.length} chapters`);
    
    // Reset batch results for next round (they're already merged)
    batchResults = [];
    // Reload existing from file for next batch merge
    existing = JSON.parse(fs.readFileSync(`data/stories-meta/${slug}-scraped.json`, 'utf-8'));
  }
  
  // Final merge
  const results = JSON.parse(fs.readFileSync(`data/stories-meta/${slug}-scraped.json`, 'utf-8'));
  const totalImgs = results.reduce((s, r) => s + r.images.length, 0);
  const successCount = results.filter(r => r.images.length > 0).length;
  console.log(`\n=== DONE: ${slug} ===`);
  console.log(`Chapters: ${results.length}, with images: ${successCount}, total images: ${totalImgs}`);
  
  // Cleanup tmp
  try { fs.unlinkSync(`data/stories-meta/${slug}-scrape-tmp.json`); } catch(e) {}
})();
