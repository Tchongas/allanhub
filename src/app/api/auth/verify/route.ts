import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { getUserProducts } from '@/lib/supabase/db';
import { cookies } from 'next/headers';
import { ensureHubUserForAuthUser } from '@/lib/hub-user';

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

    const hubUser = await ensureHubUserForAuthUser(authUser);
    const products = await getUserProducts(hubUser.id);

    return NextResponse.json({
      authenticated: true,
      user: hubUser,
      products,
    });
  } catch (error) {
    console.error('Verify error:', error);
    return NextResponse.json({ authenticated: false });
  }
}
