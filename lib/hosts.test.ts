import { describe, it, expect } from 'vitest';
import { redirectTargetFor, CANONICAL_HOST, LEGACY_HOSTS } from '@/lib/hosts';

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
