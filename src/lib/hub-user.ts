/**
 * Sincronização de usuários entre Supabase Auth e a tabela `hub_users`.
 *
 * Todo login (Google ou email/senha) passa por `ensureHubUserForAuthUser`,
 * que garante que exista um registro em `hub_users` com email normalizado.
 *
 * A canonicalização é feita por email para evitar duplicatas quando o mesmo
 * email é usado por provedores diferentes.
 */
import type { User as SupabaseAuthUser } from '@supabase/supabase-js';
import { createServiceRoleClient } from '@/lib/supabase/server';

export interface HubUserRow {
  id: string;
  email: string;
  name: string;
  created_at?: string;
  updated_at?: string;
}

function normalizeEmail(email?: string | null): string {
  return (email || '').trim().toLowerCase();
}

function getDefaultName(authUser: SupabaseAuthUser): string {
  const metadataName =
    (authUser.user_metadata?.full_name as string | undefined) ||
    (authUser.user_metadata?.name as string | undefined) ||
    (authUser.user_metadata?.display_name as string | undefined);

  if (metadataName && metadataName.trim()) return metadataName.trim();

  const email = normalizeEmail(authUser.email);
  return email.includes('@') ? email.split('@')[0] : 'Usuário';
}

export async function ensureHubUserForAuthUser(authUser: SupabaseAuthUser): Promise<HubUserRow> {
  const supabase = createServiceRoleClient();

  const normalizedEmail = normalizeEmail(authUser.email);
  if (!normalizedEmail) {
    throw new Error('Authenticated user does not have a valid email');
  }

  const desiredName = getDefaultName(authUser);

  const { data: byEmailRows, error: byEmailError } = await supabase
    .from('hub_users')
    .select('*')
    .ilike('email', normalizedEmail)
    .order('created_at', { ascending: true });

  if (byEmailError) {
    throw new Error(`Failed to fetch hub user by email: ${byEmailError.message}`);
  }

  if (byEmailRows && byEmailRows.length > 0) {
    const canonical = byEmailRows[0] as HubUserRow;

    const updates: Partial<HubUserRow> = {};

    if ((canonical.email || '').toLowerCase() !== normalizedEmail) {
      updates.email = normalizedEmail;
    }

    if (!canonical.name?.trim() && desiredName) {
      updates.name = desiredName;
    }

    if (Object.keys(updates).length > 0) {
      const { data: updated, error: updateError } = await supabase
        .from('hub_users')
        .update(updates)
        .eq('id', canonical.id)
        .select('*')
        .single();

      if (updateError || !updated) {
        throw new Error(`Failed to update hub user: ${updateError?.message || 'unknown error'}`);
      }

      return updated as HubUserRow;
    }

    return canonical;
  }

  const { data: byIdRows, error: byIdError } = await supabase
    .from('hub_users')
    .select('*')
    .eq('id', authUser.id)
    .limit(1);

  if (byIdError) {
    throw new Error(`Failed to fetch hub user by id: ${byIdError.message}`);
  }

  if (byIdRows && byIdRows.length > 0) {
    const existing = byIdRows[0] as HubUserRow;
    const updates: Partial<HubUserRow> = {};

    if ((existing.email || '').toLowerCase() !== normalizedEmail) {
      updates.email = normalizedEmail;
    }

    if (!existing.name?.trim() && desiredName) {
      updates.name = desiredName;
    }

    if (Object.keys(updates).length > 0) {
      const { data: updated, error: updateError } = await supabase
        .from('hub_users')
        .update(updates)
        .eq('id', existing.id)
        .select('*')
        .single();

      if (updateError || !updated) {
        throw new Error(`Failed to update legacy hub user: ${updateError?.message || 'unknown error'}`);
      }

      return updated as HubUserRow;
    }

    return existing;
  }

  const { data: created, error: createError } = await supabase
    .from('hub_users')
    .insert({
      id: authUser.id,
      email: normalizedEmail,
      name: desiredName,
    })
    .select('*')
    .single();

  if (createError || !created) {
    throw new Error(`Failed to create hub user: ${createError?.message || 'unknown error'}`);
  }

  return created as HubUserRow;
}
