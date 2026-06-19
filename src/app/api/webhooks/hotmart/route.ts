/**
 * Webhook de eventos de compra do Hotmart.
 *
 * Valida o token `HOTMART_HOTTOK`, persiste o evento em `hotmart_webhook_events`
 * e delega o processamento para `src/lib/hotmart/processor`. Também limpa eventos
 * antigos periodicamente para evitar crescimento excessivo da tabela.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { processHotmartWebhookEvent } from '@/lib/hotmart/processor';
import type { HotmartWebhookPayload } from '@/lib/hotmart/types';

const HOTMART_EVENT_RETENTION_DAYS = 7;

function getHeaderToken(request: NextRequest): string {
  return request.headers.get('x-hotmart-hottok') || '';
}

function isHottokValid(request: NextRequest): boolean {
  const expected = String(process.env.HOTMART_HOTTOK || '').trim();
  if (!expected) return false;

  const received = getHeaderToken(request).trim();
  return Boolean(received) && received === expected;
}

async function saveEventReceipt(payload: HotmartWebhookPayload, hottokValid: boolean): Promise<void> {
  const supabase = createServiceRoleClient();

  const eventId = String(payload.id || '').trim();
  if (!eventId) return;

  const eventName = String(payload.event || '').trim().toUpperCase();
  const productUcode = String(payload.data?.product?.ucode || '').trim() || null;
  const buyerEmail = String(payload.data?.buyer?.email || '').trim().toLowerCase() || null;

  await supabase.from('hotmart_webhook_events').upsert(
    {
      hotmart_event_id: eventId,
      event_name: eventName || 'UNKNOWN',
      version: payload.version || null,
      hottok_valid: hottokValid,
      product_ucode: productUcode,
      buyer_email: buyerEmail,
      payload,
      processing_status: 'received',
      received_at: new Date().toISOString(),
    },
    { onConflict: 'hotmart_event_id' }
  );
}

async function updateEventStatus(eventId: string, status: string, errorMessage?: string): Promise<void> {
  if (!eventId) return;

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

async function hasEventBeenProcessed(eventId: string): Promise<boolean> {
  if (!eventId) return false;

  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from('hotmart_webhook_events')
    .select('processing_status')
    .eq('hotmart_event_id', eventId)
    .limit(1);

  return Boolean(data && data.length > 0 && data[0].processing_status === 'processed');
}

async function cleanupOldSuccessfulOrIgnoredEvents(): Promise<void> {
  const supabase = createServiceRoleClient();
  const cutoffDate = new Date(Date.now() - HOTMART_EVENT_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await supabase
    .from('hotmart_webhook_events')
    .delete()
    .in('processing_status', ['processed', 'ignored'])
    .lt('received_at', cutoffDate);

  if (error) {
    throw new Error(`Failed to cleanup old Hotmart webhook events: ${error.message}`);
  }
}

export async function POST(request: NextRequest) {
  let payload: HotmartWebhookPayload | null = null;
  let eventId = '';

  try {
    payload = (await request.json()) as HotmartWebhookPayload;
    eventId = String(payload?.id || '').trim();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  const hottokValid = isHottokValid(request);

  await saveEventReceipt(payload, hottokValid);

  try {
    await cleanupOldSuccessfulOrIgnoredEvents();
  } catch (error) {
    console.error('Hotmart webhook cleanup error:', error);
  }

  if (!hottokValid) {
    await updateEventStatus(eventId, 'failed', 'Invalid or missing X-HOTMART-HOTTOK');
    return NextResponse.json({ error: 'Unauthorized webhook source' }, { status: 401 });
  }

  if (!eventId) {
    return NextResponse.json({ error: 'Missing event id' }, { status: 400 });
  }

  if (await hasEventBeenProcessed(eventId)) {
    return NextResponse.json({ success: true, duplicate: true });
  }

  try {
    const result = await processHotmartWebhookEvent(payload);

    if (result.status === 'failed') {
      await updateEventStatus(eventId, 'failed', result.reason || 'Processing failed');
      return NextResponse.json({ error: result.reason || 'Processing failed' }, { status: 400 });
    }

    if (result.status === 'ignored') {
      await updateEventStatus(eventId, 'ignored', result.reason);
      return NextResponse.json({ success: true, ignored: true, reason: result.reason || null });
    }

    await updateEventStatus(eventId, 'processed');
    return NextResponse.json({ success: true, grant_created: result.grantCreated || false });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown processing error';
    await updateEventStatus(eventId, 'failed', message);
    console.error('Hotmart webhook processing error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, provider: 'hotmart' });
}
