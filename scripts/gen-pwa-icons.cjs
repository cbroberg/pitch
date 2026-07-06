// Generates the PWA / iOS icon set from public/favicon.svg (the PV mark).
// The mark is portrait, so it's centered on a white square with padding.
// apple-touch-icon.png (180) is what makes the iOS home-screen icon correct.
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'public', 'favicon.svg');
const OUT = path.join(ROOT, 'public');
const svg = fs.readFileSync(SRC);

async function gen(size, file, { pad = 0.14, bg = { r: 255, g: 255, b: 255, alpha: 1 } } = {}) {
  const inner = Math.round(size * (1 - pad * 2));
  const mark = await sharp(svg, { density: 512 })
    .resize({ width: inner, height: inner, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: bg } })
    .composite([{ input: mark, gravity: 'center' }])
    .png()
    .toFile(path.join(OUT, file));
  console.log('wrote', file, size + 'x' + size);
}

(async () => {
  await gen(180, 'apple-touch-icon.png', { pad: 0.16 }); // iOS home screen
  await gen(192, 'icon-192.png', { pad: 0.14 });
  await gen(512, 'icon-512.png', { pad: 0.14 });
  await gen(512, 'icon-512-maskable.png', { pad: 0.22 }); // extra safe-zone for maskable
  console.log('done');
})();
