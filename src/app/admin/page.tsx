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
  ShieldCheck,
  Image,
  GripVertical,
  ExternalLink,
  Link,
  Webhook,
  RotateCcw,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { Button, Input, Badge } from '@/components/ui';
import { Product, ActivationCode, Banner } from '@/types';

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

const USERS_PAGE_SIZE = 300;
const DEFAULT_USERS_PAGINATION: UsersPagination = {
  page: 1,
  limit: USERS_PAGE_SIZE,
  total: 0,
  total_pages: 1,
  has_previous_page: false,
  has_next_page: false,
};

interface AdminUser {
  id: string;
  email: string;
  name: string;
  created_at: string;
  products: AdminUserProduct[];
}

interface UsersPagination {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  has_previous_page: boolean;
  has_next_page: boolean;
}

interface HotmartMapping {
  id: number;
  hotmart_product_ucode: string;
  product_id: string;
  active: boolean;
  notes: string;
  created_at: string;
  updated_at: string;
}

interface HotmartEvent {
  hotmart_event_id: string;
  event_name: string;
  version: string | null;
  hottok_valid: boolean;
  product_ucode: string | null;
  buyer_email: string | null;
  processing_status: 'received' | 'processed' | 'ignored' | 'failed';
  processing_error: string | null;
  processed_at: string | null;
  received_at: string;
  payload?: {
    data?: {
      product?: {
        name?: string;
      };
    };
  };
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
  const [activeTab, setActiveTab] = useState<'products' | 'banners' | 'users' | 'hotmart'>('products');
  const [allUsers, setAllUsers] = useState<AdminUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [expandedUsers, setExpandedUsers] = useState<Record<string, boolean>>({});
  const [usersPagination, setUsersPagination] = useState<UsersPagination>(DEFAULT_USERS_PAGINATION);

  // Hotmart state
  const [hotmartMappings, setHotmartMappings] = useState<HotmartMapping[]>([]);
  const [hotmartEvents, setHotmartEvents] = useState<HotmartEvent[]>([]);
  const [hotmartLoading, setHotmartLoading] = useState(false);
  const [hotmartSaving, setHotmartSaving] = useState(false);
  const [retryingEventId, setRetryingEventId] = useState<string | null>(null);
  const [editingMappingId, setEditingMappingId] = useState<number | null>(null);
  const [eventStatusFilter, setEventStatusFilter] = useState<'all' | 'received' | 'processed' | 'ignored' | 'failed'>('all');
  const [mappingForm, setMappingForm] = useState({
    hotmart_product_ucode: '',
    product_id: '',
    active: true,
    notes: '',
  });

  // Banner state
  const [allBanners, setAllBanners] = useState<Banner[]>([]);
  const [bannersLoading, setBannersLoading] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [isCreatingBanner, setIsCreatingBanner] = useState(false);
  const [isSavingBanner, setIsSavingBanner] = useState(false);
  const [bannerForm, setBannerForm] = useState<Omit<Banner, 'id' | 'created_at' | 'updated_at'>>({
    title: '',
    image_url: '',
    image_mobile_url: '',
    link_url: '',
    link_target: '_self',
    html_content: '',
    sort_order: 0,
    active: true,
  });
  const [showBannerPreview, setShowBannerPreview] = useState(false);

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

