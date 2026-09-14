import { describe, it, expect } from 'vitest';
import { buildInviteEmail } from '@/lib/email/templates/invite';
import { buildUserInviteEmail } from '@/lib/email/templates/invite-user';
import { buildBatchInviteEmail } from '@/lib/email/templates/invite-batch';

/**
 * The three invitations go to CUSTOMERS. Lifting their shared shell into one
 * module must not change a single byte of what they render — so the shape is
 * pinned here first, and the refactor has to keep it. (F031.3)
 */
const built = {
  invite: buildInviteEmail({
    pitchTitle: 'Riberhusvej 9',
    viewUrl: 'https://pitch.broberg.ai/view/abc',
    expiresAt: null,
    pin: '123456',
  }),
  user: buildUserInviteEmail({
    inviteeName: 'Bettina',
    acceptUrl: 'https://pitch.broberg.ai/invite/t',
    invitedByName: 'Christian',
    expiresAt: new Date('2026-10-01T00:00:00Z'),
  }),
  batch: buildBatchInviteEmail({
    pitches: [{ title: 'A', viewUrl: 'https://pitch.broberg.ai/view/a' }],
    message: 'Se venligst denne',
  }),
};

describe('the invitations keep their shell (F031.3)', () => {
  for (const [name, mail] of Object.entries(built)) {
    it(`${name}: dark header with the logo`, () => {
      expect(mail.html).toContain('background: #0d0f1a');
      expect(mail.html).toContain('/pitch-vault-logo-email.png');
    });

    it(`${name}: white card on the grey ground`, () => {
      expect(mail.html).toContain('background: #f9fafb');
      expect(mail.html).toContain('max-width: 600px');
      expect(mail.html).toContain('border-radius: 8px');
    });

    it(`${name}: footer links back to the site`, () => {
      expect(mail.html).toContain('background: #f3f4f6');
      expect(mail.html).toContain('href="https://broberg.ai"');
    });

    it(`${name}: is a complete document`, () => {
      expect(mail.html).toContain('<!DOCTYPE html>');
      expect(mail.html.trimEnd()).toMatch(/<\/html>$/);
    });
  }
});
