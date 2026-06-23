/**
 * Step 1: Get all chapter URLs + metadata for Sứ Mệnh Người Anh
 */
const { chromium } = require('playwright');
const path = '/home/paws/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome';

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: path });
  const page = await browser.newPage();
  
  await page.goto('https://vietmanhwa.com/manhwa-18/su-menh-nguoi-anh', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise(r => setTimeout(r, 3000));
  
  // Click Xem thêm up to 10 times
  for (let i = 0; i < 10; i++) {
    const btn = await page.$('button:has-text("Xem thêm")');
    if (!btn) break;
    await btn.click();
    await new Promise(r => setTimeout(r, 800));
  }
  await new Promise(r => setTimeout(r, 2000));
  
  // Get all chapter links
  const chapters = await page.evaluate(() => {
    const seen = new Set();
    return Array.from(document.querySelectorAll('a'))
      .map(a => ({ href: a.href, text: (a.innerText || '').trim().split('\n')[0].trim() }))
      .filter(a => {
        if (!a.text || ['Đọc từ đầu', 'Đọc mới nhất', ''].includes(a.text)) return false;
        const ok = a.href.match(/chapter-\d+/) || a.href.match(/\/\d+$/) || a.href.match(/\/chap-?\d*$/);
        if (!ok) return false;
        if (seen.has(a.href)) return false;
        seen.add(a.href);
        return true;
      });
  });
  
  // Extract chapter number
  chapters.forEach(c => {
    // Try patterns: /NNchapter-XXX, /NN, /chap-NN
    const m1 = c.href.match(/\/(\d+)chapter-/);
    if (m1) c.num = parseInt(m1[1]);
    else {
      const m2 = c.href.match(/\/(\d+)$/);
      if (m2) c.num = parseInt(m2[1]);
      else {
        const m3 = c.href.match(/\/chap-(\d+)\/?$/);
        if (m3) c.num = parseInt(m3[1]);
        else c.num = 0;
      }
    }
  });
  
  chapters.sort((a, b) => a.num - b.num);
  
  const unique = [];
  const seen = new Set();
  for (const c of chapters) {
    if (!seen.has(c.num)) {
      seen.add(c.num);
      unique.push(c);
    }
  }
  
  console.log('CHAPTERS:' + unique.length);
  for (const c of unique) {
    // Clean slug from URL
    const parts = c.href.split('/');
    const slug = parts[parts.length - 1] || parts[parts.length - 2];
    console.log(c.num + ',https://vietmanhwa.com' + (new URL(c.href).pathname));
  }
  
  await browser.close();
})();
