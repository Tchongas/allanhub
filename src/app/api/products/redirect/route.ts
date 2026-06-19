/**
 * Redireciona usuário autenticado para um produto com token JWT.
 *
 * Para `car-studio` usa o fluxo `/api/auth/car-studio/start`;
 * para outros produtos gera token via `src/lib/jwt.ts` e redireciona
 * para `produto/api/auth/callback?token=...`.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getActiveUserProduct } from '@/lib/supabase/db';
import { getProduct } from '@/lib/products';
import { generateProductToken, generateNonce } from '@/lib/jwt';
import { cookies } from 'next/headers';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { ensureHubUserForAuthUser } from '@/lib/hub-user';

const CAR_STUDIO_PRODUCT_ID = 'car-studio';

function isSafeRelativePath(value: string): boolean {
  if (!value.startsWith('/')) return false;
  if (value.startsWith('//')) return false;

  try {
    const parsed = new URL(value, 'https://hub.local');
    return parsed.origin === 'https://hub.local';
  } catch {
    return false;
  }
}

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

    const hubUser = await ensureHubUserForAuthUser(user);

    const product = await getProduct(productId);
    if (!product) {
      return NextResponse.json(
        { error: 'Produto não encontrado' },
        { status: 404 }
      );
    }

    const userProduct = await getActiveUserProduct(hubUser.id, productId);
    if (!userProduct) {
      return NextResponse.redirect(new URL(`/?error=no_access&product=${productId}`, request.url));
    }

    if (product.id === CAR_STUDIO_PRODUCT_ID) {
      const handoffBaseUrl = String(process.env.CAR_STUDIO_URL || product.url || '').trim();
      if (!handoffBaseUrl) {
        return NextResponse.redirect(new URL('/?error=car_studio_missing_url', request.url));
      }

      let returnTo: string;
      try {
        returnTo = new URL('/api/auth/callback', handoffBaseUrl).toString();
      } catch {
        return NextResponse.redirect(new URL('/?error=car_studio_invalid_url', request.url));
      }

      const handoffUrl = new URL('/api/auth/car-studio/start', request.url);
      handoffUrl.searchParams.set('product', CAR_STUDIO_PRODUCT_ID);
      handoffUrl.searchParams.set('return_to', returnTo);

      const redirectTo = String(request.nextUrl.searchParams.get('redirect_to') || '').trim();
      if (redirectTo && isSafeRelativePath(redirectTo)) {
        handoffUrl.searchParams.set('redirect_to', redirectTo);
      }

      return NextResponse.redirect(handoffUrl);
    }

    const token = await generateProductToken({
      sub: hubUser.id,
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
