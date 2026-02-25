import { Resend } from 'resend';
import { buildInviteEmail } from './templates/invite';

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
