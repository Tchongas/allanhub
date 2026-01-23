import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const origin = requestUrl.origin;

  if (code) {
    const supabase = await createSupabaseServer();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.session) {
      const serviceClient = createServiceRoleClient();
      
      const { data: existingUser } = await serviceClient
        .from('hub_users')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (!existingUser) {
        await serviceClient
          .from('hub_users')
          .insert({
            id: data.user.id,
            email: data.user.email,
            name: data.user.user_metadata?.full_name || 
                  data.user.user_metadata?.name || 
                  data.user.email?.split('@')[0],
          });
      }

      const cookieStore = await cookies();
      cookieStore.set('hub_session', data.session.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
        path: '/',
      });

      return NextResponse.redirect(`${origin}/`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
