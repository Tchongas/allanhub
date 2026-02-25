"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, X, XCircle, Loader2, LogIn, KeyRound, Sparkles, ArrowRight, Home } from 'lucide-react';
import { Button, Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui';

type ActivationState = 
  | 'loading'        // checking auth + validating code
  | 'not_logged_in'  // user not logged in, prompt to login
  | 'activating'     // currently activating
  | 'success'        // code activated successfully
  | 'already_owned'  // user already has this product active
  | 'already_used'   // code was already used
  | 'invalid'        // code is invalid or expired
  | 'error';         // generic error

interface ProductInfo {
  id: string;
  name: string;
  expires_at?: string;
}

export default function CodeActivationPage() {
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;

  const [state, setState] = useState<ActivationState>('loading');
  const [product, setProduct] = useState<ProductInfo | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const getAlreadyOwnedPopupKey = () => {
    return `already-owned-popup-seen:${product?.id || 'unknown'}`;
  };

  const closeAlreadyOwnedPopup = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(getAlreadyOwnedPopupKey(), '1');
    }
    router.push('/');
  };

  useEffect(() => {
    if (state !== 'already_owned' || typeof window === 'undefined') return;
    const hasSeenPopup = window.localStorage.getItem(getAlreadyOwnedPopupKey()) === '1';
    if (hasSeenPopup) {
      router.push('/');
    }
  }, [state, product?.id, router]);

  // Step 1: Check if user is logged in and validate the code
  useEffect(() => {
    async function checkAuthAndCode() {
      try {
        // Check auth status
        const authRes = await fetch('/api/auth/verify');
        const authData = await authRes.json();

        if (authData.authenticated) {
          setIsAuthenticated(true);
          // User is logged in — try to activate immediately
          setState('activating');
          await activateCode();
        } else {
          // User is not logged in — show login prompt
          setState('not_logged_in');
        }
      } catch {
        setState('error');
        setErrorMessage('Erro ao verificar autenticação.');
      }
    }

    checkAuthAndCode();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function activateCode() {
    try {
      const response = await fetch('/api/products/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setProduct(data.product);
        setState('success');
      } else if (response.status === 401) {
        // Session expired or invalid — prompt login
        setIsAuthenticated(false);
        setState('not_logged_in');
      } else if (response.status === 409 && data.error === 'already_owned') {
        // User already has this product active
        setProduct(data.product);
        setState('already_owned');
      } else {
        const err = data.error || 'Erro desconhecido';
        if (err.includes('inválido') || err.includes('expirado')) {
          setState('invalid');
        } else if (err.includes('já foi utilizado')) {
          setState('already_used');
        } else {
          setState('error');
        }
        setErrorMessage(err);
      }
    } catch {
      setState('error');
      setErrorMessage('Erro de conexão. Tente novamente.');
    }
  }

  const handleLogin = () => {
    const redirectPath = `/code/${encodeURIComponent(code)}`;
    window.location.href = `/login?redirect_to=${encodeURIComponent(redirectPath)}`;
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
      {/* Loading */}
      {state === 'loading' && (
        <Card className="w-full max-w-md">
          <CardContent className="py-12">
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-blue-600/20 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
                </div>
              </div>
              <p className="text-slate-400 text-sm">Verificando código...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Activating */}
      {state === 'activating' && (
        <Card className="w-full max-w-md">
          <CardContent className="py-12">
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-blue-600/20 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
                </div>
              </div>
              <p className="text-white font-medium">Ativando produto...</p>
              <p className="text-slate-400 text-sm">Aguarde um momento</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Not Logged In — Prompt to login */}
      {state === 'not_logged_in' && (
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto bg-amber-600/20 p-4 rounded-2xl w-fit mb-2">
              <KeyRound className="w-10 h-10 text-amber-400" />
            </div>
            <CardTitle className="text-2xl text-white">Código de Ativação</CardTitle>
            <CardDescription className="mt-2">
              Você precisa estar logado para ativar este código
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="bg-slate-700/50 px-3 py-1.5 rounded-lg">
                  <code className="text-blue-400 text-sm font-mono">{code}</code>
                </div>
                <span className="text-slate-400 text-sm">Pronto para ativar</span>
              </div>
            </div>

            <Button
              onClick={handleLogin}
              className="w-full flex items-center justify-center gap-2 mb-3"
            >
              <LogIn className="w-5 h-5" />
              Entrar e Ativar
            </Button>

            <p className="text-center text-xs text-slate-500 mt-4">
              Não tem conta? Ao clicar em &quot;Entrar e Ativar&quot;, você pode criar uma conta com Google.
            </p>

            <div className="mt-4 text-center">
              <Link href="/" className="text-sm text-slate-400 hover:text-white transition-colors">
                ← Voltar para o início
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Success */}
      {state === 'success' && (
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto relative mb-2">
              <div className="w-20 h-20 rounded-full bg-emerald-600/20 flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-emerald-400" />
              </div>
              <div className="absolute -top-1 -right-1">
                <Sparkles className="w-6 h-6 text-amber-400" />
              </div>
            </div>
            <CardTitle className="text-2xl text-white">Produto Ativado!</CardTitle>
            <CardDescription className="mt-2">
              Seu código foi ativado com sucesso
            </CardDescription>
          </CardHeader>
          <CardContent>
            {product && (
              <div className="bg-emerald-900/20 border border-emerald-800/30 rounded-xl p-4 mb-6">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-sm">Produto</span>
                    <span className="text-white font-medium">{product.name}</span>
                  </div>
                  {product.expires_at && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-sm">Válido até</span>
                      <span className="text-emerald-400 text-sm font-medium">
                        {new Date(product.expires_at).getFullYear() > 2100
                          ? 'Vitalício ♾️'
                          : new Date(product.expires_at).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-sm">Código</span>
                    <code className="text-blue-400 text-xs font-mono">{code}</code>
                  </div>
                </div>
              </div>
            )}

            <Button
              onClick={() => router.push('/')}
              className="w-full flex items-center justify-center gap-2 mb-3"
            >
              <Home className="w-5 h-5" />
              Ir para o Início
            </Button>

            <Button
              onClick={() => router.push('/dashboard')}
              variant="outline"
              className="w-full flex items-center justify-center gap-2"
            >
              Meus Produtos
              <ArrowRight className="w-4 h-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Already Owned */}
      {state === 'already_owned' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6" onClick={closeAlreadyOwnedPopup}>
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-md rounded-2xl border border-blue-800/50 bg-slate-900 p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={closeAlreadyOwnedPopup}
              className="absolute right-3 top-3 rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
              aria-label="Fechar aviso"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-xl bg-blue-600/20 p-3">
                <CheckCircle className="h-6 w-6 text-blue-400" />
              </div>
              <div>
                <p className="text-lg font-semibold text-white">Acesso confirmado</p>
                <p className="text-sm text-slate-300">
                  Agora você tem <span className="font-medium text-white">{product?.name || 'este produto'}</span> na sua conta.
                </p>
              </div>
            </div>

            <p className="mb-5 text-sm text-slate-400">
              Parabéns! Você já pode usar este produto.
            </p>

            <Button onClick={closeAlreadyOwnedPopup} className="w-full">
              OK
            </Button>
          </div>
        </div>
      )}

      {/* Invalid Code */}
      {state === 'invalid' && (
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto bg-red-600/20 p-4 rounded-2xl w-fit mb-2">
              <XCircle className="w-10 h-10 text-red-400" />
            </div>
            <CardTitle className="text-2xl text-white">Código Inválido</CardTitle>
            <CardDescription className="mt-2">
              Este código não existe, já foi usado ou está expirado
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-red-900/20 border border-red-800/30 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-3">
                <code className="text-red-400 text-sm font-mono">{code}</code>
                <span className="text-red-400/70 text-sm">{errorMessage}</span>
              </div>
            </div>

            <Button
              onClick={() => router.push('/')}
              variant="outline"
              className="w-full flex items-center justify-center gap-2"
            >
              <Home className="w-5 h-5" />
              Voltar para o Início
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Already Used */}
      {state === 'already_used' && (
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto bg-amber-600/20 p-4 rounded-2xl w-fit mb-2">
              <KeyRound className="w-10 h-10 text-amber-400" />
            </div>
            <CardTitle className="text-2xl text-white">Código Já Utilizado</CardTitle>
            <CardDescription className="mt-2">
              Este código de ativação já foi utilizado anteriormente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-amber-900/20 border border-amber-800/30 rounded-xl p-4 mb-6">
              <code className="text-amber-400 text-sm font-mono">{code}</code>
            </div>

            <Button
              onClick={() => router.push('/')}
              variant="outline"
              className="w-full flex items-center justify-center gap-2"
            >
              <Home className="w-5 h-5" />
              Voltar para o Início
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Generic Error */}
      {state === 'error' && (
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto bg-red-600/20 p-4 rounded-2xl w-fit mb-2">
              <XCircle className="w-10 h-10 text-red-400" />
            </div>
            <CardTitle className="text-2xl text-white">Erro</CardTitle>
            <CardDescription className="mt-2">
              {errorMessage || 'Ocorreu um erro ao processar seu código'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              <Button
                onClick={() => window.location.reload()}
                className="w-full flex items-center justify-center gap-2"
              >
                Tentar Novamente
              </Button>
              <Button
                onClick={() => router.push('/')}
                variant="outline"
                className="w-full flex items-center justify-center gap-2"
              >
                <Home className="w-5 h-5" />
                Voltar para o Início
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
