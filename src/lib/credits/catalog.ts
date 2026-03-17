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

// Registry for products that use credits instead of direct entitlement only.
// Add new entries here as we launch new credit-based products.
export const CREDIT_WALLET_DEFINITIONS: readonly CreditWalletDefinition[] = [
  {
    walletKey: 'festa_magica',
    shortCode: 'FM',
    productId: 'festa-magica',
    label: 'Festa Magica',
    grantReason: 'purchase',
    referenceType: 'hotmart',
  },
  // Template for next product:
  // {
  //   walletKey: 'car_studio',
  //   shortCode: 'CS',
  //   productId: 'car-studio',
  //   label: 'Car Studio',
  //   grantReason: 'hotmart_purchase',
  //   referenceType: 'hotmart',
  // },
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
