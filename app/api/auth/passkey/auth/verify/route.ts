import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import {
  getCredentialById,
  updateCredentialCounter,
} from '@/lib/db/queries/webauthn';
import {
  clearChallengeCookie,
  getChallengeCookie,
  getRequestOrigin,
  getRpConfig,
} from '@/lib/auth/webauthn';
import { createSession, setSessionCookie } from '@/lib/auth/session';

export async function POST(request: NextRequest) {
  const challengeData = await getChallengeCookie();
  if (!challengeData || challengeData.purpose !== 'authenticate') {
    return NextResponse.json({ error: 'No active challenge' }, { status: 400 });
  }

  const origin = getRequestOrigin(request.headers);
  const { rpID } = getRpConfig(origin);

  const body = await request.json();
  const response = body.response as Parameters<
    typeof verifyAuthenticationResponse
  >[0]['response'];

  const credential = getCredentialById(response.id);
  if (!credential) {
    return NextResponse.json({ error: 'Unknown credential' }, { status: 401 });
  }

  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: challengeData.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: {
        id: credential.id,
        publicKey: new Uint8Array(Buffer.from(credential.publicKey, 'base64url')),
        counter: credential.counter,
        transports: credential.transports
          ? (JSON.parse(credential.transports) as AuthenticatorTransport[])
          : undefined,
      },
      requireUserVerification: false,
    });
  } catch (error) {
    console.error('Passkey auth verify error:', error);
    return NextResponse.json({ error: 'Verification failed' }, { status: 401 });
  }

  if (!verification.verified) {
    return NextResponse.json({ error: 'Verification failed' }, { status: 401 });
  }

  updateCredentialCounter(credential.id, verification.authenticationInfo.newCounter);

  const sessionId = await createSession(credential.userId);
  await setSessionCookie(sessionId);

  await clearChallengeCookie();

  return NextResponse.json({ verified: true });
}
