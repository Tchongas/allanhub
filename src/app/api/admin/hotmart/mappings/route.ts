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

export async function GET() {
  try {
    const auth = await verifyAdmin();
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from('hotmart_product_mappings')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ mappings: data || [] });
  } catch (error) {
    console.error('Admin hotmart mappings GET error:', error);
    return NextResponse.json({ error: 'Erro ao buscar mapeamentos Hotmart' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAdmin();
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { hotmart_product_ucode, product_id, grant_mode, credits_amount, active, notes } = await request.json();

    if (!hotmart_product_ucode || !product_id) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: hotmart_product_ucode e product_id' },
        { status: 400 }
      );
    }

    const normalizedGrantMode = String(grant_mode || 'access').trim().toLowerCase();
    if (!['access', 'credits'].includes(normalizedGrantMode)) {
      return NextResponse.json({ error: "grant_mode deve ser 'access' ou 'credits'" }, { status: 400 });
    }

    let normalizedCreditsAmount: number | null = null;
    if (normalizedGrantMode === 'credits') {
      const parsed = Number(credits_amount);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        return NextResponse.json(
          { error: 'credits_amount deve ser um número maior que zero para grant_mode=credits' },
          { status: 400 }
        );
      }
      normalizedCreditsAmount = Math.floor(parsed);
    }

    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from('hotmart_product_mappings')
      .insert({
        hotmart_product_ucode: String(hotmart_product_ucode).trim(),
        product_id: String(product_id).trim(),
        grant_mode: normalizedGrantMode,
        credits_amount: normalizedCreditsAmount,
        active: active !== undefined ? Boolean(active) : true,
        notes: String(notes || ''),
      })
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, mapping: data });
  } catch (error) {
    console.error('Admin hotmart mappings POST error:', error);
    return NextResponse.json({ error: 'Erro ao criar mapeamento Hotmart' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await verifyAdmin();
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id, ...updates } = await request.json();
    if (!id) {
      return NextResponse.json({ error: 'ID do mapeamento é obrigatório' }, { status: 400 });
    }

    const normalizedGrantMode = updates.grant_mode
      ? String(updates.grant_mode).trim().toLowerCase()
      : undefined;

    if (normalizedGrantMode !== undefined && !['access', 'credits'].includes(normalizedGrantMode)) {
      return NextResponse.json({ error: "grant_mode deve ser 'access' ou 'credits'" }, { status: 400 });
    }

    if (normalizedGrantMode !== undefined) {
      updates.grant_mode = normalizedGrantMode;
    }

    const effectiveGrantMode = (updates.grant_mode ? String(updates.grant_mode) : 'access').toLowerCase();

    if (effectiveGrantMode === 'credits') {
      const normalizedCreditsAmount = Number(updates.credits_amount);
      if (!Number.isFinite(normalizedCreditsAmount) || normalizedCreditsAmount <= 0) {
        return NextResponse.json(
          { error: 'credits_amount deve ser um número maior que zero para grant_mode=credits' },
          { status: 400 }
        );
      }

      updates.credits_amount = Math.floor(normalizedCreditsAmount);
    } else if (effectiveGrantMode === 'access') {
      updates.credits_amount = null;
    }

    const normalizedUpdates = {
      ...updates,
      updated_at: new Date().toISOString(),
    };

    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from('hotmart_product_mappings')
      .update(normalizedUpdates)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, mapping: data });
  } catch (error) {
    console.error('Admin hotmart mappings PUT error:', error);
    return NextResponse.json({ error: 'Erro ao atualizar mapeamento Hotmart' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await verifyAdmin();
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID do mapeamento é obrigatório' }, { status: 400 });
    }

    const supabase = createServiceRoleClient();
    const { error } = await supabase.from('hotmart_product_mappings').delete().eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin hotmart mappings DELETE error:', error);
    return NextResponse.json({ error: 'Erro ao remover mapeamento Hotmart' }, { status: 500 });
  }
}
