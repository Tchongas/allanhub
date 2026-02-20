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
    const status = searchParams.get('status');
    const limitParam = Number(searchParams.get('limit') || 50);
    const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 200) : 50;

    const supabase = createServiceRoleClient();

    let query = supabase
      .from('hotmart_webhook_events')
      .select('hotmart_event_id, event_name, version, hottok_valid, product_ucode, buyer_email, payload, processing_status, processing_error, processed_at, received_at')
      .order('received_at', { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq('processing_status', status);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ events: data || [] });
  } catch (error) {
    console.error('Admin hotmart events GET error:', error);
    return NextResponse.json({ error: 'Erro ao buscar eventos Hotmart' }, { status: 500 });
  }
}
