import { getPitchBySlug } from '@/lib/db/queries/pitches';

export function toSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

export async function generateUniqueSlug(title: string): Promise<string> {
  const base = toSlug(title);
  let slug = base;
  let attempt = 0;

  while (true) {
    const existing = getPitchBySlug(slug);
    if (!existing) return slug;
    attempt++;
    slug = `${base}-${attempt}`;
  }
}
