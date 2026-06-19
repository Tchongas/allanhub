/**
 * Página de login.
 *
 * Envolve `login-content.tsx` em Suspense devido ao uso de `useSearchParams`.
 */
import { Suspense } from 'react';
import LoginContent from './login-content';

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="text-slate-400">Carregando...</div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <LoginContent />
    </Suspense>
  );
}
