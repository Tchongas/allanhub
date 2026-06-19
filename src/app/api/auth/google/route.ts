/**
 * Inicia o login OAuth com Google.
 *
 * Aceita `redirect_to` relativo (ex: `/code/ABC-123` ou `/api/auth/festa-magica/start?...`),
 * armazena em cookie `auth_redirect_to` e redireciona para o Supabase Auth.
 * O callback do OAuth é sempre `/api/auth/callback`.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServer();
  const origin = request.nextUrl.origin;
  const callbackUrl = `${origin}/api/auth/callback`;

  const redirectTo = request.nextUrl.searchParams.get('redirect_to');
  if (redirectTo) {
    const cookieStore = await cookies();
    cookieStore.set('auth_redirect_to', redirectTo, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 10, // 10 minutes
      path: '/',
    });
  }

  console.info('hub_oauth_google_start', {
    origin,
    callback_url: callbackUrl,
    has_redirect_to: Boolean(redirectTo),
    redirect_to: redirectTo || null,
  });

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: callbackUrl,
    },
  });

  console.info('hub_oauth_google_signin_result', {
    has_error: Boolean(error),
    error_message: error?.message || null,
    redirect_host: data.url ? new URL(data.url).host : null,
    redirect_url_preview: data.url ? data.url.slice(0, 200) : null,
  });

  if (error || !data.url) {
    return NextResponse.redirect(`${origin}/login?error=oauth_failed`);
  }

  return NextResponse.redirect(data.url);
}
