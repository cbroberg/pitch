#!/usr/bin/env node
/**
 * Syncs published pitches from the Pitch Vault down to the local `pitches/` dir.
 *
 * For every published pitch in the vault it ensures a local copy exists at
 * `pitches/<slug>/<slug>.html`. By default only MISSING pitches are downloaded;
 * existing ones are left untouched. Use --force to re-download every pitch and
 * report which ones actually changed in the vault.
 *
 * Dedup is by directory existence — a pitch counts as "already local" when its
 * `<slug>/` dir exists. A few legacy dirs were hand-named differently from their
 * slug; the ALIAS map below maps slug -> existing dir so they aren't re-fetched.
 *
 * Usage:
 *   npm run sync            # download only new pitches
 *   npm run sync -- --force # re-download all, report changed
 *
 * Auth: reads PITCH_API_KEY from env, falls back to the read-only vault key.
 */
import fs from 'fs';
import path from 'path';

const API_BASE = process.env.PITCH_API_BASE || 'https://pitch.broberg.dk/api/v1';
const API_KEY = process.env.PITCH_API_KEY || 'WVJsQfzssKUCFbWQxY3uXRV92uODz6w3';
const PITCHES_DIR = path.join(process.cwd(), 'pitches');
const FORCE = process.argv.includes('--force');

// Legacy dirs hand-named differently from their slug: slug -> existing dir name.
const ALIAS = {
  'demo-pr-sentation-af-webhouse-cms': 'demo-praesentation-webhouse-cms',
  'fysiodk-aalborg': 'fysiodk-aalborg-driftsaftale',
  'kymi-rens-digital-transformation-pitch': 'kymi-rens-digital-transformation',
};

const headers = { 'x-api-key': API_KEY };

// Resolve which html file inside a dir is the pitch entry point.
function resolveHtmlFile(dir, slug) {
  const candidates = [`${slug}.html`, 'index.html'];
  for (const c of candidates) {
    if (fs.existsSync(path.join(dir, c))) return c;
  }
  const html = fs.readdirSync(dir).find((f) => f.endsWith('.html'));
  return html || `${slug}.html`;
}

async function fetchJson(url) {
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return res.json();
}

async function run() {
  if (!fs.existsSync(PITCHES_DIR)) {
    console.error(`No pitches/ dir at ${PITCHES_DIR} — run from the repo root.`);
    process.exit(1);
  }

  console.log(`Syncing from ${API_BASE}  (mode: ${FORCE ? 'FORCE refresh' : 'missing only'})\n`);

  const { pitches } = await fetchJson(`${API_BASE}/pitches`);
  const published = pitches.filter((p) => p.isPublished);

  let added = 0;
  let updated = 0;
  let skipped = 0;

  for (const p of published) {
    const dirName = ALIAS[p.slug] || p.slug;
    const dir = path.join(PITCHES_DIR, dirName);
    const exists = fs.existsSync(dir);

    if (exists && !FORCE) {
      skipped++;
      continue;
    }

    const { html } = await fetchJson(`${API_BASE}/pitches/${p.id}/content`);
    const file = exists ? resolveHtmlFile(dir, p.slug) : `${p.slug}.html`;
    const filePath = path.join(dir, file);

    if (exists) {
      const current = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf-8') : '';
      if (current === html) {
        skipped++;
        continue;
      }
      fs.writeFileSync(filePath, html, 'utf-8');
      console.log(`  [updated] ${dirName}/${file}  (${html.length} bytes)`);
      updated++;
    } else {
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(filePath, html, 'utf-8');
      console.log(`  [new]     ${dirName}/${file}  (${html.length} bytes)`);
      added++;
    }
  }

  console.log(
    `\nDone. ${added} new, ${updated} updated, ${skipped} unchanged — ${published.length} published in vault.`
  );
}

run().catch((err) => {
  console.error('Sync failed:', err.message);
  process.exit(1);
});
