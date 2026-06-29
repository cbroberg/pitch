import { EMAIL_FOOTER } from '@/lib/email/footer';

export function buildBatchInviteEmail(params: {
  pitches: { title: string; viewUrl: string; pin?: string }[];
  message?: string;
}): { html: string; text: string } {
  const { pitches, message } = params;
  const baseUrl = process.env.BASE_URL || 'https://pitch-vault.fly.dev';

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

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 0; background: #f9fafb;">
  <div style="max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <div style="background: #0d0f1a; padding: 28px 32px; text-align: center;">
      <img src="${baseUrl}/pitch-vault-logo-email.png" alt="Pitch Vault" width="300" height="122" style="height: 60px; width: auto; display: inline-block;" />
    </div>
    <div style="padding: 32px;">
      <h2 style="margin: 0 0 20px; color: #111827; font-size: 20px;">Du er inviteret til at se ${pitches.length === 1 ? 'en præsentation' : `${pitches.length} præsentationer`}</h2>
      ${messageBlock}
      ${pitchRows}
    </div>
    <div style="background: #f3f4f6; padding: 16px; text-align: center;">
      <p style="margin: 0; color: #9ca3af; font-size: 12px;">${EMAIL_FOOTER}</p>
    </div>
  </div>
</body>
</html>
  `.trim();

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
