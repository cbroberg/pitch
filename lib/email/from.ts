/**
 * Who Pitch Vault's mail comes from. One place, so a change is one edit. (F029.3)
 *
 * The fallback used to be `noreply@pitchvault.app` — a domain we do not own. An
 * empty EMAIL_FROM would have sent mail claiming a stranger's domain, with no
 * SPF or DKIM behind it, straight into spam filters, under our name. It falls
 * back to the domain we actually send from instead.
 *
 * `noreply` (one word) matches the fleet's house pattern "<Product> <noreply@domain>".
 */
export const MAIL_FROM = process.env.EMAIL_FROM || 'Pitch Vault <noreply@broberg.ai>';
