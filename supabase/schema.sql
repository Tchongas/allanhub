-- Hub - Supabase Schema
-- Run this in Supabase SQL Editor to set up the database

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Hub Users table
CREATE TABLE IF NOT EXISTS hub_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Products table (tracks which products users have access to)
CREATE TABLE IF NOT EXISTS user_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES hub_users(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  activated_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  activation_code TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activation Codes table
CREATE TABLE IF NOT EXISTS activation_codes (
  code TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  used_by UUID REFERENCES hub_users(id),
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_hub_users_email ON hub_users(email);
CREATE INDEX IF NOT EXISTS idx_user_products_user_id ON user_products(user_id);
CREATE INDEX IF NOT EXISTS idx_user_products_product_id ON user_products(product_id);
CREATE INDEX IF NOT EXISTS idx_user_products_status ON user_products(status, expires_at);
CREATE INDEX IF NOT EXISTS idx_activation_codes_product ON activation_codes(product_id);
CREATE INDEX IF NOT EXISTS idx_activation_codes_used ON activation_codes(used);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for hub_users table
DROP TRIGGER IF EXISTS update_hub_users_updated_at ON hub_users;
CREATE TRIGGER update_hub_users_updated_at
  BEFORE UPDATE ON hub_users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS)
ALTER TABLE hub_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE activation_codes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own data" ON hub_users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can view own products" ON user_products
  FOR SELECT USING (user_id = auth.uid());

-- Cleanup function for expired products
CREATE OR REPLACE FUNCTION cleanup_expired_products()
RETURNS void AS $$
BEGIN
  UPDATE user_products 
  SET status = 'expired' 
  WHERE status = 'active' AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Helper function to generate activation codes (for admin use)
CREATE OR REPLACE FUNCTION generate_activation_codes(
  p_product_id TEXT,
  p_count INTEGER DEFAULT 1
)
RETURNS TABLE(code TEXT) AS $$
DECLARE
  i INTEGER;
  new_code TEXT;
  prefix TEXT;
BEGIN
  prefix := UPPER(LEFT(p_product_id, 2));
  
  FOR i IN 1..p_count LOOP
    new_code := prefix || '-' || 
                UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4)) || '-' ||
                UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4)) || '-' ||
                LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
    
    INSERT INTO activation_codes (code, product_id, used)
    VALUES (new_code, p_product_id, FALSE);
    
    code := new_code;
    RETURN NEXT;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Example: Generate 5 activation codes for festa-magica
-- SELECT * FROM generate_activation_codes('festa-magica', 5);
