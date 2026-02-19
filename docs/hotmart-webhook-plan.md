# Hotmart Webhook Integration Plan

## Objective

Automatically grant/revoke product access in Hub when purchase status changes in Hotmart, without requiring manual activation codes.

## What was scaffolded

- Webhook receiver endpoint: `/api/webhooks/hotmart`
- Event processor service: `src/lib/hotmart/processor.ts`
- Admin mapping endpoint: `/api/admin/hotmart/mappings`
- Migration with integration tables:
  - `hotmart_product_mappings`
  - `hotmart_webhook_events`
  - `hotmart_grants`

## Data contract used (Hotmart docs v2.0.0)

Primary fields used from payload:

- `id` (event id)
- `event` (event type)
- `version`
- `data.product.ucode`
- `data.buyer.email`
- `data.buyer.name`
- `data.purchase.transaction`
- `data.purchase.status`

Security field used from headers:

- `X-HOTMART-HOTTOK`

## Entitlement strategy

### Grant events

- `PURCHASE_APPROVED`
- `PURCHASE_COMPLETE`

Behavior:
- Resolve product mapping via `product.ucode`.
- Find or create `hub_users` by email.
- If user does not already have active entitlement for that product, create one in `user_products`.
- Write grant ledger to `hotmart_grants`.

### Revoke events

- `PURCHASE_CANCELED`
- `PURCHASE_REFUNDED`
- `PURCHASE_CHARGEBACK`
- `PURCHASE_EXPIRED`

Behavior:
- Mark active entitlement as `cancelled` and expire immediately.
- Update ledger with `revoked_at`.

### Ignored events

- `PURCHASE_DELAYED`
- `PURCHASE_BILLET_PRINTED`
- `PURCHASE_PROTEST`

Behavior:
- Store event for audit, no entitlement change.

## Idempotency and reliability

- Event dedupe key: `hotmart_event_id` (unique constraint).
- `hotmart_webhook_events` stores every accepted payload and processing status.
- Duplicate processed events return success with `duplicate: true`.

## Edge cases considered

1. Missing/invalid `X-HOTMART-HOTTOK`.
2. Missing `id`, `buyer.email`, `product.ucode`, or `purchase.transaction`.
3. Product not mapped in `hotmart_product_mappings`.
4. Duplicate event delivery/retries.
5. Buyer has no Hub account yet.
6. Existing active entitlement already present.
7. Refund/chargeback arrives after prior grant.
8. Unsupported event type arrives.

## Open decisions before production rollout

1. Should grant timing include delayed approvals only, or also specific trial states?
2. For recurring subscriptions, should renewals extend `expires_at` instead of only checking active state?
3. Should revocation be immediate for chargebacks, or include grace period?
4. Should we keep synthetic `activation_code` (`hotmart:<transaction>`) forever, or add dedicated source columns to `user_products` in a future migration?
5. Should we notify users (email/WhatsApp) when grant/revoke occurs?

## Recommended next implementation steps

1. Add admin UI for Hotmart mappings/events dashboard.
2. Add retry job for `hotmart_webhook_events` with `failed` status.
3. Add signed request hardening (IP allowlist if Hotmart provides static ranges).
4. Add integration tests for grant/revoke/idempotency paths.
5. Add monitoring/alerts on failed webhook processing ratio.
