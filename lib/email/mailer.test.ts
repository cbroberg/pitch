import { describe, it, expect, vi, afterEach } from 'vitest';

/**
 * The mail gate fails SILENTLY in the direction that matters to us: with
 * MAIL_LIVE unset, a key is present, every send answers `{ok:true,
 * skipped:true}`, and only the fleet admins receive anything. A customer's
 * invitation stops arriving while every surface still says "sent". (F031.1)
 */

const ENV = { ...process.env };
afterEach(() => {
  process.env = { ...ENV };
  vi.resetModules();
  vi.restoreAllMocks();
});

async function freshMailer(env: Record<string, string | undefined>) {
  process.env = { ...ENV, ...env };
  vi.resetModules();
  const mod = await import('@/lib/email/mailer');
  // The mailer is cached on globalThis; clear it so each case builds its own.
  delete (globalThis as Record<symbol, unknown>)[Symbol.for('pitch-vault.mailer')];
  return mod;
}

describe('the mail gate (F031.1)', () => {
  it('MAIL_LIVE=true opens the gate to real customers', async () => {
    const { mailer } = await freshMailer({ RESEND_API_KEY: 're_x', MAIL_LIVE: 'true' });
    expect(mailer().mode).toBe('live');
  });

  it('the trap: MAIL_LIVE unset leaves a KEYED mailer reaching only the allowlist', async () => {
    // This is the whole reason the boot check exists. `ok` would still be true.
    const { mailer } = await freshMailer({ RESEND_API_KEY: 're_x', MAIL_LIVE: undefined });
    expect(mailer().mode).toBe('allowlist-only');
  });

  it('MAIL_LIVE must be exactly "true" — a truthy-looking value does not open it', async () => {
    const { mailer } = await freshMailer({ RESEND_API_KEY: 're_x', MAIL_LIVE: '1' });
    expect(mailer().mode).toBe('allowlist-only');
  });

  it('no key ships dark rather than crashing a flow', async () => {
    const { mailer } = await freshMailer({ RESEND_API_KEY: undefined, MAIL_LIVE: 'true' });
    expect(mailer().mode).toBe('no-key');
  });
});

describe('the boot check (F031.1)', () => {
  it('complains when a DEPLOYED instance comes up with the gate shut', async () => {
    const { assertMailGateSane } = await freshMailer({
      RESEND_API_KEY: 're_x',
      MAIL_LIVE: undefined,
      FLY_APP_NAME: 'pitch-vault',
    });
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    assertMailGateSane();
    expect(err).toHaveBeenCalledOnce();
    // The message must name the ACTUAL mode, or it cannot be acted on.
    expect(err.mock.calls[0][0]).toContain('allowlist-only');
    expect(err.mock.calls[0][0]).toContain('MAIL_LIVE=true');
  });

  it('SAYS SO when the gate is open — silence would be indistinguishable from never running', async () => {
    const { assertMailGateSane } = await freshMailer({
      RESEND_API_KEY: 're_x',
      MAIL_LIVE: 'true',
      FLY_APP_NAME: 'pitch-vault',
    });
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    assertMailGateSane();
    expect(err).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledOnce();
    // The mode must be IN the line — that is what makes it readable off a
    // running machine rather than inferred.
    expect(log.mock.calls[0][0]).toContain('live');
  });

  it('stays quiet on a developer machine — a shut gate there is correct', async () => {
    const { assertMailGateSane } = await freshMailer({
      RESEND_API_KEY: 're_x',
      MAIL_LIVE: undefined,
      FLY_APP_NAME: undefined,
    });
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    assertMailGateSane();
    expect(err).not.toHaveBeenCalled();
  });

  it('does NOT decide "am I deployed" from the variable that opens the gate', async () => {
    // cms wrote this check against NODE_ENV first — the same value their gate
    // keyed on — so the complaint branch was unreachable. Read the source.
    const fs = await import('fs');
    const src = fs.readFileSync('lib/email/mailer.ts', 'utf-8');
    const isDeployed = src.slice(src.indexOf('export function isDeployed'));
    expect(isDeployed).toContain('FLY_APP_NAME');
    expect(isDeployed.slice(0, 200)).not.toContain('NODE_ENV');
    expect(isDeployed.slice(0, 200)).not.toContain('MAIL_LIVE');
  });
});

/**
 * The gate answers `{ok:true, skipped:true}` when it is shut. Our callers treat
 * a resolved promise as "the customer got it", so a skip MUST be raised here or
 * an invitation that reached nobody returns quietly. (F031.1)
 *
 * Measured against the REAL package with an injected fetch, not a stand-in for
 * it — a hand-rolled fake would be a test of my own idea of the contract.
 */
describe('a shut gate is raised, never swallowed (F031.1)', () => {
  async function sendInvite(env: Record<string, string | undefined>, fetchImpl: typeof fetch) {
    process.env = { ...ENV, ...env, RESEND_API_KEY: env.RESEND_API_KEY };
    vi.resetModules();
    delete (globalThis as Record<symbol, unknown>)[Symbol.for('pitch-vault.mailer')];

    const { createMailer } = await import('@broberg/mail');
    const m = createMailer({
      apiKey: env.RESEND_API_KEY,
      from: 'Pitch Vault <noreply@broberg.ai>',
      live: env.MAIL_LIVE === 'true',
      fetch: fetchImpl,
    });
    return m.send({ to: 'someone@external.example', subject: 'x', html: '<p>x</p>' });
  }

  const neverCalled = (() => {
    throw new Error('the provider must not be contacted when the gate is shut');
  }) as unknown as typeof fetch;

  it('a KEYED mailer without MAIL_LIVE skips a real customer — and says why', async () => {
    const r = await sendInvite({ RESEND_API_KEY: 're_x', MAIL_LIVE: undefined }, neverCalled);
    expect(r.ok).toBe(true); // the shape that fools a caller
    expect(r.skipped).toBe(true);
    expect(r.reason).toBe('not-live'); // the dangerous one: a key IS present
  });

  it('our wrapper turns that success-shaped nothing into a thrown error', async () => {
    const { mailer: _m } = await import('@/lib/email/mailer');
    void _m;
    const mod = await import('@/lib/email/resend');
    // The helper is not exported; assert on the behaviour through a send.
    // With no key at all the gate is shut for a different reason — still a skip.
    process.env = { ...ENV, RESEND_API_KEY: undefined, MAIL_LIVE: undefined };
    vi.resetModules();
    delete (globalThis as Record<symbol, unknown>)[Symbol.for('pitch-vault.mailer')];
    const fresh = await import('@/lib/email/resend');
    void mod;
    await expect(
      fresh.sendInviteEmail({
        to: 'someone@external.example',
        pitchTitle: 'T',
        viewUrl: 'https://pitch.broberg.ai/view/x',
        expiresAt: null,
      }),
    ).rejects.toThrow(/NOT delivered/);
  });
});
