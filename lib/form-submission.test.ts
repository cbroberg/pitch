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

  it('escapes the VALUE', () => {
    const { html } = renderSubmission('T', [{ label: 'A', value: evil }]);
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;img');
  });

  it('escapes the LABEL too — the page controls both', () => {
    const { html } = renderSubmission('T', [{ label: evil, value: 'x' }]);
    expect(html).not.toContain('<img');
  });

  it('escapes the PITCH TITLE — it is not user input, but it is not ours either', () => {
    const { html } = renderSubmission(evil, [{ label: 'A', value: 'x' }]);
    expect(html).not.toContain('<img');
  });

  it('the plain-text alternative carries the answer verbatim, unescaped', () => {
    // Text has no markup, so escaping it would show the reader &lt; instead of <.
    const { text } = renderSubmission('T', [{ label: 'A', value: evil }]);
    expect(text).toContain(evil);
  });

  it('MUTATION CONTROL: the evil string really would be markup unescaped', () => {
    expect(evil).toMatch(/<img/);
  });

  it('an empty answer is shown as empty, not dropped', () => {
    // A field the customer left blank is information; a missing row is not.
    const { html, text } = renderSubmission('T', [{ label: 'Navn 6', value: '' }]);
    expect(html).toContain('Navn 6');
    expect(text).toContain('Navn 6: (tomt)');
  });
});
