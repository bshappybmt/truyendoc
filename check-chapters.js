/**
 * Quick check: chapter counts for both stories
 */
const { chromium } = require('playwright');
const path = '/home/paws/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome';

async function getChapters(slug) {
  const url = 'https://vietmanhwa.com/manhwa-18/' + slug;
  const browser = await chromium.launch({ headless: true, executablePath: path });
  const page = await browser.newPage();
  
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise(r => setTimeout(r, 3000));
  
  // Click Xem thêm up to 5 times
  for (let i = 0; i < 5; i++) {
    const btn = await page.$('button:has-text("Xem thêm")');
    if (!btn) break;
    await btn.click();
    await new Promise(r => setTimeout(r, 800));
  }
  await new Promise(r => setTimeout(r, 2000));
  
  const result = await page.evaluate(() => {
    const seen = new Set();
    return Array.from(document.querySelectorAll('a'))
      .map(a => ({ href: a.href, text: (a.innerText || '').trim().split('\n')[0].trim() }))
      .filter(a => {
        if (!a.text || ['Đọc từ đầu', 'Đọc mới nhất', ''].includes(a.text)) return false;
        // Accept any chapter-like path
        const ok = a.href.match(/chapter-\d+/) || a.href.match(/\/chap-?\d*$/);
        if (!ok) return false;
        if (seen.has(a.href)) return false;
        seen.add(a.href);
        return true;
      });
  });
  
  result.forEach(c => {
    const m = c.href.match(/chapter-(\d+)/);
    if (m) c.num = parseInt(m[1]);
    else {
      const m2 = c.href.match(/\/chap-?(\d+)?\/?$/);
      if (m2 && m2[1]) c.num = parseInt(m2[1]);
      else c.num = 0;
    }
  });
  result.sort((a, b) => a.num - b.num);
  
  const nums = result.map(r => r.num);
  const uniqueNums = [...new Set(nums)];
  
  console.log(`\n=== ${slug} ===`);
  console.log(`Total unique: ${uniqueNums.length}`);
  if (uniqueNums.length > 0) {
    console.log(`Range: ${uniqueNums[0]} → ${uniqueNums[uniqueNums.length-1]}`);
    // Check for gaps
    const gaps = [];
    for (let i = uniqueNums[0]; i <= uniqueNums[uniqueNums.length-1]; i++) {
      if (!uniqueNums.includes(i)) gaps.push(i);
    }
    if (gaps.length > 0) console.log(`Gaps: ${gaps.slice(0,10).join(', ')}${gaps.length > 10 ? '...' : ''}`);
    else console.log('No gaps (continuous)');
    // Show last 5
    console.log(`Last 5: ${uniqueNums.slice(-5).join(', ')}`);
  }
  
  await browser.close();
}

(async () => {
  await getChapters('nhat-ky-o-tro-khong-che');
  await getChapters('su-menh-nguoi-anh');
})();
