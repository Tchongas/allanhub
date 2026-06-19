/**
 * Ativação de código de produto.
 *
 * Requer cookie `hub_session`. Valida o código, verifica se o usuário já
 * possui acesso ativo e cria o `user_products` com prazo de acordo com
 * `duration_months` ou `is_lifetime` do produto.
 */
import { NextRequest, NextResponse } from 'next/server';
import { validateActivationCode, activateProduct, getActiveUserProduct } from '@/lib/supabase/db';
import { getProduct } from '@/lib/products';
import { cookies } from 'next/headers';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { ensureHubUserForAuthUser } from '@/lib/hub-user';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('hub_session')?.value;

    if (!sessionToken) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      );
    }

    const supabase = createServiceRoleClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser(sessionToken);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Sessão inválida' },
        { status: 401 }
      );
    }

    const hubUser = await ensureHubUserForAuthUser(user);

    const { code } = await request.json();

    if (!code) {
      return NextResponse.json(
        { error: 'Código de ativação é obrigatório' },
        { status: 400 }
      );
    }

    const activationCode = await validateActivationCode(code);

    if (!activationCode) {
      return NextResponse.json(
        { error: 'Código inválido ou expirado' },
        { status: 400 }
      );
    }

    const product = await getProduct(activationCode.product_id);
    if (!product) {
      return NextResponse.json(
        { error: 'Produto não encontrado' },
        { status: 400 }
      );
    }

    const existingProduct = await getActiveUserProduct(hubUser.id, activationCode.product_id);
    if (existingProduct) {
      return NextResponse.json(
        { error: 'already_owned', product: { id: product.id, name: product.name, expires_at: existingProduct.expires_at } },
        { status: 409 }
      );
    }

    const userProduct = await activateProduct(
      hubUser.id,
      code,
      activationCode.product_id,
      product.duration_months,
      product.is_lifetime
    );

    return NextResponse.json({
      success: true,
      product: {
        id: product.id,
        name: product.name,
        expires_at: userProduct.expires_at,
      },
    });
  } catch (error) {
    console.error('Activation error:', error);
    return NextResponse.json(
      { error: 'Erro ao ativar código' },
      { status: 500 }
    );
  }
}
