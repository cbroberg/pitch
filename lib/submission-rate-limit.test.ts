import { describe, it, expect, beforeEach } from 'vitest';
import {
  takeSubmissionSlot,
  resetSubmissionLimits,
  MAX_PER_WINDOW,
  WINDOW_MS,
} from '@/lib/submission-rate-limit';

/** A share link is public to anyone holding it. Without a ceiling the submit
 *  route is a mail bomb aimed at whoever reads ADMIN_EMAIL. (F031.2) */
describe('one link cannot flood the inbox (F031.2)', () => {
  beforeEach(resetSubmissionLimits);

  it('lets a normal submission through', () => {
    expect(takeSubmissionSlot('tok').allowed).toBe(true);
  });

  it('stops the link after its allowance, and says how long to wait', () => {
    for (let i = 0; i < MAX_PER_WINDOW; i++) {
      expect(takeSubmissionSlot('tok', 1_000).allowed).toBe(true);
    }
    const blocked = takeSubmissionSlot('tok', 1_000);
    expect(blocked.allowed).toBe(false);
    if (!blocked.allowed) expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('counts PER LINK — one busy link must not silence another', () => {
    for (let i = 0; i < MAX_PER_WINDOW; i++) takeSubmissionSlot('busy', 1_000);
    expect(takeSubmissionSlot('busy', 1_000).allowed).toBe(false);
    expect(takeSubmissionSlot('other', 1_000).allowed).toBe(true);
  });

  it('forgives once the window has passed', () => {
    for (let i = 0; i < MAX_PER_WINDOW; i++) takeSubmissionSlot('tok', 1_000);
    expect(takeSubmissionSlot('tok', 1_000).allowed).toBe(false);
    expect(takeSubmissionSlot('tok', 1_000 + WINDOW_MS).allowed).toBe(true);
  });

  it('is shared across module copies — Next inlines a lib into every route bundle', async () => {
    // The same defect that caused F027: module scope would give several
    // independent counters that never see each other, and the cap would be
    // whatever number of bundles happened to exist.
    const { resetModules } = await import('vitest').then((m) => ({ resetModules: m.vi.resetModules }));
    resetModules();
    const a = await import('@/lib/submission-rate-limit');
    resetModules();
    const b = await import('@/lib/submission-rate-limit');
    expect(a.takeSubmissionSlot).not.toBe(b.takeSubmissionSlot); // genuinely two copies

    a.resetSubmissionLimits();
    for (let i = 0; i < MAX_PER_WINDOW; i++) a.takeSubmissionSlot('shared', 1_000);
    expect(b.takeSubmissionSlot('shared', 1_000).allowed).toBe(false);
  });
});
