"use client";

/**
 * Tela de redefinição de senha.
 *
 * Valida o token/link de recuperação do Supabase (via hash ou query params)
 * e permite ao usuário definir uma nova senha. Redireciona para login ao final.
 */
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, KeyRound } from 'lucide-react';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';

function readHashParams(): URLSearchParams {
  if (typeof window === 'undefined') return new URLSearchParams();
  const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : '';
  return new URLSearchParams(hash);
}

export default function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const setupRecoverySession = async () => {
      const tokenHash = searchParams.get('token_hash');
      const type = searchParams.get('type');

      if (tokenHash && type === 'recovery') {
        const { error: otpError } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: 'recovery',
        });

        if (otpError) {
          if (isMounted) {
            setError('Link de recuperação inválido ou expirado. Solicite um novo.');
            setLoading(false);
          }
          return;
        }

        if (isMounted) {
          setReady(true);
          setLoading(false);
        }
        return;
      }

      const hashParams = readHashParams();
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      const hashType = hashParams.get('type');
      const hashError = hashParams.get('error_description');

      if (hashError) {
        if (isMounted) {
          setError(decodeURIComponent(hashError));
          setLoading(false);
        }
        return;
      }

      if (accessToken && refreshToken && hashType === 'recovery') {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (sessionError) {
          if (isMounted) {
            setError('Link de recuperação inválido ou expirado. Solicite um novo.');
            setLoading(false);
          }
          return;
        }

        if (isMounted) {
          setReady(true);
          setLoading(false);
        }
        return;
      }

      const { data } = await supabase.auth.getSession();
      if (isMounted) {
        setReady(Boolean(data.session));
        if (!data.session) {
          setError('Link de recuperação inválido ou expirado. Solicite um novo.');
        }
        setLoading(false);
      }
    };

    void setupRecoverySession();

    return () => {
      isMounted = false;
    };
  }, [searchParams, supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas não conferem.');
      return;
    }

    setSubmitting(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message || 'Não foi possível redefinir sua senha.');
        return;
      }

      await supabase.auth.signOut();
      router.replace('/login?reset=success');
    } catch {
      setError('Não foi possível redefinir sua senha. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto bg-blue-600 p-3 rounded-lg w-fit mb-4">
            <KeyRound className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl text-white">Redefinir senha</CardTitle>
          <CardDescription>Crie uma nova senha para entrar na sua conta.</CardDescription>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center gap-2 text-sm text-slate-300 py-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              Validando link...
            </div>
          ) : !ready ? (
            <div className="space-y-4">
              {error && (
                <div className="bg-red-900/40 border border-red-800 text-red-300 text-sm rounded-lg px-3 py-2">
                  {error}
                </div>
              )}
              <Link href="/login" className="text-sm text-blue-300 hover:text-blue-200">
                Voltar para o login
              </Link>
            </div>
          ) : (
            <form className="space-y-3" onSubmit={handleSubmit}>
              <div>
                <label className="mb-1 block text-xs text-slate-400">Nova senha</label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  autoComplete="new-password"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-xs text-slate-400">Confirmar nova senha</label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita sua nova senha"
                  autoComplete="new-password"
                  required
                />
              </div>

              {error && (
                <div className="bg-red-900/40 border border-red-800 text-red-300 text-sm rounded-lg px-3 py-2">
                  {error}
                </div>
              )}

              <Button type="submit" variant="primary" className="w-full" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Salvar nova senha'
                )}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
