#!/usr/bin/env node
/**
 * Cleans up WYSIWYG editor artifacts from saved pitch HTML files.
 *
 * Removes:
 *  - inline outline / outline-offset / cursor:text styles added by the visual editor
 *  - contenteditable attributes
 *  - data-cc-editing / data-cc-skip attributes
 *  - empty style="" attributes left after cleanup
 *
 * Usage:
 *   node scripts/clean-pitch-html.mjs           # dry-run (default)
 *   node scripts/clean-pitch-html.mjs --write    # actually write changes
 */
import fs from 'fs';
import path from 'path';

const STORAGE = process.env.STORAGE_PATH || path.join(process.cwd(), 'data');
const PITCHES_DIR = path.join(STORAGE, 'pitches');
const WRITE = process.argv.includes('--write');

// Patterns to strip from inline style attributes
const STYLE_REMOVALS = [
  /outline\s*:\s*[^;]+;?\s*/gi,
  /outline-offset\s*:\s*[^;]+;?\s*/gi,
  /cursor\s*:\s*text\s*;?\s*/gi,
];

// Attributes to remove entirely
const ATTR_REMOVALS = [
  /\s+contenteditable\s*=\s*"[^"]*"/gi,
  /\s+data-cc-editing\s*=\s*"[^"]*"/gi,
  /\s+data-cc-skip\s*=\s*"[^"]*"/gi,
];

function cleanHtml(html) {
  let cleaned = html;

  // Clean inline style values
  cleaned = cleaned.replace(/style\s*=\s*"([^"]*)"/gi, (match, styleValue) => {
    let sv = styleValue;
    for (const pat of STYLE_REMOVALS) {
      sv = sv.replace(pat, '');
    }
    sv = sv.replace(/;\s*$/, '').trim();
    if (!sv) return ''; // remove empty style attribute entirely
    return `style="${sv}"`;
  });

  // Remove editor attributes
  for (const pat of ATTR_REMOVALS) {
    cleaned = cleaned.replace(pat, '');
  }

  return cleaned;
}

function run() {
  if (!fs.existsSync(PITCHES_DIR)) {
    console.log('No pitches directory found at', PITCHES_DIR);
    process.exit(0);
  }

  const pitchIds = fs.readdirSync(PITCHES_DIR).filter((f) => {
    return fs.statSync(path.join(PITCHES_DIR, f)).isDirectory();
  });

  console.log(`Found ${pitchIds.length} pitches. Mode: ${WRITE ? 'WRITE' : 'DRY-RUN'}\n`);

  let totalCleaned = 0;

  for (const id of pitchIds) {
    const dir = path.join(PITCHES_DIR, id);
    const htmlFiles = fs.readdirSync(dir).filter((f) => f.endsWith('.html'));

    for (const file of htmlFiles) {
      const filePath = path.join(dir, file);
      const original = fs.readFileSync(filePath, 'utf-8');
      const cleaned = cleanHtml(original);

      if (cleaned !== original) {
        const diffBytes = original.length - cleaned.length;
        console.log(`  [DIRTY] ${id}/${file}  (−${diffBytes} bytes)`);
        totalCleaned++;
        if (WRITE) {
          fs.writeFileSync(filePath, cleaned, 'utf-8');
          console.log(`          → cleaned & saved`);
        }
      }
    }
  }

  console.log(`\n${totalCleaned} file(s) ${WRITE ? 'cleaned' : 'need cleaning'}.`);
  if (!WRITE && totalCleaned > 0) {
    console.log('Run with --write to apply changes.');
  }
}

run();
