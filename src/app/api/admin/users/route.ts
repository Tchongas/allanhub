import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';

async function verifyAdmin() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('hub_session')?.value;

  if (!sessionToken) return null;

  const supabase = createServiceRoleClient();
  const { data: { user }, error } = await supabase.auth.getUser(sessionToken);

  if (error || !user || !isAdmin(user.email)) return null;

  return user;
}

export async function GET(request: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const supabase = createServiceRoleClient();

    // Fetch all users
    const { data: users, error: usersError } = await supabase
      .from('hub_users')
      .select('*')
      .order('created_at', { ascending: false });

    if (usersError) {
      throw new Error(`Failed to fetch users: ${usersError.message}`);
    }

    // Fetch all user_products with product info
    const { data: userProducts, error: productsError } = await supabase
      .from('user_products')
      .select('*')
      .order('activated_at', { ascending: false });

    if (productsError) {
      throw new Error(`Failed to fetch user products: ${productsError.message}`);
    }

    // Fetch all products for name mapping
    const { data: products, error: prodError } = await supabase
      .from('products')
      .select('id, name');

    if (prodError) {
      throw new Error(`Failed to fetch products: ${prodError.message}`);
    }

    // Build product name map
    const productNameMap: Record<string, string> = {};
    for (const p of products || []) {
      productNameMap[p.id] = p.name;
    }

    // Group user products by user_id
    const userProductsMap: Record<string, any[]> = {};
    for (const up of userProducts || []) {
      if (!userProductsMap[up.user_id]) {
        userProductsMap[up.user_id] = [];
      }
      userProductsMap[up.user_id].push({
        ...up,
        product_name: productNameMap[up.product_id] || up.product_id,
      });
    }

    // Combine users with their products
    const usersWithProducts = (users || []).map((user: any) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      created_at: user.created_at,
      products: userProductsMap[user.id] || [],
    }));

    return NextResponse.json({ users: usersWithProducts });
  } catch (error) {
    console.error('Admin users GET error:', error);
    return NextResponse.json({ error: 'Erro ao buscar usuários' }, { status: 500 });
  }
}
