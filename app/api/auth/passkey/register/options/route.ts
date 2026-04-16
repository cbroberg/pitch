import { NextRequest, NextResponse } from 'next/server';
import { generateRegistrationOptions } from '@simplewebauthn/server';
import { getUser } from '@/lib/get-user';
import { getCredentialsByUserId } from '@/lib/db/queries/webauthn';
import { getRequestOrigin, getRpConfig, setChallengeCookie } from '@/lib/auth/webauthn';

export async function POST(request: NextRequest) {
  let user;
  try {
    user = await getUser();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const origin = getRequestOrigin(request.headers);
  const { rpID, rpName } = getRpConfig(origin);

  const existing = getCredentialsByUserId(user.id);

  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userID: new TextEncoder().encode(user.id),
    userName: user.email,
    userDisplayName: user.name,
    attestationType: 'none',
    excludeCredentials: existing.map((c) => ({
      id: c.id,
      transports: c.transports ? (JSON.parse(c.transports) as AuthenticatorTransport[]) : undefined,
    })),
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred',
    },
  });

  await setChallengeCookie(options.challenge, 'register', user.id);

  return NextResponse.json(options);
}
