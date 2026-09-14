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

  it('stays quiet on a deployed instance whose gate is open', async () => {
    const { assertMailGateSane } = await freshMailer({
      RESEND_API_KEY: 're_x',
      MAIL_LIVE: 'true',
      FLY_APP_NAME: 'pitch-vault',
    });
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    assertMailGateSane();
    expect(err).not.toHaveBeenCalled();
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
