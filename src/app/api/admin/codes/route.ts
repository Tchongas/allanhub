import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';
import { getActivationCodesForProduct, generateMultipleActivationCodes } from '@/lib/supabase/db';

async function verifyAdmin() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('hub_session')?.value;

  if (!sessionToken) return null;

  const supabase = createServiceRoleClient();
  const { data: { user }, error } = await supabase.auth.getUser(sessionToken);

  if (error || !user || !isAdmin(user.email)) return null;

  return user;
}

export async function GET(request: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const productId = request.nextUrl.searchParams.get('productId');
  
  if (!productId) {
    return NextResponse.json({ error: 'Product ID é obrigatório' }, { status: 400 });
  }

  try {
    const codes = await getActivationCodesForProduct(productId, 5);
    return NextResponse.json({ codes });
  } catch (error) {
    console.error('Error fetching codes:', error);
    return NextResponse.json({ error: 'Erro ao buscar códigos' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const { productId, count = 5 } = await request.json();

    if (!productId) {
      return NextResponse.json({ error: 'Product ID é obrigatório' }, { status: 400 });
    }

    const codes = await generateMultipleActivationCodes(productId, Math.min(count, 10));
    return NextResponse.json({ codes, message: `${codes.length} códigos gerados com sucesso` });
  } catch (error) {
    console.error('Error generating codes:', error);
    return NextResponse.json({ error: 'Erro ao gerar códigos' }, { status: 500 });
  }
}
