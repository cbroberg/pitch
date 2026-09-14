import { EMAIL_FOOTER } from '@/lib/email/footer';
import { emailShell } from '@/lib/email/templates/layout';

export function buildBatchInviteEmail(params: {
  pitches: { title: string; viewUrl: string; pin?: string }[];
  message?: string;
}): { html: string; text: string } {
  const { pitches, message } = params;

  const messageBlock = message
    ? `<p style="margin: 0 0 20px; color: #374151; line-height: 1.6;">${message.replace(/\n/g, '<br>')}</p>`
    : '';

  const pitchRows = pitches
    .map(
      (p) => `
    <div style="margin-bottom: 16px; padding: 16px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px;">
      <p style="margin: 0 0 10px; font-weight: 600; color: #111827;">${p.title}</p>
      ${p.pin ? `<p style="margin: 0 0 8px; color: #6b7280; font-size: 13px;">Adgangskode: <strong style="font-family: monospace; letter-spacing: 0.1em; color: #111827;">${p.pin}</strong></p>` : ''}
      <a href="${p.viewUrl}" style="display: inline-block; background: #2563eb; color: #ffffff; text-decoration: none; padding: 8px 18px; border-radius: 6px; font-size: 14px; font-weight: 600;">Se præsentation →</a>
    </div>`
    )
    .join('');

  const html = emailShell({
    heading: `Du er inviteret til at se ${pitches.length === 1 ? 'en præsentation' : `${pitches.length} præsentationer`}`,
    body: `      ${messageBlock}
      ${pitchRows}`,
  });

  const textPitches = pitches
    .map((p) => `• ${p.title}\n  ${p.viewUrl}${p.pin ? `\n  Adgangskode: ${p.pin}` : ''}`)
    .join('\n\n');

  const text = [
    `Du er inviteret til at se ${pitches.length === 1 ? 'en præsentation' : `${pitches.length} præsentationer`}`,
    '',
    message || '',
    message ? '' : '',
    textPitches,
    '',
    `— ${EMAIL_FOOTER}`,
  ]
    .filter((l) => l !== undefined)
    .join('\n');

  return { html, text };
}
