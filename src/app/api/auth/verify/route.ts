import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { getUserProducts } from '@/lib/supabase/db';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('hub_session')?.value;

    if (!sessionToken) {
      return NextResponse.json({ authenticated: false });
    }

    const supabase = createServiceRoleClient();

    const { data: { user: authUser }, error } = await supabase.auth.getUser(sessionToken);

    if (error || !authUser) {
      return NextResponse.json({ authenticated: false });
    }

    const { data: user } = await supabase
      .from('hub_users')
      .select('*')
      .eq('id', authUser.id)
      .single();

    const products = await getUserProducts(authUser.id);

    return NextResponse.json({
      authenticated: true,
      user: user || {
        id: authUser.id,
        email: authUser.email,
        name: authUser.user_metadata?.name || authUser.email?.split('@')[0],
      },
      products,
    });
  } catch (error) {
    console.error('Verify error:', error);
    return NextResponse.json({ authenticated: false });
  }
}
