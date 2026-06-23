const { chromium } = require('playwright');
const path = '/home/paws/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome';

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: path });
  const page = await browser.newPage();
  
  await page.goto('https://vietmanhwa.com/manhwa-18/nhat-ky-o-tro-khong-che/1chapter-1', { 
    waitUntil: 'domcontentloaded', timeout: 20000 
  });
  await new Promise(r => setTimeout(r, 2000));
  
  // Remove lazy loading
  const count = await page.evaluate(() => {
    const imgs = document.querySelectorAll('img[loading="lazy"]');
    imgs.forEach(img => { img.loading = 'eager'; });
    return imgs.length;
  });
  console.log('Set', count, 'images to eager');
  
  // Scroll each image into view
  const imgs = await page.$$('img.w-full');
  console.log('Total img elements:', imgs.length);
  
  for (let i = 0; i < imgs.length; i++) {
    try {
      await imgs[i].scrollIntoViewIfNeeded();
      await new Promise(r => setTimeout(r, 80));
    } catch(e) {}
  }
  await new Promise(r => setTimeout(r, 3000));
  
  // Collect results
  const result = await page.evaluate(() => {
    const imgs = document.querySelectorAll('img.w-full');
    let loaded = 0;
    let placeholder = 0;
    const urls = [];
    imgs.forEach(img => {
      if (img.src && img.src.startsWith('http') && img.naturalWidth > 1) {
        loaded++;
        urls.push(img.src);
      } else if (img.src && img.src.startsWith('data:')) {
        placeholder++;
      }
    });
    return { total: imgs.length, loaded, placeholder, urls: urls.slice(0, 3) };
  });
  
  console.log('Result:', JSON.stringify(result, null, 2));
  
  await browser.close();
})();
