import { NextRequest, NextResponse } from 'next/server';
import { generateAuthenticationOptions } from '@simplewebauthn/server';
import { getRequestOrigin, getRpConfig, setChallengeCookie } from '@/lib/auth/webauthn';

export async function POST(request: NextRequest) {
  const origin = getRequestOrigin(request.headers);
  const { rpID } = getRpConfig(origin);

  // Usernameless / discoverable credentials: no allowCredentials list,
  // browser shows all matching passkeys to choose from.
  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: 'preferred',
  });

  await setChallengeCookie(options.challenge, 'authenticate');

  return NextResponse.json(options);
}
