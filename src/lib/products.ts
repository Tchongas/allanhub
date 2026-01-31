import { Product } from '@/types';
import { createServiceRoleClient } from '@/lib/supabase/server';

// Fallback products for when DB is not available
const FALLBACK_PRODUCTS: Product[] = [
  {
    id: 'festa-magica',
    name: 'Festa Mágica',
    description: 'Crie convites e kits de festa infantil personalizados com inteligência artificial. Transforme fotos em artes únicas para aniversários.',
    icon_name: 'party-popper',
    image: '/images/festa-magica.jpg',
    color: 'blue',
    url: process.env.FESTA_MAGICA_URL || 'https://festa-magica-two.vercel.app',
    price: 49.90,
    duration_months: 3,
    is_lifetime: false,
    features: [
      'Geração ilimitada de kits',
      'Download em alta qualidade',
      'Estilos 2D e 3D',
    ],
    active: true,
  },
];

// Cache for products
let productsCache: Product[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 60000; // 1 minute

export async function getProductsFromDB(): Promise<Product[]> {
  const now = Date.now();
  if (productsCache && (now - cacheTimestamp) < CACHE_TTL) {
    return productsCache;
  }

  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: true });

    if (error || !data || data.length === 0) {
      return FALLBACK_PRODUCTS;
    }

    productsCache = data as Product[];
    cacheTimestamp = now;
    return productsCache;
  } catch {
    return FALLBACK_PRODUCTS;
  }
}

export function clearProductsCache(): void {
  productsCache = null;
  cacheTimestamp = 0;
}

export async function getProduct(id: string): Promise<Product | undefined> {
  const products = await getProductsFromDB();
  return products.find(p => p.id === id);
}

export async function getActiveProducts(): Promise<Product[]> {
  const products = await getProductsFromDB();
  return products.filter(p => p.active);
}

// Admin functions
export async function createProduct(product: Omit<Product, 'created_at' | 'updated_at'>): Promise<Product> {
  const supabase = createServiceRoleClient();
  
  const { data, error } = await supabase
    .from('products')
    .insert(product)
    .select()
    .single();

  if (error) throw new Error(`Failed to create product: ${error.message}`);
  clearProductsCache();
  return data as Product;
}

export async function updateProduct(id: string, updates: Partial<Product>): Promise<Product> {
  const supabase = createServiceRoleClient();
  
  const { data, error } = await supabase
    .from('products')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(`Failed to update product: ${error.message}`);
  clearProductsCache();
  return data as Product;
}

export async function deleteProduct(id: string): Promise<void> {
  const supabase = createServiceRoleClient();
  
  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', id);

  if (error) throw new Error(`Failed to delete product: ${error.message}`);
  clearProductsCache();
}
