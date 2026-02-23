import { JWTPayload, SignJWT } from 'jose';

export interface HubTokenPayload {
  sub: string;
  email: string;
  name?: string;
  product: string;
  nonce: string;
}

function getHubJwtSecret(): Uint8Array {
  const secret = String(process.env.HUB_JWT_SECRET || '').trim();
  if (!secret) {
    throw new Error('Missing HUB_JWT_SECRET');
  }

  return new TextEncoder().encode(secret);
}

export async function createHubToken(payload: HubTokenPayload): Promise<string> {
  const jwtPayload: JWTPayload = {
    sub: payload.sub,
    email: payload.email,
    name: payload.name,
    product: payload.product,
    nonce: payload.nonce,
  };

  return new SignJWT(jwtPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(getHubJwtSecret());
}

export function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}
