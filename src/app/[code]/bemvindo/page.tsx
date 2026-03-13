import { getProductByActivationCode } from '@/lib/supabase/db';

interface WelcomePageProps {
  params: { code: string };
}

export default async function PublicWelcomePage({ params }: WelcomePageProps) {
  const { code } = params;
  const product = await getProductByActivationCode(code);

  if (!product) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-900/70 p-8 text-center">
          <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Link inválido</p>
          <h1 className="mt-3 text-2xl font-bold">Não encontramos este código</h1>
          <p className="mt-3 text-slate-400">
            Confira se o link foi copiado completo. Se precisar, peça um novo link de boas-vindas para o suporte.
          </p>
        </div>
      </main>
    );
  }

  const buttonText = product.welcome_button_text?.trim() || 'Acessar site';
  const buttonUrl = product.welcome_button_url?.trim() || product.url;
  const welcomeHtml =
    product.welcome_html?.trim() ||
    `<h2>Compra confirmada 🎉</h2><p>Seu acesso ao <strong>${product.name}</strong> está pronto. Clique no botão abaixo para continuar.</p>`;

  return (
    <main className="min-h-screen welcome-page-shell px-5 py-8 sm:px-8 sm:py-12">
      <div className="mx-auto w-full max-w-4xl rounded-3xl border border-slate-700/50 bg-slate-900/80 p-6 shadow-2xl shadow-black/40 backdrop-blur-sm sm:p-8">
        <div className="mb-6 text-center sm:mb-8">
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-300/80">Boas-vindas</p>
          <h1 className="mt-2 text-3xl font-semibold text-white sm:text-4xl">{product.name}</h1>
        </div>

        <section
          className="product-modal-content welcome-page-content rounded-2xl border border-slate-700/60 bg-slate-900/60 p-5 sm:p-7"
          dangerouslySetInnerHTML={{ __html: welcomeHtml }}
        />

        <div className="mt-8 flex justify-center">
          <a
            href={buttonUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-12 items-center justify-center rounded-xl bg-cyan-500 px-7 text-base font-semibold text-slate-950 transition hover:bg-cyan-400"
          >
            {buttonText}
          </a>
        </div>
      </div>
    </main>
  );
}
