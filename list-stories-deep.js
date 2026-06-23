/**
 * Thorough story inventory on vietmanhwa.com
 * Check: homepage (scroll all), genre pages, search, sitemap
 */
const { chromium } = require('playwright');
const path = '/home/paws/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome';

async function extractStories(page, url, label) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);
  
  // Aggressive scrolling to load lazy content
  for (let i = 0; i < 50; i++) {
    await page.evaluate(() => window.scrollBy(0, window.innerHeight));
    await page.waitForTimeout(200);
  }
  
  const stories = await page.evaluate((lbl) => {
    const seen = new Set();
    const links = Array.from(document.querySelectorAll('a[href*="/manhwa-18/"]'));
    const results = [];
    
    links.forEach(a => {
      const href = a.href.split('?')[0].split('#')[0]; // clean URL
      if (seen.has(href)) return;
      seen.add(href);
      
      const title = a.innerText?.trim().split('\n')[0].trim().substring(0, 80);
      const img = a.querySelector('img');
      const imgAlt = img?.alt?.trim().substring(0, 80) || '';
      
      results.push({
        url: href,
        title: title,
        alt: imgAlt,
        slug: href.split('/').pop()
      });
    });
    
    return { source: lbl, count: results.length, items: results };
  }, label);
  
  return stories;
}

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: path });
  const page = await browser.newPage();
  
  // 1. Homepage (scrolled fully)
  let home = await extractStories(page, 'https://vietmanhwa.com', 'homepage');
  console.log(`=== HOMEPAGE: ${home.count} links ===`);
  home.items.forEach((s, i) => console.log(`${i+1}. ${s.title || s.alt || s.slug} → ${s.url}`));
  
  // 2. Check genre/category pages (if any)
  const genreLinks = await page.evaluate(() => {
    const seen = new Set();
    return Array.from(document.querySelectorAll('a[href*="the-loai"], a[href*="genre"], a[href*="category"], a[href*="danh-muc"]'))
      .map(a => a.href);
  });
  
  console.log(`\n=== GENRE/CATEGORY LINKS FOUND: ${genreLinks.length} ===`);
  genreLinks.forEach(g => console.log(g));
  
  // 3. Check pagination
  const pagination = await page.evaluate(() => {
    const seen = new Set();
    return Array.from(document.querySelectorAll('a[href*="page"], a[href*="trang"], [class*="pagination"] a, nav a'))
      .filter(a => a.href.match(/[?&]page=|trang|page\//))
      .map(a => ({ href: a.href, text: a.innerText?.substring(0, 30) }));
  });
  
  console.log(`\n=== PAGINATION: ${pagination.length} links ===`);
  pagination.forEach(p => console.log(`${p.text} → ${p.href}`));
  
  // 4. Check "xem thêm" / "trang chủ" / "danh sách" links
  if (genreLinks.length === 0) {
    console.log('\n=== No genre links found on homepage. Trying direct genre URLs... ===');
    const possibleGenres = ['the-loai/all', 'the-loai', 'category', 'list', 'truyen', 'danh-sach'];
    for (const g of possibleGenres) {
      try {
        const result = await extractStories(page, `https://vietmanhwa.com/${g}`, g);
        if (result.count > 0) {
          console.log(`\n--- ${g}: ${result.count} stories ---`);
          result.items.slice(0, 5).forEach(s => console.log(`  ${s.title || s.slug}`));
        }
      } catch(e) {}
    }
  }
  
  // 5. Try site-wide search/dump
  // Check if there's a sitemap
  console.log('\n=== CHECKING SITEMAP ===');
  try {
    const smResp = await page.goto('https://vietmanhwa.com/sitemap.xml', { timeout: 10000 });
  } catch(e) {
    console.log('No sitemap.xml');
  }
  
  await browser.close();
})();
