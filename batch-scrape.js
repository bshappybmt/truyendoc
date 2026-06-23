/**
 * Scrape a range of chapters from a CSV file
 * Usage: node batch-scrape.js <csv-file> <start-line> <end-line> <output>
 * CSV format: num,url
 * Output: JSON array of {number, slug, pages}
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = '/home/paws/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome';

const csvFile = process.argv[2] || '/tmp/nkot-chapters-dedup.csv';
const startLine = parseInt(process.argv[3] || '1');
const endLine = parseInt(process.argv[4] || '100');
const outFile = process.argv[5] || '/tmp/nkot-batch.json';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function loadChapterImages(browser, url) {
  const page = await browser.newPage();
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await sleep(2000);
    
    // Force load lazy images
    await page.evaluate(() => {
      document.querySelectorAll('img[loading="lazy"]').forEach(img => { img.loading = 'eager'; });
    });
    
    const imgElements = await page.$$('img.w-full, div.relative img');
    for (const img of imgElements) {
      try { await img.scrollIntoViewIfNeeded(); await sleep(30); } catch(e) {}
    }
    await sleep(2000);
    
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
    
    return urls;
  } finally {
    try { await page.close(); } catch(e) {}
  }
}

async function main() {
  // Read CSV
  const lines = fs.readFileSync(csvFile, 'utf8').split('\n').filter(l => l.trim());
  const chapters = lines.map(l => {
    const [num, url] = l.split(',', 2);
    return { num: parseInt(num), url: url };
  });
  
  const slice = chapters.slice(startLine - 1, endLine);
  console.error(`Batch: lines ${startLine}-${endLine} = ${slice.length} chapters (${slice[0]?.num}→${slice[slice.length-1]?.num})`);
  
  const results = [];
  
  const browser = await chromium.launch({ headless: true, executablePath: path });
  
  for (let i = 0; i < slice.length; i++) {
    const ch = slice[i];
    const chNum = ch.num;
    const slug = ch.url.split('/').filter(s => s).pop() || '';
    
    console.error(`[${i+1}/${slice.length}] Ch #${chNum} (${slug})...`);
    
    try {
      const urls = await loadChapterImages(browser, ch.url);
      console.error(`  → ${urls.length} images`);
      
      if (urls.length > 0) {
        results.push({
          number: chNum,
          slug: slug,
          pages: urls
        });
      }
    } catch (err) {
      console.error(`  ERROR: ${err.message.substring(0, 100)}`);
    }
  }
  
  try { await browser.close(); } catch(e) {}
  
  // Write results
  fs.writeFileSync(outFile, JSON.stringify(results, null, 2));
  console.error(`\nDone. ${results.length}/${slice.length} chapters saved to ${outFile}`);
}

main().catch(e => { console.error('FATAL: ' + e.message); process.exit(1); });
