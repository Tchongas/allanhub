/**
 * Retorna banners ativos para o carrossel da home.
 *
 * Leitura pública, sem autenticação. Usa cache de 1 minuto.
 */
import { NextResponse } from 'next/server';
import { getActiveBanners } from '@/lib/banners';

export async function GET() {
  try {
    const banners = await getActiveBanners();
    return NextResponse.json({ banners });
  } catch (error) {
    console.error('Banners GET error:', error);
    return NextResponse.json({ banners: [] });
  }
}
