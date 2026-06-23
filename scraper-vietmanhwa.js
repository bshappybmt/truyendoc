/**
 * Scraper for vietmanhwa.com — downloads chapter image URLs
 * Usage: node scraper-vietmanhwa.js <manhwa-slug> [chapter-count]
 * Example: node scraper-vietmanhwa.js nhat-ky-o-tro-khong-che 5
 * Outputs JSON to stdout (stderr for logs)
 */

const { chromium } = require('playwright');
const path = '/home/paws/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome';

const MANHWA_SLUG = process.argv[2] || 'nhat-ky-o-tro-khong-che';
const MAX_CHAPTERS = parseInt(process.argv[3] || '5');
const MANHWA_URL = `https://vietmanhwa.com/manhwa-18/${MANHWA_SLUG}`;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

/**
 * Force-load all lazy images on a chapter page by:
 * 1. Removing loading="lazy" attribute
 * 2. Scrolling each image into view
 * 3. Waiting for them to load
 */
async function collectChapterImages(page) {
  // Remove lazy loading on all images
  await page.evaluate(() => {
    document.querySelectorAll('img[loading="lazy"]').forEach(img => { img.loading = 'eager'; });
  });
  
  // Get all image elements in the reader
  const imgElements = await page.$$('div.relative img, div.flex.flex-col img[src*="data:"], div.flex.flex-col img.w-full');
  
  // Scroll each into view to trigger loading
  for (const img of imgElements) {
    try {
      await img.scrollIntoViewIfNeeded();
      await sleep(50);
    } catch(e) {}
  }
  await sleep(2000);
  
  // Collect all real manga image URLs
  const urls = await page.evaluate(() => {
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
  
  return urls;
}

async function main() {
  console.error(`Scraping: ${MANHWA_URL} | Max chapters: ${MAX_CHAPTERS}`);
  
  const browser = await chromium.launch({ headless: true, executablePath: path });
  const page = await browser.newPage();
  
  // 1. Get story metadata + chapter list
  await page.goto(MANHWA_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await sleep(3000);
  
  const meta = await page.evaluate(() => {
    const text = document.body.innerText;
    const lines = text.split('\n').filter(l => l.trim());
    const title = lines.find(l => l.includes('Nhật Ký') || l.includes('Ở Trọ'))
      || lines[1] || MANHWA_SLUG;
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
      title: title.replace('(Không Che)', '').trim(),
      status: (statusMatch ? statusMatch[1] : '').includes('hoàn') ? 'completed' : 'ongoing',
      author: authorMatch ? authorMatch[1].trim() : 'Unknown',
      genres: genres.slice(0, 5),
      description: descMatch ? descMatch[1].trim() : ''
    };
  });
  
  console.error('Title:', meta.title);
  
  // 2. Get unique chapter links
  const chapters = await page.evaluate(() => {
    const allLinks = document.querySelectorAll('a');
    const seen = new Set();
    const results = [];
    allLinks.forEach(a => {
      const href = a.href;
      if (!href.includes('manhwa')) return;
      if (!href.match(/\/(\d+)chapter-/) && !href.match(/\/chap(?:ter)?-?\d*$/)) return;
      if (seen.has(href)) return;
      const label = a.innerText.trim();
      if (!label || label === 'Đọc từ đầu' || label === 'Đọc mới nhất') return;
      seen.add(href);
      
      let num = 0;
      const m1 = href.match(/\/(\d+)chapter-/);
      if (m1) num = parseInt(m1[1]);
      else {
        const m2 = href.match(/\/chap-(\d+)$/);
        if (m2) num = parseInt(m2[1]);
        else if (href.match(/\/chap$/)) num = 999;
      }
      results.push({ num, href });
    });
    results.sort((a, b) => b.num - a.num);
    return results;
  });
  
  console.error(`Chapters: ${chapters.length} (${chapters[chapters.length-1]?.num} → ${chapters[0]?.num})`);
  
  // 3. Take most recent N (skip 999 which is "chap" without number)
  let toScrape = chapters.filter(c => c.num !== 999).slice(0, MAX_CHAPTERS);
  // If not enough, include 999
  if (toScrape.length < MAX_CHAPTERS) {
    const extra = chapters.filter(c => c.num === 999);
    toScrape = toScrape.concat(extra).slice(0, MAX_CHAPTERS);
  }
  console.error(`Scraping: ${toScrape.map(c => `#${c.num}`).join(', ')}`);
  
  // Get thumbnail from chapter 1 (oldest)  
  const firstCh = chapters[chapters.length - 1];
  let thumbnail = '';
  try {
    await page.goto(firstCh.href, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await sleep(2000);
    const imgs = await collectChapterImages(page);
    if (imgs.length > 0) thumbnail = imgs[0];
    console.error(`Thumbnail: OK (${imgs.length} images)`);
  } catch(e) {}
  
  // Scrape each chapter
  const resultChapters = [];
  for (let i = 0; i < toScrape.length; i++) {
    const ch = toScrape[i];
    console.error(`\n[${i+1}/${toScrape.length}] Ch #${ch.num}...`);
    
    try {
      await page.goto(ch.href, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await sleep(2000);
      
      const imageUrls = await collectChapterImages(page);
      console.error(`  → ${imageUrls.length} images`);
      
      if (imageUrls.length > 0) {
        resultChapters.push({
          id: `${MANHWA_SLUG}-${ch.num}`,
          number: ch.num,
          title: `Chapter ${ch.num}`,
          slug: ch.href.split('/').pop(),
          pages: imageUrls,
          createdAt: new Date().toISOString().split('T')[0]
        });
      }
    } catch (err) {
      console.error(`  ERROR: ${err.message.substring(0, 80)}`);
    }
  }
  
  await browser.close();
  
  // Sort oldest first for display
  resultChapters.sort((a, b) => a.number - b.number);
  
  // Output final JSON
  const output = [{
    id: MANHWA_SLUG,
    slug: MANHWA_SLUG,
    title: meta.title || 'Nhật Ký Ở Trọ',
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
