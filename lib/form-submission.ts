import { emailShell } from '@/lib/email/templates/layout';
import { EMAIL_FOOTER } from '@/lib/email/footer';

/**
 * Turning a pitch's form answers into a mail a human can read. (F031.2)
 *
 * Pure — no I/O, no mail, no request. The route decides whether to send; this
 * decides what a valid submission IS, so both can be tested without the other.
 */

/** Deliberately small. how measured what pitches ACTUALLY collect: short free
 *  text, a choice from fixed options, and a long remark. Never a file — leaving
 *  uploads out removes the most expensive part of the security surface. */
export const MAX_FIELDS = 40;
export const MAX_LABEL = 200;
export const MAX_VALUE = 4000;
/** The whole submission, so a hundred short fields cannot add up to a novel. */
export const MAX_TOTAL = 20_000;

export type SubmissionField = { label: string; value: string };

export type ParseResult =
  | { ok: true; fields: SubmissionField[]; subject?: string }
  | { ok: false; error: string };

/**
 * Validate what the page sent. Rejects rather than truncates: a silently
 * shortened answer is worse than a refused one, because the sender is told it
 * arrived and the reader never learns a word is missing.
 */
export function parseSubmission(body: unknown): ParseResult {
  if (typeof body !== 'object' || body === null) return { ok: false, error: 'Body must be an object' };
  const raw = body as Record<string, unknown>;

  if (raw.fields === undefined) return { ok: false, error: 'Missing "fields"' };
  if (!Array.isArray(raw.fields)) return { ok: false, error: '"fields" must be an array' };
  if (raw.fields.length === 0) return { ok: false, error: 'Nothing to send — "fields" is empty' };
  if (raw.fields.length > MAX_FIELDS) {
    return { ok: false, error: `Too many fields (max ${MAX_FIELDS})` };
  }

  const fields: SubmissionField[] = [];
  let total = 0;

  for (const [i, entry] of raw.fields.entries()) {
    if (typeof entry !== 'object' || entry === null) {
      return { ok: false, error: `Field ${i} must be an object` };
    }
    const { label, value } = entry as Record<string, unknown>;
    if (typeof label !== 'string' || typeof value !== 'string') {
      // Everything a pitch collects is a string. A number or a nested object
      // means the page is sending something this was not built to carry.
      return { ok: false, error: `Field ${i}: "label" and "value" must both be text` };
    }
    if (label.length > MAX_LABEL) return { ok: false, error: `Field ${i}: label too long` };
    if (value.length > MAX_VALUE) return { ok: false, error: `Field ${i}: answer too long` };
    total += label.length + value.length;
    if (total > MAX_TOTAL) return { ok: false, error: 'Submission too large' };
    fields.push({ label, value });
  }

  let subject: string | undefined;
  if (raw.subject !== undefined) {
    if (typeof raw.subject !== 'string') return { ok: false, error: '"subject" must be text' };
    if (raw.subject.length > MAX_LABEL) return { ok: false, error: '"subject" too long' };
    subject = raw.subject;
  }

  return { ok: true, fields, subject };
}

/** Escape for HTML. ONE place — the answers are written by whoever opened the
 *  link, and they must never become markup in mail we send under our own name. */
function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * The mail body, in the same shell as every other Pitch Vault mail.
 *
 * Both forms are built from the SAME escaped data, so an answer cannot be safe
 * in one and markup in the other.
 */
export function renderSubmission(
  pitchTitle: string,
  fields: SubmissionField[],
): { html: string; text: string } {
  // A stacked label-over-answer block rather than a two-column table: the
  // answers are free text of unpredictable length, and a narrow label column
  // wraps into a ladder on a phone.
  const blocks = fields
    .map(
      (f) =>
        `      <div style="margin: 0 0 18px;">` +
        `<div style="color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:0.04em;margin:0 0 4px;">${esc(f.label)}</div>` +
        `<div style="color:#111827;font-size:15px;line-height:1.5;white-space:pre-wrap;">` +
        `${esc(f.value) || '<span style="color:#9ca3af;font-style:italic;">(ikke udfyldt)</span>'}` +
        `</div></div>`,
    )
    .join('\n');

  const body =
    `      <p style="margin: 0 0 24px; color: #374151;">Der er indsendt et svar p\u00e5 <strong>${esc(pitchTitle)}</strong>.</p>\n` +
    `      <div style="border-top: 1px solid #e5e7eb; padding-top: 20px;">\n${blocks}\n      </div>`;

  const html = emailShell({ heading: 'Nyt svar fra en pitch', body });

  const text =
    `Der er indsendt et svar p\u00e5 "${pitchTitle}".\n\n` +
    fields.map((f) => `${f.label}:\n${f.value || '(ikke udfyldt)'}`).join('\n\n') +
    `\n\n\u2014 ${EMAIL_FOOTER}`;

  return { html, text };
}
