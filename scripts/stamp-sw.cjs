// Stamp public/sw.js with a unique per-build token so every deploy ships a
// byte-changed service worker. That byte-diff is what makes the browser install
// the new SW into the "waiting" state, which is how the in-app update banner
// detects a new version (F021). Runs as an npm `prebuild` step, so `next build`
// (and therefore the Docker builder, which copies /app/public afterwards) always
// picks up a fresh token.
const fs = require('fs');
const path = require('path');

const swPath = path.join(__dirname, '..', 'public', 'sw.js');
const token = Date.now().toString(36);
const src = fs
  .readFileSync(swPath, 'utf8')
  .replace(/const SW_BUILD = '[^']*';/, `const SW_BUILD = '${token}';`);
fs.writeFileSync(swPath, src);
console.log(`[stamp-sw] SW_BUILD=${token}`);
