/**
 * Scraper v2 — clicks "Xem thêm" to reveal ALL chapters, then scrapes in batches
 * Usage: node scraper-v2.js <manhwa-slug> [start-chapter] [end-chapter]
 * Output: stdout = JSON, stderr = logs
 */

const { chromium } = require('playwright');
const path = '/home/paws/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome';

const MANHWA_SLUG = process.argv[2] || 'nhat-ky-o-tro-khong-che';
const START_CH = parseInt(process.argv[3] || '1');
const END_CH = parseInt(process.argv[4] || '0'); // 0 = all
const MANHWA_URL = `https://vietmanhwa.com/manhwa-18/${MANHWA_SLUG}`;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function collectChapterImages(page) {
  await page.evaluate(() => {
    document.querySelectorAll('img[loading="lazy"]').forEach(img => { img.loading = 'eager'; });
  });
  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(100);
  
  const imgElements = await page.$$('img.w-full, div.relative img');
  for (const img of imgElements) {
    try { await img.scrollIntoViewIfNeeded(); await sleep(30); } catch(e) {}
  }
  await sleep(2000);
  
  return await page.evaluate(() => {
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
}

async function main() {
  console.error('=== Scraper v2 ===');
  console.error(`Manhwa: ${MANHWA_SLUG} | Range: ${START_CH}–${END_CH || 'all'}`);
  
  // Phase 1: Get ALL chapter links (click Xem thêm)
  const browser1 = await chromium.launch({ headless: true, executablePath: path });
  const page1 = await browser1.newPage();
  await page1.goto(MANHWA_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await sleep(2000);
  
  // Click "Xem thêm" repeatedly until gone
  let moreClicks = 0;
  while (true) {
    const btn = await page1.$('button:has-text("Xem thêm")');
    if (!btn) break;
    await btn.click();
    moreClicks++;
    await sleep(500);
  }
  console.error(`Clicked "Xem thêm" ${moreClicks} times`);
  await sleep(2000);
  
  // Get all chapter links
  const allChapters = await page1.evaluate(() => {
    const seen = new Set();
    return Array.from(document.querySelectorAll('a'))
      .map(a => ({ href: a.href, text: a.innerText.trim().split('\n')[0].trim() }))
      .filter(a => {
        if (!a.text || ['Đọc từ đầu', 'Đọc mới nhất', ''].includes(a.text)) return false;
        return a.href.match(/\/\d+chapter-/) || a.href.match(/\/chap-?\d*$/);
      })
      .filter(a => {
        if (seen.has(a.href)) return false;
        seen.add(a.href);
        return true;
      });
  });
  
  console.error(`Total chapters found: ${allChapters.length}`);
  
  // Sort by number (ascending = oldest first)
  allChapters.forEach(ch => {
    const m = ch.href.match(/\/(\d+)chapter-/);
    if (m) ch.num = parseInt(m[1]);
    else {
      const m2 = ch.href.match(/\/chap-(\d+)$/);
      if (m2) ch.num = parseInt(m2[1]);
      else if (ch.href.match(/\/chap$/)) ch.num = 999;
      else ch.num = 0;
    }
  });
  allChapters.sort((a, b) => a.num - b.num);
  
  console.error(`Sorted: #${allChapters[0]?.num} → #${allChapters[allChapters.length-1]?.num}`);
  
  // Filter by range
  let toScrape = allChapters;
  if (END_CH > 0) {
    toScrape = allChapters.filter(c => c.num >= START_CH && c.num <= END_CH);
  } else if (START_CH > 1) {
    toScrape = allChapters.filter(c => c.num >= START_CH);
  }
  
  console.error(`To scrape: ${toScrape.length} chapters (#${toScrape[0]?.num} → #${toScrape[toScrape.length-1]?.num})`);
  
  await browser1.close();
  
  // Phase 2: Get thumbnail from chapter 1
  const browser2 = await chromium.launch({ headless: true, executablePath: path });
  const page2 = await browser2.newPage();
  const firstCh = allChapters[0];
  let thumbnail = '';
  try {
    await page2.goto(firstCh.href, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await sleep(2000);
    const imgs = await collectChapterImages(page2);
    if (imgs.length > 0) thumbnail = imgs[0];
    console.error(`Thumbnail: ${imgs.length} images from Ch #${firstCh.num}`);
  } catch(e) {
    console.error(`Thumbnail error: ${e.message.substring(0, 60)}`);
  }
  await browser2.close();
  
  // Phase 3: Scrape chapters in batches (restart browser every 15 chapters)
  const BATCH_SIZE = 15;
  const resultChapters = [];
  
  for (let batchStart = 0; batchStart < toScrape.length; batchStart += BATCH_SIZE) {
    const batch = toScrape.slice(batchStart, batchStart + BATCH_SIZE);
    console.error(`\n--- Batch ${Math.floor(batchStart/BATCH_SIZE)+1}/${Math.ceil(toScrape.length/BATCH_SIZE)} (ch #${batch[0].num}–#${batch[batch.length-1].num}) ---`);
    
    const browser = await chromium.launch({ headless: true, executablePath: path });
    const page = await browser.newPage();
    
    for (let i = 0; i < batch.length; i++) {
      const ch = batch[i];
      const globalIdx = batchStart + i + 1;
      console.error(`[${globalIdx}/${toScrape.length}] Ch #${ch.num}...`);
      
      try {
        await page.goto(ch.href, { waitUntil: 'domcontentloaded', timeout: 20000 });
        await sleep(1500);
        
        const imageUrls = await collectChapterImages(page);
        console.error(`  → ${imageUrls.length} images`);
        
        if (imageUrls.length > 0) {
          resultChapters.push({
            id: `${MANHWA_SLUG}-${ch.num}`,
            number: ch.num,
            title: `Chapter ${ch.num}`,
            slug: ch.href.split('/').filter(s => s).pop(),
            pages: imageUrls,
            createdAt: new Date().toISOString().split('T')[0]
          });
        }
      } catch (err) {
        console.error(`  ERROR: ${err.message.substring(0, 80)}`);
      }
    }
    
    await browser.close();
  }
  
  // Sort oldest first
  resultChapters.sort((a, b) => a.number - b.number);
  
  // Get metadata (reuse from first chapter page)
  const metaBrowser = await chromium.launch({ headless: true, executablePath: path });
  const metaPage = await metaBrowser.newPage();
  await metaPage.goto(toScrape[0]?.href || MANHWA_URL, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await sleep(2000);
  
  const meta = await metaPage.evaluate(() => {
    const text = document.body.innerText;
    const statusMatch = text.match(/Tình trạng:\s*\n?\s*(.+?)(?:\n|$)/);
    const authorMatch = text.match(/Tác giả:\s*\n?\s*(.+?)(?:\n|$)/);
    const genres = [];
    const gs = text.match(/Thể loại:\s*\n?([\s\S]*?)(?=Tổng quan:|GIỚI THIỆU)/);
    if (gs) gs[1].split('\n').forEach(g => {
      const g2 = g.trim();
      if (g2 && g2.match(/^[A-Za-zÀ-ỹ]/) && g2.length < 30) genres.push(g2);
    });
    const descMatch = text.match(/GIỚI THIỆU\s*\n([\s\S]*?)(?=DANH SÁCH CHƯƠNG|Xem thêm)/);
    return {
      status: (statusMatch ? statusMatch[1] : '').includes('hoàn') ? 'completed' : 'ongoing',
      author: authorMatch ? authorMatch[1].trim() : 'Unknown',
      genres: genres.slice(0, 5),
      description: descMatch ? descMatch[1].trim() : ''
    };
  });
  await metaBrowser.close();
  
  // Output
  const output = [{
    id: MANHWA_SLUG,
    slug: MANHWA_SLUG,
    title: 'Nhật Ký Ở Trọ',
    altTitle: 'Diary of a Boarding House',
    description: meta.description,
    thumbnail: thumbnail,
    author: meta.author,
    status: meta.status,
    genres: meta.genres.length > 0 ? meta.genres : ['Manhwa'],
    views: 5000,
    updatedAt: new Date().toISOString().split('T')[0],
    chapters: resultChapters
  }];
  
  console.log(JSON.stringify(output, null, 2));
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
