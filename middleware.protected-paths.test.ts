import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * Three pages under app/(app)/ had been left off the middleware's hand-written
 * list and answered a raw 500 to anyone not logged in — and the error response
 * carried the rendered page with it, so it could be read inside the failure.
 *
 * The list is hand-written, so the only durable fix is a check that reads the
 * PAGES OFF DISK rather than from a second list I also maintain: one hand-kept
 * list checked against another only proves I typed the same thing twice. (F030.1)
 */

const APP_DIR = path.join(process.cwd(), 'app', '(app)');
const MIDDLEWARE = fs.readFileSync(path.join(process.cwd(), 'middleware.ts'), 'utf-8');

/** Every routable page under app/(app)/, as a URL path. */
function appPages(dir = APP_DIR, prefix = ''): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      // Route groups "(x)" do not appear in the URL.
      const segment = entry.name.startsWith('(') ? '' : `/${entry.name}`;
      out.push(...appPages(path.join(dir, entry.name), prefix + segment));
    } else if (entry.name === 'page.tsx') {
      out.push(prefix || '/');
    }
  }
  return out;
}

/** The list the middleware actually enforces. */
function protectedPaths(): string[] {
  const block = MIDDLEWARE.match(/const PROTECTED_PATHS = \[([\s\S]*?)\];/);
  if (!block) throw new Error('PROTECTED_PATHS not found in middleware.ts');
  return [...block[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
}

describe('every page behind the app shell requires a session (F030.1)', () => {
  const pages = appPages();
  const guarded = protectedPaths();

  it('found the pages at all — a silent empty scan would pass everything', () => {
    expect(pages.length).toBeGreaterThan(5);
    expect(pages).toContain('/help');
    expect(guarded.length).toBeGreaterThan(0);
  });

  it.each(pages)('%s is covered by PROTECTED_PATHS', (page) => {
    const covered = guarded.some((p) => page === p || page.startsWith(`${p}/`));
    expect(
      covered,
      `${page} is a page inside the app shell but no entry in middleware.ts PROTECTED_PATHS ` +
        `covers it. Without one it answers HTTP 500 to a visitor with no session — and the ` +
        `error response carries the rendered page, so it can be read inside the failure. ` +
        `Add its top-level segment to PROTECTED_PATHS.`,
    ).toBe(true);
  });

  it('the matcher lets middleware see every path, not a short list', () => {
    // A protected path that the matcher never runs on is protected on paper only.
    const matcher = MIDDLEWARE.match(/matcher:\s*\[([\s\S]*?)\]/)?.[1] ?? '';
    expect(matcher).toContain('(?!');
  });
});
