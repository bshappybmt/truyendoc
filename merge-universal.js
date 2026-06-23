/**
 * Universal merge script: takes scraped data + metadata → adds to stories.json
 * 
 * Usage: node merge-universal.js <slug>
 *   - Reads: data/stories-meta/<slug>.json (metadata)
 *   - Reads: data/stories-meta/<slug>-scraped.json (chapter images)
 *   - Reads: stories.json (existing data)
 *   - Writes: stories.json (updated)
 */
const fs = require('fs');
const slug = process.argv[2];

if (!slug) { console.error('Usage: node merge-universal.js <slug>'); process.exit(1); }

// Load meta
const meta = JSON.parse(fs.readFileSync(`data/stories-meta/${slug}.json`, 'utf-8'));
const scraped = JSON.parse(fs.readFileSync(`data/stories-meta/${slug}-scraped.json`, 'utf-8'));
const existing = JSON.parse(fs.readFileSync('data/stories.json', 'utf-8'));

// Check if story already exists
const existingIdx = existing.findIndex(s => s.slug === slug);
if (existingIdx >= 0) {
  console.log(`Story "${slug}" already exists! Updating chapters...`);
}

// Build chapters array from scraped data (in page order)
// Use sequential index-based numbering for clean, reliable chapter IDs
const chapters = scraped.map((ch, i) => {
  const idx = i + 1;
  return {
    id: `chapter-${idx}`,
    number: idx,
    title: `Chapter ${idx}`,
    slug: `${idx}`,
    pages: ch.images,
    createdAt: new Date().toISOString().split('T')[0]
  };
});

// Story object
const story = {
  id: slug,
  title: meta.title,
  slug: slug,
  altTitle: meta.title,
  thumbnail: meta.thumbnail,
  description: meta.description || `${meta.title} - Truyện tranh 18+`,
  status: 'ongoing',
  views: 0,
  author: 'Không rõ',
  genres: ['Adult', 'Mature'],
  chapters: chapters,
  updatedAt: new Date().toISOString().split('T')[0],
  createdAt: new Date().toISOString().split('T')[0]
};

// Add or update
if (existingIdx >= 0) {
  existing[existingIdx] = story;
} else {
  existing.push(story);
}

fs.writeFileSync('data/stories.json', JSON.stringify(existing, null, 2));
console.log(`\n=== Merged "${meta.title}" into stories.json ===`);
console.log(`Chapters: ${chapters.length}, Total images: ${chapters.reduce((s,c) => s + c.pages.length, 0)}`);
console.log(`Total stories in DB: ${existing.length}`);
