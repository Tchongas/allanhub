import { Banner } from '@/types';
import { createServiceRoleClient } from '@/lib/supabase/server';

let bannersCache: Banner[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 60000; // 1 minute

export async function getActiveBanners(): Promise<Banner[]> {
  const now = Date.now();
  if (bannersCache && (now - cacheTimestamp) < CACHE_TTL) {
    return bannersCache;
  }

  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from('banners')
      .select('*')
      .eq('active', true)
      .order('sort_order', { ascending: true });

    if (error || !data) return [];

    bannersCache = data as Banner[];
    cacheTimestamp = now;
    return bannersCache;
  } catch {
    return [];
  }
}

export async function getAllBanners(): Promise<Banner[]> {
  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from('banners')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error || !data) return [];
    return data as Banner[];
  } catch {
    return [];
  }
}

export function clearBannersCache(): void {
  bannersCache = null;
  cacheTimestamp = 0;
}

export async function createBanner(banner: Omit<Banner, 'id' | 'created_at' | 'updated_at'>): Promise<Banner> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from('banners')
    .insert(banner)
    .select()
    .single();

  if (error) throw new Error(`Failed to create banner: ${error.message}`);
  clearBannersCache();
  return data as Banner;
}

export async function updateBanner(id: string, updates: Partial<Banner>): Promise<Banner> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from('banners')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(`Failed to update banner: ${error.message}`);
  clearBannersCache();
  return data as Banner;
}

export async function deleteBanner(id: string): Promise<void> {
  const supabase = createServiceRoleClient();

  const { error } = await supabase
    .from('banners')
    .delete()
    .eq('id', id);

  if (error) throw new Error(`Failed to delete banner: ${error.message}`);
  clearBannersCache();
}
