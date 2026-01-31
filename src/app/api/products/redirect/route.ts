import { NextRequest, NextResponse } from 'next/server';
import { getActiveUserProduct } from '@/lib/supabase/db';
import { getProduct } from '@/lib/products';
import { generateProductToken, generateNonce } from '@/lib/jwt';
import { cookies } from 'next/headers';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const productId = request.nextUrl.searchParams.get('product');

    if (!productId) {
      return NextResponse.json(
        { error: 'Produto não especificado' },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('hub_session')?.value;

    if (!sessionToken) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    const supabase = createServiceRoleClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser(sessionToken);

    if (authError || !user) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    const product = await getProduct(productId);
    if (!product) {
      return NextResponse.json(
        { error: 'Produto não encontrado' },
        { status: 404 }
      );
    }

    const userProduct = await getActiveUserProduct(user.id, productId);
    if (!userProduct) {
      return NextResponse.redirect(new URL(`/?error=no_access&product=${productId}`, request.url));
    }

    const { data: hubUser } = await supabase
      .from('hub_users')
      .select('*')
      .eq('id', user.id)
      .single();

    const token = await generateProductToken({
      sub: user.id,
      email: user.email!,
      name: hubUser?.name || user.user_metadata?.name,
      product: productId,
      nonce: generateNonce(),
    });

    const redirectUrl = `${product.url}/api/auth/callback?token=${token}`;
    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error('Redirect error:', error);
    return NextResponse.json(
      { error: 'Erro ao redirecionar' },
      { status: 500 }
    );
  }
}
