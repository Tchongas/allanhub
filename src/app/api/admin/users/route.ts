/**
 * Listagem paginada de usuários para o painel admin.
 *
 * Retorna usuários de `hub_users` com seus produtos ativos/expirados/cancelados.
 * Útil para suporte e auditoria de acessos.
 */
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';

const DEFAULT_USERS_PAGE_SIZE = 300;
const MAX_USERS_PAGE_SIZE = 300;

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
    const { searchParams } = new URL(request.url);
    const pageParam = Number(searchParams.get('page') || 1);
    const limitParam = Number(searchParams.get('limit') || DEFAULT_USERS_PAGE_SIZE);

    const page = Number.isFinite(pageParam) && pageParam > 0 ? Math.floor(pageParam) : 1;
    const limit = Number.isFinite(limitParam)
      ? Math.min(Math.max(Math.floor(limitParam), 1), MAX_USERS_PAGE_SIZE)
      : DEFAULT_USERS_PAGE_SIZE;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data: users, error: usersError, count } = await supabase
      .from('hub_users')
      .select('id, email, name, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (usersError) {
      throw new Error(`Failed to fetch users: ${usersError.message}`);
    }

    const userRows = users || [];
    const userIds = userRows.map((user: { id: string }) => user.id);

    let userProducts: any[] = [];
    if (userIds.length > 0) {
      const { data: pageUserProducts, error: productsError } = await supabase
        .from('user_products')
        .select('*')
        .in('user_id', userIds)
        .order('activated_at', { ascending: false });

      if (productsError) {
        throw new Error(`Failed to fetch user products: ${productsError.message}`);
      }

      userProducts = pageUserProducts || [];
    }

    const { data: products, error: prodError } = await supabase
      .from('products')
      .select('id, name');

    if (prodError) {
      throw new Error(`Failed to fetch products: ${prodError.message}`);
    }

    const productNameMap: Record<string, string> = {};
    for (const p of products || []) {
      productNameMap[p.id] = p.name;
    }

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

    const usersWithProducts = userRows.map((user: any) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      created_at: user.created_at,
      products: userProductsMap[user.id] || [],
    }));

    const total = typeof count === 'number' ? count : 0;
    const totalPages = total > 0 ? Math.ceil(total / limit) : 1;

    return NextResponse.json({
      users: usersWithProducts,
      pagination: {
        page,
        limit,
        total,
        total_pages: totalPages,
        has_previous_page: page > 1,
        has_next_page: page < totalPages,
      },
    });
  } catch (error) {
    console.error('Admin users GET error:', error);
    return NextResponse.json({ error: 'Erro ao buscar usuários' }, { status: 500 });
  }
}
