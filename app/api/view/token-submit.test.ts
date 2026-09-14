import { describe, it, expect } from 'vitest';
import fs from 'fs';

/**
 * "Submit uses the same control as the view" is a claim about code until
 * something measures it. how's words: a revocation that closes the view but
 * leaves the mail path open is exactly the half gate we write ADRs about.
 *
 * These read the two routes and require that the submit path goes through the
 * SAME function — not a second implementation that happens to agree today.
 * (F031.2)
 */
const SUBMIT = fs.readFileSync('app/api/view/[token]/submit/route.ts', 'utf-8');
const CONTENT = fs.readFileSync('app/api/view/[token]/content/route.ts', 'utf-8');

describe('a link that may not be opened may not send either (F031.2)', () => {
  it('submit calls the SAME validator as the viewer', () => {
    expect(CONTENT).toContain('validateToken(token)');
    expect(SUBMIT).toContain('validateToken(token)');
  });

  it('submit refuses on an invalid token before doing anything else', () => {
    // The refusal must come before the body is read or a mail is built —
    // otherwise a revoked link still costs work and could still send.
    const refuse = SUBMIT.indexOf('if (!result.valid)');
    const readBody = SUBMIT.indexOf('request.json()');
    const send = SUBMIT.indexOf('mailer().send');
    expect(refuse).toBeGreaterThan(-1);
    expect(refuse).toBeLessThan(readBody);
    expect(refuse).toBeLessThan(send);
  });

  it('submit checks the PIN, like the content route', () => {
    expect(SUBMIT).toContain('pin-verified-');
    const pin = SUBMIT.indexOf('pin-verified-');
    expect(pin).toBeLessThan(SUBMIT.indexOf('mailer().send'));
  });

  it('the recipient is read on the SERVER and never from the request', () => {
    expect(SUBMIT).toContain('process.env.ADMIN_EMAIL');
    // Nothing off the request may reach the `to:` field. If this ever fails,
    // every public pitch has become an open mail relay.
    const toLine = SUBMIT.match(/const sent = await mailer\(\)\.send\(\{\s*\n\s*to,/);
    expect(toLine).not.toBeNull();
    expect(SUBMIT).not.toMatch(/to:\s*(body|raw|parsed|request)/);
  });

  it('the rate limit runs before the mail is built', () => {
    // Look for the CALL, not the name. The first version searched for
    // "takeSubmissionSlot" and found the IMPORT at the top of the file, so it
    // stayed green when the call was moved after the send — the mutation that
    // was supposed to catch exactly this. An anchor that matches the import is
    // an assertion about the import list.
    const limit = SUBMIT.indexOf('const slot = takeSubmissionSlot(');
    expect(limit).toBeGreaterThan(-1);
    expect(limit).toBeLessThan(SUBMIT.indexOf('mailer().send'));
  });

  it('a skipped send is reported as NOT sent — ok alone is not delivery', () => {
    // The gate answers { ok: true, skipped: true } when shut. Telling the
    // customer "sent" there is the exact failure this feature exists to avoid.
    expect(SUBMIT).toContain('!sent.ok || sent.skipped');
    expect(SUBMIT).toMatch(/IKKE sendt/);
  });

  it('MUTATION CONTROL: the files were actually read', () => {
    expect(SUBMIT.length).toBeGreaterThan(500);
    expect(CONTENT.length).toBeGreaterThan(500);
  });
});
