import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * The viewer embeds every HTML pitch in a sandboxed iframe. Which keywords are
 * in that attribute is a product decision, not a detail: drop allow-modals and
 * a pitch's own print button silently does nothing — the browser ignores the
 * call without throwing, so nothing anywhere reports a failure. (F028)
 */
const src = fs.readFileSync(
  path.join(process.cwd(), 'components/pitch-viewer.tsx'),
  'utf-8',
);

function sandboxKeywords(): string[] {
  const m = src.match(/sandbox="([^"]+)"/);
  if (!m) throw new Error('no sandbox attribute found in pitch-viewer.tsx');
  return m[1].trim().split(/\s+/);
}

describe('pitch viewer iframe sandbox (F028)', () => {
  it('allows modals, so a pitch can open the print dialog', () => {
    expect(sandboxKeywords()).toContain('allow-modals');
  });

  it('still carries the four permissions the viewer already depended on', () => {
    // Guards the other direction: a later tidy-up must not trade one
    // permission away for another.
    const kw = sandboxKeywords();
    for (const needed of [
      'allow-scripts',
      'allow-same-origin',
      'allow-forms',
      'allow-popups',
    ]) {
      expect(kw).toContain(needed);
    }
  });

  it('grants nothing beyond those five', () => {
    expect(sandboxKeywords().sort()).toEqual([
      'allow-forms',
      'allow-modals',
      'allow-popups',
      'allow-same-origin',
      'allow-scripts',
    ]);
  });
});
