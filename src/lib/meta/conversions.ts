import { createHash } from 'node:crypto';

interface MetaStartTrialParams {
  userId: string;
  email: string;
  source: 'wallet_created';
}

export type MetaProductId = 'festa-magica' | 'car-studio';

interface MetaStartTrialForProductParams extends MetaStartTrialParams {
  productId: MetaProductId;
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function normalizeEmail(email: string): string {
  return String(email || '').trim().toLowerCase();
}

function getMetaConfig(productId: MetaProductId) {
  const isCarStudio = productId === 'car-studio';
  const pixelId = String(
    isCarStudio
      ? process.env.META_CAR_STUDIO_PIXEL_ID || ''
      : process.env.META_PIXEL_ID || process.env.NEXT_PUBLIC_META_PIXEL_ID || ''
  ).trim();
  const accessToken = String(
    isCarStudio ? process.env.META_CAR_STUDIO_ACCESS_TOKEN || '' : process.env.META_ACCESS_TOKEN || ''
  ).trim();
  const testEventCode = String(
    isCarStudio ? process.env.META_CAR_STUDIO_TEST_EVENT_CODE || '' : process.env.META_TEST_EVENT_CODE || ''
  ).trim();

  if (!pixelId || !accessToken) {
    return null;
  }

  return {
    pixelId,
    accessToken,
    testEventCode,
  };
}

export async function sendMetaStartTrialForProductAccountCreated(
  params: MetaStartTrialForProductParams
): Promise<void> {
  const config = getMetaConfig(params.productId);
  if (!config) return;

  const normalizedEmail = normalizeEmail(params.email);
  if (!normalizedEmail) return;

  const payload: {
    data: Array<Record<string, unknown>>;
    test_event_code?: string;
    access_token: string;
  } = {
    data: [
      {
        event_name: 'StartTrial',
        event_time: Math.floor(Date.now() / 1000),
        action_source: 'website',
        user_data: {
          em: [sha256(normalizedEmail)],
          external_id: [sha256(params.userId)],
        },
        custom_data: {
          source: params.source,
          product: params.productId,
          account_created: true,
        },
      },
    ],
    access_token: config.accessToken,
  };

  if (config.testEventCode) {
    payload.test_event_code = config.testEventCode;
  }

  const response = await fetch(`https://graph.facebook.com/v19.0/${config.pixelId}/events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });

  if (!response.ok) {
    const responseText = await response.text();
    throw new Error(`Meta CAPI request failed (${response.status}): ${responseText}`);
  }
}
