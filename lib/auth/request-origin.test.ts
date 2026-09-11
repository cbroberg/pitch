import { describe, it, expect } from 'vitest';
import { getRequestOrigin } from '@/lib/auth/webauthn';

/**
 * The help page shows the recipient link as an example, and it used to name one
 * domain in hand-written text. Pitch Vault answers on two hostnames — the old
 * pitch.broberg.dk and the new pitch.broberg.ai — and both must keep working,
 * so a page that names either one is wrong half the time. (F029.1)
 */
describe('request origin follows the hostname it was served on (F029.1)', () => {
  const origin = (host: string, proto = 'https') =>
    getRequestOrigin(new Headers({ host, 'x-forwarded-proto': proto }));

  it('answers the NEW primary domain', () => {
    expect(origin('pitch.broberg.ai')).toBe('https://pitch.broberg.ai');
  });

  it('answers the OLD domain — every link already sent to a customer lives here', () => {
    expect(origin('pitch.broberg.dk')).toBe('https://pitch.broberg.dk');
  });

  it('MUTATION CONTROL: the two are not the same string', () => {
    // If this ever passes, the assertions above are measuring nothing.
    expect(origin('pitch.broberg.ai')).not.toBe(origin('pitch.broberg.dk'));
  });

  it('never invents a domain of its own', () => {
    // A hardcoded fallback is exactly the defect this replaced.
    expect(origin('example.test')).toBe('https://example.test');
  });
});
