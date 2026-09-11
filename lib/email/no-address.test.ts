import { describe, it, expect } from 'vitest';
import { buildInviteEmail } from '@/lib/email/templates/invite';
import { buildUserInviteEmail } from '@/lib/email/templates/invite-user';
import { buildBatchInviteEmail } from '@/lib/email/templates/invite-batch';
import { MAIL_FROM } from '@/lib/email/from';
import { SITE_URL } from '@/lib/email/footer';

/**
 * Christian, 11 September 2026: "der bør ikke være en synlig mail adresse, der
 * bør henvises til sitet broberg.ai". The mail is sent from a noreply, so the
 * site link is the only way a recipient can reach us — a stray address in the
 * body would be a dead end that looks like a way back. (F029.3)
 */
const ADDRESS = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}/;

const built = [
  [
    'invite',
    buildInviteEmail({
      pitchTitle: 'Riberhusvej 9',
      viewUrl: 'https://pitch.broberg.ai/view/abc',
      expiresAt: null,
      pin: '123456',
    }),
  ],
  [
    'user-invite',
    buildUserInviteEmail({
      inviteeName: 'Bettina',
      acceptUrl: 'https://pitch.broberg.ai/invite/t',
      invitedByName: 'Christian',
      expiresAt: new Date('2026-10-01'),
    }),
  ],
  [
    'batch',
    buildBatchInviteEmail({
      pitches: [{ title: 'A', viewUrl: 'https://pitch.broberg.ai/view/a' }],
      message: 'Se venligst denne',
    }),
  ],
] as const;

describe('the mail shows no email address, and does point at the site (F029.3)', () => {
  for (const [name, mail] of built) {
    it(`${name}: neither the HTML nor the plain text contains an address`, () => {
      // Assert on the RENDERED mail, not on the source — a template could grow
      // an address through a variable and a source-grep would stay green.
      expect(mail.html.match(ADDRESS)?.[0] ?? null).toBeNull();
      expect(mail.text.match(ADDRESS)?.[0] ?? null).toBeNull();
    });

    it(`${name}: the way back is a clickable link to the site`, () => {
      expect(mail.html).toContain(`href="${SITE_URL}"`);
      expect(mail.text).toContain(SITE_URL);
    });
  }

  it('the sender is on a domain we own, never the old stranger domain', () => {
    expect(MAIL_FROM).toContain('broberg.ai');
    expect(MAIL_FROM).not.toContain('pitchvault.app');
  });

  it('what this does NOT promise: a name supplied by the caller is printed verbatim', () => {
    // /api/users/invite passes the invitee's own `name` straight through, and
    // people are routinely invited under their email address. That is THEIR
    // address shown back to them, not a contact route we added — so it is out
    // of scope here, and stated rather than left for someone to discover.
    const withAddressAsName = buildUserInviteEmail({
      inviteeName: 'bgb@webhouse.dk',
      acceptUrl: 'https://pitch.broberg.ai/invite/t',
      expiresAt: new Date('2026-10-01'),
    });
    expect(withAddressAsName.html).toContain('bgb@webhouse.dk');
  });

  it('MUTATION CONTROL: the address pattern really does catch one', () => {
    // If this ever fails, every assertion above is measuring nothing.
    expect('skriv til os på hej@broberg.ai').toMatch(ADDRESS);
  });
});
