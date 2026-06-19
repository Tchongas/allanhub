/**
 * Clientes Supabase para uso no servidor (Server Components, API Routes, Server Actions).
 *
 * - `createSupabaseServer`: cliente SSR que lê/escreve cookies do Next.js.
 *   Usado principalmente no fluxo OAuth do Supabase Auth.
 * - `createServiceRoleClient`: cliente com `service_role`, sem sessão persistente.
 *   Usado em todas as API routes que leem/escrevem no banco diretamente.
 */
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

export async function createSupabaseServer() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Ignora erros de Server Component; cookies já foram setados no middleware.
          }
        },
      },
    }
  );
}

export function createServiceRoleClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
