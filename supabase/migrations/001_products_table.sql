-- Products table for storing product information
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon_name TEXT DEFAULT 'sparkles',
  image TEXT DEFAULT '',
  color TEXT DEFAULT 'blue',
  url TEXT NOT NULL,
  price DECIMAL(10, 2) DEFAULT 0,
  duration_months INTEGER DEFAULT 3,
  is_lifetime BOOLEAN DEFAULT FALSE,
  features JSONB DEFAULT '[]'::jsonb,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add is_lifetime column to user_products if it doesn't exist
ALTER TABLE user_products 
ADD COLUMN IF NOT EXISTS is_lifetime BOOLEAN DEFAULT FALSE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_products_active ON products(active);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at);

-- Insert default product if table is empty
INSERT INTO products (id, name, description, icon_name, image, color, url, price, duration_months, is_lifetime, features, active)
SELECT 
  'festa-magica',
  'Festa Mágica',
  'Crie convites e kits de festa infantil personalizados com inteligência artificial. Transforme fotos em artes únicas para aniversários.',
  'party-popper',
  '/images/festa-magica.jpg',
  'blue',
  'https://festa-magica-two.vercel.app',
  49.90,
  3,
  FALSE,
  '["Geração ilimitada de kits", "Download em alta qualidade", "Estilos 2D e 3D"]'::jsonb,
  TRUE
WHERE NOT EXISTS (SELECT 1 FROM products WHERE id = 'festa-magica');
