import { getDb } from '@/lib/db/client';
import { tags, pitchTags } from '@/lib/db/schema';
import { eq, inArray, sql, asc } from 'drizzle-orm';
import { nanoid } from 'nanoid';

const MAX_TAG_LENGTH = 30;

/**
 * Canonical form of a tag name. Trims, collapses inner whitespace and
 * lowercases so `Shop`, `shop ` and `SHOP` resolve to one tag instead of three
 * — the whole point of tags is finding things, which fails the moment the same
 * subject is spelled two ways. Returns null for input that is empty once
 * trimmed, so callers can drop it.
 */
export function normalizeTagName(raw: string): string | null {
  const name = raw.trim().replace(/\s+/g, ' ').toLowerCase();
  if (!name) return null;
  return name.slice(0, MAX_TAG_LENGTH);
}

/** Normalize a list, dropping blanks and duplicates while keeping order. */
export function normalizeTagNames(raw: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const r of raw) {
    const n = normalizeTagName(r);
    if (n && !seen.has(n)) {
      seen.add(n);
      out.push(n);
    }
  }
  return out;
}

/** Every tag with how many pitches use it — powers the filter + suggestions. */
export function listTagsWithCounts(): { id: string; name: string; count: number }[] {
  return getDb()
    .select({
      id: tags.id,
      name: tags.name,
      count: sql<number>`count(${pitchTags.pitchId})`,
    })
    .from(tags)
    .leftJoin(pitchTags, eq(pitchTags.tagId, tags.id))
    .groupBy(tags.id)
    .orderBy(asc(tags.name))
    .all();
}

/** Tag names for one pitch, alphabetical. */
export function getTagsForPitch(pitchId: string): string[] {
  return getDb()
    .select({ name: tags.name })
    .from(pitchTags)
    .innerJoin(tags, eq(tags.id, pitchTags.tagId))
    .where(eq(pitchTags.pitchId, pitchId))
    .orderBy(asc(tags.name))
    .all()
    .map((r) => r.name);
}

/**
 * Tag names for many pitches in ONE query — the list view renders every pitch,
 * so a per-pitch lookup would be a query per row.
 */
export function getTagsForPitches(pitchIds: string[]): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  if (pitchIds.length === 0) return out;
  const rows = getDb()
    .select({ pitchId: pitchTags.pitchId, name: tags.name })
    .from(pitchTags)
    .innerJoin(tags, eq(tags.id, pitchTags.tagId))
    .where(inArray(pitchTags.pitchId, pitchIds))
    .orderBy(asc(tags.name))
    .all();
  for (const r of rows) (out[r.pitchId] ??= []).push(r.name);
  return out;
}

/** Ids of pitches carrying a given tag name (already normalized by caller). */
export function getPitchIdsForTag(name: string): string[] {
  return getDb()
    .select({ pitchId: pitchTags.pitchId })
    .from(pitchTags)
    .innerJoin(tags, eq(tags.id, pitchTags.tagId))
    .where(eq(tags.name, name))
    .all()
    .map((r) => r.pitchId);
}

/** Look up existing tag ids by name, creating any that don't exist yet. */
function ensureTags(names: string[]): string[] {
  if (names.length === 0) return [];
  const db = getDb();
  const existing = db
    .select({ id: tags.id, name: tags.name })
    .from(tags)
    .where(inArray(tags.name, names))
    .all();
  const byName = new Map(existing.map((t) => [t.name, t.id]));
  const missing = names.filter((n) => !byName.has(n));
  if (missing.length > 0) {
    const created = missing.map((name) => ({
      id: nanoid(),
      name,
      createdAt: Math.floor(Date.now() / 1000),
    }));
    db.insert(tags).values(created).onConflictDoNothing().run();
    // Re-read rather than trusting the insert: a concurrent request may have
    // created the same name, in which case onConflictDoNothing kept theirs.
    for (const t of db
      .select({ id: tags.id, name: tags.name })
      .from(tags)
      .where(inArray(tags.name, missing))
      .all()) {
      byName.set(t.name, t.id);
    }
  }
  return names.map((n) => byName.get(n)).filter((id): id is string => !!id);
}

/**
 * Drop tags no pitch uses any more, so the filter and suggestion lists never
 * fill up with dead values the owner has to scroll past.
 */
export function pruneOrphanTags(): void {
  getDb()
    .run(
      sql`DELETE FROM tags WHERE id NOT IN (SELECT tag_id FROM pitch_tags)`,
    );
}

/** Replace a pitch's tags wholesale. Returns the stored (normalized) names. */
export function setPitchTags(pitchId: string, rawNames: string[]): string[] {
  const names = normalizeTagNames(rawNames);
  const db = getDb();
  const tagIds = ensureTags(names);
  db.delete(pitchTags).where(eq(pitchTags.pitchId, pitchId)).run();
  if (tagIds.length > 0) {
    db.insert(pitchTags)
      .values(tagIds.map((tagId) => ({ pitchId, tagId })))
      .onConflictDoNothing()
      .run();
  }
  pruneOrphanTags();
  return names;
}

/**
 * Add ONE tag to many pitches without touching their other tags — the bulk
 * action from the selection bar is additive on purpose (F022.4).
 */
export function addTagToPitches(pitchIds: string[], rawName: string): string | null {
  const name = normalizeTagName(rawName);
  if (!name || pitchIds.length === 0) return null;
  const [tagId] = ensureTags([name]);
  if (!tagId) return null;
  getDb()
    .insert(pitchTags)
    .values(pitchIds.map((pitchId) => ({ pitchId, tagId })))
    .onConflictDoNothing()
    .run();
  return name;
}
