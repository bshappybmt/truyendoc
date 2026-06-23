/**
 * Get SMNA story metadata: thumbnail, description from the detail page
 */
const { chromium } = require('playwright');
const path = '/home/paws/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome';

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: path });
  const page = await browser.newPage();
  
  await page.goto('https://vietmanhwa.com/manhwa-18/su-menh-nguoi-anh', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise(r => setTimeout(r, 4000));
  
  const meta = await page.evaluate(() => {
    // Try to find the thumbnail image
    const posters = Array.from(document.querySelectorAll('img[alt*=\"Sứ Mệnh\"], img.poster, img[alt*=\"su-menh\"]'));
    const thumbnail = posters.length > 0 ? posters[0].src : '';
    
    // Try to find description
    const descEl = document.querySelector('p.text-sm, div.content p, div.description');
    const description = descEl ? descEl.innerText.substring(0, 500) : '';
    
    // Get title
    const titleEl = document.querySelector('h1');
    const title = titleEl ? titleEl.innerText.trim() : 'Sứ Mệnh Người Anh';
    
    return { thumbnail, description, title };
  });
  
  console.log('TITLE:', meta.title);
  console.log('THUMB:', meta.thumbnail || '(not found)');
  console.log('DESC:', meta.description || '(not found)');
  
  // Also get the first chapter thumbnail as fallback
  if (!meta.thumbnail) {
    console.log('Trying to get image from chapter page...');
    await page.goto('https://vietmanhwa.com/manhwa-18/su-menh-nguoi-anh/1', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await new Promise(r => setTimeout(r, 2000));
    const imgs = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('img'))
        .filter(i => i.src && i.src.includes('vinahentai'))
        .map(i => i.src);
    });
    if (imgs.length > 0) {
      console.log('THUMB(FALLBACK):', imgs[0]);
    }
  }
  
  await browser.close();
})();
