import { Resend } from 'resend';
import { buildInviteEmail } from './templates/invite';
import { buildUserInviteEmail } from './templates/invite-user';

function getResend(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('RESEND_API_KEY is not configured');
  return new Resend(apiKey);
}

export async function sendInviteEmail(params: {
  to: string;
  pitchTitle: string;
  viewUrl: string;
  message?: string;
  expiresAt: Date | null;
  pin?: string;
}): Promise<void> {
  const resend = getResend();
  const from =
    process.env.EMAIL_FROM || 'Pitch Vault <noreply@pitchvault.app>';

  const { html, text } = buildInviteEmail(params);

  const { error } = await resend.emails.send({
    from,
    to: params.to,
    subject: `You've been invited to view: ${params.pitchTitle}`,
    html,
    text,
  });

  if (error) {
    throw new Error(`Email send failed: ${error.message}`);
  }
}

export async function sendUserInviteEmail(params: {
  to: string;
  inviteeName: string;
  acceptUrl: string;
  invitedByName?: string;
  expiresAt: Date;
}): Promise<void> {
  const resend = getResend();
  const from =
    process.env.EMAIL_FROM || 'Pitch Vault <noreply@pitchvault.app>';

  const { html, text } = buildUserInviteEmail(params);

  const { error } = await resend.emails.send({
    from,
    to: params.to,
    subject: 'Du er inviteret som bruger af Pitch Vault',
    html,
    text,
  });

  if (error) {
    throw new Error(`Email send failed: ${error.message}`);
  }
}
