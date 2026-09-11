import { describe, it, expect } from 'vitest';
import { redirectTargetFor, displayOrigin, CANONICAL_HOST, LEGACY_HOSTS } from '@/lib/hosts';

/**
 * Every link already sent to a customer was written on the old hostname. This
 * is the rule that keeps those links arriving somewhere real. (F029.2)
 */
describe('legacy-host redirect (F029.2)', () => {
  it('sends an old share link to the current address', () => {
    expect(redirectTargetFor('pitch.broberg.dk', '/view/GL3xiybdbsFM')).toBe(
      'https://pitch.broberg.ai',
    );
  });

  it('NEVER redirects the current address to itself — that would be an endless loop on every visit', () => {
    expect(redirectTargetFor(CANONICAL_HOST, '/view/GL3xiybdbsFM')).toBeNull();
    expect(LEGACY_HOSTS).not.toContain(CANONICAL_HOST.toLowerCase());
  });

  it('leaves /api alone — curl does not follow redirects, so a script would break silently', () => {
    expect(redirectTargetFor('pitch.broberg.dk', '/api/v1/pitches')).toBeNull();
    expect(redirectTargetFor('pitch.broberg.dk', '/api/cli/push')).toBeNull();
  });

  it('/api-lookalikes are still redirected — only the real prefix is exempt', () => {
    // "/apidocs" is a page, not the API. A `startsWith('/api')` would have
    // exempted it by accident.
    expect(redirectTargetFor('pitch.broberg.dk', '/apidocs')).toBe('https://pitch.broberg.ai');
  });

  it('ignores the port and the casing a proxy may hand us', () => {
    expect(redirectTargetFor('PITCH.BROBERG.DK:443', '/view/x')).toBe('https://pitch.broberg.ai');
  });

  it('serves an unknown host here rather than bouncing it somewhere', () => {
    expect(redirectTargetFor('localhost:4300', '/view/x')).toBeNull();
    expect(redirectTargetFor(null, '/view/x')).toBeNull();
  });
});

/**
 * Measured before this guard existed: `curl -H "Host: evil.example" …/help`
 * with a valid session rendered "http://evil.example/view/[token]" back at the
 * reader. (F029.1)
 */
describe('the origin we SHOW a user is never whatever the caller claimed (F029.1)', () => {
  it('refuses a forged host and falls back to the real address', () => {
    expect(displayOrigin('evil.example', 'https')).toBe('https://pitch.broberg.ai');
    expect(displayOrigin('pitch.broberg.ai.evil.example', 'https')).toBe(
      'https://pitch.broberg.ai',
    );
    expect(displayOrigin(null, 'https')).toBe('https://pitch.broberg.ai');
  });

  it('MUTATION CONTROL: a host we DO answer on is shown as-is', () => {
    // Without this the guard could "pass" by always returning the canonical
    // host, which would quietly break the point of the help page.
    expect(displayOrigin('pitch.broberg.dk', 'https')).toBe('https://pitch.broberg.dk');
    expect(displayOrigin('pitch.broberg.ai', 'https')).toBe('https://pitch.broberg.ai');
  });

  it('still works for a developer on localhost, port and all', () => {
    expect(displayOrigin('localhost:4300', 'http')).toBe('http://localhost:4300');
    expect(displayOrigin('127.0.0.1:4300', 'http')).toBe('http://127.0.0.1:4300');
  });
});
