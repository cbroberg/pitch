import { EMAIL_FOOTER_HTML } from '@/lib/email/footer';

/**
 * The shell every Pitch Vault mail sits in: dark logo header, white card,
 * footer with the link back to the site. (F031.3)
 *
 * Extracted because the form-answer mail arrived as a bare table while the
 * three invitations had this — Christian saw the difference immediately. The
 * fix is one shell rather than a fourth copy of it: four copies is the drift
 * the house rule exists to prevent, and the one nobody updates is the one a
 * customer receives.
 */
/**
 * Where the recipient's mail client fetches the logo from. ONE place: the
 * three invitations each carried their own copy of this fallback, and the one
 * nobody updates is the one that ends up pointing at a dead host.
 */
function logoBase(): string {
  return process.env.BASE_URL || 'https://pitch.broberg.ai';
}

export function emailShell(params: {
  /** The heading inside the card. */
  heading: string;
  /** Already-escaped HTML for the body. */
  body: string;
}): string {
  const { heading, body } = params;
  const baseUrl = logoBase();
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 0; background: #f9fafb;">
  <div style="max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <div style="background: #0d0f1a; padding: 28px 32px; text-align: center;">
      <img src="${baseUrl}/pitch-vault-logo-email.png" alt="Pitch Vault" width="300" height="122" style="height: 60px; width: auto; display: inline-block;" />
    </div>
    <div style="padding: 32px;">
      <h2 style="margin: 0 0 16px; color: #111827; font-size: 20px;">${heading}</h2>
${body}
    </div>
    <div style="background: #f3f4f6; padding: 16px; text-align: center;">
      <p style="margin: 0; color: #9ca3af; font-size: 12px;">${EMAIL_FOOTER_HTML}</p>
    </div>
  </div>
</body>
</html>`;
}
