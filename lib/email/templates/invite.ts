import { format } from 'date-fns';
import { EMAIL_FOOTER } from '@/lib/email/footer';
import { emailShell } from '@/lib/email/templates/layout';

export function buildInviteEmail(params: {
  pitchTitle: string;
  viewUrl: string;
  message?: string;
  expiresAt: Date | null;
  pin?: string;
}): { html: string; text: string } {
  const { pitchTitle, viewUrl, message, expiresAt, pin } = params;

  const expiryText = expiresAt
    ? `This link expires on ${format(expiresAt, 'PPP')}.`
    : 'This link does not expire.';

  const messageBlock = message
    ? `<p style="margin: 0 0 16px; color: #374151;">${message}</p>`
    : '';

  const pinBlock = pin
    ? `
      <div style="margin: 24px 0; text-align: center;">
        <p style="margin: 0 0 8px; color: #6b7280; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em;">Your access code</p>
        <div style="display: inline-flex; gap: 6px; font-family: 'SF Mono', SFMono-Regular, Menlo, Monaco, monospace;">
          ${pin.split('').map((d) => `<span style="display: inline-block; width: 40px; height: 48px; line-height: 48px; text-align: center; font-size: 24px; font-weight: 700; color: #111827; background: #f3f4f6; border: 1px solid #d1d5db; border-radius: 8px;">${d}</span>`).join('')}
        </div>
        <p style="margin: 8px 0 0; color: #9ca3af; font-size: 12px;">Enter this code when you open the link</p>
      </div>`
    : '';

  const html = emailShell({
    heading: `You've been invited to view a pitch`,
    body: `      <p style="margin: 0 0 8px; color: #374151;"><strong>${pitchTitle}</strong></p>
      ${messageBlock}
      <div style="margin: 24px 0;">
        <a href="${viewUrl}" style="display: inline-block; background: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600;">View Pitch</a>
      </div>
      ${pinBlock}
      <p style="margin: 0 0 8px; color: #6b7280; font-size: 14px;">${expiryText}</p>
      <p style="margin: 0; color: #6b7280; font-size: 14px;">Or copy this link: <a href="${viewUrl}" style="color: #2563eb;">${viewUrl}</a></p>`,
  });

  const text = [
    `You've been invited to view: ${pitchTitle}`,
    '',
    message || '',
    `View it here: ${viewUrl}`,
    '',
    pin ? `Your access code: ${pin}` : '',
    pin ? 'Enter this code when you open the link.' : '',
    '',
    expiryText,
    '',
    `— ${EMAIL_FOOTER}`,
  ]
    .filter((l) => l !== undefined)
    .join('\n');

  return { html, text };
}
