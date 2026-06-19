/**
 * Encerra a sessão local removendo o cookie `hub_session`.
 *
 * A sessão no Supabase Auth continua válida; o cookie do Hub é apenas
 * o access token armazenado localmente após login/callback.
 */
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete('hub_session');

  return NextResponse.json({ success: true });
}
