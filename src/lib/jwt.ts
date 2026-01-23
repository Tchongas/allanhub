import { SignJWT, JWTPayload } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-min-32-characters-long'
);

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
    .sign(JWT_SECRET);

  return token;
}

export function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}
