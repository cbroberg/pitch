import { createMailer } from '@broberg/mail';
import { MAIL_FROM } from '@/lib/email/from';

/**
 * The one mailer for this app. (F031.1)
 *
 * `live` MUST be opted into explicitly — that is the package's fail-safe, and
 * for us it is the dangerous direction: with MAIL_LIVE unset, a key is present,
 * every send answers `{ ok: true, skipped: true, reason: 'not-live' }`, and mail
 * reaches only the fleet admins. A customer's invitation would stop arriving
 * while every surface here still said "sent".
 *
 * The sender comes from OUR single source, passed explicitly: the package reads
 * `MAIL_FROM` from the environment and ours is called `EMAIL_FROM`. Relying on
 * the env name would silently fall back to the package's own default.
 */
const LOCK = Symbol.for('pitch-vault.mailer');

type Mailer = ReturnType<typeof createMailer>;

export function mailer(): Mailer {
  const g = globalThis as typeof globalThis & { [LOCK]?: Mailer };
  if (!g[LOCK]) {
    g[LOCK] = createMailer({
      apiKey: process.env.RESEND_API_KEY,
      from: MAIL_FROM,
      live: process.env.MAIL_LIVE === 'true',
    });
  }
  return g[LOCK];
}

/**
 * True when this process is a DEPLOYED instance.
 *
 * Read from a platform-injected variable, never from the same value that opens
 * the mail gate: cms wrote this check against NODE_ENV first, which is what
 * their gate already keyed on, so the complaint branch could never be reached.
 * FLY_APP_NAME comes from Fly itself — not from our Dockerfile or fly.toml.
 */
export function isDeployed(): boolean {
  return Boolean(process.env.FLY_APP_NAME);
}

/**
 * Complain — loudly, in the log — if a deployed instance came up unable to
 * reach real recipients. Deliberately does NOT throw: taking the whole app down
 * over a mail misconfiguration trades a silent failure for a loud outage.
 */
export function assertMailGateSane(): void {
  if (!isDeployed()) return;
  const mode = mailer().mode;
  if (mode !== 'live') {
    console.error(
      `[mail] DEPLOYED but the gate is "${mode}" — invitations will NOT reach ` +
        `customers, and every send will still answer ok. ` +
        `Fix: set MAIL_LIVE=true (mode "allowlist-only"), RESEND_API_KEY ("no-key"), ` +
        `or clear the kill-switch ("disabled").`,
    );
  }
}
