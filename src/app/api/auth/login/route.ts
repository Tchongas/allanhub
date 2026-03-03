import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServer } from '@/lib/supabase/server';
import { ensureHubUserForAuthUser } from '@/lib/hub-user';

function safeRedirectPath(redirectTo?: string): string {
  if (!redirectTo) return '/';
  return redirectTo.startsWith('/') ? redirectTo : '/';
}

function mapLoginError(message?: string): string {
  const normalized = (message || '').toLowerCase();

  if (normalized.includes('email not confirmed')) {
    return 'Confirme seu email antes de entrar.';
  }

  if (normalized.includes('invalid login credentials')) {
    return 'Email ou senha inválidos. Se não lembrar como entrou, tente também "Continuar com Google".';
  }

  return 'Email ou senha inválidos';
}

export async function POST(request: NextRequest) {
  try {
    const { email, password, redirect_to } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email e senha são obrigatórios' }, { status: 400 });
    }

    const supabase = await createSupabaseServer();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: String(email).trim().toLowerCase(),
      password: String(password),
    });

    if (error || !data.user || !data.session) {
      return NextResponse.json({ error: mapLoginError(error?.message) }, { status: 401 });
    }

    await ensureHubUserForAuthUser(data.user);

    const cookieStore = await cookies();
    cookieStore.set('hub_session', data.session.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return NextResponse.json({
      success: true,
      redirect_to: safeRedirectPath(redirect_to),
    });
  } catch (error) {
    console.error('Email login error:', error);
    return NextResponse.json({ error: 'Erro ao fazer login' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.redirect('/login');
}
