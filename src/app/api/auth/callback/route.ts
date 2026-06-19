/**
 * Callback do OAuth do Supabase (Google) e redirecionamento pós-login.
 *
 * Troca o `code` por sessão, sincroniza o usuário em `hub_users`,
 * grava o cookie `hub_session` e redireciona para:
 * - `auth_redirect_to` cookie (se existir e for relativo);
 * - `next` query param (se existir e for relativo);
 * - ou `/` como padrão.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { ensureHubUserForAuthUser } from '@/lib/hub-user';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const nextPath = requestUrl.searchParams.get('next');
  const origin = requestUrl.origin;

  console.info('hub_oauth_callback_hit', {
    url: requestUrl.toString(),
    has_code: Boolean(code),
  });

  if (code) {
    const supabase = await createSupabaseServer();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    console.info('hub_oauth_callback_exchange_result', {
      has_error: Boolean(error),
      error_message: error?.message || null,
      has_session: Boolean(data.session),
      user_id: data.user?.id || null,
    });

    if (!error && data.session) {
      await ensureHubUserForAuthUser(data.user);

      const cookieStore = await cookies();
      cookieStore.set('hub_session', data.session.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
        path: '/',
      });

      // Check for a stored redirect path (e.g. from /code/CODE activation)
      const redirectTo = cookieStore.get('auth_redirect_to')?.value;
      if (redirectTo) {
        cookieStore.delete('auth_redirect_to');
        // Only allow relative paths to prevent open redirect
        if (redirectTo.startsWith('/')) {
          console.info('hub_oauth_callback_redirect', {
            target: `${origin}${redirectTo}`,
            source: 'auth_redirect_to_cookie',
          });
          return NextResponse.redirect(`${origin}${redirectTo}`);
        }
      }

      if (nextPath && nextPath.startsWith('/')) {
        console.info('hub_oauth_callback_redirect', {
          target: `${origin}${nextPath}`,
          source: 'next_query_param',
        });
        return NextResponse.redirect(`${origin}${nextPath}`);
      }

      console.info('hub_oauth_callback_redirect', {
        target: `${origin}/`,
        source: 'default_root',
      });

      return NextResponse.redirect(`${origin}/`);
    }
  }

  console.warn('hub_oauth_callback_failed', {
    has_code: Boolean(code),
  });

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
