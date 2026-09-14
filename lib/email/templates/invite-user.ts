import { format } from 'date-fns';
import { EMAIL_FOOTER } from '@/lib/email/footer';
import { emailShell } from '@/lib/email/templates/layout';

export function buildUserInviteEmail(params: {
  inviteeName: string;
  acceptUrl: string;
  invitedByName?: string;
  expiresAt: Date;
}): { html: string; text: string } {
  const { inviteeName, acceptUrl, invitedByName, expiresAt } = params;

  const invitedByLine = invitedByName
    ? `<p style="margin: 0 0 16px; color: #374151;">${invitedByName} har inviteret dig som bruger af Pitch Vault.</p>`
    : `<p style="margin: 0 0 16px; color: #374151;">Du er inviteret som bruger af Pitch Vault.</p>`;

  const invitedByText = invitedByName
    ? `${invitedByName} har inviteret dig som bruger af Pitch Vault.`
    : 'Du er inviteret som bruger af Pitch Vault.';

  const expiryText = `Linket udløber ${format(expiresAt, 'PPP')}.`;

  const html = emailShell({
    heading: `Hej ${inviteeName},`,
    body: `      ${invitedByLine}
      <p style="margin: 0 0 16px; color: #374151;">Klik på knappen nedenfor for at oprette dit password og aktivere din konto.</p>
      <div style="margin: 24px 0;">
        <a href="${acceptUrl}" style="display: inline-block; background: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600;">Aktivér konto</a>
      </div>
      <p style="margin: 0 0 8px; color: #6b7280; font-size: 14px;">${expiryText}</p>
      <p style="margin: 0; color: #6b7280; font-size: 14px;">Eller kopiér linket: <a href="${acceptUrl}" style="color: #2563eb;">${acceptUrl}</a></p>`,
  });

  const text = [
    `Hej ${inviteeName},`,
    '',
    invitedByText,
    '',
    'Aktivér din konto her:',
    acceptUrl,
    '',
    expiryText,
    '',
    `— ${EMAIL_FOOTER}`,
  ].join('\n');

  return { html, text };
}
