/**
 * Debug: check what links are on the Sứ Mệnh Người Anh page
 */
const { chromium } = require('playwright');
const path = '/home/paws/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome';

async function main() {
  const browser = await chromium.launch({ headless: true, executablePath: path });
  const page = await browser.newPage();
  
  await page.goto('https://vietmanhwa.com/manhwa-18/su-menh-nguoi-anh', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise(r => setTimeout(r, 4000));
  
  // Click Xem thêm many times
  for (let i = 0; i < 10; i++) {
    const btn = await page.$('button:has-text("Xem thêm")');
    if (!btn) { console.log('No more Xem thêm at iteration', i); break; }
    try { await btn.click(); await new Promise(r => setTimeout(r, 1000)); } catch(e) { console.log('Click error:', e.message); break; }
  }
  
  await new Promise(r => setTimeout(r, 2000));
  
  // Dump all page text around links
  const info = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a')).map(a => ({
      href: a.href,
      text: (a.innerText || '').substring(0, 80),
      classes: a.className?.substring(0, 60) || ''
    }));
    // Get the visible chapter sections
    const chSections = Array.from(document.querySelectorAll('a[href*="manhwa-18/su-menh"]')).map(a => ({
      href: a.href,
      text: (a.innerText || '').substring(0, 80)
    }));
    return {
      totalLinks: links.length,
      manhwaLinks: chSections,
      pageTitle: document.title,
      hasChapterLinks: links.some(l => l.href.includes('chapter')),
    };
  });
  
  console.log('Title:', info.pageTitle);
  console.log('Total links:', info.totalLinks);
  console.log('Has chapter links:', info.hasChapterLinks);
  console.log('Manhwa links:', info.manhwaLinks.length);
  info.manhwaLinks.forEach(l => console.log(' ', l.href, '|', l.text));
  
  await browser.close();
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });
