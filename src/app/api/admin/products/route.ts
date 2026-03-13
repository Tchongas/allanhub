import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';
import { getProductsFromDB, createProduct, updateProduct, deleteProduct } from '@/lib/products';

async function verifyAdmin(request: NextRequest) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('hub_session')?.value;

  if (!sessionToken) {
    return { error: 'Não autenticado', status: 401 };
  }

  const supabase = createServiceRoleClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser(sessionToken);

  if (authError || !user) {
    return { error: 'Sessão inválida', status: 401 };
  }

  if (!isAdmin(user.email)) {
    return { error: 'Acesso negado', status: 403 };
  }

  return { user };
}

// GET - List all products
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAdmin(request);
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const products = await getProductsFromDB();
    return NextResponse.json({ products });
  } catch (error) {
    console.error('Admin products GET error:', error);
    return NextResponse.json({ error: 'Erro ao buscar produtos' }, { status: 500 });
  }
}

// POST - Create new product
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAdmin(request);
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const {
      id,
      name,
      description,
      icon_name,
      image,
      color,
      url,
      shop_link,
      modal_html,
      welcome_html,
      welcome_button_text,
      welcome_button_url,
      price,
      duration_months,
      is_lifetime,
      features,
      active,
    } = body;

    if (!id || !name || !description || !url) {
      return NextResponse.json({ error: 'Campos obrigatórios: id, name, description, url' }, { status: 400 });
    }

    const product = await createProduct({
      id,
      name,
      description,
      icon_name: icon_name || 'sparkles',
      image: image || '',
      color: color || 'blue',
      url,
      shop_link: shop_link || '',
      modal_html: modal_html || '',
      welcome_html: welcome_html || '',
      welcome_button_text: welcome_button_text || 'Acessar site',
      welcome_button_url: welcome_button_url || '',
      price: price || 0,
      duration_months: duration_months || 3,
      is_lifetime: is_lifetime || false,
      features: features || [],
      active: active !== undefined ? active : true,
    });

    return NextResponse.json({ success: true, product });
  } catch (error) {
    console.error('Admin products POST error:', error);
    return NextResponse.json({ error: 'Erro ao criar produto' }, { status: 500 });
  }
}

// PUT - Update product
export async function PUT(request: NextRequest) {
  try {
    const auth = await verifyAdmin(request);
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID do produto é obrigatório' }, { status: 400 });
    }

    const product = await updateProduct(id, updates);
    return NextResponse.json({ success: true, product });
  } catch (error) {
    console.error('Admin products PUT error:', error);
    return NextResponse.json({ error: 'Erro ao atualizar produto' }, { status: 500 });
  }
}

// DELETE - Delete product
export async function DELETE(request: NextRequest) {
  try {
    const auth = await verifyAdmin(request);
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID do produto é obrigatório' }, { status: 400 });
    }

    await deleteProduct(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin products DELETE error:', error);
    return NextResponse.json({ error: 'Erro ao deletar produto' }, { status: 500 });
  }
}
