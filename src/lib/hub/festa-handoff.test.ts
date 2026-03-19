import assert from 'node:assert/strict';
import test from 'node:test';
import { decodeJwt } from 'jose';
import {
  FESTA_PRODUCT_ID,
  buildFestaCallbackRedirectUrl,
  buildHubMembersErrorUrl,
  getAllowedFestaReturnToList,
  validateFestaHandoffRequest,
} from '@/lib/festa-handoff';
import { createHubToken } from '@/lib/hub/jwt';

test('allowlist includes callback URLs for FESTA_MAGICA_URL and FESTA_MAGICA_URLS', () => {
  const allowlist = getAllowedFestaReturnToList({
    ...process.env,
    FESTA_MAGICA_URL: 'https://membros.allanfulcher.com',
    FESTA_MAGICA_URLS: 'https://festa-magica.allanfulcher.com',
  });

  assert.deepEqual(
    allowlist.sort(),
    [
      'https://festa-magica.allanfulcher.com/auth/callback/google',
      'https://festa-magica.allanfulcher.com/api/auth/callback',
      'https://membros.allanfulcher.com/auth/callback/google',
      'https://membros.allanfulcher.com/api/auth/callback',
    ].sort()
  );
});

test('blocks invalid return_to', () => {
  const params = new URLSearchParams({
    product: FESTA_PRODUCT_ID,
    return_to: 'https://evil.example.com/api/auth/callback',
  });

  const result = validateFestaHandoffRequest(params, ['https://festa.example.com/api/auth/callback']);

  assert.equal(result.ok, false);
  assert.equal(result.error, 'festa_invalid_return_to');
});

test('blocks invalid redirect_to', () => {
  const params = new URLSearchParams({
    product: FESTA_PRODUCT_ID,
    return_to: 'https://festa.example.com/api/auth/callback',
    redirect_to: 'https://evil.example.com/steal',
  });

  const result = validateFestaHandoffRequest(params, ['https://festa.example.com/api/auth/callback']);

  assert.equal(result.ok, false);
  assert.equal(result.error, 'festa_invalid_redirect_to');
});

test('denied redirect keeps user in Hub with explicit error', () => {
  const errorUrl = buildHubMembersErrorUrl('https://hub.example.com', 'festa_no_access');
  const parsed = new URL(errorUrl);

  assert.equal(parsed.origin, 'https://hub.example.com');
  assert.equal(parsed.pathname, '/');
  assert.equal(parsed.searchParams.get('error'), 'festa_no_access');
  assert.equal(parsed.searchParams.get('product'), FESTA_PRODUCT_ID);
});

test('success redirect includes token and safe redirect_to', () => {
  const redirectUrl = buildFestaCallbackRedirectUrl({
    returnTo: 'https://festa.example.com/api/auth/callback',
    token: 'signed.jwt.token',
    redirectTo: '/criar',
  });

  const parsed = new URL(redirectUrl);
  assert.equal(parsed.origin, 'https://festa.example.com');
  assert.equal(parsed.pathname, '/api/auth/callback');
  assert.equal(parsed.searchParams.get('token'), 'signed.jwt.token');
  assert.equal(parsed.searchParams.get('redirect_to'), '/criar');
});

test('token contains required claims and short expiration', async () => {
  const previousSecret = process.env.HUB_JWT_SECRET;
  process.env.HUB_JWT_SECRET = 'unit-test-hub-secret-1234567890';

  try {
    const token = await createHubToken({
      sub: 'user-123',
      email: 'user@example.com',
      name: 'Test User',
      product: FESTA_PRODUCT_ID,
      nonce: 'abc123nonce',
    });

    const payload = decodeJwt(token);

    assert.equal(payload.sub, 'user-123');
    assert.equal(payload.email, 'user@example.com');
    assert.equal(payload.name, 'Test User');
    assert.equal(payload.product, FESTA_PRODUCT_ID);
    assert.equal(payload.nonce, 'abc123nonce');

    assert.equal(typeof payload.iat, 'number');
    assert.equal(typeof payload.exp, 'number');

    const ttlSeconds = (payload.exp as number) - (payload.iat as number);
    assert.ok(ttlSeconds > 0 && ttlSeconds <= 5 * 60, `Expected <= 300s, received ${ttlSeconds}s`);
  } finally {
    if (typeof previousSecret === 'string') {
      process.env.HUB_JWT_SECRET = previousSecret;
    } else {
      delete process.env.HUB_JWT_SECRET;
    }
  }
});
