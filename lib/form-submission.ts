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

/** The mail body. Both forms are built from the SAME escaped data, so an answer
 *  cannot be safe in one and markup in the other. */
export function renderSubmission(
  pitchTitle: string,
  fields: SubmissionField[],
): { html: string; text: string } {
  const rows = fields
    .map(
      (f) =>
        `<tr>` +
        `<td style="padding:6px 12px 6px 0;color:#6b7280;vertical-align:top;white-space:nowrap;">${esc(f.label)}</td>` +
        `<td style="padding:6px 0;color:#111827;">${esc(f.value) || '<em style="color:#9ca3af;">(tomt)</em>'}</td>` +
        `</tr>`,
    )
    .join('');

  const html =
    `<p style="color:#374151;">Et svar er indsendt fra <strong>${esc(pitchTitle)}</strong>.</p>` +
    `<table style="border-collapse:collapse;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;">${rows}</table>`;

  const text =
    `Et svar er indsendt fra "${pitchTitle}".\n\n` +
    fields.map((f) => `${f.label}: ${f.value || '(tomt)'}`).join('\n');

  return { html, text };
}
