/**
 * Check the tennis story details
 */
const { chromium } = require('playwright');
const path = '/home/paws/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome';

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: path });
  const page = await browser.newPage();
  
  await page.goto('https://vietmanhwa.com/manhwa-18/rac-roi-cua-chu-tich-cau-lac-bo-tennis', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise(r => setTimeout(r, 4000));
  
  const info = await page.evaluate(() => {
    // Title
    const titleEl = document.querySelector('h1');
    const title = titleEl ? titleEl.innerText.trim() : '';
    
    // Description
    const descEl = document.querySelector('p.text-sm, div.content p, div.description, [class*="description"]');
    const description = descEl ? descEl.innerText.substring(0, 500) : '';
    
    // Thumbnail 
    const posters = Array.from(document.querySelectorAll('img[alt*="Rắc rối"], img[alt*="rac-roi"], img.poster, img[alt*="tennis"]'));
    const thumbnail = posters.length > 0 ? posters[0].src : '';
    
    // Chapter list
    const seen = new Set();
    const chLinks = Array.from(document.querySelectorAll('a'))
      .map(a => ({ href: a.href, text: (a.innerText || '').trim().split('\n')[0].trim() }))
      .filter(a => {
        if (!a.text || ['Đọc từ đầu', 'Đọc mới nhất', ''].includes(a.text)) return false;
        const ok = a.href.match(/chapter-\d+/) || a.href.match(/\/\d+$/) || a.href.match(/\/chap-?\d*$/);
        if (!ok) return false;
        if (seen.has(a.href)) return false;
        seen.add(a.href);
        return true;
      });
    
    chLinks.forEach(c => {
      const m = c.href.match(/\/(\d+)chapter-/) || c.href.match(/\/(\d+)$/);
      c.num = m ? parseInt(m[1]) : 0;
    });
    chLinks.sort((a,b) => a.num - b.num);
    
    return { title, description: description.substring(0,300), thumbnail, chapterCount: chLinks.length, firstChapter: chLinks[0]?.href, lastChapter: chLinks[chLinks.length-1]?.href };
  });
  
  console.log('Title:', info.title);
  console.log('Description:', info.description || '(none)');
  console.log('Thumbnail:', info.thumbnail || '(none)');
  console.log('Chapters:', info.chapterCount);
  console.log('First:', info.firstChapter);
  console.log('Last:', info.lastChapter);
  
  await browser.close();
})();
