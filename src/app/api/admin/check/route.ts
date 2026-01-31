import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('hub_session')?.value;

    if (!sessionToken) {
      return NextResponse.json({ isAdmin: false });
    }

    const supabase = createServiceRoleClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser(sessionToken);

    if (authError || !user) {
      return NextResponse.json({ isAdmin: false });
    }

    return NextResponse.json({ isAdmin: isAdmin(user.email) });
  } catch (error) {
    console.error('Admin check error:', error);
    return NextResponse.json({ isAdmin: false });
  }
}
