-- 002_email_and_google_auth_support.sql
-- Production-safe migration for dual auth (Google + Email/Password)
-- Goals:
-- 1) Normalize emails in hub_users
-- 2) Merge duplicate hub_users rows by normalized email
-- 3) Preserve entitlements (user_products) and activation history (activation_codes.used_by)
-- 4) Enforce uniqueness to avoid future duplicates

BEGIN;

-- 1) Normalize existing emails (trim + lowercase)
-- Treat blank emails as NULL to avoid accidental cross-user merges on ''.
UPDATE hub_users
SET email = NULL
WHERE email IS NOT NULL
  AND trim(email) = '';

UPDATE hub_users
SET email = lower(trim(email))
WHERE email IS NOT NULL
  AND email <> lower(trim(email));

-- 2) Build canonical/duplicate mapping by normalized email (oldest row wins)
DROP TABLE IF EXISTS tmp_hub_user_dedup;
CREATE TEMP TABLE tmp_hub_user_dedup AS
WITH ranked AS (
  SELECT
    id,
    email,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY email
      ORDER BY created_at ASC NULLS LAST, id ASC
    ) AS rn,
    FIRST_VALUE(id) OVER (
      PARTITION BY email
      ORDER BY created_at ASC NULLS LAST, id ASC
    ) AS canonical_id
  FROM hub_users
  WHERE email IS NOT NULL
    AND email <> ''
)
SELECT
  id AS duplicate_id,
  canonical_id,
  email
FROM ranked
WHERE rn > 1;

-- Backup rows that are going to be merged/deleted for safe recovery.
CREATE TABLE IF NOT EXISTS hub_users_dedup_backup (
  backup_id BIGSERIAL PRIMARY KEY,
  backup_run_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  duplicate_id TEXT NOT NULL,
  canonical_id TEXT NOT NULL,
  email TEXT,
  hub_user_row JSONB NOT NULL
);

INSERT INTO hub_users_dedup_backup (duplicate_id, canonical_id, email, hub_user_row)
SELECT
  d.duplicate_id::text,
  d.canonical_id::text,
  d.email,
  to_jsonb(hu)
FROM tmp_hub_user_dedup d
JOIN hub_users hu ON hu.id = d.duplicate_id;

CREATE TABLE IF NOT EXISTS user_products_dedup_backup (
  backup_id BIGSERIAL PRIMARY KEY,
  backup_run_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  source_user_id TEXT NOT NULL,
  canonical_user_id TEXT NOT NULL,
  product_id TEXT,
  user_product_row JSONB NOT NULL
);

INSERT INTO user_products_dedup_backup (source_user_id, canonical_user_id, product_id, user_product_row)
SELECT
  up.user_id::text,
  d.canonical_id::text,
  up.product_id,
  to_jsonb(up)
FROM user_products up
JOIN tmp_hub_user_dedup d ON d.duplicate_id = up.user_id;

-- 3) Prevent duplicate entitlement rows if canonical user already has same product.
DELETE FROM user_products up
USING tmp_hub_user_dedup d
WHERE up.user_id = d.duplicate_id
  AND EXISTS (
    SELECT 1
    FROM user_products up2
    WHERE up2.user_id = d.canonical_id
      AND up2.product_id = up.product_id
  );

-- 4) Repoint user_products to canonical user
UPDATE user_products up
SET user_id = d.canonical_id
FROM tmp_hub_user_dedup d
WHERE up.user_id = d.duplicate_id;

-- 5) Repoint activation_codes.used_by when this column exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'activation_codes'
      AND column_name = 'used_by'
  ) THEN
    UPDATE activation_codes ac
    SET used_by = d.canonical_id
    FROM tmp_hub_user_dedup d
    WHERE ac.used_by = d.duplicate_id;
  END IF;
END $$;

-- 6) Delete duplicate hub_users rows
DELETE FROM hub_users hu
USING tmp_hub_user_dedup d
WHERE hu.id = d.duplicate_id;

-- 7) Enforce uniqueness for future inserts
-- We store normalized (lowercase) emails at app level and above update normalized current data.
CREATE UNIQUE INDEX IF NOT EXISTS idx_hub_users_email_unique ON hub_users (email);

COMMIT;
