import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';

async function verifyAdmin() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('hub_session')?.value;

  if (!sessionToken) {
    return { error: 'Não autenticado', status: 401 };
  }

  const supabase = createServiceRoleClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(sessionToken);

  if (authError || !user) {
    return { error: 'Sessão inválida', status: 401 };
  }

  if (!isAdmin(user.email)) {
    return { error: 'Acesso negado', status: 403 };
  }

  return { user };
}

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAdmin();
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const walletLimitParam = Number(searchParams.get('wallet_limit') || 80);
    const ledgerLimitParam = Number(searchParams.get('ledger_limit') || 120);

    const walletLimit = Number.isFinite(walletLimitParam)
      ? Math.min(Math.max(Math.floor(walletLimitParam), 1), 300)
      : 80;
    const ledgerLimit = Number.isFinite(ledgerLimitParam)
      ? Math.min(Math.max(Math.floor(ledgerLimitParam), 1), 500)
      : 120;

    const supabase = createServiceRoleClient();

    const { data: walletRows, error: walletError } = await supabase
      .from('user_credit_wallets')
      .select('user_id, balance, lifetime_earned, lifetime_spent, updated_at')
      .order('balance', { ascending: false })
      .limit(walletLimit);

    if (walletError) {
      return NextResponse.json({ error: walletError.message }, { status: 500 });
    }

    const { data: ledgerRows, error: ledgerError } = await supabase
      .from('credit_ledger')
      .select('id, user_id, amount, entry_type, source, reference_id, created_at')
      .order('created_at', { ascending: false })
      .limit(ledgerLimit);

    if (ledgerError) {
      return NextResponse.json({ error: ledgerError.message }, { status: 500 });
    }

    const userIds = Array.from(
      new Set([
        ...(walletRows || []).map((row) => row.user_id as string),
        ...(ledgerRows || []).map((row) => row.user_id as string),
      ])
    );

    let usersById: Record<string, { email: string; name: string }> = {};

    if (userIds.length > 0) {
      const { data: userRows, error: usersError } = await supabase
        .from('hub_users')
        .select('id, email, name')
        .in('id', userIds);

      if (usersError) {
        return NextResponse.json({ error: usersError.message }, { status: 500 });
      }

      usersById = (userRows || []).reduce<Record<string, { email: string; name: string }>>((acc, user) => {
        acc[user.id as string] = {
          email: (user.email as string) || '',
          name: (user.name as string) || '',
        };
        return acc;
      }, {});
    }

    const wallets = (walletRows || []).map((row) => ({
      user_id: row.user_id,
      email: usersById[row.user_id as string]?.email || '',
      name: usersById[row.user_id as string]?.name || '',
      balance: Number(row.balance || 0),
      lifetime_earned: Number(row.lifetime_earned || 0),
      lifetime_spent: Number(row.lifetime_spent || 0),
      updated_at: row.updated_at,
    }));

    const ledger = (ledgerRows || []).map((row) => ({
      id: row.id,
      user_id: row.user_id,
      email: usersById[row.user_id as string]?.email || '',
      name: usersById[row.user_id as string]?.name || '',
      amount: Number(row.amount || 0),
      entry_type: row.entry_type,
      source: row.source,
      reference_id: row.reference_id,
      created_at: row.created_at,
    }));

    return NextResponse.json({ wallets, ledger });
  } catch (error) {
    console.error('Admin hotmart credits GET error:', error);
    return NextResponse.json({ error: 'Erro ao buscar dados de créditos' }, { status: 500 });
  }
}
