import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server';

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    const normalizedEmail = String(email || '').trim().toLowerCase();

    if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
      return NextResponse.json({ error: 'Informe um email válido.' }, { status: 400 });
    }

    const supabase = await createSupabaseServer();
    const redirectTo = `${new URL(request.url).origin}/reset-password`;

    await supabase.auth.resetPasswordForEmail(normalizedEmail, { redirectTo });

    return NextResponse.json({
      success: true,
      message: 'Se o email existir, você receberá um link de redefinição.',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ error: 'Não foi possível enviar o link de redefinição.' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.redirect('/login');
}
