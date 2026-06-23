/**
 * List all stories on vietmanhwa.com with their details
 */
const { chromium } = require('playwright');
const path = '/home/paws/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome';

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: path });
  const page = await browser.newPage();
  
  await page.goto('https://vietmanhwa.com', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise(r => setTimeout(r, 4000));
  
  // Get all story cards from the homepage
  const stories = await page.evaluate(() => {
    const seen = new Set();
    const links = Array.from(document.querySelectorAll('a[href*="/manhwa-18/"]'));
    const results = [];
    
    links.forEach(a => {
      const href = a.href;
      if (seen.has(href)) return;
      seen.add(href);
      
      // Try to get title, subtitle, genre tags
      const parent = a.closest('div') || a.parentElement;
      const title = a.innerText?.trim() || '';
      // Get nearby images for alt text
      const img = a.querySelector('img');
      const imgAlt = img?.alt || '';
      
      results.push({
        url: href,
        title: title.substring(0, 100),
        alt: imgAlt?.substring(0, 100),
        slug: href.split('/').pop()
      });
    });
    
    return results;
  });
  
  console.log('=== TRUYỆN TRÊN VIETMANHWA.COM ===');
  console.log('Total:', stories.length);
  console.log('');
  
  stories.forEach((s, i) => {
    console.log(`${i+1}. ${s.title || s.alt || s.slug}`);
    console.log(`   Slug: ${s.slug}`);
    console.log(`   URL: ${s.url}`);
    console.log('');
  });
  
  // Also get genres/categories
  const genres = await page.evaluate(() => {
    const seen = new Set();
    return Array.from(document.querySelectorAll('a[href*="/the-loai/"]'))
      .filter(a => {
        if (seen.has(a.innerText)) return false;
        seen.add(a.innerText);
        return true;
      })
      .map(a => a.innerText.trim())
      .filter(Boolean);
  });
  
  console.log('=== THỂ LOẠI ===');
  console.log(genres.join(', '));
  
  await browser.close();
})();
