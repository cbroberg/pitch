import { buildInviteEmail } from './templates/invite';
import { buildUserInviteEmail } from './templates/invite-user';
import { buildBatchInviteEmail } from './templates/invite-batch';
import { mailer } from '@/lib/email/mailer';
import type { MailResult } from '@broberg/mail';

/**
 * Sending goes through @broberg/mail (F031.1). The package never throws and
 * never lets a failure look like a success — but it DOES answer
 * `{ ok: true, skipped: true }` when the gate is shut, and these callers treat
 * a resolved promise as "the customer got it". So a skip is raised here rather
 * than swallowed: an invitation that reached nobody must not return quietly.
 */
function throwIfNotDelivered(result: MailResult, what: string): void {
  if (!result.ok) throw new Error(`Email send failed (${what}): ${result.error}`);
  if (result.skipped) {
    throw new Error(
      `Email NOT delivered (${what}): the mail gate is shut — reason "${result.reason}". ` +
        `Nothing was sent. Fix the gate rather than retrying.`,
    );
  }
}

export async function sendInviteEmail(params: {
  to: string;
  pitchTitle: string;
  viewUrl: string;
  message?: string;
  expiresAt: Date | null;
  pin?: string;
}): Promise<void> {
  const { html, text } = buildInviteEmail(params);

  const result = await mailer().send({
    to: params.to,
    subject: `You've been invited to view: ${params.pitchTitle}`,
    html,
    text,
  });

  throwIfNotDelivered(result, 'invite');
}

export async function sendUserInviteEmail(params: {
  to: string;
  inviteeName: string;
  acceptUrl: string;
  invitedByName?: string;
  expiresAt: Date;
}): Promise<void> {
  const { html, text } = buildUserInviteEmail(params);

  const result = await mailer().send({
    to: params.to,
    subject: 'Du er inviteret som bruger af Pitch Vault',
    html,
    text,
  });

  throwIfNotDelivered(result, 'user-invite');
}

export async function sendBatchInviteEmail(params: {
  to: string;
  cc?: string[];
  pitches: { title: string; viewUrl: string; pin?: string }[];
  message?: string;
}): Promise<void> {
  const { html, text } = buildBatchInviteEmail(params);
  const subject = params.pitches.length === 1
    ? `Du er inviteret til at se: ${params.pitches[0].title}`
    : `Du er inviteret til at se ${params.pitches.length} præsentationer`;

  const result = await mailer().send({
    to: params.to,
    ...(params.cc && params.cc.length > 0 ? { cc: params.cc } : {}),
    subject,
    html,
    text,
  });
  throwIfNotDelivered(result, 'batch-invite');
}
