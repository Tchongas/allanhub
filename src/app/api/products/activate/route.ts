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

    // Check if user already owns this product
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
