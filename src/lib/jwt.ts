import { SignJWT, JWTPayload } from 'jose';

function getJwtSecret(): Uint8Array {
  const secret = String(process.env.HUB_JWT_SECRET || process.env.JWT_SECRET || process.env.SUPABASE_JWT_SECRET || '').trim();
  if (!secret) {
    throw new Error('Missing JWT secret (set HUB_JWT_SECRET, JWT_SECRET, or SUPABASE_JWT_SECRET)');
  }

  return new TextEncoder().encode(secret);
}

export interface ProductTokenPayload {
  sub: string;
  email: string;
  name?: string;
  product: string;
  nonce: string;
}

export async function generateProductToken(payload: ProductTokenPayload): Promise<string> {
  const jwtPayload: JWTPayload = {
    sub: payload.sub,
    email: payload.email,
    name: payload.name,
    product: payload.product,
    nonce: payload.nonce,
  };

  const token = await new SignJWT(jwtPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(getJwtSecret());

  return token;
}

export function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}