  async function loadHotmartMappings() {
    const res = await fetch('/api/admin/hotmart/mappings');
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Erro ao carregar mapeamentos Hotmart');
    }
    setHotmartMappings(data.mappings || []);
  }

  async function loadHotmartEvents(status: 'all' | 'received' | 'processed' | 'ignored' | 'failed' = eventStatusFilter) {
    const qs = new URLSearchParams();
    qs.set('limit', '100');
    if (status !== 'all') {
      qs.set('status', status);
    }

    const res = await fetch(`/api/admin/hotmart/events?${qs.toString()}`);
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Erro ao carregar eventos Hotmart');
    }
    setHotmartEvents(data.events || []);
  }

  async function loadHotmartData(status: 'all' | 'received' | 'processed' | 'ignored' | 'failed' = eventStatusFilter) {
    setHotmartLoading(true);
    try {
      await Promise.all([loadHotmartMappings(), loadHotmartEvents(status)]);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar dados do Hotmart');
    } finally {
      setHotmartLoading(false);
    }
  }

  function startCreateMapping() {
    const firstProductId = products[0]?.id || '';
    setEditingMappingId(null);
    setMappingForm({
      hotmart_product_ucode: '',
      product_id: firstProductId,
      active: true,
      notes: '',
    });
    setError(null);
    setSuccess(null);
  }

  function startEditMapping(mapping: HotmartMapping) {
    setEditingMappingId(mapping.id);
    setMappingForm({
      hotmart_product_ucode: mapping.hotmart_product_ucode,
      product_id: mapping.product_id,
      active: mapping.active,
      notes: mapping.notes || '',
    });
    setError(null);
    setSuccess(null);
  }

  async function saveMapping() {
    if (!mappingForm.hotmart_product_ucode || !mappingForm.product_id) {
      setError('Hotmart UCode e Produto são obrigatórios');
      return;
    }

    setHotmartSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const method = editingMappingId ? 'PUT' : 'POST';
      const body = editingMappingId
        ? { id: editingMappingId, ...mappingForm }
        : mappingForm;

      const res = await fetch('/api/admin/hotmart/mappings', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao salvar mapeamento');
      }

      setSuccess(editingMappingId ? 'Mapeamento atualizado com sucesso!' : 'Mapeamento criado com sucesso!');
      startCreateMapping();
      await loadHotmartMappings();
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar mapeamento');
    } finally {
      setHotmartSaving(false);
    }
  }

  async function deleteMapping(mappingId: number) {
    if (!confirm('Tem certeza que deseja excluir este mapeamento Hotmart?')) return;

    try {
      const res = await fetch(`/api/admin/hotmart/mappings?id=${mappingId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao excluir mapeamento');
      }

      if (editingMappingId === mappingId) {
        startCreateMapping();
      }

      setSuccess('Mapeamento removido com sucesso!');
      await loadHotmartMappings();
    } catch (err: any) {
      setError(err.message || 'Erro ao excluir mapeamento');
    }
  }

  async function retryHotmartEvent(eventId: string) {
    setRetryingEventId(eventId);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch('/api/admin/hotmart/events/retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_id: eventId }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao reprocessar evento');
      }

      setSuccess(`Evento ${eventId} reprocessado (${data.status || 'ok'}).`);
      await loadHotmartEvents(eventStatusFilter);
    } catch (err: any) {
      setError(err.message || 'Erro ao reprocessar evento Hotmart');
    } finally {
      setRetryingEventId(null);
    }
  }

  function getEventBadgeVariant(status: HotmartEvent['processing_status']): 'default' | 'secondary' | 'success' | 'error' {
    if (status === 'processed') return 'success';
    if (status === 'failed') return 'error';
    if (status === 'ignored') return 'secondary';
    return 'default';
  }

  function getMappedProductLabel(productUcode: string | null): string | null {
    if (!productUcode) return null;
    const mapping = hotmartMappings.find((m) => m.hotmart_product_ucode === productUcode);
    if (!mapping) return null;

    const product = products.find((p) => p.id === mapping.product_id);
    if (product) {
      return `${product.name} (${product.id})`;
    }

    return mapping.product_id;
  }

  async function loadUsers(page: number = 1) {
    setUsersLoading(true);
    try {
      const qs = new URLSearchParams();
      qs.set('page', String(page));
      qs.set('limit', String(USERS_PAGE_SIZE));

      const res = await fetch(`/api/admin/users?${qs.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch users');
      const data = await res.json();
      setAllUsers(data.users || []);
      setUsersPagination(data.pagination || DEFAULT_USERS_PAGINATION);
      setExpandedUsers({});
    } catch (err) {
      setError('Erro ao carregar usuários');
    } finally {
      setUsersLoading(false);
    }
  }

  // Banner functions
  async function loadBanners() {
    setBannersLoading(true);
    try {
      const res = await fetch('/api/admin/banners');
      if (!res.ok) throw new Error('Failed to fetch banners');
      const data = await res.json();
      setAllBanners(data.banners || []);
    } catch (err) {
      setError('Erro ao carregar banners');
    } finally {
      setBannersLoading(false);
    }
  }

  function startEditBanner(banner: Banner) {
    setEditingBanner(banner);
    setBannerForm({
      title: banner.title,
      image_url: banner.image_url,
      image_mobile_url: banner.image_mobile_url || '',
      link_url: banner.link_url || '',
      link_target: banner.link_target || '_self',
      html_content: banner.html_content || '',
      sort_order: banner.sort_order,
      active: banner.active,
    });
    setIsCreatingBanner(false);
    setShowBannerPreview(false);
    setError(null);
    setSuccess(null);
  }

  function startCreateBanner() {
    setEditingBanner(null);
    setBannerForm({
      title: '',
      image_url: '',
      image_mobile_url: '',
      link_url: '',
      link_target: '_self',
      html_content: '',
      sort_order: allBanners.length,
      active: true,
    });
    setIsCreatingBanner(true);
    setShowBannerPreview(false);
    setError(null);
    setSuccess(null);
  }

  function cancelEditBanner() {
    setEditingBanner(null);
    setIsCreatingBanner(false);
    setShowBannerPreview(false);
    setError(null);
  }

  async function handleSaveBanner() {
    setIsSavingBanner(true);
    setError(null);
    setSuccess(null);

    try {
      const method = isCreatingBanner ? 'POST' : 'PUT';
      const body = isCreatingBanner
        ? bannerForm
        : { id: editingBanner!.id, ...bannerForm };

      const res = await fetch('/api/admin/banners', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar');

      setSuccess(isCreatingBanner ? 'Banner criado com sucesso!' : 'Banner atualizado com sucesso!');
      await loadBanners();
      cancelEditBanner();
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar banner');
    } finally {
      setIsSavingBanner(false);
    }
  }

  async function handleDeleteBanner(id: string) {
    if (!confirm('Tem certeza que deseja excluir este banner?')) return;

    try {
      const res = await fetch(`/api/admin/banners?id=${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao excluir');
      }
      setSuccess('Banner excluído com sucesso!');
      await loadBanners();
    } catch (err: any) {
      setError(err.message || 'Erro ao excluir banner');
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

  function renderUsersPaginationControls(position: 'top' | 'bottom') {
    const isTop = position === 'top';

    return (
      <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${isTop ? 'mb-4' : 'mt-6'}`}>
        <p className="text-xs text-slate-500">
          Página {usersPagination.page} de {usersPagination.total_pages} • {usersPagination.total} usuário{usersPagination.total !== 1 ? 's' : ''} no total
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => loadUsers(usersPagination.page - 1)}
            disabled={usersLoading || !usersPagination.has_previous_page}
          >
            Anterior
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => loadUsers(usersPagination.page + 1)}
            disabled={usersLoading || !usersPagination.has_next_page}
          >
            Próxima
          </Button>
        </div>
      </div>
    );
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
            {activeTab === 'banners' && (
              <Button variant="primary" onClick={startCreateBanner}>
                <Plus className="w-4 h-4" /> Novo Banner
              </Button>
            )}
            {activeTab === 'hotmart' && (
              <Button variant="primary" onClick={startCreateMapping}>
                <Plus className="w-4 h-4" /> Novo Mapeamento
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
                setActiveTab('banners');
                if (allBanners.length === 0) loadBanners();
              }}
              className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors flex items-center gap-2 ${
                activeTab === 'banners'
                  ? 'bg-slate-900 text-white border-t border-x border-slate-700'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Image className="w-4 h-4" /> Banners
            </button>
            <button
              onClick={() => {
                setActiveTab('users');
                if (allUsers.length === 0) loadUsers(1);
              }}
              className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors flex items-center gap-2 ${
                activeTab === 'users'
                  ? 'bg-slate-900 text-white border-t border-x border-slate-700'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Users className="w-4 h-4" /> Usuários
            </button>
            <button
              onClick={() => {
                setActiveTab('hotmart');
                if (hotmartMappings.length === 0 && hotmartEvents.length === 0) {
                  startCreateMapping();
                  loadHotmartData('all');
                }
              }}
              className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors flex items-center gap-2 ${
                activeTab === 'hotmart'
                  ? 'bg-slate-900 text-white border-t border-x border-slate-700'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Webhook className="w-4 h-4" /> Hotmart
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

        {activeTab === 'banners' && (
          <div>
            {/* Banner Form */}
            {(isCreatingBanner || editingBanner) && (
              <div className="mb-8 bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-white mb-6">
                  {isCreatingBanner ? 'Novo Banner' : 'Editar Banner'}
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">Título</label>
                    <Input
                      value={bannerForm.title}
                      onChange={(e) => setBannerForm({ ...bannerForm, title: e.target.value })}
                      placeholder="Nome do banner (interno)"
                      className="bg-slate-900/50 border-slate-600 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">Ordem</label>
                    <Input
                      type="number"
                      value={bannerForm.sort_order}
                      onChange={(e) => setBannerForm({ ...bannerForm, sort_order: parseInt(e.target.value) || 0 })}
                      className="bg-slate-900/50 border-slate-600 text-white"
                    />
                    <p className="text-xs text-slate-500 mt-1">Menor número = aparece primeiro</p>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-400 mb-1">URL da Imagem (Desktop)</label>
                  <Input
                    value={bannerForm.image_url}
                    onChange={(e) => setBannerForm({ ...bannerForm, image_url: e.target.value })}
                    placeholder="https://exemplo.com/banner-desktop.jpg"
                    className="bg-slate-900/50 border-slate-600 text-white"
                  />
                  <p className="text-xs text-slate-500 mt-1">Proporção recomendada: 21:7 (ex: 2100×700px)</p>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-400 mb-1">URL da Imagem (Mobile) — opcional</label>
                  <Input
                    value={bannerForm.image_mobile_url || ''}
                    onChange={(e) => setBannerForm({ ...bannerForm, image_mobile_url: e.target.value })}
                    placeholder="https://exemplo.com/banner-mobile.jpg"
                    className="bg-slate-900/50 border-slate-600 text-white"
                  />
                  <p className="text-xs text-slate-500 mt-1">Proporção recomendada: 21:9 (ex: 1050×450px). Se vazio, usa a imagem desktop.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1 flex items-center gap-1">
                      <Link className="w-3.5 h-3.5" /> Link (ao clicar) — opcional
                    </label>
                    <Input
                      value={bannerForm.link_url || ''}
                      onChange={(e) => setBannerForm({ ...bannerForm, link_url: e.target.value })}
                      placeholder="https://exemplo.com/promo"
                      className="bg-slate-900/50 border-slate-600 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">Abrir link em</label>
                    <select
                      value={bannerForm.link_target || '_self'}
                      onChange={(e) => setBannerForm({ ...bannerForm, link_target: e.target.value as '_self' | '_blank' })}
                      className="w-full h-11 px-4 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="_self">Mesma aba</option>
                      <option value="_blank">Nova aba</option>
                    </select>
                  </div>
                </div>

                {/* HTML overlay */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-slate-400 flex items-center gap-2">
                      <Code className="w-4 h-4" /> HTML Overlay (opcional)
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowBannerPreview(!showBannerPreview)}
                      className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
                    >
                      {showBannerPreview ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      {showBannerPreview ? 'Editar' : 'Pré-visualizar'}
                    </button>
                  </div>
                  {showBannerPreview ? (
                    <div className="w-full min-h-[100px] bg-slate-800 border border-slate-600 rounded-lg overflow-hidden">
                      <div className="px-3 py-2 bg-slate-700/50 border-b border-slate-600 text-xs text-slate-400">Pré-visualização do overlay</div>
                      <div
                        className="banner-overlay-content p-4 text-center"
                        dangerouslySetInnerHTML={{ __html: bannerForm.html_content || '<p style="color: #64748b;">Nenhum HTML inserido.</p>' }}
                      />
                    </div>
                  ) : (
                    <textarea
                      value={bannerForm.html_content || ''}
                      onChange={(e) => setBannerForm({ ...bannerForm, html_content: e.target.value })}
                      placeholder='<h2 style="color:white;font-size:2rem;">Promoção!</h2>&#10;<p style="color:white;">Aproveite 50% de desconto</p>'
                      rows={4}
                      className="w-full px-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                    />
                  )}
                  <p className="text-xs text-slate-500 mt-1">Texto/botões sobrepostos à imagem. Use inline styles para cores.</p>
                </div>

                <div className="flex items-center gap-4 mb-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={bannerForm.active}
                      onChange={(e) => setBannerForm({ ...bannerForm, active: e.target.checked })}
                      className="w-5 h-5 rounded border-slate-600 bg-slate-900/50 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-slate-300">Banner Ativo</span>
                  </label>
                </div>

                {/* Image preview */}
                {bannerForm.image_url && (
                  <div className="mb-6">
                    <p className="text-xs text-slate-500 mb-2">Pré-visualização da imagem:</p>
                    <div className="relative w-full aspect-[21/7] bg-slate-900/50 rounded-lg overflow-hidden border border-slate-700">
                      <img
                        src={bannerForm.image_url}
                        alt="Preview"
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                      {bannerForm.html_content && (
                        <div className="absolute inset-0 flex items-center justify-center p-4">
                          <div
                            className="banner-overlay-content text-center"
                            dangerouslySetInnerHTML={{ __html: bannerForm.html_content }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  <Button variant="primary" onClick={handleSaveBanner} disabled={isSavingBanner}>
                    {isSavingBanner ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Salvar
                  </Button>
                  <Button variant="ghost" onClick={cancelEditBanner}>
                    <X className="w-4 h-4" /> Cancelar
                  </Button>
                </div>
              </div>
            )}

            {/* Banner list */}
            {bannersLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              </div>
            ) : allBanners.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                Nenhum banner cadastrado. Clique em &quot;Novo Banner&quot; para começar.
              </div>
            ) : (
              <div className="space-y-4">
                {allBanners.map((banner) => (
                  <div
                    key={banner.id}
                    className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden"
                  >
                    <div className="flex flex-col sm:flex-row">
                      {/* Thumbnail */}
                      <div className="sm:w-64 h-32 sm:h-auto bg-slate-900/50 flex-shrink-0 overflow-hidden">
                        <img
                          src={banner.image_url}
                          alt={banner.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>
                      {/* Info */}
                      <div className="flex-1 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5">
                            <h3 className="text-base font-semibold text-white truncate">{banner.title}</h3>
                            {banner.active ? (
                              <Badge variant="success">Ativo</Badge>
                            ) : (
                              <Badge variant="secondary">Inativo</Badge>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                              <GripVertical className="w-3 h-3" /> Ordem: {banner.sort_order}
                            </span>
                            {banner.link_url && (
                              <span className="flex items-center gap-1 truncate max-w-[200px]">
                                <ExternalLink className="w-3 h-3 flex-shrink-0" /> {banner.link_url}
                              </span>
                            )}
                            {banner.image_mobile_url && (
                              <span className="text-blue-400">📱 Mobile</span>
                            )}
                            {banner.html_content && (
                              <span className="text-violet-400">HTML overlay</span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <Button variant="ghost" size="icon" onClick={() => startEditBanner(banner)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                            onClick={() => handleDeleteBanner(banner.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Refresh button */}
            <div className="mt-6 flex justify-center">
              <Button variant="ghost" onClick={loadBanners} disabled={bannersLoading}>
                <RefreshCw className={`w-4 h-4 ${bannersLoading ? 'animate-spin' : ''}`} /> Atualizar lista
              </Button>
            </div>
          </div>
        )}

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
                {renderUsersPaginationControls('top')}
                <div className="text-sm text-slate-500 mb-4">
                  {filteredUsers.length} usuário{filteredUsers.length !== 1 ? 's' : ''} encontrado{filteredUsers.length !== 1 ? 's' : ''} nesta página
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
                {renderUsersPaginationControls('bottom')}
              </div>
            )}

            {/* Refresh button */}
            <div className="mt-6 flex justify-center">
              <Button variant="ghost" onClick={() => loadUsers(usersPagination.page)} disabled={usersLoading}>
                <RefreshCw className={`w-4 h-4 ${usersLoading ? 'animate-spin' : ''}`} /> Atualizar lista
              </Button>
            </div>
          </div>
        )}

        {activeTab === 'hotmart' && (
          <div className="space-y-6">
            <div className="bg-slate-800/40 border border-slate-700 rounded-xl p-4">
              <h2 className="text-white font-semibold mb-1 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" /> Segurança & Operação
              </h2>
              <p className="text-sm text-slate-400">
                Esta área já é protegida por sessão e validação de admin no backend. Todos os endpoints abaixo exigem usuário admin.
              </p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
                <h3 className="text-white font-semibold mb-4">Mapeamento UCode → Produto</h3>

                <div className="space-y-3">
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Hotmart Product UCode</label>
                    <Input
                      value={mappingForm.hotmart_product_ucode}
                      onChange={(e) => setMappingForm({ ...mappingForm, hotmart_product_ucode: e.target.value })}
                      placeholder="abc123-ucode"
                      className="bg-slate-900/50 border-slate-600 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Produto no Hub</label>
                    <select
                      value={mappingForm.product_id}
                      onChange={(e) => setMappingForm({ ...mappingForm, product_id: e.target.value })}
                      className="w-full h-11 px-4 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Selecione um produto...</option>
                      {products.map((product) => (
                        <option key={product.id} value={product.id}>{product.name} ({product.id})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Notas (opcional)</label>
                    <Input
                      value={mappingForm.notes}
                      onChange={(e) => setMappingForm({ ...mappingForm, notes: e.target.value })}
                      placeholder="Oferta principal, funil A..."
                      className="bg-slate-900/50 border-slate-600 text-white"
                    />
                  </div>
                  <label className="flex items-center gap-2 text-sm text-slate-300">
                    <input
                      type="checkbox"
                      checked={mappingForm.active}
                      onChange={(e) => setMappingForm({ ...mappingForm, active: e.target.checked })}
                      className="w-5 h-5 rounded border-slate-600 bg-slate-900/50 text-blue-600 focus:ring-blue-500"
                    />
                    Mapeamento ativo
                  </label>
                </div>

                <div className="mt-4 flex gap-2">
                  <Button variant="primary" onClick={saveMapping} disabled={hotmartSaving}>
                    {hotmartSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {editingMappingId ? 'Atualizar' : 'Salvar'}
                  </Button>
                  <Button variant="ghost" onClick={startCreateMapping}>
                    <X className="w-4 h-4" /> Limpar
                  </Button>
                </div>

                <div className="mt-6 space-y-2 max-h-[380px] overflow-auto pr-1">
                  {hotmartMappings.length === 0 ? (
                    <p className="text-sm text-slate-500">Nenhum mapeamento cadastrado.</p>
                  ) : hotmartMappings.map((mapping) => (
                    <div key={mapping.id} className="bg-slate-900/50 border border-slate-700 rounded-lg p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm text-white font-medium break-all">{mapping.hotmart_product_ucode}</p>
                          <p className="text-xs text-slate-400 mt-1">Produto: <code>{mapping.product_id}</code></p>
                          {mapping.notes && <p className="text-xs text-slate-500 mt-1">{mapping.notes}</p>}
                          <div className="mt-2">
                            <Badge variant={mapping.active ? 'success' : 'secondary'}>
                              {mapping.active ? 'Ativo' : 'Inativo'}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => startEditMapping(mapping)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                            onClick={() => deleteMapping(mapping.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <h3 className="text-white font-semibold">Eventos de Webhook</h3>
                  <div className="flex gap-2">
                    <select
                      value={eventStatusFilter}
                      onChange={(e) => {
                        const value = e.target.value as 'all' | 'received' | 'processed' | 'ignored' | 'failed';
                        setEventStatusFilter(value);
                        loadHotmartEvents(value);
                      }}
                      className="h-9 px-3 bg-slate-900/50 border border-slate-600 rounded-lg text-sm text-white"
                    >
                      <option value="all">Todos</option>
                      <option value="failed">Falhos</option>
                      <option value="received">Recebidos</option>
                      <option value="processed">Processados</option>
                      <option value="ignored">Ignorados</option>
                    </select>
                    <Button variant="ghost" onClick={() => loadHotmartData(eventStatusFilter)} disabled={hotmartLoading}>
                      <RefreshCw className={`w-4 h-4 ${hotmartLoading ? 'animate-spin' : ''}`} /> Atualizar
                    </Button>
                  </div>
                </div>

                <div className="space-y-2 max-h-[520px] overflow-auto pr-1">
                  {hotmartEvents.length === 0 ? (
                    <p className="text-sm text-slate-500">Nenhum evento encontrado.</p>
                  ) : hotmartEvents.map((event) => {
                    const mappedProductLabel = getMappedProductLabel(event.product_ucode);
                    const hotmartProductName = event.payload?.data?.product?.name?.trim() || null;

                    return (
                      <div key={event.hotmart_event_id} className="bg-slate-900/50 border border-slate-700 rounded-lg p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm text-white font-medium">{event.event_name}</p>
                              <Badge variant={getEventBadgeVariant(event.processing_status)}>{event.processing_status}</Badge>
                              {!event.hottok_valid && (
                                <Badge variant="error" className="flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3" /> token inválido
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 mt-1 break-all">ID: {event.hotmart_event_id}</p>
                            <div className="mt-1 text-xs text-slate-400 space-y-0.5">
                              {event.product_ucode && <p>UCode: <code>{event.product_ucode}</code></p>}
                              {hotmartProductName && <p>Produto Hotmart: <span className="text-slate-300">{hotmartProductName}</span></p>}
                              {mappedProductLabel && <p>Mapeado no Hub: <span className="text-emerald-300">{mappedProductLabel}</span></p>}
                              {event.buyer_email && <p>Email: {event.buyer_email}</p>}
                              <p>Recebido: {formatDate(event.received_at)}</p>
                            </div>
                            {event.processing_error && (
                              <p className="text-xs text-red-300 mt-2 break-words">Erro: {event.processing_error}</p>
                            )}
                          </div>
                          <div className="flex-shrink-0">
                            {event.processing_status === 'failed' && event.hottok_valid ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => retryHotmartEvent(event.hotmart_event_id)}
                                disabled={retryingEventId === event.hotmart_event_id}
                              >
                                {retryingEventId === event.hotmart_event_id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <RotateCcw className="w-4 h-4" />
                                )}
                                Retry
                              </Button>
                            ) : event.processing_status === 'processed' ? (
                              <span className="text-emerald-400 text-xs inline-flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> OK
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
