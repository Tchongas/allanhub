/**
 * Saldos e ledger de créditos para monitoramento admin.
 *
 * GET une dados das tabelas de credit wallets/ledgers do Festa Mágica e do
 * Car Studio, normaliza e retorna os registros mais recentes. Limite padrão
 * de 80 wallets e 120 entradas de ledger (configurável via query params).
 */
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
    const walletKeyParam = String(searchParams.get('wallet_key') || '').trim();
    const walletKeyFilter = walletKeyParam && walletKeyParam !== 'all' ? walletKeyParam : null;

    const walletLimit = Number.isFinite(walletLimitParam)
      ? Math.min(Math.max(Math.floor(walletLimitParam), 1), 300)
      : 80;
    const ledgerLimit = Number.isFinite(ledgerLimitParam)
      ? Math.min(Math.max(Math.floor(ledgerLimitParam), 1), 500)
      : 120;

    const supabase = createServiceRoleClient();

    const includeFestaWallet = !walletKeyFilter || walletKeyFilter === 'festa_magica';
    const includeCarStudioWallet = !walletKeyFilter || walletKeyFilter === 'car_studio';

    const normalizedWalletRows: Array<{
      user_id: string;
      wallet_key: string;
      balance: number;
      lifetime_earned: number;
      lifetime_spent: number;
      updated_at: string;
    }> = [];

    const normalizedLedgerRows: Array<{
      id: string | number;
      user_id: string;
      wallet_key: string;
      amount: number;
      entry_type: string;
      source: string;
      reference_id: string | null;
      created_at: string;
    }> = [];

    if (includeFestaWallet) {
      const festaWallets = await supabase
        .from('user_credit_wallets')
        .select('user_id, balance, lifetime_earned, lifetime_spent, updated_at')
        .order('balance', { ascending: false })
        .limit(walletLimit);

      if (festaWallets.error) {
        return NextResponse.json({ error: festaWallets.error.message }, { status: 500 });
      }

      normalizedWalletRows.push(
        ...(festaWallets.data || []).map((row) => ({
          user_id: row.user_id as string,
          wallet_key: 'festa_magica',
          balance: Number((row as any).balance || 0),
          lifetime_earned: Number((row as any).lifetime_earned || 0),
          lifetime_spent: Number((row as any).lifetime_spent || 0),
          updated_at: String((row as any).updated_at || ''),
        }))
      );

      const festaLedger = await supabase
        .from('credit_ledger')
        .select('id, user_id, direction, amount, entry_type, source, reason, reference_id, created_at')
        .order('created_at', { ascending: false })
        .limit(ledgerLimit);

      if (festaLedger.error) {
        return NextResponse.json({ error: festaLedger.error.message }, { status: 500 });
      }

      normalizedLedgerRows.push(
        ...(festaLedger.data || []).map((row) => {
          const direction = String((row as any).direction || '').toLowerCase();
          const rawAmount = Number((row as any).amount || 0);
          const signedAmount = direction === 'debit' ? -rawAmount : rawAmount;

          return {
            id: (row as any).id,
            user_id: (row as any).user_id as string,
            wallet_key: 'festa_magica',
            amount: signedAmount,
            entry_type: String((row as any).entry_type || direction || 'adjustment'),
            source: String((row as any).source || (row as any).reason || ''),
            reference_id: ((row as any).reference_id as string | null) || null,
            created_at: String((row as any).created_at || ''),
          };
        })
      );
    }

    if (includeCarStudioWallet) {
      const carStudioWallets = await supabase
        .from('cs_user_wallets')
        .select('user_id, wallet_key, balance, lifetime_earned, lifetime_spent, updated_at')
        .order('balance', { ascending: false })
        .limit(walletLimit);

      if (carStudioWallets.error) {
        return NextResponse.json({ error: carStudioWallets.error.message }, { status: 500 });
      }

      normalizedWalletRows.push(
        ...(carStudioWallets.data || []).map((row) => ({
          user_id: row.user_id as string,
          wallet_key: String((row as any).wallet_key || 'car_studio'),
          balance: Number((row as any).balance || 0),
          lifetime_earned: Number((row as any).lifetime_earned || 0),
          lifetime_spent: Number((row as any).lifetime_spent || 0),
          updated_at: String((row as any).updated_at || ''),
        }))
      );

      const carStudioLedger = await supabase
        .from('cs_credit_ledger')
        .select('id, user_id, wallet_key, direction, amount, entry_type, reason, reference_id, created_at')
        .order('created_at', { ascending: false })
        .limit(ledgerLimit);

      if (carStudioLedger.error) {
        return NextResponse.json({ error: carStudioLedger.error.message }, { status: 500 });
      }

      normalizedLedgerRows.push(
        ...(carStudioLedger.data || []).map((row) => {
          const direction = String((row as any).direction || '').toLowerCase();
          const rawAmount = Number((row as any).amount || 0);
          const signedAmount = direction === 'debit' ? -rawAmount : rawAmount;

          return {
            id: (row as any).id,
            user_id: (row as any).user_id as string,
            wallet_key: String((row as any).wallet_key || 'car_studio'),
            amount: signedAmount,
            entry_type: String((row as any).entry_type || direction || 'adjustment'),
            source: String((row as any).reason || ''),
            reference_id: ((row as any).reference_id as string | null) || null,
            created_at: String((row as any).created_at || ''),
          };
        })
      );
    }

    const walletRows = normalizedWalletRows
      .sort((a, b) => b.balance - a.balance)
      .slice(0, walletLimit);

    const ledgerRows = normalizedLedgerRows
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, ledgerLimit);

    const userIds = Array.from(
      new Set([
        ...walletRows.map((row) => row.user_id as string),
        ...ledgerRows.map((row) => row.user_id as string),
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

    const wallets = walletRows.map((row) => ({
      user_id: row.user_id,
      wallet_key: row.wallet_key,
      email: usersById[row.user_id as string]?.email || '',
      name: usersById[row.user_id as string]?.name || '',
      balance: Number(row.balance),
      lifetime_earned: Number(row.lifetime_earned),
      lifetime_spent: Number(row.lifetime_spent),
      updated_at: row.updated_at,
    }));

    const ledger = ledgerRows.map((row) => ({
      id: row.id,
      user_id: row.user_id,
      wallet_key: row.wallet_key,
      email: usersById[row.user_id as string]?.email || '',
      name: usersById[row.user_id as string]?.name || '',
      amount: Number(row.amount),
      entry_type: row.entry_type,
      source: row.source || '',
      reference_id: row.reference_id,
      created_at: row.created_at,
    }));

    return NextResponse.json({
      wallets,
      ledger,
      wallet_key: walletKeyFilter || 'all',
    });
  } catch (error) {
    console.error('Admin hotmart credits GET error:', error);
    return NextResponse.json({ error: 'Erro ao buscar dados de créditos' }, { status: 500 });
  }
}
