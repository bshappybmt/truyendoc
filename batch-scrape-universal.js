/**
 * Universal chapter scraper — uses pre-extracted chapter paths from metadata
 * 
 * Usage: node batch-scrape-universal.js <slug> [startIndex] [endIndex]
 *   - Uses data/stories-meta/<slug>.json for chapter paths
 *   - startIndex/endIndex for partial scraping (0-based)
 */
const { chromium } = require('playwright');
const path = '/home/paws/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome';
const fs = require('fs');

const slug = process.argv[2];
const startIdx = parseInt(process.argv[3] || '0');
const endIdx = parseInt(process.argv[4] || '999999');

if (!slug) {
  console.error('Usage: node batch-scrape-universal.js <slug> [startIdx] [endIdx]');
  process.exit(1);
}

// Load metadata
const metaPath = `data/stories-meta/${slug}.json`;
if (!fs.existsSync(metaPath)) {
  console.error(`Metadata not found: ${metaPath}`);
  console.error('Run extract-story-metadata.js first');
  process.exit(1);
}
const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));

// Dedup chapter paths
const seen = new Set();
const chapters = [];
meta.chapters.forEach(p => {
  if (seen.has(p)) return;
  seen.add(p);
  chapters.push(p);
});

// Slice range
const slice = chapters.slice(startIdx, endIdx);
console.log(`Scraping ${slug} — ${slice.length} chapters (range ${startIdx}-${Math.min(endIdx, chapters.length)})`);
console.log(`Total chapters in story: ${chapters.length}`);

const results = [];

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: path });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  
  for (let i = 0; i < slice.length; i++) {
    const chapPath = slice[i];
    const chapterUrl = `https://vietmanhwa.com/manhwa-18/${slug}/${chapPath}`;
    const numIdx = startIdx + i;
    
    process.stdout.write(`[${numIdx + 1}/${chapters.length}] ${chapPath}... `);
    
    try {
      const page = await context.newPage();
      await page.goto(chapterUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.waitForTimeout(2000);
      
      // Extract images
      const images = await page.evaluate(() => {
        const imgs = Array.from(document.querySelectorAll('img[src*="vinahentai.cloud"]'));
        const results = [];
        imgs.forEach(img => {
          const src = img.src || '';
          if (src && src.includes('manga-images')) {
            results.push(src);
          }
        });
        return results;
      });
      
      if (images.length > 0) {
        // Scrolling for lazy images
        for (let s = 0; s < 10; s++) {
          await page.evaluate(() => {
            window.scrollBy(0, window.innerHeight);
            document.querySelectorAll('img[loading="lazy"]').forEach(i => i.loading = 'eager');
          });
          await page.waitForTimeout(100);
        }
        await page.waitForTimeout(500);
        
        // Second pass: get all images after scrolling
        const allImages = await page.evaluate(() => {
          return Array.from(document.querySelectorAll('img[src*="vinahentai.cloud/manga-images"]'))
            .map(i => i.src);
        });
        
        results.push({ chapter: chapPath, images: allImages });
        console.log(`${allImages.length} images`);
      } else {
        results.push({ chapter: chapPath, images: [] });
        console.log('0 images (failed)');
      }
      
      // Save incremental
      if (results.length % 5 === 0) {
        fs.writeFileSync(`data/stories-meta/${slug}-scrape-tmp.json`, JSON.stringify(results, null, 2));
      }
      
      await page.close();
    } catch (e) {
      console.log(`ERROR: ${e.message?.substring(0, 80)}`);
      results.push({ chapter: chapPath, images: [], error: e.message?.substring(0, 100) });
    }
  }
  
  await browser.close();
  
  // Merge with existing scraped data (don't overwrite previous batches)
  const finalPath = `data/stories-meta/${slug}-scraped.json`;
  let allResults = [];
  if (fs.existsSync(finalPath)) {
    const existing = JSON.parse(fs.readFileSync(finalPath, 'utf-8'));
    // Keep existing chapters NOT in the current batch range
    const currentPaths = new Set(results.map(r => r.chapter));
    const kept = existing.filter(r => !currentPaths.has(r.chapter));
    allResults = [...kept, ...results];
    // Restore original order from metadata
    const orderMap = {};
    chapters.forEach((p, i) => { orderMap[p] = i; });
    allResults.sort((a, b) => (orderMap[a.chapter] || 9999) - (orderMap[b.chapter] || 9999));
    console.log(`Merged: ${kept.length} existing + ${results.length} new = ${allResults.length} total`);
  } else {
    allResults = results;
  }
  
  fs.writeFileSync(finalPath, JSON.stringify(allResults, null, 2));
  console.log(`Saved ${allResults.length} chapters to ${finalPath}`);
  
  // Summary
  let totalImgs = 0;
  let failed = 0;
  allResults.forEach(r => {
    totalImgs += r.images.length;
    if (r.images.length === 0) failed++;
  });
  console.log(`Total images: ${totalImgs}, Failed: ${failed}`);
})();
