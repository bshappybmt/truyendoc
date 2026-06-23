const fs = require('fs');

// Read existing stories.json
const stories = JSON.parse(fs.readFileSync('./data/stories.json', 'utf8'));

// Read batch scrape output
const batchFile = process.argv[2] || '/tmp/smna-all.json';
const batch = JSON.parse(fs.readFileSync(batchFile, 'utf8'));

console.log('Batch chapters loaded:', batch.length);

// Create SMNA story with ALL required fields matching NKOT
const smna = {
  title: 'Sứ Mệnh Người Anh',
  slug: 'su-menh-nguoi-anh',
  altTitle: 'Sisters Duty',
  thumbnail: 'https://cdn.vinahentai.cloud/test/story-images/poster-68e19f721d73ad33622dbfe1-w575-1770347625652-3aa9442f.webp',
  description: '',
  status: 'completed',
  views: 5000,
  author: '',
  updatedAt: '2026-06-23',
  genres: ['Manhwa', 'Adult', 'Romance', 'Drama'],
  chapters: batch.map(c => {
    const num = c.number;
    return {
      id: `su-menh-nguoi-anh-${num}`,
      number: num,
      title: `Chapter ${num}`,
      slug: String(num),
      pages: c.pages,
      createdAt: '2026-06-23'
    };
  })
};

// Check if SMNA already exists
const existingIdx = stories.findIndex(s => s.slug === 'su-menh-nguoi-anh');
if (existingIdx >= 0) {
  console.log('SMNA already exists, replacing...');
  stories[existingIdx] = smna;
} else {
  console.log('Adding SMNA as new story...');
  stories.push(smna);
}

// Validate
console.log('Total stories:', stories.length);
const smnaCheck = stories.find(s => s.slug === 'su-menh-nguoi-anh');
console.log('SMNA chapters:', smnaCheck?.chapters?.length || 0);
console.log('SMNA genres:', smnaCheck?.genres);
const totalImgs = smnaCheck?.chapters?.reduce((sum, c) => sum + (c.pages?.length || 0), 0) || 0;
console.log('Total images:', totalImgs);

// Write back
fs.writeFileSync('./data/stories.json', JSON.stringify(stories));
console.log('stories.json updated.');
