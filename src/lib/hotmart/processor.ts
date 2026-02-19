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

async function resolveMappedProductId(productUcode: string): Promise<string | null> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from('hotmart_product_mappings')
    .select('product_id')
    .eq('hotmart_product_ucode', productUcode)
    .eq('active', true)
    .limit(1);

  if (error) {
    throw new Error(`Failed to resolve product mapping: ${error.message}`);
  }

  if (!data || data.length === 0) return null;
  return data[0].product_id as string;
}

async function grantProductToUser(userId: string, productId: string, transaction: string, eventId: string): Promise<boolean> {
  const supabase = createServiceRoleClient();

  const { data: existing } = await supabase
    .from('user_products')
    .select('id')
    .eq('user_id', userId)
    .eq('product_id', productId)
    .eq('status', 'active')
    .gt('expires_at', new Date().toISOString())
    .limit(1);

  if (existing && existing.length > 0) {
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

  const { error: ledgerError } = await supabase.from('hotmart_grants').upsert(
    {
      purchase_transaction: transaction,
      product_id: productId,
      user_id: userId,
      source_event_id: eventId,
      purchase_status: 'APPROVED',
      metadata: {},
    },
    { onConflict: 'purchase_transaction,product_id,user_id' }
  );

  if (ledgerError) {
    throw new Error(`Failed to write hotmart grant ledger: ${ledgerError.message}`);
  }

  return true;
}

async function revokeProductFromUser(userId: string, productId: string, transaction: string, eventId: string, purchaseStatus: string): Promise<void> {
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

  await supabase.from('hotmart_grants').upsert(
    {
      purchase_transaction: transaction,
      product_id: productId,
      user_id: userId,
      source_event_id: eventId,
      purchase_status: purchaseStatus,
      revoked_at: new Date().toISOString(),
      metadata: {},
    },
    { onConflict: 'purchase_transaction,product_id,user_id' }
  );
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

  const productId = await resolveMappedProductId(productUcode);
  if (!productId) {
    return {
      accepted: false,
      status: 'failed',
      reason: `No active product mapping for Hotmart ucode ${productUcode}`,
    };
  }

  const hubUser = await ensureHubUserByEmail(normalizedEmail, buyerName);

  if (GRANT_EVENTS.has(eventName)) {
    const grantCreated = await grantProductToUser(hubUser.id, productId, transaction, eventId);
    return { accepted: true, status: 'processed', grantCreated };
  }

  if (REVOKE_EVENTS.has(eventName)) {
    await revokeProductFromUser(hubUser.id, productId, transaction, eventId, eventName);
    return { accepted: true, status: 'processed' };
  }

  return {
    accepted: true,
    status: 'ignored',
    reason: `Unhandled event ${eventName}. Extend processor mapping if needed.`,
  };
}
