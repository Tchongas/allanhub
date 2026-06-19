/**
 * CRUD de banners no painel admin.
 *
 * GET retorna todos os banners (ativos e inativos).
 * POST/PUT/DELETE manipulam a tabela `banners` e limpam o cache em memória.
 */
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';
import { getAllBanners, createBanner, updateBanner, deleteBanner } from '@/lib/banners';

async function verifyAdmin() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('hub_session')?.value;

  if (!sessionToken) return null;

  const supabase = createServiceRoleClient();
  const { data: { user }, error } = await supabase.auth.getUser(sessionToken);

  if (error || !user || !isAdmin(user.email)) return null;
  return user;
}

export async function GET() {
  try {
    const user = await verifyAdmin();
    if (!user) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const banners = await getAllBanners();
    return NextResponse.json({ banners });
  } catch (error) {
    console.error('Admin banners GET error:', error);
    return NextResponse.json({ error: 'Erro ao buscar banners' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAdmin();
    if (!user) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const body = await request.json();
    const { title, image_url, image_mobile_url, link_url, link_target, html_content, sort_order, active } = body;

    if (!title || !image_url) {
      return NextResponse.json({ error: 'Campos obrigatórios: title, image_url' }, { status: 400 });
    }

    const banner = await createBanner({
      title,
      image_url,
      image_mobile_url: image_mobile_url || '',
      link_url: link_url || '',
      link_target: link_target || '_self',
      html_content: html_content || '',
      sort_order: sort_order ?? 0,
      active: active !== undefined ? active : true,
    });

    return NextResponse.json({ success: true, banner });
  } catch (error) {
    console.error('Admin banners POST error:', error);
    return NextResponse.json({ error: 'Erro ao criar banner' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await verifyAdmin();
    if (!user) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID do banner é obrigatório' }, { status: 400 });
    }

    const banner = await updateBanner(id, updates);
    return NextResponse.json({ success: true, banner });
  } catch (error) {
    console.error('Admin banners PUT error:', error);
    return NextResponse.json({ error: 'Erro ao atualizar banner' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await verifyAdmin();
    if (!user) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID do banner é obrigatório' }, { status: 400 });
    }

    await deleteBanner(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin banners DELETE error:', error);
    return NextResponse.json({ error: 'Erro ao deletar banner' }, { status: 500 });
  }
}
