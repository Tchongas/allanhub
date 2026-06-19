/**
 * Cadastro com email/senha.
 *
 * Cria a conta no Supabase Auth, sincroniza em `hub_users` e retorna
 * `requires_email_confirmation` quando a confirmação de email está ativa.
 * Também trata o caso de anti-enumeração em que o Supabase devolve um
 * usuário sem identidades para emails já registrados.
 */
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServer } from '@/lib/supabase/server';
import { ensureHubUserForAuthUser } from '@/lib/hub-user';

function safeRedirectPath(redirectTo?: string): string {
  if (!redirectTo) return '/';
  return redirectTo.startsWith('/') ? redirectTo : '/';
}

const ACCOUNT_EXISTS_MESSAGE =
  'Este email já está em uso. Tente entrar com email/senha ou continuar com Google.';

export async function POST(request: NextRequest) {
  try {
    const { email, password, name, redirect_to } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email e senha são obrigatórios' }, { status: 400 });
    }

    if (String(password).length < 6) {
      return NextResponse.json({ error: 'A senha deve ter pelo menos 6 caracteres' }, { status: 400 });
    }

    const supabase = await createSupabaseServer();
    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedName = String(name || '').trim();

    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password: String(password),
      options: {
        data: {
          name: normalizedName || undefined,
          full_name: normalizedName || undefined,
        },
      },
    });

    if (error) {
      if (error.message.toLowerCase().includes('already')) {
        return NextResponse.json(
          {
            error: ACCOUNT_EXISTS_MESSAGE,
          },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: error.message || 'Erro ao criar conta' }, { status: 400 });
    }

    // Supabase may return a masked user without identities for already-registered emails
    // when anti-enumeration protections are enabled.
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      return NextResponse.json(
        {
          error: ACCOUNT_EXISTS_MESSAGE,
        },
        { status: 409 }
      );
    }

    if (data.user) {
      await ensureHubUserForAuthUser(data.user);
    }

    if (data.session) {
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
    }

    return NextResponse.json({
      success: true,
      requires_email_confirmation: true,
      message: 'Conta criada. Verifique seu email para confirmar o cadastro antes de entrar.',
    });
  } catch (error) {
    console.error('Email register error:', error);
    return NextResponse.json({ error: 'Erro ao criar conta' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.redirect('/login');
}
