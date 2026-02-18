import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { ensureHubUserForAuthUser } from '@/lib/hub-user';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const origin = requestUrl.origin;

  if (code) {
    const supabase = await createSupabaseServer();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

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
          return NextResponse.redirect(`${origin}${redirectTo}`);
        }
      }

      return NextResponse.redirect(`${origin}/`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
