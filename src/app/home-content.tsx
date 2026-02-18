"use client";

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AlertCircle, LogIn, Settings, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui';
import { ProductCard } from '@/components/product-card';
import { ProfileModal } from '@/components/profile-modal';
import { BannerCarousel } from '@/components/banner-carousel';
import { User as UserType, UserProduct, Product, Banner } from '@/types';
import { getDaysRemaining } from '@/lib/utils';

export default function HomeContent() {
  const searchParams = useSearchParams();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<UserType | null>(null);
  const [userProducts, setUserProducts] = useState<UserProduct[]>([]);
  const [showProfile, setShowProfile] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  const errorParam = searchParams.get('error');
  const productParam = searchParams.get('product');

  useEffect(() => {
    async function init() {
      try {
        // Fetch products and banners in parallel
        const [productsRes, bannersRes] = await Promise.all([
          fetch('/api/products'),
          fetch('/api/banners'),
        ]);
        const productsData = await productsRes.json();
        const bannersData = await bannersRes.json();
        setProducts(productsData.products || []);
        setBanners(bannersData.banners || []);

        // Check auth
        const authRes = await fetch('/api/auth/verify');
        const authData = await authRes.json();
        setIsLoggedIn(authData.authenticated);
        if (authData.authenticated) {
          setUser(authData.user);
          setUserProducts(authData.products || []);
          
          // Check admin status
          const adminRes = await fetch('/api/admin/check');
          const adminData = await adminRes.json();
          setIsAdmin(adminData.isAdmin);
        }
      } catch {
        setIsLoggedIn(false);
      } finally {
        setIsLoading(false);
      }
    }
    init();
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
    setShowProfile(false);
  };

  const handleLogin = () => {
    window.location.href = '/login';
  };

  const isProductOwned = (productId: string) => {
    return userProducts.some(p => 
      p.product_id === productId && 
      p.status === 'active' && 
      new Date(p.expires_at) > new Date()
    );
  };

  const getProductDaysRemaining = (productId: string) => {
    const userProduct = userProducts.find(p => 
      p.product_id === productId && 
      p.status === 'active'
    );
    return userProduct ? getDaysRemaining(userProduct.expires_at) : 0;
  };

  const isLifetimeProduct = (productId: string) => {
    const userProduct = userProducts.find(p => 
      p.product_id === productId && 
      p.status === 'active'
    );
    const product = products.find(p => p.id === productId);
    return product?.is_lifetime || (userProduct && getProductDaysRemaining(productId) > 36000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800">
      <header className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800/50 py-4 px-6 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-blue-500 to-violet-600 p-2.5 rounded-xl shadow-lg shadow-blue-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">Área de Membros</span>
          </div>
          <nav className="flex items-center gap-3">
            {!isLoading && isAdmin && (
              <a href="/admin">
                <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                  <Settings className="w-4 h-4" /> Admin
                </Button>
              </a>
            )}
            {!isLoading && (
              isLoggedIn && user ? (
                <button
                  onClick={() => setShowProfile(true)}
                  className="flex items-center gap-3 px-4 py-2 rounded-xl bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 transition-all duration-200"
                >
                  <span className="text-sm text-slate-400">
                    Olá, <span className="text-white font-medium">{user.name}</span>
                  </span>
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-violet-600 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/20">
                    <span className="text-sm font-bold text-white">
                      {user.name?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  </div>
                </button>
              ) : (
                <Button variant="primary" size="sm" onClick={handleLogin} className="shadow-lg shadow-blue-500/20">
                  <LogIn className="w-4 h-4" /> Entrar
                </Button>
              )
            )}
          </nav>
        </div>
      </header>

      {showProfile && user && (
        <ProfileModal
          user={user}
          products={userProducts}
          onClose={() => setShowProfile(false)}
          onLogout={handleLogout}
        />
      )}

      <main className="max-w-5xl mx-auto px-6 py-12">
        {errorParam === 'no_access' && productParam && (
          <div className="mb-8 bg-amber-900/30 border border-amber-700/50 text-amber-300 p-5 rounded-2xl flex items-start gap-4 backdrop-blur-sm">
            <div className="bg-amber-500/20 p-2 rounded-lg">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold">Acesso não encontrado</p>
              <p className="text-sm text-amber-400/80">Você precisa ativar um código para acessar este produto.</p>
            </div>
          </div>
        )}

        {banners.length > 0 && (
          <div className="mb-10">
            <BannerCarousel banners={banners} />
          </div>
        )}

        <div className="mb-10">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent mb-3">Produtos</h1>
          <p className="text-slate-400 text-lg">
            {isLoggedIn 
              ? 'Ative seu código de acesso ou acesse seus produtos ativos.'
              : 'Conheça nossos produtos. Faça login para ativar seu código de acesso.'}
          </p>
        </div>



        <div className="space-y-6">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              isOwned={isProductOwned(product.id)}
              daysRemaining={getProductDaysRemaining(product.id)}
              isLifetime={isLifetimeProduct(product.id)}
              isLoggedIn={isLoggedIn}
              onActivate={handleActivate}
            />
          ))}
        </div>
      </main>
    </div>
  );
}
