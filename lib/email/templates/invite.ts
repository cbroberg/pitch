import { format } from 'date-fns';

export function buildInviteEmail(params: {
  pitchTitle: string;
  viewUrl: string;
  message?: string;
  expiresAt: Date | null;
}): { html: string; text: string } {
  const { pitchTitle, viewUrl, message, expiresAt } = params;
  const baseUrl = process.env.BASE_URL || 'https://pitch-vault.fly.dev';

  const expiryText = expiresAt
    ? `This link expires on ${format(expiresAt, 'PPP')}.`
    : 'This link does not expire.';

  const messageBlock = message
    ? `<p style="margin: 0 0 16px; color: #374151;">${message}</p>`
    : '';

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
      <img src="${baseUrl}/pitch-vault-logo-dark.svg" alt="Pitch Vault" width="200" height="114" style="height: 48px; width: auto; display: inline-block;" />
    </div>
    <div style="padding: 32px;">
      <h2 style="margin: 0 0 16px; color: #111827; font-size: 20px;">You've been invited to view a pitch</h2>
      <p style="margin: 0 0 8px; color: #374151;"><strong>${pitchTitle}</strong></p>
      ${messageBlock}
      <div style="margin: 24px 0;">
        <a href="${viewUrl}" style="display: inline-block; background: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600;">View Pitch</a>
      </div>
      <p style="margin: 0 0 8px; color: #6b7280; font-size: 14px;">${expiryText}</p>
      <p style="margin: 0; color: #6b7280; font-size: 14px;">Or copy this link: <a href="${viewUrl}" style="color: #2563eb;">${viewUrl}</a></p>
    </div>
    <div style="background: #f3f4f6; padding: 16px; text-align: center;">
      <p style="margin: 0; color: #9ca3af; font-size: 12px;">Shared via Pitch Vault by Broberg</p>
    </div>
  </div>
</body>
</html>
  `.trim();

  const text = [
    `You've been invited to view: ${pitchTitle}`,
    '',
    message || '',
    `View it here: ${viewUrl}`,
    '',
    expiryText,
    '',
    '— Shared via Pitch Vault by Broberg',
  ]
    .filter((l) => l !== undefined)
    .join('\n');

  return { html, text };
}
