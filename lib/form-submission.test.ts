import { describe, it, expect } from 'vitest';
import {
  parseSubmission,
  renderSubmission,
  MAX_FIELDS,
  MAX_VALUE,
  MAX_TOTAL,
} from '@/lib/form-submission';

/**
 * The answers are written by whoever holds the share link — a public string.
 * Everything here is about what that string may become. (F031.2)
 */
describe('what a submission may contain (F031.2)', () => {
  const ok = (fields: { label: string; value: string }[]) => parseSubmission({ fields });

  it('accepts what a pitch actually collects: short text, a choice, a long remark', () => {
    const r = ok([
      { label: 'Navn 1', value: 'Helena' },
      { label: 'Funktion 1', value: 'Ejer' },
      { label: 'Bemærkning', value: 'x'.repeat(2000) },
    ]);
    expect(r.ok).toBe(true);
  });

  it('refuses a file — uploads are out of scope, and that is the point', () => {
    // A field whose value is not text means the page is sending something this
    // was never built to carry. Refuse rather than coerce.
    expect(parseSubmission({ fields: [{ label: 'CV', value: { data: 'AAAA' } }] }).ok).toBe(false);
  });

  it('REJECTS rather than truncates an over-long answer', () => {
    // A silently shortened answer is worse than a refused one: the sender is
    // told it arrived and the reader never learns a word is missing.
    const r = ok([{ label: 'A', value: 'x'.repeat(MAX_VALUE + 1) }]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/too long/);
  });

  it('caps the WHOLE submission, not just each field', () => {
    // Otherwise a hundred legal fields add up to a novel.
    const many = Array.from({ length: MAX_FIELDS }, (_, i) => ({
      label: `F${i}`,
      value: 'x'.repeat(Math.ceil(MAX_TOTAL / MAX_FIELDS)),
    }));
    expect(parseSubmission({ fields: many }).ok).toBe(false);
  });

  it('refuses an empty or absent form rather than mailing nothing', () => {
    expect(parseSubmission({ fields: [] }).ok).toBe(false);
    expect(parseSubmission({}).ok).toBe(false);
    expect(parseSubmission(null).ok).toBe(false);
    expect(parseSubmission('fields').ok).toBe(false);
  });

  it('refuses more fields than a form plausibly has', () => {
    const many = Array.from({ length: MAX_FIELDS + 1 }, () => ({ label: 'a', value: 'b' }));
    expect(parseSubmission({ fields: many }).ok).toBe(false);
  });
});

describe('an answer never becomes markup in our mail (F031.2)', () => {
  const evil = '<img src=x onerror="alert(1)">';

  /**
   * TWO WRONG PREDICATES BEFORE THIS ONE, each wrong for its own reason:
   *  · "no <img anywhere"  — the shell carries the Pitch Vault logo, a real
   *    <img. Went red the moment the mail got its proper frame.
   *  · "no onerror="       — escaping leaves the TEXT "onerror=" intact; it is
   *    harmless precisely because the < around it is escaped. Went red on
   *    correctly escaped output.
   * What actually matters: the raw string must be gone, and its escaped form
   * present. Anything looser tests the shell; anything stricter tests English.
   */
  const assertEscaped = (html: string) => {
    expect(html).not.toContain(evil); // not verbatim anywhere
    expect(html).toContain('&lt;img'); // and it IS there, as text
  };

  it('escapes the VALUE', () => {
    assertEscaped(renderSubmission('T', [{ label: 'A', value: evil }]).html);
  });

  it('escapes the LABEL too — the page controls both', () => {
    assertEscaped(renderSubmission('T', [{ label: evil, value: 'x' }]).html);
  });

  it('escapes the PITCH TITLE — it is not user input, but it is not ours either', () => {
    assertEscaped(renderSubmission(evil, [{ label: 'A', value: 'x' }]).html);
  });

  it('MUTATION CONTROL: the logo IS a real <img, so a blanket check would be meaningless', () => {
    const { html } = renderSubmission('T', [{ label: 'A', value: 'x' }]);
    expect(html).toContain('<img src=');
  });

  it('the plain-text alternative carries the answer verbatim, unescaped', () => {
    // Text has no markup, so escaping it would show the reader &lt; instead of <.
    const { text } = renderSubmission('T', [{ label: 'A', value: evil }]);
    expect(text).toContain(evil);
  });

  it('the answer mail wears the same shell as the invitations', () => {
    // Christian, on the first version: "lige trist nok den mail". It was a bare
    // table while every invitation had a logo header and a footer.
    const { html } = renderSubmission('T', [{ label: 'A', value: 'x' }]);
    expect(html).toContain('background: #0d0f1a');          // header
    expect(html).toContain('/pitch-vault-logo-email.png');  // logo
    expect(html).toContain('href="https://broberg.ai"');    // footer link
    expect(html).toContain('<!DOCTYPE html>');
  });

  it('MUTATION CONTROL: the evil string really would be markup unescaped', () => {
    expect(evil).toMatch(/<img/);
  });

  it('an empty answer is shown as empty, not dropped', () => {
    // A field the customer left blank is information; a missing row is not.
    const { html, text } = renderSubmission('T', [{ label: 'Navn 6', value: '' }]);
    expect(html).toContain('Navn 6');
    expect(html).toContain('(ikke udfyldt)');
    expect(text).toContain('(ikke udfyldt)');
  });
});

describe('the subject line is not a hole (F031.2)', () => {
  it('strips CR/LF — the sender must not hand the provider a multi-line header', () => {
    const r = parseSubmission({
      subject: 'Svar\r\nBcc: someone@example.com',
      fields: [{ label: 'A', value: 'x' }],
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.subject).toBe('Svar Bcc: someone@example.com');
    expect(r.subject).not.toMatch(/[\r\n]/);
  });

  it('MUTATION CONTROL: the raw input really does carry a line break', () => {
    expect('Svar\r\nBcc: x').toMatch(/[\r\n]/);
  });

  it('an ordinary subject passes through unchanged', () => {
    const r = parseSubmission({ subject: 'Sådan ser et svar ud', fields: [{ label: 'A', value: 'x' }] });
    expect(r.ok && r.subject).toBe('Sådan ser et svar ud');
  });
});
