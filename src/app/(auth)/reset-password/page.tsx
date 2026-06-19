/**
 * Página de redefinição de senha.
 *
 * Envolve `reset-password-content.tsx` em Suspense devido ao uso de `useSearchParams`.
 */
import { Suspense } from 'react';
import ResetPasswordContent from './reset-password-content';

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="text-slate-400">Carregando...</div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ResetPasswordContent />
    </Suspense>
  );
}
