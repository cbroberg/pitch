import { NextRequest, NextResponse } from 'next/server';
import { verifyRegistrationResponse } from '@simplewebauthn/server';
import { getUser } from '@/lib/get-user';
import { createCredential } from '@/lib/db/queries/webauthn';
import {
  clearChallengeCookie,
  getChallengeCookie,
  getRequestOrigin,
  getRpConfig,
} from '@/lib/auth/webauthn';

export async function POST(request: NextRequest) {
  let user;
  try {
    user = await getUser();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const challengeData = await getChallengeCookie();
  if (!challengeData || challengeData.purpose !== 'register' || challengeData.userId !== user.id) {
    return NextResponse.json({ error: 'No active challenge' }, { status: 400 });
  }

  const origin = getRequestOrigin(request.headers);
  const { rpID } = getRpConfig(origin);

  const body = await request.json();
  const { response, name } = body as {
    response: Parameters<typeof verifyRegistrationResponse>[0]['response'];
    name?: string;
  };

  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: challengeData.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: false,
    });
  } catch (error) {
    console.error('Passkey register verify error:', error);
    return NextResponse.json({ error: 'Verification failed' }, { status: 400 });
  }

  if (!verification.verified || !verification.registrationInfo) {
    return NextResponse.json({ error: 'Verification failed' }, { status: 400 });
  }

  const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;

  createCredential({
    id: credential.id,
    userId: user.id,
    publicKey: Buffer.from(credential.publicKey).toString('base64url'),
    counter: credential.counter,
    transports: credential.transports ? JSON.stringify(credential.transports) : null,
    deviceType: credentialDeviceType,
    backedUp: credentialBackedUp,
    name: name || guessDeviceName(request.headers.get('user-agent') || ''),
  });

  await clearChallengeCookie();

  return NextResponse.json({ verified: true });
}

function guessDeviceName(userAgent: string): string {
  if (/Mac/i.test(userAgent)) return 'Mac';
  if (/iPhone/i.test(userAgent)) return 'iPhone';
  if (/iPad/i.test(userAgent)) return 'iPad';
  if (/Android/i.test(userAgent)) return 'Android';
  if (/Windows/i.test(userAgent)) return 'Windows';
  return 'Passkey';
}
