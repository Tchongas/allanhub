import { NextResponse } from 'next/server';
import { getProductsFromDB } from '@/lib/products';

export async function GET() {
  try {
    const products = await getProductsFromDB();
    return NextResponse.json({ products });
  } catch (error) {
    console.error('Products GET error:', error);
    return NextResponse.json({ error: 'Erro ao buscar produtos' }, { status: 500 });
  }
}
