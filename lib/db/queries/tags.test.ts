import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';

// Point the app at a throwaway data dir BEFORE anything opens the DB — both
// runMigrations() and getDb() read STORAGE_PATH lazily, at call time.
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pitch-tags-test-'));
process.env.STORAGE_PATH = tmpDir;

// Imported after the env var is set.
const { runMigrations } = await import('@/lib/db/migrate');
const { getDb } = await import('@/lib/db/client');
const { pitches } = await import('@/lib/db/schema');
const {
  normalizeTagName,
  normalizeTagNames,
  setPitchTags,
  getTagsForPitch,
  getTagsForPitches,
  listTagsWithCounts,
  addTagToPitches,
  getPitchIdsForTag,
} = await import('@/lib/db/queries/tags');

function makePitch(id: string) {
  getDb()
    .insert(pitches)
    .values({
      id,
      title: `Pitch ${id}`,
      slug: `pitch-${id}`,
      isPublished: true,
      createdAt: 1,
      updatedAt: 1,
    })
    .run();
}

beforeAll(() => {
  runMigrations();
  makePitch('p1');
  makePitch('p2');
});

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('tag name normalization (F022.1)', () => {
  it('folds case and surrounding whitespace so one subject is one tag', () => {
    expect(normalizeTagName('Shop')).toBe('shop');
    expect(normalizeTagName('  shop ')).toBe('shop');
    expect(normalizeTagName('SHOP')).toBe('shop');
  });

  it('collapses inner whitespace', () => {
    expect(normalizeTagName('ai   demo')).toBe('ai demo');
  });

  it('rejects blank input', () => {
    expect(normalizeTagName('   ')).toBeNull();
    expect(normalizeTagName('')).toBeNull();
  });

  it('caps length at 30 characters', () => {
    expect(normalizeTagName('x'.repeat(50))).toHaveLength(30);
  });

  it('drops duplicates that differ only by case/space, keeping order', () => {
    expect(normalizeTagNames(['Shop', 'ai', 'shop ', '', 'DEMO'])).toEqual([
      'shop',
      'ai',
      'demo',
    ]);
  });
});

describe('pitch tagging (F022.1)', () => {
  it('stores normalized names and reads them back', () => {
    setPitchTags('p1', ['Shop', 'AI']);
    expect(getTagsForPitch('p1')).toEqual(['ai', 'shop']); // alphabetical
  });

  it('writing the same subject twice does not create two tags', () => {
    setPitchTags('p2', ['shop']);
    const names = listTagsWithCounts().map((t) => t.name);
    expect(names.filter((n) => n === 'shop')).toHaveLength(1);
  });

  it('counts how many pitches use each tag', () => {
    const shop = listTagsWithCounts().find((t) => t.name === 'shop');
    expect(shop?.count).toBe(2); // p1 + p2
  });

  it('fetches tags for many pitches in one call', () => {
    expect(getTagsForPitches(['p1', 'p2'])).toEqual({
      p1: ['ai', 'shop'],
      p2: ['shop'],
    });
  });

  it('finds the pitches carrying a tag', () => {
    expect(getPitchIdsForTag('shop').sort()).toEqual(['p1', 'p2']);
  });

  it('prunes a tag once its last pitch drops it — no dead filter entries', () => {
    setPitchTags('p1', ['ai']); // p1 loses `shop`
    setPitchTags('p2', []); // p2 loses `shop` — nobody uses it now
    expect(listTagsWithCounts().map((t) => t.name)).not.toContain('shop');
    expect(listTagsWithCounts().map((t) => t.name)).toContain('ai');
  });

  it('bulk-adds one tag to many pitches without removing their existing ones', () => {
    setPitchTags('p1', ['ai']);
    setPitchTags('p2', ['demo']);
    const applied = addTagToPitches(['p1', 'p2'], 'Client Work');
    expect(applied).toBe('client work');
    expect(getTagsForPitch('p1')).toEqual(['ai', 'client work']);
    expect(getTagsForPitch('p2')).toEqual(['client work', 'demo']);
  });

  it('bulk-adding the same tag twice is idempotent', () => {
    addTagToPitches(['p1'], 'client work');
    expect(getTagsForPitch('p1').filter((t) => t === 'client work')).toHaveLength(1);
  });

  it('rejects a blank bulk tag', () => {
    expect(addTagToPitches(['p1'], '   ')).toBeNull();
  });
});
