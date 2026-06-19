/**
 * Catálogo de carteiras de crédito por produto.
 *
 * Produtos credit-based (ex: Festa Mágica, Car Studio) precisam estar neste
 * registro para que o processador Hotmart e o painel admin reconheçam suas
 * wallets e ledgers. Para adicionar um novo produto credit-based, registre-o
 * em `CREDIT_WALLET_DEFINITIONS` e crie as tabelas correspondentes no Supabase.
 */
export interface CreditWalletDefinition {
  walletKey: string;
  shortCode: string;
  productId: string;
  label: string;
  grantReason: string;
  referenceType: string;
}

export interface CreditNamingConvention {
  walletKey: string;
  shortCode: string;
  ledgerAlias: string;
  walletAlias: string;
  idempotencyPrefix: string;
}

export const CREDIT_WALLET_DEFINITIONS: readonly CreditWalletDefinition[] = [
  {
    walletKey: 'festa_magica',
    shortCode: 'FM',
    productId: 'festa-magica',
    label: 'Festa Magica',
    grantReason: 'purchase',
    referenceType: 'webhook_event',
  },
  {
    walletKey: 'car_studio',
    shortCode: 'CS',
    productId: 'car-studio',
    label: 'Car Studio',
    grantReason: 'purchase',
    referenceType: 'webhook_event',
  },
] as const;

const DEFINITION_BY_PRODUCT_ID = new Map(
  CREDIT_WALLET_DEFINITIONS.map((definition) => [definition.productId, definition])
);

export function getCreditWalletDefinition(productId: string): CreditWalletDefinition | null {
  return DEFINITION_BY_PRODUCT_ID.get(String(productId || '').trim()) ?? null;
}

export function getCreditNamingConvention(productId: string): CreditNamingConvention | null {
  const definition = getCreditWalletDefinition(productId);
  if (!definition) return null;

  return {
    walletKey: definition.walletKey,
    shortCode: definition.shortCode,
    ledgerAlias: `${definition.shortCode}_credits_ledger`,
    walletAlias: `${definition.shortCode}_user_credit_wallets`,
    idempotencyPrefix: definition.walletKey,
  };
}
