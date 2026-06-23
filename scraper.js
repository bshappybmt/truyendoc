/**
 * Scraper for vietmanhwa.com — downloads chapter image URLs
 * Usage: node scraper.js <manhwa-slug> [chapter-count]
 * Example: node scraper.js nhat-ky-o-tro-khong-che 5
 */

const { chromium } = require('playwright');
const path = '/home/paws/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome';

const BASE = 'https://vietmanhwa.com';
const MANHWA_SLUG = process.argv[2] || 'nhat-ky-o-tro-khong-che';
const MAX_CHAPTERS = parseInt(process.argv[3] || '5');
const MANHWA_URL = `${BASE}/manhwa-18/${MANHWA_SLUG}`;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function loadAllImages(page) {
  // Scroll through entire page incrementally to trigger IntersectionObserver lazy loading
  const height = await page.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y < height; y += 400) {
    await page.evaluate(y => window.scrollTo(0, y), y);
    await sleep(80);
  }
  await sleep(2000);
  
  // Collect only real manga-content images (not posters, logos, etc.)
  const urls = await page.evaluate(() => {
    const imgs = document.querySelectorAll('img');
    const seen = new Set();
    return Array.from(imgs)
      .filter(img => {
        const src = img.src || '';
        // Only real HTTP URLs, not placeholders
        if (!src.startsWith('http')) return false;
        // Only manga images from the reader
        if (!src.includes('cdn.vinahentai.cloud/manga-images/')) return false;
        // Deduplicate
        if (seen.has(src)) return false;
        seen.add(src);
        return true;
      })
      .map(img => img.src);
  });
  
  return urls;
}

function extractChapterNum(href) {
  // Pattern: /{num}chapter-{something}
  const m = href.match(/\/(\d+)chapter-/);
  if (m) return parseInt(m[1]);
  
  // Pattern: /chap-{num}
  const m2 = href.match(/\/chap-(\d+)$/);
  if (m2) return parseInt(m2[1]);
  
  // Plain /chap (latest, no number)
  if (href.match(/\/chap$/)) return 999;
  
  return 0;
}

async function main() {
  console.error(`Scraping: ${MANHWA_URL} | Max chapters: ${MAX_CHAPTERS}`);
  
  const browser = await chromium.launch({ headless: true, executablePath: path });
  const page = await browser.newPage();
  
  // 1. Get story metadata + chapter list from manhwa page
  await page.goto(MANHWA_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await sleep(3000);
  
  const meta = await page.evaluate(() => {
    const text = document.body.innerText;
    
    // Find the real title — typically the first visible heading
    const lines = text.split('\n').filter(l => l.trim());
    const titleCandidates = [
      // Look for Nhật Ký Ở Trọ pattern
      lines.find(l => l.includes('Nhật Ký') && l.includes('Ở Trọ')),
    ];
    const title = titleCandidates.find(t => t) || MANHWA_SLUG;
    
    const statusMatch = text.match(/Tình trạng:\s*\n?\s*(.+?)(?:\n|$)/);
    const status = statusMatch ? statusMatch[1].trim() : 'ongoing';
    
    const authorMatch = text.match(/Tác giả:\s*\n?\s*(.+?)(?:\n|$)/);
    const author = authorMatch ? authorMatch[1].trim() : 'Unknown';
    
    const genres = [];
    const genreSection = text.match(/Thể loại:\s*\n?([\s\S]*?)(?=Tổng quan:|GIỚI THIỆU)/);
    if (genreSection) {
      genreSection[1].split('\n').forEach(g => {
        const g2 = g.trim();
        if (g2 && g2.match(/^[A-Za-zÀ-ỹ]/) && g2.length < 30) genres.push(g2);
      });
    }
    
    const descMatch = text.match(/GIỚI THIỆU\s*\n([\s\S]*?)(?=DANH SÁCH CHƯƠNG|Xem thêm)/);
    const description = descMatch ? descMatch[1].trim() : '';
    
    return { title, status: status.includes('hoàn') ? 'completed' : 'ongoing', author, genres: genres.slice(0, 5), description };
  });
  
  console.error('=== METADATA ===');
  console.error(JSON.stringify(meta, null, 2));
  
  // 2. Get unique chapter links
  const chapters = await page.evaluate(() => {
    const allLinks = document.querySelectorAll('a');
    const seen = new Set();
    const results = [];
    
    allLinks.forEach(a => {
      const href = a.href;
      // Must be a chapter link: contain "manhwa" and match chapter pattern
      if (!href.includes('manhwa')) return;
      const isChapter = href.match(/\/(\d+)chapter-/) || href.match(/\/chap(?:ter)?-?\d*$/);
      if (!isChapter) return;
      if (seen.has(href)) return;
      
      const label = a.innerText.trim();
      if (!label || label === 'Đọc từ đầu' || label === 'Đọc mới nhất') return;
      
      seen.add(href);
      
      // Extract chapter number from the URL path
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
    
    // Sort descending by chapter number
    results.sort((a, b) => b.num - a.num);
    return results;
  });
  
  console.error(`\nTotal unique chapters: ${chapters.length}`);
  if (chapters.length > 0) {
    console.error(`Range: ${chapters[chapters.length-1]?.num} → ${chapters[0]?.num}`);
    console.error(`Sample: ${chapters.slice(0, 5).map(c => `#${c.num}`).join(', ')}`);
  }
  
  // 3. Take recent N chapters
  const toScrape = chapters.slice(0, MAX_CHAPTERS);
  console.error(`\nScraping ${toScrape.length} chapters: ${toScrape.map(c => c.num).join(', ')}`);
  
  // Get thumbnail from first available chapter
  let thumbnail = '';
  for (const ch of chapters) {
    try {
      await page.goto(ch.href, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await sleep(2000);
      const imgs = await loadAllImages(page);
      if (imgs.length > 0) { thumbnail = imgs[0]; break; }
    } catch(e) {}
  }
  console.error(`Thumbnail: ${thumbnail.substring(0, 80)}`);
  
  // Scrape each chapter
  const resultChapters = [];
  for (let i = 0; i < toScrape.length; i++) {
    const ch = toScrape[i];
    console.error(`\n[${i+1}/${toScrape.length}] Chapter #${ch.num}...`);
    
    try {
      await page.goto(ch.href, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await sleep(2000);
      
      const imageUrls = await loadAllImages(page);
      console.error(`  Got ${imageUrls.length} manga images`);
      
      if (imageUrls.length > 0) {
        resultChapters.push({
          id: `${MANHWA_SLUG}-${ch.num}`,
          number: ch.num,
          title: `Chapter ${ch.num}`,
          slug: ch.href.split('/').pop(),
          pages: imageUrls,
          createdAt: new Date().toISOString().split('T')[0]
        });
      } else {
        console.error(`  SKIPPED (no images)`);
      }
    } catch (err) {
      console.error(`  ERROR: ${err.message.substring(0, 100)}`);
    }
  }
  
  await browser.close();
  
  // 4. Output: oldest first
  resultChapters.sort((a, b) => a.number - b.number);
  
  const output = [{
    id: MANHWA_SLUG,
    slug: MANHWA_SLUG,
    title: meta.title || 'Nhật Ký Ở Trọ',
    altTitle: 'Diary of a Boarding House',
    description: meta.description,
    thumbnail: thumbnail,
    author: meta.author,
    status: meta.status,
    genres: meta.genres.length > 0 ? meta.genres : ['Manhwa', 'Adult', 'Milf'],
    views: 5000,
    updatedAt: new Date().toISOString().split('T')[0],
    chapters: resultChapters
  }];
  
  console.log(JSON.stringify(output, null, 2));
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
