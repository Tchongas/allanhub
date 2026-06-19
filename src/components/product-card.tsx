"use client";

/**
 * Card de produto na home do Hub.
 *
 * Exibe informações do produto, campos de ativação de código e botão de acesso.
 * Se o produto tiver `modal_html`, abre o modal de introdução ao clicar em acessar.
 */
import { useState } from 'react';
import { PartyPopper, Rocket, Sparkles, Check, ExternalLink, Loader2, Clock, Infinity, LogIn, ShoppingCart } from 'lucide-react';
import { Button, Input, Badge } from '@/components/ui';
import { Product } from '@/types';
import { ProductIntroModal } from '@/components/product-intro-modal';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  'party-popper': PartyPopper,
  'rocket': Rocket,
  'sparkles': Sparkles,
};

interface ProductCardProps {
  product: Product;
  isOwned?: boolean;
  daysRemaining?: number;
  isLifetime?: boolean;
  isLoggedIn?: boolean;
  onActivate?: (code: string) => Promise<{ success: boolean; error?: string }>;
}

export function ProductCard({ 
  product, 
  isOwned = false, 
  daysRemaining = 0,
  isLifetime = false,
  isLoggedIn = false,
  onActivate 
}: ProductCardProps) {
  const [activationCode, setActivationCode] = useState('');
  const [isActivating, setIsActivating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showIntroModal, setShowIntroModal] = useState(false);

  const IconComponent = iconMap[product.icon_name] || Sparkles;

  const handleActivate = async () => {
    if (!activationCode.trim() || !onActivate) return;
    
    setIsActivating(true);
    setError(null);
    
    const result = await onActivate(activationCode);
    
    if (result.success) {
      setSuccess(true);
      setActivationCode('');
    } else {
      setError(result.error || 'Erro ao ativar código');
    }
    
    setIsActivating(false);
  };

  return (
    <div className="group bg-slate-800/40 border border-slate-700/50 rounded-2xl overflow-hidden hover:border-slate-600/50 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/5">
      <div className="flex flex-col lg:flex-row">
        <div className="lg:w-72 h-44 lg:h-auto min-h-[176px] bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center relative overflow-hidden">
          {product.image ? (
            <>
              <img
                src={product.image}
                alt={product.name}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent" />
            </>
          ) : (
            <>
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-violet-600/10 to-transparent" />
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-blue-500/20 to-violet-500/20" />
              <IconComponent className="w-16 h-16 text-slate-500 group-hover:text-slate-400 transition-colors duration-300 relative z-10" />
            </>
          )}
          {!product.active && (
            <div className="absolute top-4 left-4 z-20">
              <Badge variant="secondary">Em breve</Badge>
            </div>
          )}
          {isOwned && (
            <div className="absolute top-4 left-4 z-20">
              <Badge variant="success" className="shadow-lg shadow-emerald-500/20">Ativo</Badge>
            </div>
          )}
        </div>

        <div className="flex-1 p-6 lg:p-8 flex flex-col">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h3 className="text-xl font-semibold text-white mb-2">{product.name}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{product.description}</p>
            </div>
          </div>

          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-6 flex-1">
            {product.features.map((feature, i) => (
              <li key={i} className="flex items-center gap-2.5 text-sm text-slate-300">
                <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                  <Check className="w-3 h-3 text-emerald-400" />
                </div>
                {feature}
              </li>
            ))}
          </ul>

          {isOwned ? (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-slate-400">
                {isLifetime ? (
                  <>
                    <Infinity className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-400">Acesso vitalício</span>
                  </>
                ) : (
                  <>
                    <Clock className="w-4 h-4" />
                    {daysRemaining > 0 ? `${daysRemaining} dias restantes` : 'Expira hoje'}
                  </>
                )}
              </div>
              {product.modal_html ? (
                <Button
                  variant="primary"
                  className="ml-auto shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-shadow"
                  onClick={() => setShowIntroModal(true)}
                >
                  Acessar Produto <ExternalLink className="w-4 h-4" />
                </Button>
              ) : (
                <a href={`/api/products/redirect?product=${product.id}`} className="ml-auto">
                  <Button variant="primary" className="shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-shadow">
                    Acessar Produto <ExternalLink className="w-4 h-4" />
                  </Button>
                </a>
              )}
            </div>
          ) : product.active ? (
            <div className="space-y-3">
              {isLoggedIn ? (
                <>
                  <div className="flex flex-wrap gap-3">
                    <Input
                      placeholder="Código de ativação"
                      value={activationCode}
                      onChange={(e) => setActivationCode(e.target.value.toUpperCase())}
                      className="font-mono bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500 flex-1 min-w-[180px]"
                    />
                    <Button
                      variant="primary"
                      onClick={handleActivate}
                      disabled={isActivating || !activationCode.trim()}
                      className="shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-shadow"
                    >
                      {isActivating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Ativar'}
                    </Button>
                    {product.shop_link && (
                      <a href={product.shop_link} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" className="whitespace-nowrap">
                          <ShoppingCart className="w-4 h-4" /> Comprar
                        </Button>
                      </a>
                    )}
                  </div>
                  {error && <p className="text-sm text-red-400">{error}</p>}
                  {success && <p className="text-sm text-emerald-400">Produto ativado com sucesso!</p>}
                </>
              ) : (
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <span className="text-sm text-slate-400">Faça login para ativar seu código</span>
                  <div className="flex gap-3">
                    <Button variant="primary" onClick={() => window.location.href = '/login'} className="shadow-lg shadow-blue-500/25">
                      <LogIn className="w-4 h-4" /> Entrar
                    </Button>
                    {product.shop_link && (
                      <a href={product.shop_link} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" className="whitespace-nowrap">
                          <ShoppingCart className="w-4 h-4" /> Comprar
                        </Button>
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm text-slate-500">
              Este produto estará disponível em breve.
            </div>
          )}
        </div>
      </div>

      {showIntroModal && product.modal_html && (
        <ProductIntroModal
          productName={product.name}
          html={product.modal_html}
          onClose={() => setShowIntroModal(false)}
        />
      )}
    </div>
  );
}
