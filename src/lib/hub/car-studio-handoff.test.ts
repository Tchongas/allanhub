import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CAR_STUDIO_PRODUCT_ID,
  buildCarStudioCallbackRedirectUrl,
  buildCarStudioHandoffResumePath,
  buildHubMembersErrorUrlForCarStudio,
  getAllowedCarStudioReturnToList,
  validateCarStudioHandoffRequest,
} from '@/lib/car-studio-handoff';

test('allowlist includes callback URLs for CAR_STUDIO_URL and CAR_STUDIO_URLS', () => {
  const allowlist = getAllowedCarStudioReturnToList({
    ...process.env,
    CAR_STUDIO_URL: 'https://membros.allanfulcher.com',
    CAR_STUDIO_URLS: 'https://car-studio.allanfulcher.com',
  });

  assert.deepEqual(
    allowlist.sort(),
    [
      'https://car-studio.allanfulcher.com/auth/callback/google',
      'https://car-studio.allanfulcher.com/api/auth/callback',
      'https://membros.allanfulcher.com/auth/callback/google',
      'https://membros.allanfulcher.com/api/auth/callback',
    ].sort()
  );
});

test('blocks invalid return_to for car studio', () => {
  const params = new URLSearchParams({
    product: CAR_STUDIO_PRODUCT_ID,
    return_to: 'https://evil.example.com/api/auth/callback',
    nonce: '45f7d6dc-8f08-45d2-a8f2-cf54393a1548',
  });

  const result = validateCarStudioHandoffRequest(params, ['https://car.example.com/api/auth/callback']);

  assert.equal(result.ok, false);
  assert.equal(result.error, 'car_studio_invalid_return_to');
});

test('blocks missing nonce for car studio', () => {
  const params = new URLSearchParams({
    product: CAR_STUDIO_PRODUCT_ID,
    return_to: 'https://car.example.com/api/auth/callback',
  });

  const result = validateCarStudioHandoffRequest(params, ['https://car.example.com/api/auth/callback']);

  assert.equal(result.ok, false);
  assert.equal(result.error, 'car_studio_invalid_nonce');
});

test('blocks invalid redirect_to for car studio', () => {
  const params = new URLSearchParams({
    product: CAR_STUDIO_PRODUCT_ID,
    return_to: 'https://car.example.com/api/auth/callback',
    nonce: '45f7d6dc-8f08-45d2-a8f2-cf54393a1548',
    redirect_to: 'https://evil.example.com/steal',
  });

  const result = validateCarStudioHandoffRequest(params, ['https://car.example.com/api/auth/callback']);

  assert.equal(result.ok, false);
  assert.equal(result.error, 'car_studio_invalid_redirect_to');
});

test('denied redirect keeps user in Hub with explicit car studio error', () => {
  const errorUrl = buildHubMembersErrorUrlForCarStudio('https://hub.example.com', 'car_studio_no_access');
  const parsed = new URL(errorUrl);

  assert.equal(parsed.origin, 'https://hub.example.com');
  assert.equal(parsed.pathname, '/');
  assert.equal(parsed.searchParams.get('error'), 'car_studio_no_access');
  assert.equal(parsed.searchParams.get('product'), CAR_STUDIO_PRODUCT_ID);
});

test('success redirect includes token and safe redirect_to for car studio', () => {
  const redirectUrl = buildCarStudioCallbackRedirectUrl({
    returnTo: 'https://car.example.com/api/auth/callback',
    token: 'signed.jwt.token',
    redirectTo: '/create',
  });

  const parsed = new URL(redirectUrl);
  assert.equal(parsed.origin, 'https://car.example.com');
  assert.equal(parsed.pathname, '/api/auth/callback');
  assert.equal(parsed.searchParams.get('token'), 'signed.jwt.token');
  assert.equal(parsed.searchParams.get('redirect_to'), '/create');
});

test('resume path keeps incoming nonce for oauth roundtrip', () => {
  const resumePath = buildCarStudioHandoffResumePath({
    product: CAR_STUDIO_PRODUCT_ID,
    returnTo: 'https://car.example.com/api/auth/callback',
    nonce: '45f7d6dc-8f08-45d2-a8f2-cf54393a1548',
    redirectTo: '/create',
  });

  const parsed = new URL(resumePath, 'https://hub.example.com');
  assert.equal(parsed.pathname, '/api/auth/car-studio/start');
  assert.equal(parsed.searchParams.get('nonce'), '45f7d6dc-8f08-45d2-a8f2-cf54393a1548');
});
