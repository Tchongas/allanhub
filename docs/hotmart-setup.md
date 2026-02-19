# Hotmart Webhook Setup Guide (Hub)

This is the practical checklist to configure Hotmart automatic activation in your environment.

## 1) Prerequisites

- Hub deployed and reachable via HTTPS
- Supabase project configured for Hub
- Admin user email configured in `src/lib/admin.ts`
- You already applied migrations `001` and `002`

## 2) Apply Hotmart migration

Run this SQL in Supabase SQL Editor:

- `supabase/migrations/003_hotmart_webhook_scaffold.sql`

This creates:

- `hotmart_product_mappings`
- `hotmart_webhook_events`
- `hotmart_grants`

## 3) Configure environment variable

Set this in your Hub runtime env:

- `HOTMART_HOTTOK=<your_hotmart_hottok_value>`

Important:
- Use exactly the same value configured in Hotmart webhook settings.
- Do not expose this token client-side.

## 4) Deploy code

Deploy Hub with the new routes:

- `POST /api/webhooks/hotmart`
- `GET /api/admin/hotmart/events`
- `POST /api/admin/hotmart/events/retry`
- `GET/POST/PUT/DELETE /api/admin/hotmart/mappings`

## 5) Create product mappings (required)

Before enabling Hotmart webhook, map each Hotmart product `ucode` to your Hub `products.id`.

### Option A: API (quick)

`POST /api/admin/hotmart/mappings`

Body example:

```json
{
  "hotmart_product_ucode": "abc123-ucode-from-hotmart",
  "product_id": "festa-magica",
  "active": true,
  "notes": "Main offer"
}
```

### Option B: Supabase SQL

```sql
insert into hotmart_product_mappings (hotmart_product_ucode, product_id, active, notes)
values ('abc123-ucode-from-hotmart', 'festa-magica', true, 'Main offer');
```

## 6) Configure webhook in Hotmart

In Hotmart webhook panel:

- URL: `https://YOUR_HUB_DOMAIN/api/webhooks/hotmart`
- Header/token: configure the same token used in `HOTMART_HOTTOK`
- Send purchase events (approved, refunded, canceled, chargeback, etc.)

## 7) Validate end-to-end

1. Trigger test event from Hotmart (or real sandbox purchase).
2. Confirm row inserted in `hotmart_webhook_events`.
3. Confirm `processing_status` becomes `processed` (or `ignored` when expected).
4. For approved event:
   - Check `user_products` has active entitlement for buyer email user.
   - Check ledger in `hotmart_grants`.
5. For refund/chargeback event:
   - Check `user_products.status = 'cancelled'`.
   - Check `hotmart_grants.revoked_at` filled.

## 8) Troubleshooting

### Error: Unauthorized webhook source
- `X-HOTMART-HOTTOK` does not match `HOTMART_HOTTOK`.

### Error: No active product mapping for Hotmart ucode
- Missing mapping in `hotmart_product_mappings`.

### Event stuck as failed
- Query failed events:
  - `GET /api/admin/hotmart/events?status=failed`
- Reprocess one event:
  - `POST /api/admin/hotmart/events/retry` with `{ "event_id": "..." }`

## 9) Recommended production ops

- Monitor failed event count daily.
- Keep a dashboard on `hotmart_webhook_events` by status.
- Alert if failed ratio spikes.
- Keep mapping table updated when adding/changing offers.

## 10) Current event behavior

- Grants access: `PURCHASE_APPROVED`, `PURCHASE_COMPLETE`
- Revokes access: `PURCHASE_CANCELED`, `PURCHASE_REFUNDED`, `PURCHASE_CHARGEBACK`, `PURCHASE_EXPIRED`
- Ignored (audit only): `PURCHASE_DELAYED`, `PURCHASE_BILLET_PRINTED`, `PURCHASE_PROTEST`
