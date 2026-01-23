"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Package, User, LogOut, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui';
import { ProductCard } from '@/components/product-card';
import { PRODUCTS } from '@/lib/products';
import { User as UserType, UserProduct } from '@/types';
import { getDaysRemaining } from '@/lib/utils';

export default function HomePage() {
  const searchParams = useSearchParams();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<UserType | null>(null);
  const [userProducts, setUserProducts] = useState<UserProduct[]>([]);

  const errorParam = searchParams.get('error');
  const productParam = searchParams.get('product');

  useEffect(() => {
    async function checkAuth() {
      try {
        const response = await fetch('/api/auth/verify');
        const data = await response.json();
        setIsLoggedIn(data.authenticated);
        if (data.authenticated) {
          setUser(data.user);
          setUserProducts(data.products || []);
        }
      } catch {
        setIsLoggedIn(false);
      } finally {
        setIsLoading(false);
      }
    }
    checkAuth();
  }, []);

  const handleActivate = async (code: string) => {
    const response = await fetch('/api/products/activate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    const data = await response.json();
    
    if (response.ok) {
      const verifyResponse = await fetch('/api/auth/verify');
      const verifyData = await verifyResponse.json();
      setUserProducts(verifyData.products || []);
      return { success: true };
    }
    
    return { success: false, error: data.error };
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setIsLoggedIn(false);
    setUser(null);
    setUserProducts([]);
  };

  const isProductOwned = (productId: string) => {
    return userProducts.some(p => 
      p.product_id === productId && 
      p.status === 'active' && 
      new Date(p.expires_at) > new Date()
    );
  };

  const getProductDaysRemaining = (productId: string) => {
    const product = userProducts.find(p => 
      p.product_id === productId && 
      p.status === 'active'
    );
    return product ? getDaysRemaining(product.expires_at) : 0;
  };

  return (
    <div className="min-h-screen bg-slate-900">
      <header className="bg-slate-900 border-b border-slate-800 py-4 px-6 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Package className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-semibold text-white">Hub</span>
          </div>
          <nav className="flex items-center gap-3">
            {!isLoading && (
              isLoggedIn ? (
                <div className="flex items-center gap-4">
                  <span className="text-sm text-slate-400">
                    Olá, <span className="text-white">{user?.name}</span>
                  </span>
                  <Button variant="ghost" size="sm" onClick={handleLogout}>
                    <LogOut className="w-4 h-4" /> Sair
                  </Button>
                </div>
              ) : (
                <>
                  <Link href="/login">
                    <Button variant="ghost" size="sm">Entrar</Button>
                  </Link>
                  <Link href="/register">
                    <Button variant="primary" size="sm">
                      <User className="w-4 h-4" /> Criar Conta
                    </Button>
                  </Link>
                </>
              )
            )}
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        {errorParam === 'no_access' && productParam && (
          <div className="mb-6 bg-amber-900/50 border border-amber-700 text-amber-300 p-4 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Acesso não encontrado</p>
              <p className="text-sm text-amber-400">Você precisa ativar um código para acessar este produto.</p>
            </div>
          </div>
        )}

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">Produtos</h1>
          <p className="text-slate-400">
            {isLoggedIn 
              ? 'Ative seu código de acesso ou acesse seus produtos ativos.'
              : 'Conheça nossos produtos. Faça login para ativar seu código de acesso.'}
          </p>
        </div>

        <div className="space-y-6">
          {PRODUCTS.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              isOwned={isProductOwned(product.id)}
              daysRemaining={getProductDaysRemaining(product.id)}
              isLoggedIn={isLoggedIn}
              onActivate={handleActivate}
            />
          ))}
        </div>
      </main>

      <footer className="bg-slate-900 border-t border-slate-800 py-8 px-6 mt-16">
        <div className="max-w-5xl mx-auto text-center text-sm text-slate-500">
          © 2024 Hub. Todos os direitos reservados.
        </div>
      </footer>
    </div>
  );
}
