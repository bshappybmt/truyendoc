/**
 * Full scraper v3 — robust batch processing with browser restarts
 * Usage: node scraper-v3.js
 * Output: JSON to stdout, logs to stderr
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = '/home/paws/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome';

const MANHWA_SLUG = 'nhat-ky-o-tro-khong-che';
const BASE_URL = 'https://vietmanhwa.com/manhwa-18/' + MANHWA_SLUG;
const BATCH_SIZE = 10; // restart browser every N chapters

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function loadChapterImages(page, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await sleep(2000);
  
  // Force-load lazy images
  await page.evaluate(() => {
    document.querySelectorAll('img[loading="lazy"]').forEach(img => { img.loading = 'eager'; });
  });
  
  // Scroll each image into view
  const imgElements = await page.$$('img.w-full, div.relative img');
  for (const img of imgElements) {
    try { await img.scrollIntoViewIfNeeded(); await sleep(30); } catch(e) {}
  }
  await sleep(2000);
  
  return await page.evaluate(() => {
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
}

async function main() {
  console.error('=== Scraper v3 ===');
  
  // Phase 1: Get all chapter URLs
  const browser1 = await chromium.launch({ headless: true, executablePath: path });
  const page1 = await browser1.newPage();
  await page1.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await sleep(2000);
  
  // Click "Xem thêm"
  for (let i = 0; i < 5; i++) {
    const btn = await page1.$('button:has-text("Xem thêm")');
    if (!btn) break;
    await btn.click();
    await sleep(800);
  }
  await sleep(2000);
  
  // Get all chapter links
  const rawChapters = await page1.evaluate(() => {
    const seen = new Set();
    const base = window.location.origin;
    return Array.from(document.querySelectorAll('a'))
      .map(a => {
        const href = a.href;
        const text = (a.innerText || '').trim().split('\n')[0].trim();
        return { href, text };
      })
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
  
  // Extract number and dedup (prefer Nchapter-NN over chap-N)
  const chMap = new Map();
  for (const c of rawChapters) {
    let num = 0;
    const m = c.href.match(/\/(\d+)chapter-/);
    if (m) num = parseInt(m[1]);
    else {
      const m2 = c.href.match(/\/chap-(\d+)\/?$/);
      if (m2) num = parseInt(m2[1]);
      else if (c.href.match(/\/chap\/?$/)) num = 999;
    }
    
    // Dedup: prefer the one with "Nchapter-" format over "chap-N"
    const existing = chMap.get(num);
    if (!existing || (!existing.href.includes('chapter-') && c.href.includes('chapter-'))) {
      chMap.set(num, { num, href: c.href, slug: c.href.split('/').filter(s => s).pop() || '' });
    }
  }
  
  // Remove 999 (special latest chapter URL — same content as chapter 100)
  chMap.delete(999);
  
  // Sort by number
  const chapters = Array.from(chMap.values()).sort((a, b) => a.num - b.num);
  
  console.error(`Found ${chapters.length} unique chapters (1 → ${chapters[chapters.length-1].num})`);
  
  await browser1.close();
  
  // Get thumbnail from chapter 1 (separate browser to avoid state issues)
  let thumbnail = '';
  try {
    const tb = await chromium.launch({ headless: true, executablePath: path });
    const tp = await tb.newPage();
    const ch1 = chapters.find(c => c.num === 1);
    if (ch1) {
      const urls = await loadChapterImages(tp, ch1.href);
      if (urls.length > 0) thumbnail = urls[0];
      console.error(`Thumbnail: ${urls.length} images from Ch #1`);
    }
    await tb.close();
  } catch(e) {
    console.error('Thumbnail error: ' + e.message.substring(0, 80));
  }
  
  // Phase 2: Scrape chapters in batches
  const meta = { title: 'Nhật Ký Ở Trọ', author: '', status: 'completed', genres: ['Manhwa'], description: '' };
  const resultChapters = [];
  
  for (let batchStart = 0; batchStart < chapters.length; batchStart += BATCH_SIZE) {
    const batch = chapters.slice(batchStart, batchStart + BATCH_SIZE);
    console.error(`\n--- Batch ${Math.floor(batchStart/BATCH_SIZE)+1}/${Math.ceil(chapters.length/BATCH_SIZE)} (ch #${batch[0].num}–#${batch[batch.length-1].num}) ---`);
    
    let browser, page;
    try {
      browser = await chromium.launch({ headless: true, executablePath: path });
      page = await browser.newPage();
    } catch(e) {
      console.error('  Browser launch failed: ' + e.message);
      continue;
    }
    
    for (let i = 0; i < batch.length; i++) {
      const ch = batch[i];
      const globalIdx = batchStart + i + 1;
      console.error(`[${globalIdx}/${chapters.length}] Ch #${ch.num} (${ch.slug})...`);
      
      try {
        const imageUrls = await loadChapterImages(page, ch.href);
        console.error(`  → ${imageUrls.length} images`);
        
        if (imageUrls.length > 0) {
          resultChapters.push({
            id: `${MANHWA_SLUG}-${ch.num}`,
            number: ch.num,
            title: `Chapter ${ch.num}`,
            slug: ch.slug,
            pages: imageUrls,
            createdAt: new Date().toISOString().split('T')[0]
          });
        }
      } catch(err) {
        console.error('  ERROR: ' + err.message.substring(0, 100));
      }
    }
    
    try { await browser.close(); } catch(e) {}
  }
  
  // Sort oldest first
  resultChapters.sort((a, b) => a.number - b.number);
  
  console.error(`\n=== COMPLETE ===`);
  console.error(`Chapters scraped: ${resultChapters.length}/${chapters.length}`);
  console.error(`Total images: ${resultChapters.reduce((s, c) => s + c.pages.length, 0)}`);
  
  // Output JSON
  const output = [{
    id: MANHWA_SLUG,
    slug: MANHWA_SLUG,
    title: 'Nhật Ký Ở Trọ',
    altTitle: 'Diary of a Boarding House',
    description: meta.description,
    thumbnail: thumbnail,
    author: meta.author,
    status: meta.status,
    genres: meta.genres,
    views: 5000,
    updatedAt: new Date().toISOString().split('T')[0],
    chapters: resultChapters
  }];
  
  console.log(JSON.stringify(output, null, 2));
}

main().catch(e => { console.error('FATAL: ' + e.message); process.exit(1); });
