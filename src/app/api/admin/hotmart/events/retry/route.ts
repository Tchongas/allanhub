/**
 * Reprocessamento manual de eventos Hotmart.
 *
 * Permite ao admin re-executar o processador sobre um evento falho
 * diretamente pelo painel. Eventos com `hottok_valid=false` não são reprocessados.
 */
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';
import { processHotmartWebhookEvent } from '@/lib/hotmart/processor';
import type { HotmartWebhookPayload } from '@/lib/hotmart/types';

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

async function updateEventStatus(eventId: string, status: string, errorMessage?: string): Promise<void> {
  const supabase = createServiceRoleClient();
  await supabase
    .from('hotmart_webhook_events')
    .update({
      processing_status: status,
      processing_error: errorMessage || null,
      processed_at: new Date().toISOString(),
    })
    .eq('hotmart_event_id', eventId);
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAdmin();
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const eventId = String(body?.event_id || '').trim();

    if (!eventId) {
      return NextResponse.json({ error: 'event_id é obrigatório' }, { status: 400 });
    }

    const supabase = createServiceRoleClient();
    const { data: eventRow, error: fetchError } = await supabase
      .from('hotmart_webhook_events')
      .select('hotmart_event_id, payload, processing_status, hottok_valid')
      .eq('hotmart_event_id', eventId)
      .single();

    if (fetchError || !eventRow) {
      return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 });
    }

    if (!eventRow.hottok_valid) {
      return NextResponse.json(
        { error: 'Evento rejeitado por token inválido não deve ser reprocessado' },
        { status: 400 }
      );
    }

    await updateEventStatus(eventId, 'received');

    const result = await processHotmartWebhookEvent(eventRow.payload as HotmartWebhookPayload);

    if (result.status === 'failed') {
      await updateEventStatus(eventId, 'failed', result.reason || 'Processing failed');
      return NextResponse.json(
        { success: false, error: result.reason || 'Processing failed', status: 'failed' },
        { status: 400 }
      );
    }

    if (result.status === 'ignored') {
      await updateEventStatus(eventId, 'ignored', result.reason);
      return NextResponse.json({ success: true, status: 'ignored', reason: result.reason || null });
    }

    await updateEventStatus(eventId, 'processed');
    return NextResponse.json({ success: true, status: 'processed', grant_created: result.grantCreated || false });
  } catch (error) {
    console.error('Admin hotmart retry POST error:', error);
    return NextResponse.json({ error: 'Erro ao reprocessar evento Hotmart' }, { status: 500 });
  }
}
