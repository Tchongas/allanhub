"use client";

import { useState } from 'react';
import { PartyPopper, Rocket, Sparkles, Check, ExternalLink, Loader2, Clock } from 'lucide-react';
import { Button, Input, Badge } from '@/components/ui';
import { Product } from '@/types';
import { formatCurrency } from '@/lib/utils';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  'party-popper': PartyPopper,
  'rocket': Rocket,
  'sparkles': Sparkles,
};

interface ProductCardProps {
  product: Product;
  isOwned?: boolean;
  daysRemaining?: number;
  isLoggedIn?: boolean;
  onActivate?: (code: string) => Promise<{ success: boolean; error?: string }>;
}

export function ProductCard({ 
  product, 
  isOwned = false, 
  daysRemaining = 0,
  isLoggedIn = false,
  onActivate 
}: ProductCardProps) {
  const [activationCode, setActivationCode] = useState('');
  const [isActivating, setIsActivating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const IconComponent = iconMap[product.iconName] || Sparkles;

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
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
      <div className="flex flex-col lg:flex-row">
        <div className="lg:w-80 h-48 lg:h-auto bg-slate-700/50 flex items-center justify-center relative">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-violet-600/20" />
          <IconComponent className="w-20 h-20 text-slate-400" />
          {!product.active && (
            <div className="absolute top-4 left-4">
              <Badge variant="secondary">Em breve</Badge>
            </div>
          )}
          {isOwned && (
            <div className="absolute top-4 left-4">
              <Badge variant="success">Ativo</Badge>
            </div>
          )}
        </div>

        <div className="flex-1 p-6 lg:p-8">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h3 className="text-xl font-semibold text-white mb-2">{product.name}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{product.description}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-2xl font-bold text-white">{formatCurrency(product.price)}</div>
              <div className="text-sm text-slate-500">por {product.duration_months} meses</div>
            </div>
          </div>

          <ul className="grid grid-cols-2 gap-2 mb-6">
            {product.features.map((feature, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-slate-300">
                <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                {feature}
              </li>
            ))}
          </ul>

          {isOwned ? (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Clock className="w-4 h-4" />
                {daysRemaining > 0 ? `${daysRemaining} dias restantes` : 'Expira hoje'}
              </div>
              <a href={`/api/products/redirect?product=${product.id}`} className="ml-auto">
                <Button variant="primary">
                  Acessar Produto <ExternalLink className="w-4 h-4" />
                </Button>
              </a>
            </div>
          ) : product.active ? (
            <div className="space-y-3">
              {isLoggedIn ? (
                <>
                  <div className="flex gap-3">
                    <Input
                      placeholder="Código de ativação"
                      value={activationCode}
                      onChange={(e) => setActivationCode(e.target.value.toUpperCase())}
                      className="font-mono bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500"
                    />
                    <Button
                      variant="primary"
                      onClick={handleActivate}
                      disabled={isActivating || !activationCode.trim()}
                    >
                      {isActivating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Ativar'}
                    </Button>
                  </div>
                  {error && <p className="text-sm text-red-400">{error}</p>}
                  {success && <p className="text-sm text-emerald-400">Produto ativado com sucesso!</p>}
                </>
              ) : (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-slate-400">Faça login para ativar seu código</span>
                  <Button variant="primary" onClick={() => window.location.href = '/api/auth/google'}>
                    Entrar com Google
                  </Button>
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
    </div>
  );
}
