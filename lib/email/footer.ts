/**
 * The one line at the bottom of every invite. (F029.3)
 *
 * Deliberately a LINK to the site and not an email address: the mail is sent
 * from a noreply, so the site is the only way back to us. A plain-text mention
 * is not a way back.
 */
export const SITE_URL = 'https://broberg.ai';

/** Plain-text mail. */
export const EMAIL_FOOTER = `Shared via Pitch Vault by ${SITE_URL}`;

/** HTML mail — same words, but the referral is clickable. */
export const EMAIL_FOOTER_HTML =
  `Shared via Pitch Vault by <a href="${SITE_URL}" style="color: #6b7280;">broberg.ai</a>`;
