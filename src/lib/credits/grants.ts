import { createServiceRoleClient } from '@/lib/supabase/server';
import { getCreditWalletDefinition } from './catalog';
import {
  sendMetaStartTrialForProductAccountCreated,
  type MetaProductId,
} from '@/lib/meta/conversions';

interface GrantCreditsParams {
  userId: string;
  productId: string;
  amount: number;
  referenceId: string;
  eventId: string;
  eventName: string;
  meta?: Record<string, unknown>;
}

const START_TRIAL_PRODUCT_IDS = new Set<MetaProductId>(['festa-magica', 'car-studio']);

async function walletRowExists(params: {
  userId: string;
  productId: MetaProductId;
  walletKey: string;
}): Promise<boolean> {
  const supabase = createServiceRoleClient();

  if (params.productId === 'festa-magica') {
    const { data, error } = await supabase
      .from('user_credit_wallets')
      .select('user_id')
      .eq('user_id', params.userId)
      .limit(1);

    if (error) {
      throw new Error(`Failed to query festa wallet row: ${error.message}`);
    }

    return Boolean(data && data.length > 0);
  }

  const { data, error } = await supabase
    .from('cs_user_wallets')
    .select('user_id')
    .eq('user_id', params.userId)
    .eq('wallet_key', params.walletKey)
    .limit(1);

  if (error) {
    throw new Error(`Failed to query car studio wallet row: ${error.message}`);
  }

  return Boolean(data && data.length > 0);
}

async function getHubUserEmail(userId: string): Promise<string | null> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from('hub_users')
    .select('email')
    .eq('id', userId)
    .single();

  if (error || !data?.email) {
    return null;
  }

  return String(data.email).trim().toLowerCase() || null;
}

export async function grantCreditsForProduct(params: GrantCreditsParams): Promise<void> {
  const walletDefinition = getCreditWalletDefinition(params.productId);
  if (!walletDefinition) {
    throw new Error(`No credit wallet definition found for product ${params.productId}`);
  }

  if (!params.amount || params.amount <= 0) {
    throw new Error(`Invalid credit amount for product ${params.productId}: ${params.amount}`);
  }

  const supabase = createServiceRoleClient();
  const idempotencyKey = `${walletDefinition.walletKey}:${params.eventId}`;
  const startTrialProductId = START_TRIAL_PRODUCT_IDS.has(params.productId as MetaProductId)
    ? (params.productId as MetaProductId)
    : null;
  const hadWalletBeforeGrant = startTrialProductId
    ? await walletRowExists({
        userId: params.userId,
        productId: startTrialProductId,
        walletKey: walletDefinition.walletKey,
      })
    : true;

  const { error } = await supabase.rpc('grant_credits', {
    p_user_id: params.userId,
    p_amount: Math.floor(params.amount),
    p_reason: walletDefinition.grantReason,
    p_reference_type: walletDefinition.referenceType,
    p_reference_id: params.referenceId,
    p_idempotency_key: idempotencyKey,
    p_meta: {
      wallet_key: walletDefinition.walletKey,
      wallet_label: walletDefinition.label,
      product_id: params.productId,
      event: params.eventName,
      event_id: params.eventId,
      ...(params.meta || {}),
    },
  });

  if (error) {
    throw new Error(`Failed to grant credits for ${walletDefinition.walletKey}: ${error.message}`);
  }

  if (!startTrialProductId || hadWalletBeforeGrant) {
    return;
  }

  const hasWalletAfterGrant = await walletRowExists({
    userId: params.userId,
    productId: startTrialProductId,
    walletKey: walletDefinition.walletKey,
  });
  if (!hasWalletAfterGrant) {
    return;
  }

  const email = await getHubUserEmail(params.userId);
  if (!email) {
    return;
  }

  try {
    await sendMetaStartTrialForProductAccountCreated({
      productId: startTrialProductId,
      userId: params.userId,
      email,
      source: 'wallet_created',
    });
  } catch (trackingError) {
    console.warn('meta_start_trial_wallet_tracking_failed', {
      user_id: params.userId,
      product_id: startTrialProductId,
      wallet_key: walletDefinition.walletKey,
      message: trackingError instanceof Error ? trackingError.message : 'unknown tracking error',
    });
  }
}
