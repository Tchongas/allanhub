export type HotmartPurchaseEventName =
  | 'PURCHASE_APPROVED'
  | 'PURCHASE_COMPLETE'
  | 'PURCHASE_DELAYED'
  | 'PURCHASE_BILLET_PRINTED'
  | 'PURCHASE_CANCELED'
  | 'PURCHASE_REFUNDED'
  | 'PURCHASE_CHARGEBACK'
  | 'PURCHASE_EXPIRED'
  | 'PURCHASE_PROTEST';

export interface HotmartWebhookPayload {
  id?: string;
  event?: HotmartPurchaseEventName | string;
  version?: string;
  data?: {
    product?: {
      id?: number;
      ucode?: string;
      name?: string;
    };
    buyer?: {
      email?: string;
      name?: string;
      first_name?: string;
      last_name?: string;
    };
    purchase?: {
      transaction?: string;
      status?: string;
      approved_date?: number;
      order_date?: string;
      recurrence_number?: number;
    };
    subscription?: {
      status?: string;
      subscriber?: {
        code?: string;
      };
      plan?: {
        id?: number;
        name?: string;
      };
    };
  };
}

export interface HotmartProcessResult {
  accepted: boolean;
  status: 'processed' | 'ignored' | 'failed' | 'duplicate';
  reason?: string;
  grantCreated?: boolean;
}
