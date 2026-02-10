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
  Clock,
  Key,
  Copy,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Check,
  Code,
  Eye,
  EyeOff,
  FileCode,
  Users,
  Search,
  Mail,
  Calendar,
  ShieldCheck
} from 'lucide-react';
import { Button, Input, Badge } from '@/components/ui';
import { Product, ActivationCode } from '@/types';

interface AdminUserProduct {
  id: string;
  product_id: string;
  product_name: string;
  status: string;
  activated_at: string;
  expires_at: string;
  activation_code: string;
  is_lifetime?: boolean;
}

interface AdminUser {
  id: string;
  email: string;
  name: string;
  created_at: string;
  products: AdminUserProduct[];
}

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
  const [productCodes, setProductCodes] = useState<Record<string, ActivationCode[]>>({});
  const [expandedCodes, setExpandedCodes] = useState<Record<string, boolean>>({});
  const [generatingCodes, setGeneratingCodes] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'products' | 'users'>('products');
  const [allUsers, setAllUsers] = useState<AdminUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [expandedUsers, setExpandedUsers] = useState<Record<string, boolean>>({});

  const EXAMPLE_MODAL_HTML = `<h2>Bem-vindo ao Produto!</h2>

<p>Antes de acessar, aqui estão algumas informações importantes:</p>

<div class="info-box">
  <strong>Dica:</strong> Salve o link do produto nos seus favoritos para acesso rápido.
</div>

<h3>Como usar</h3>
<ul class="steps">
  <li>Clique no botão abaixo para acessar o produto</li>
  <li>Faça login com a mesma conta da Área de Membros</li>
  <li>Comece a usar todas as funcionalidades</li>
</ul>

<h3>Como usar (sem os numeros)</h3>
<ul>
  <li>Clique no botão abaixo para acessar o produto</li>
  <li>Faça login com a mesma conta da Área de Membros</li>
  <li>Comece a usar todas as funcionalidades</li>
</ul>

<div class="video-container">
  <iframe 
    src="https://www.youtube.com/embed/dQw4w9WgXcQ" 
    title="Video tutorial"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
    allowfullscreen>
  </iframe>
</div>

<div class="warning-box">
  <strong>Atenção:</strong> Não compartilhe seu link de acesso com outras pessoas.
</div>

<hr>

<p style="text-align: center;">
  <a href="/api/products/redirect?product=SEU_PRODUTO_ID" class="btn-primary">Acessar Produto →</a>
</p>
<p style="text-align: center; margin-top: 0.5rem;">
</p>`;

  const emptyProduct: Omit<Product, 'created_at' | 'updated_at'> = {
    id: '',
    name: '',
    description: '',
    icon_name: 'sparkles',
    image: '',
    color: 'blue',
    url: '',
    shop_link: '',
    modal_html: '',
    price: 0,
    duration_months: 3,
    is_lifetime: false,
    features: [],
    active: true,
  };

  const [formData, setFormData] = useState<Omit<Product, 'created_at' | 'updated_at'>>(emptyProduct);
  const [featuresText, setFeaturesText] = useState('');
  const [showHtmlPreview, setShowHtmlPreview] = useState(false);

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
      
      // Load codes for each product
      for (const product of data.products || []) {
        await loadCodesForProduct(product.id);
      }
    } catch (err) {
      setError('Erro ao carregar produtos');
    }
  }

  async function loadUsers() {
    setUsersLoading(true);
    try {
      const res = await fetch('/api/admin/users');
      if (!res.ok) throw new Error('Failed to fetch users');
      const data = await res.json();
      setAllUsers(data.users || []);
    } catch (err) {
      setError('Erro ao carregar usuários');
    } finally {
      setUsersLoading(false);
    }
  }

  async function loadCodesForProduct(productId: string) {
    try {
      const res = await fetch(`/api/admin/codes?productId=${productId}`);
      const data = await res.json();
      setProductCodes(prev => ({ ...prev, [productId]: data.codes || [] }));
    } catch (err) {
      console.error('Error loading codes:', err);
    }
  }

  async function generateCodes(productId: string) {
    setGeneratingCodes(productId);
    try {
      const res = await fetch('/api/admin/codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, count: 5 }),
      });
      
      if (res.ok) {
        await loadCodesForProduct(productId);
        setSuccess('Códigos gerados com sucesso!');
      }
    } catch (err) {
      setError('Erro ao gerar códigos');
    } finally {
      setGeneratingCodes(null);
    }
  }

  function toggleCodes(productId: string) {
    setExpandedCodes(prev => ({ ...prev, [productId]: !prev[productId] }));
  }

  async function copyCode(code: string) {
    await navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  }

  function startEdit(product: Product) {
    setEditingProduct(product);
    setFormData(product);
    setFeaturesText(product.features.join('\n'));
    setIsCreating(false);
    setShowHtmlPreview(false);
    setError(null);
    setSuccess(null);
  }

  function startCreate() {
    setEditingProduct(null);
    setFormData(emptyProduct);
    setFeaturesText('');
    setIsCreating(true);
    setShowHtmlPreview(false);
    setError(null);
    setSuccess(null);
  }

  function cancelEdit() {
    setEditingProduct(null);
    setIsCreating(false);
    setFormData(emptyProduct);
    setFeaturesText('');
    setShowHtmlPreview(false);
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

  const filteredUsers = allUsers.filter(u => {
    if (!userSearch) return true;
    const q = userSearch.toLowerCase();
    return u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
  });

  function toggleUser(userId: string) {
    setExpandedUsers(prev => ({ ...prev, [userId]: !prev[userId] }));
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  function isExpired(dateStr: string) {
    return new Date(dateStr) < new Date();
  }

  function isLifetimeDate(dateStr: string) {
    return new Date(dateStr).getFullYear() > new Date().getFullYear() + 50;
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <header className="bg-slate-800/50 border-b border-slate-700 sticky top-0 z-50 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/')}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3">
                <div className="bg-violet-600 p-2 rounded-lg">
                  <ShieldCheck className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-semibold text-white">Admin</span>
              </div>
            </div>
            {activeTab === 'products' && (
              <Button variant="primary" onClick={startCreate}>
                <Plus className="w-4 h-4" /> Novo Produto
              </Button>
            )}
          </div>
          {/* Tabs */}
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab('products')}
              className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors flex items-center gap-2 ${
                activeTab === 'products'
                  ? 'bg-slate-900 text-white border-t border-x border-slate-700'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Package className="w-4 h-4" /> Produtos
            </button>
            <button
              onClick={() => {
                setActiveTab('users');
                if (allUsers.length === 0) loadUsers();
              }}
              className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors flex items-center gap-2 ${
                activeTab === 'users'
                  ? 'bg-slate-900 text-white border-t border-x border-slate-700'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Users className="w-4 h-4" /> Usuários
            </button>
          </div>
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

        {activeTab === 'products' && <>
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
                <label className="block text-sm font-medium text-slate-400 mb-1">URL do Produto (redirect)</label>
                <Input
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  placeholder="https://app.exemplo.com"
                  className="bg-slate-900/50 border-slate-600 text-white"
                />
                <p className="text-xs text-slate-500 mt-1">URL de destino após autenticação</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Link da Loja (compra)</label>
                <Input
                  value={formData.shop_link || ''}
                  onChange={(e) => setFormData({ ...formData, shop_link: e.target.value })}
                  placeholder="https://loja.exemplo.com/produto"
                  className="bg-slate-900/50 border-slate-600 text-white"
                />
                <p className="text-xs text-slate-500 mt-1">Link externo para compra</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Preço</label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                  className="bg-slate-900/50 border-slate-600 text-white"
                />
              </div>
            </div>

            {/* Modal HTML Section */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-slate-400 flex items-center gap-2">
                  <Code className="w-4 h-4" /> HTML do Modal de Introdução
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const exampleHtml = EXAMPLE_MODAL_HTML.replace('SEU_PRODUTO_ID', formData.id || 'produto-id');
                      setFormData({ ...formData, modal_html: exampleHtml });
                    }}
                    className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
                  >
                    <FileCode className="w-3 h-3" /> Inserir exemplo
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowHtmlPreview(!showHtmlPreview)}
                    className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
                  >
                    {showHtmlPreview ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    {showHtmlPreview ? 'Editar' : 'Pré-visualizar'}
                  </button>
                </div>
              </div>
              {showHtmlPreview ? (
                <div className="w-full min-h-[200px] bg-slate-800 border border-slate-600 rounded-lg overflow-hidden">
                  <div className="px-3 py-2 bg-slate-700/50 border-b border-slate-600 text-xs text-slate-400">Pré-visualização</div>
                  <div
                    className="product-modal-content p-4"
                    dangerouslySetInnerHTML={{ __html: formData.modal_html || '<p style="color: #64748b;">Nenhum HTML inserido ainda.</p>' }}
                  />
                </div>
              ) : (
                <textarea
                  value={formData.modal_html || ''}
                  onChange={(e) => setFormData({ ...formData, modal_html: e.target.value })}
                  placeholder='<h2>Bem-vindo!</h2>\n<p>Instruções do produto...</p>\n<a href="/api/products/redirect?product=id" class="btn-primary">Acessar →</a>'
                  rows={10}
                  className="w-full px-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                />
              )}
              <p className="text-xs text-slate-500 mt-1">
                Use classes: <code className="text-blue-400">btn-primary</code>, <code className="text-blue-400">btn-outline</code>, <code className="text-blue-400">info-box</code>, <code className="text-blue-400">warning-box</code>, <code className="text-blue-400">success-box</code>, <code className="text-blue-400">steps</code>. Deixe vazio para redirecionar direto.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">URL da Imagem</label>
                <Input
                  value={formData.image}
                  onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                  placeholder="https://exemplo.com/imagem.jpg"
                  className="bg-slate-900/50 border-slate-600 text-white"
                />
                <p className="text-xs text-slate-500 mt-1">Deixe vazio para usar o ícone</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Ícone (fallback)</label>
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

                  {/* Activation Codes Section */}
                  <div className="mt-4 pt-4 border-t border-slate-700/50">
                    <button
                      onClick={() => toggleCodes(product.id)}
                      className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
                    >
                      <Key className="w-4 h-4" />
                      <span>Códigos de Ativação ({productCodes[product.id]?.length || 0})</span>
                      {expandedCodes[product.id] ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>

                    {expandedCodes[product.id] && (
                      <div className="mt-3 space-y-2">
                        {productCodes[product.id]?.length > 0 ? (
                          productCodes[product.id].map((code) => (
                            <div
                              key={code.code}
                              className="flex items-center justify-between bg-slate-900/50 rounded-lg px-3 py-2"
                            >
                              <code className="text-sm font-mono text-emerald-400">{code.code}</code>
                              <button
                                onClick={() => copyCode(code.code)}
                                className="text-slate-400 hover:text-white transition-colors p-1"
                                title="Copiar código"
                              >
                                {copiedCode === code.code ? (
                                  <Check className="w-4 h-4 text-emerald-400" />
                                ) : (
                                  <Copy className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-slate-500">Nenhum código gerado ainda.</p>
                        )}

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => generateCodes(product.id)}
                          disabled={generatingCodes === product.id}
                          className="mt-2"
                        >
                          {generatingCodes === product.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <RefreshCw className="w-4 h-4" />
                          )}
                          Gerar 5 Novos Códigos
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 self-start">
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
        </>}

        {activeTab === 'users' && (
          <div>
            {/* Search bar */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Buscar por nome ou email..."
                  className="pl-10 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
                />
              </div>
            </div>

            {usersLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                {userSearch ? 'Nenhum usuário encontrado.' : 'Nenhum usuário cadastrado.'}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-sm text-slate-500 mb-4">
                  {filteredUsers.length} usuário{filteredUsers.length !== 1 ? 's' : ''} encontrado{filteredUsers.length !== 1 ? 's' : ''}
                </div>
                {filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden"
                  >
                    <button
                      onClick={() => toggleUser(user.id)}
                      className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-700/30 transition-colors"
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-violet-600 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-bold text-white">
                            {user.name?.charAt(0).toUpperCase() || 'U'}
                          </span>
                        </div>
                        <div className="text-left min-w-0">
                          <p className="text-white font-medium truncate">{user.name || 'Sem nome'}</p>
                          <p className="text-sm text-slate-400 flex items-center gap-1.5 truncate">
                            <Mail className="w-3 h-3 flex-shrink-0" /> {user.email}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                        <div className="flex items-center gap-2">
                          {user.products.length > 0 ? (
                            <Badge variant="success">{user.products.length} produto{user.products.length !== 1 ? 's' : ''}</Badge>
                          ) : (
                            <Badge variant="default">Sem produtos</Badge>
                          )}
                        </div>
                        <div className="text-slate-500 flex items-center gap-1 text-xs">
                          <Calendar className="w-3 h-3" /> {formatDate(user.created_at)}
                        </div>
                        {expandedUsers[user.id] ? (
                          <ChevronUp className="w-4 h-4 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                    </button>

                    {expandedUsers[user.id] && (
                      <div className="px-6 pb-4 border-t border-slate-700/50">
                        <div className="pt-4 space-y-2">
                          <p className="text-xs text-slate-500 mb-3">ID: <code className="text-slate-400">{user.id}</code></p>
                          {user.products.length === 0 ? (
                            <p className="text-sm text-slate-500 py-2">Este usuário não possui nenhum produto ativo.</p>
                          ) : (
                            <div className="space-y-2">
                              {user.products.map((up) => (
                                <div
                                  key={up.id}
                                  className="flex items-center justify-between bg-slate-900/50 rounded-lg px-4 py-3"
                                >
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium text-white">{up.product_name}</p>
                                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                                      <span>Código: <code className="text-slate-400">{up.activation_code}</code></span>
                                      <span>Ativado: {formatDate(up.activated_at)}</span>
                                    </div>
                                  </div>
                                  <div className="flex-shrink-0 ml-4">
                                    {isLifetimeDate(up.expires_at) ? (
                                      <Badge variant="success" className="flex items-center gap-1">
                                        <Infinity className="w-3 h-3" /> Vitalício
                                      </Badge>
                                    ) : isExpired(up.expires_at) ? (
                                      <Badge variant="error">Expirado</Badge>
                                    ) : (
                                      <Badge variant="default">
                                        Expira: {formatDate(up.expires_at)}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Refresh button */}
            <div className="mt-6 flex justify-center">
              <Button variant="ghost" onClick={loadUsers} disabled={usersLoading}>
                <RefreshCw className={`w-4 h-4 ${usersLoading ? 'animate-spin' : ''}`} /> Atualizar lista
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
