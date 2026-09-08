import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * Every surface where a PERSON reads a pitch embeds it in a sandboxed iframe.
 * Which keywords sit in that attribute is a product decision, not a detail:
 * drop allow-modals and the pitch's own print button silently does nothing —
 * the browser ignores the call without throwing, so nothing reports a failure.
 *
 * The first version of this test grepped ONE file for the FIRST sandbox= match.
 * It went green while the preview route still blocked printing, because that
 * route lives in a different file. A test that reads one of two call sites
 * measures nothing about the second. (F028)
 */
const READER_SURFACES = [
  'components/pitch-viewer.tsx',
  'app/(viewer)/preview/[id]/page.tsx',
];

/** Every sandbox attribute in a file, not just the first. */
function sandboxAttrs(file: string): string[][] {
  const src = fs.readFileSync(path.join(process.cwd(), file), 'utf-8');
  const found = [...src.matchAll(/sandbox="([^"]+)"/g)];
  if (found.length === 0) throw new Error(`no sandbox attribute in ${file}`);
  return found.map((m) => m[1].trim().split(/\s+/));
}

const EXPECTED = [
  'allow-forms',
  'allow-modals',
  'allow-popups',
  'allow-same-origin',
  'allow-scripts',
];

describe('pitch reader iframe sandboxes (F028)', () => {
  it.each(READER_SURFACES)('%s allows modals, so a pitch can print', (file) => {
    for (const kw of sandboxAttrs(file)) {
      expect(kw).toContain('allow-modals');
    }
  });

  it.each(READER_SURFACES)('%s grants exactly the five agreed keywords', (file) => {
    // Both directions: the new permission must be there, and no earlier one
    // may be traded away for it by a later tidy-up.
    for (const kw of sandboxAttrs(file)) {
      expect([...kw].sort()).toEqual(EXPECTED);
    }
  });

  it('covers every reader surface that exists — no third one crept in', () => {
    // The miss this file exists to prevent: a NEW reader route with its own
    // iframe, invisible to a list written by hand.
    const roots = ['components', 'app/(viewer)'];
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const e of fs.readdirSync(path.join(process.cwd(), dir), { withFileTypes: true })) {
        const rel = `${dir}/${e.name}`;
        if (e.isDirectory()) walk(rel);
        else if (/\.tsx?$/.test(e.name) && !e.name.includes('.test.')) {
          if (/sandbox="/.test(fs.readFileSync(path.join(process.cwd(), rel), 'utf-8'))) {
            files.push(rel);
          }
        }
      }
    };
    roots.forEach(walk);
    expect(files.sort()).toEqual([...READER_SURFACES].sort());
  });
});
