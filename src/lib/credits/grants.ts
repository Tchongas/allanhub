/**
 * Concessão de créditos para produtos credit-based.
 *
 * Usa a RPC `grant_credits` no Supabase para garantir atomicidade e idempotência
 * (via `idempotency_key`). A carteira e o ledger são determinados pelo catálogo
 * em `src/lib/credits/catalog.ts`.
 */
import { createServiceRoleClient } from '@/lib/supabase/server';
import { getCreditWalletDefinition } from './catalog';

interface GrantCreditsParams {
  userId: string;
  productId: string;
  amount: number;
  referenceId: string;
  eventId: string;
  eventName: string;
  meta?: Record<string, unknown>;
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
}
