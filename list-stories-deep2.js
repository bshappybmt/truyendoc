/**
 * Deep story inventory: check embedded data, API, network requests
 */
const { chromium } = require('playwright');
const path = '/home/paws/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome';

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: path });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Listen for XHR/fetch API responses
  const apiUrls = new Set();
  page.on('response', resp => {
    const url = resp.url();
    if (url.includes('/manhwa-18') || url.includes('/api/') || url.includes('/json') || url.includes('vietmanhwa')) {
      if (!url.match(/\.(js|css|png|jpg|webp|woff2?|svg)/)) {
        apiUrls.add(`${resp.status()} ${url}`);
      }
    }
  });
  
  await page.goto('https://vietmanhwa.com/danh-sach', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);
  
  // Aggressive scrolling
  for (let i = 0; i < 30; i++) {
    await page.evaluate(() => window.scrollBy(0, 800));
    await page.waitForTimeout(300);
  }
  await page.waitForTimeout(2000);
  
  // Extract ALL story links from /danh-sach
  const stories = await page.evaluate(() => {
    const seen = new Set();
    const links = Array.from(document.querySelectorAll('a'));
    const results = [];
    links.forEach(a => {
      const href = a.href;
      const m = href.match(/vietmanhwa\.com\/(manhwa[^?]+?)(\?|$)/);
      if (!m) return;
      if (seen.has(m[1])) return;
      seen.add(m[1]);
      
      const title = (a.querySelector('h2, h3, h4, .title')?.innerText || a.innerText || a.title || '').trim().substring(0, 100);
      const img = a.querySelector('img');
      
      results.push({
        slug: m[1],
        title: title,
        hasImg: !!img,
        imgAlt: img?.alt?.substring(0, 60) || ''
      });
    });
    return results;
  });
  
  console.log(`=== /danh-sach: ${stories.length} unique story links ===\n`);
  stories.forEach((s, i) => {
    console.log(`${i+1}. [${s.slug}] ${s.title || s.imgAlt || '(no title)'}`);
  });
  
  // Check inline JSON data
  const jsonData = await page.evaluate(() => {
    const results = {};
    // Check for __NEXT_DATA__ or similar
    const scripts = Array.from(document.querySelectorAll('script:not([src])'));
    scripts.forEach(s => {
      const html = s.innerHTML.substring(0, 500);
      if (html.includes('manhwa') || html.includes('story') || html.includes('chapter') || html.includes('truyen')) {
        results.id = s.id || s.className;
        results.preview = html.substring(0, 300);
      }
    });
    return results;
  });
  
  if (jsonData.preview) {
    console.log('\n=== EMBEDDED JSON/SCRIPT DATA ===');
    console.log(`ID: ${jsonData.id}`);
    console.log(`Preview: ${jsonData.preview}...`);
  }
  
  // Log API endpoints found
  console.log('\n=== API/NETWORK REQUESTS ===');
  apiUrls.forEach(u => console.log(u));
  
  await browser.close();
})();
