import { describe, it, expect } from 'vitest';
import path from 'path';
import { resolveWithinDir } from './safe-path';

describe('resolveWithinDir (F009.5)', () => {
  it('resolves a normal entry under a RELATIVE dir (the suggest-invite bug)', () => {
    // Before the fix the route compared an absolute resolved path against a
    // relative dir with startsWith → false → 400 "Invalid path" locally.
    const result = resolveWithinDir('./data/pitches/abc123', 'index.html');
    expect(result).not.toBeNull();
    expect(path.isAbsolute(result!)).toBe(true);
    expect(result).toBe(path.resolve('./data/pitches/abc123', 'index.html'));
  });

  it('resolves a normal entry under an ABSOLUTE dir (prod, unchanged)', () => {
    const result = resolveWithinDir('/data/pitches/abc123', 'deck.pdf');
    expect(result).toBe('/data/pitches/abc123/deck.pdf');
  });

  it('rejects a ../ traversal that escapes the dir', () => {
    expect(resolveWithinDir('/data/pitches/abc123', '../../etc/passwd')).toBeNull();
  });

  it('rejects an absolute entry that escapes the dir', () => {
    expect(resolveWithinDir('/data/pitches/abc123', '/etc/passwd')).toBeNull();
  });

  it('does not allow a sibling dir via prefix match', () => {
    // /data/pitches/abc must not be considered inside /data/pitches/ab
    expect(resolveWithinDir('/data/pitches/ab', '../abc/secret')).toBeNull();
  });
});
