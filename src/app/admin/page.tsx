"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Save, 
  X, 
  ArrowLeft,
  Loader2,
  Package,
  Infinity,
  Clock
} from 'lucide-react';
import { Button, Input, Badge } from '@/components/ui';
import { Product } from '@/types';

export default function AdminPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const emptyProduct: Omit<Product, 'created_at' | 'updated_at'> = {
    id: '',
    name: '',
    description: '',
    icon_name: 'sparkles',
    image: '',
    color: 'blue',
    url: '',
    price: 0,
    duration_months: 3,
    is_lifetime: false,
    features: [],
    active: true,
  };

  const [formData, setFormData] = useState<Omit<Product, 'created_at' | 'updated_at'>>(emptyProduct);
  const [featuresText, setFeaturesText] = useState('');

  useEffect(() => {
    async function checkAdmin() {
      try {
        const res = await fetch('/api/admin/check');
        const data = await res.json();
        
        if (!data.isAdmin) {
          router.push('/');
          return;
        }
        
        setIsAdmin(true);
        await loadProducts();
      } catch {
        router.push('/');
      } finally {
        setIsLoading(false);
      }
    }
    checkAdmin();
  }, [router]);

  async function loadProducts() {
    try {
      const res = await fetch('/api/admin/products');
      const data = await res.json();
      setProducts(data.products || []);
    } catch (err) {
      setError('Erro ao carregar produtos');
    }
  }

  function startEdit(product: Product) {
    setEditingProduct(product);
    setFormData(product);
    setFeaturesText(product.features.join('\n'));
    setIsCreating(false);
    setError(null);
    setSuccess(null);
  }

  function startCreate() {
    setEditingProduct(null);
    setFormData(emptyProduct);
    setFeaturesText('');
    setIsCreating(true);
    setError(null);
    setSuccess(null);
  }

  function cancelEdit() {
    setEditingProduct(null);
    setIsCreating(false);
    setFormData(emptyProduct);
    setFeaturesText('');
    setError(null);
  }

  async function handleSave() {
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const productData = {
        ...formData,
        features: featuresText.split('\n').filter(f => f.trim()),
      };

      const method = isCreating ? 'POST' : 'PUT';
      const res = await fetch('/api/admin/products', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao salvar');
      }

      setSuccess(isCreating ? 'Produto criado com sucesso!' : 'Produto atualizado com sucesso!');
      await loadProducts();
      cancelEdit();
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar produto');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Tem certeza que deseja excluir este produto?')) return;

    try {
      const res = await fetch(`/api/admin/products?id=${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao excluir');
      }

      setSuccess('Produto excluído com sucesso!');
      await loadProducts();
    } catch (err: any) {
      setError(err.message || 'Erro ao excluir produto');
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <header className="bg-slate-800/50 border-b border-slate-700 py-4 px-6 sticky top-0 z-50 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/')}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <div className="bg-violet-600 p-2 rounded-lg">
                <Package className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-semibold text-white">Admin - Produtos</span>
            </div>
          </div>
          <Button variant="primary" onClick={startCreate}>
            <Plus className="w-4 h-4" /> Novo Produto
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {error && (
          <div className="mb-6 bg-red-900/50 border border-red-700 text-red-300 p-4 rounded-lg">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-6 bg-emerald-900/50 border border-emerald-700 text-emerald-300 p-4 rounded-lg">
            {success}
          </div>
        )}

        {(isCreating || editingProduct) && (
          <div className="mb-8 bg-slate-800/50 border border-slate-700 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-6">
              {isCreating ? 'Novo Produto' : 'Editar Produto'}
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">ID (único)</label>
                <Input
                  value={formData.id}
                  onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                  placeholder="meu-produto"
                  disabled={!isCreating}
                  className="bg-slate-900/50 border-slate-600 text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Nome</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nome do Produto"
                  className="bg-slate-900/50 border-slate-600 text-white"
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-400 mb-1">Descrição</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descrição do produto..."
                rows={3}
                className="w-full px-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">URL do Produto</label>
                <Input
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  placeholder="https://..."
                  className="bg-slate-900/50 border-slate-600 text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Ícone</label>
                <select
                  value={formData.icon_name}
                  onChange={(e) => setFormData({ ...formData, icon_name: e.target.value })}
                  className="w-full h-11 px-4 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="party-popper">🎉 Party Popper</option>
                  <option value="rocket">🚀 Rocket</option>
                  <option value="sparkles">✨ Sparkles</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Cor</label>
                <select
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-full h-11 px-4 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="blue">Azul</option>
                  <option value="emerald">Verde</option>
                  <option value="violet">Violeta</option>
                  <option value="amber">Âmbar</option>
                  <option value="rose">Rosa</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Duração (meses)</label>
                <Input
                  type="number"
                  value={formData.duration_months}
                  onChange={(e) => setFormData({ ...formData, duration_months: parseInt(e.target.value) || 0 })}
                  className="bg-slate-900/50 border-slate-600 text-white"
                  disabled={formData.is_lifetime}
                />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_lifetime}
                    onChange={(e) => setFormData({ ...formData, is_lifetime: e.target.checked })}
                    className="w-5 h-5 rounded border-slate-600 bg-slate-900/50 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-300 flex items-center gap-1">
                    <Infinity className="w-4 h-4" /> Acesso Vitalício
                  </span>
                </label>
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.active}
                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                    className="w-5 h-5 rounded border-slate-600 bg-slate-900/50 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-300">Produto Ativo</span>
                </label>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-400 mb-1">
                Recursos (um por linha)
              </label>
              <textarea
                value={featuresText}
                onChange={(e) => setFeaturesText(e.target.value)}
                placeholder="Recurso 1&#10;Recurso 2&#10;Recurso 3"
                rows={4}
                className="w-full px-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex gap-3">
              <Button variant="primary" onClick={handleSave} disabled={isSaving}>
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Salvar
              </Button>
              <Button variant="ghost" onClick={cancelEdit}>
                <X className="w-4 h-4" /> Cancelar
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {products.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              Nenhum produto cadastrado. Clique em "Novo Produto" para começar.
            </div>
          ) : (
            products.map((product) => (
              <div
                key={product.id}
                className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 flex items-center justify-between"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-white">{product.name}</h3>
                    {product.active ? (
                      <Badge variant="success">Ativo</Badge>
                    ) : (
                      <Badge variant="secondary">Inativo</Badge>
                    )}
                    {product.is_lifetime && (
                      <Badge variant="default" className="flex items-center gap-1">
                        <Infinity className="w-3 h-3" /> Vitalício
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-slate-400 mb-2">{product.description}</p>
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span>ID: {product.id}</span>
                    {!product.is_lifetime && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {product.duration_months} meses
                      </span>
                    )}
                    <span>{product.features.length} recursos</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" onClick={() => startEdit(product)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                    onClick={() => handleDelete(product.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
