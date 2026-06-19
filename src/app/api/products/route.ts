/**
 * Lista produtos ativos para a home.
 *
 * Retorna todos os produtos do banco, independentemente de `active`.
 * O filtro visual é feito no componente `home-content.tsx`.
 */
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
