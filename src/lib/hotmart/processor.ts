import { createServiceRoleClient } from '@/lib/supabase/server';
import { getProduct } from '@/lib/products';
import type { HotmartWebhookPayload, HotmartProcessResult } from './types';

const GRANT_EVENTS = new Set(['PURCHASE_APPROVED', 'PURCHASE_COMPLETE']);
const REVOKE_EVENTS = new Set(['PURCHASE_CANCELED', 'PURCHASE_REFUNDED', 'PURCHASE_CHARGEBACK', 'PURCHASE_EXPIRED']);
const IGNORE_EVENTS = new Set(['PURCHASE_DELAYED', 'PURCHASE_BILLET_PRINTED', 'PURCHASE_PROTEST']);

function normalizeEmail(email?: string): string {
  return String(email || '').trim().toLowerCase();
}

async function ensureHubUserByEmail(email: string, name?: string): Promise<{ id: string }> {
  const supabase = createServiceRoleClient();

  const { data: existing, error: existingError } = await supabase
    .from('hub_users')
    .select('id, name')
    .ilike('email', email)
    .order('created_at', { ascending: true })
    .limit(1);

  if (existingError) {
    throw new Error(`Failed to query hub user by email: ${existingError.message}`);
  }

  if (existing && existing.length > 0) {
    return { id: existing[0].id as string };
  }

  const { data: created, error: createError } = await supabase
    .from('hub_users')
    .insert({
      email,
      name: (name || '').trim() || email.split('@')[0],
    })
    .select('id')
    .single();

  if (createError) {
    const errorMessage = (createError.message || '').toLowerCase();
    const likelyDuplicate = errorMessage.includes('duplicate') || errorMessage.includes('unique');

    if (likelyDuplicate) {
      const { data: retried, error: retryError } = await supabase
        .from('hub_users')
        .select('id')
        .ilike('email', email)
        .order('created_at', { ascending: true })
        .limit(1);

      if (!retryError && retried && retried.length > 0) {
        return { id: retried[0].id as string };
      }
    }

    throw new Error(`Failed to create hub user for webhook grant: ${createError.message}`);
  }

  if (!created) {
    throw new Error('Failed to create hub user for webhook grant: unknown error');
  }

  return { id: created.id as string };
}

interface HotmartCreditMapping {
  productId: string;
  grantMode: 'access' | 'credits';
  creditsAmount: number | null;
}

async function resolveMappedCreditConfig(productUcode: string): Promise<HotmartCreditMapping | null> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from('hotmart_product_mappings')
    .select('product_id, grant_mode, credits_amount')
    .eq('hotmart_product_ucode', productUcode)
    .eq('active', true)
    .limit(1);

  if (error) {
    throw new Error(`Failed to resolve product mapping: ${error.message}`);
  }

  if (!data || data.length === 0) return null;

  const rawGrantMode = String((data[0] as any).grant_mode || 'access').toLowerCase();
  const grantMode: 'access' | 'credits' = rawGrantMode === 'credits' ? 'credits' : 'access';

  return {
    productId: data[0].product_id as string,
    grantMode,
    creditsAmount: data[0].credits_amount === null || data[0].credits_amount === undefined
      ? null
      : Number(data[0].credits_amount),
  };
}

async function hasApprovedGrantRecord(userId: string, productId: string, transaction: string): Promise<boolean> {
  const supabase = createServiceRoleClient();

  const { data } = await supabase
    .from('hotmart_grants')
    .select('id')
    .eq('purchase_transaction', transaction)
    .eq('product_id', productId)
    .eq('user_id', userId)
    .eq('purchase_status', 'APPROVED')
    .limit(1);

  return Boolean(data && data.length > 0);
}

async function upsertHotmartGrantRecord(params: {
  userId: string;
  productId: string;
  transaction: string;
  eventId: string;
  purchaseStatus: string;
  grantType: 'product' | 'credit';
  creditsAmount?: number | null;
  metadata?: Record<string, unknown>;
  revokedAt?: string;
}): Promise<void> {
  const supabase = createServiceRoleClient();
  const { error } = await supabase.from('hotmart_grants').upsert(
    {
      purchase_transaction: params.transaction,
      product_id: params.productId,
      user_id: params.userId,
      source_event_id: params.eventId,
      purchase_status: params.purchaseStatus,
      credits_amount: params.creditsAmount ?? null,
      grant_type: params.grantType,
      metadata: params.metadata || {},
      revoked_at: params.revokedAt || null,
    },
    { onConflict: 'purchase_transaction,product_id,user_id' }
  );

  if (error) {
    throw new Error(`Failed to write hotmart grant ledger: ${error.message}`);
  }
}

async function grantAccessToUser(
  userId: string,
  productId: string,
  transaction: string,
  eventId: string,
  eventName: string
): Promise<boolean> {
  const supabase = createServiceRoleClient();

  if (await hasApprovedGrantRecord(userId, productId, transaction)) {
    return false;
  }

  const { data: existingActive } = await supabase
    .from('user_products')
    .select('id')
    .eq('user_id', userId)
    .eq('product_id', productId)
    .eq('status', 'active')
    .gt('expires_at', new Date().toISOString())
    .limit(1);

  if (existingActive && existingActive.length > 0) {
    await upsertHotmartGrantRecord({
      userId,
      productId,
      transaction,
      eventId,
      purchaseStatus: 'APPROVED',
      grantType: 'product',
      metadata: { event_name: eventName, existing_entitlement: true },
    });
    return false;
  }

  const product = await getProduct(productId);
  if (!product) {
    throw new Error(`Mapped product not found: ${productId}`);
  }

  const activatedAt = new Date();
  const expiresAt = new Date();
  if (product.is_lifetime) {
    expiresAt.setFullYear(expiresAt.getFullYear() + 100);
  } else {
    expiresAt.setMonth(expiresAt.getMonth() + (product.duration_months || 3));
  }

  const syntheticActivationCode = `hotmart:${transaction}`;
  const { error: grantError } = await supabase.from('user_products').insert({
    user_id: userId,
    product_id: productId,
    status: 'active',
    activated_at: activatedAt.toISOString(),
    expires_at: expiresAt.toISOString(),
    activation_code: syntheticActivationCode,
    is_lifetime: product.is_lifetime,
  });

  if (grantError) {
    throw new Error(`Failed to create user product grant: ${grantError.message}`);
  }

  await upsertHotmartGrantRecord({
    userId,
    productId,
    transaction,
    eventId,
    purchaseStatus: 'APPROVED',
    grantType: 'product',
    metadata: { event_name: eventName },
  });

  return true;
}

async function grantCreditsToUser(
  userId: string,
  productId: string,
  creditsAmount: number,
  transaction: string,
  eventId: string,
  eventName: string
): Promise<boolean> {
  if (await hasApprovedGrantRecord(userId, productId, transaction)) {
    return false;
  }

  const supabase = createServiceRoleClient();

  if (creditsAmount <= 0) {
    throw new Error(`Invalid credits amount for mapped product ${productId}: ${creditsAmount}`);
  }

  const creditReference = `hotmart:${transaction}:${productId}:grant`;
  const { error: creditGrantError } = await supabase.rpc('grant_credits', {
    p_user_id: userId,
    p_amount: creditsAmount,
    p_source: 'hotmart_purchase',
    p_reference_id: creditReference,
    p_metadata: {
      event_id: eventId,
      event_name: eventName,
      product_id: productId,
      transaction,
    },
  });

  if (creditGrantError) {
    throw new Error(`Failed to grant credits: ${creditGrantError.message}`);
  }

  await upsertHotmartGrantRecord({
    userId,
    productId,
    transaction,
    eventId,
    purchaseStatus: 'APPROVED',
    grantType: 'credit',
    creditsAmount,
    metadata: { event_name: eventName },
  });

  return true;
}

async function revokeAccessGrant(
  userId: string,
  productId: string,
  transaction: string,
  eventId: string,
  purchaseStatus: string
): Promise<void> {
  const supabase = createServiceRoleClient();

  await supabase
    .from('user_products')
    .update({
      status: 'cancelled',
      expires_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('product_id', productId)
    .eq('status', 'active');

  await upsertHotmartGrantRecord({
    userId,
    productId,
    transaction,
    eventId,
    purchaseStatus,
    grantType: 'product',
    metadata: {},
    revokedAt: new Date().toISOString(),
  });
}

async function revokeCreditGrant(
  userId: string,
  productId: string,
  transaction: string,
  eventId: string,
  purchaseStatus: string
): Promise<void> {
  await upsertHotmartGrantRecord({
    userId,
    productId,
    transaction,
    eventId,
    purchaseStatus,
    grantType: 'credit',
    metadata: { revoked_without_wallet_debit: true },
    revokedAt: new Date().toISOString(),
  });
}

export async function processHotmartWebhookEvent(payload: HotmartWebhookPayload): Promise<HotmartProcessResult> {
  const eventName = String(payload.event || '').toUpperCase();
  const eventId = String(payload.id || '').trim();
  const transaction = String(payload.data?.purchase?.transaction || '').trim();
  const normalizedEmail = normalizeEmail(payload.data?.buyer?.email);
  const buyerName = String(payload.data?.buyer?.name || '').trim();
  const productUcode = String(payload.data?.product?.ucode || '').trim();

  if (!eventId) {
    return { accepted: false, status: 'failed', reason: 'Missing event id' };
  }

  if (!normalizedEmail) {
    return { accepted: false, status: 'failed', reason: 'Missing buyer email' };
  }

  if (!productUcode) {
    return { accepted: false, status: 'failed', reason: 'Missing product ucode' };
  }

  if (IGNORE_EVENTS.has(eventName)) {
    return { accepted: true, status: 'ignored', reason: `Event ${eventName} does not change entitlement` };
  }

  if (!transaction) {
    return { accepted: false, status: 'failed', reason: 'Missing purchase transaction' };
  }

  const creditConfig = await resolveMappedCreditConfig(productUcode);
  if (!creditConfig) {
    return {
      accepted: false,
      status: 'failed',
      reason: `No active product mapping for Hotmart ucode ${productUcode}`,
    };
  }

  const hubUser = await ensureHubUserByEmail(normalizedEmail, buyerName);

  if (GRANT_EVENTS.has(eventName)) {
    const grantCreated = creditConfig.grantMode === 'credits'
      ? await grantCreditsToUser(
          hubUser.id,
          creditConfig.productId,
          Number(creditConfig.creditsAmount || 0),
          transaction,
          eventId,
          eventName
        )
      : await grantAccessToUser(hubUser.id, creditConfig.productId, transaction, eventId, eventName);
    return { accepted: true, status: 'processed', grantCreated };
  }

  if (REVOKE_EVENTS.has(eventName)) {
    if (creditConfig.grantMode === 'credits') {
      await revokeCreditGrant(hubUser.id, creditConfig.productId, transaction, eventId, eventName);
    } else {
      await revokeAccessGrant(hubUser.id, creditConfig.productId, transaction, eventId, eventName);
    }
    return { accepted: true, status: 'processed' };
  }

  return {
    accepted: true,
    status: 'ignored',
    reason: `Unhandled event ${eventName}. Extend processor mapping if needed.`,
  };
}
