// pages/Stock.jsx — Controle de Estoque e Vendas (admin only)

import { useState, useEffect, useCallback } from 'react';
import {
  Package, Plus, Edit2, Trash2,
  DollarSign, AlertTriangle, Search, ArrowDownCircle,
  ArrowUpCircle, ShoppingCart, RefreshCw, X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Products as ProductsAPI } from '../utils/api';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import { toast } from '../components/ui/Toast';
import { cn } from '../utils/cn';

// ── Constants ─────────────────────────────────────────────────────────────────
const UNITS     = ['un', 'ml', 'g', 'l', 'kg', 'cx', 'fr', 'pc'];
const MOV_TYPES = [
  { value: 'entrada', label: 'Entrada de estoque',  icon: ArrowDownCircle, color: 'text-emerald-600' },
  { value: 'saida',   label: 'Saída (consumo)',      icon: ArrowUpCircle,   color: 'text-orange-500'  },
  { value: 'venda',   label: 'Venda ao cliente',     icon: ShoppingCart,    color: 'text-brand-600'   },
  { value: 'ajuste',  label: 'Ajuste de estoque',    icon: RefreshCw,       color: 'text-violet-600'  },
];

const EMPTY_FORM = {
  name: '', description: '', brand: '', category: 'consumo',
  unit: 'un', costPrice: '', salePrice: '', stock: '0', minStock: '0',
};
const EMPTY_MOV = { type: 'entrada', quantity: '', unitCost: '', unitPrice: '', notes: '' };

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt     = v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
const fmtDate = iso => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
const fmtTime = iso => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

const MOV_LABEL = { entrada: 'Entrada', saida: 'Saída', venda: 'Venda', ajuste: 'Ajuste' };
const MOV_COLOR = {
  entrada: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
  saida:   'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
  venda:   'bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300',
  ajuste:  'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300',
};

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({ label, value, icon: Icon, color, sub, warn }) {
  return (
    <div className={cn(
      'bg-white dark:bg-gray-900 rounded-xl border p-5 flex items-start gap-4',
      warn ? 'border-orange-200 dark:border-orange-800 ring-1 ring-orange-200 dark:ring-orange-800/50'
           : 'border-gray-100 dark:border-gray-800',
    )}>
      <div className={cn('p-2.5 rounded-xl shrink-0', color)}>
        <Icon size={18} className="text-white" />
      </div>
      <div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
        <p className={cn('text-2xl font-bold', warn ? 'text-orange-600 dark:text-orange-400' : 'text-gray-900 dark:text-gray-100')}>{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ── Product Card ──────────────────────────────────────────────────────────────
function ProductCard({ product, onEdit, onMove, onDelete }) {
  const lowStock = product.stock <= product.minStock && product.minStock > 0;
  const pct      = product.minStock > 0 ? Math.min(100, Math.round((product.stock / (product.minStock * 2)) * 100)) : 100;

  return (
    <div className={cn(
      'bg-white dark:bg-gray-900 rounded-xl border p-4 transition-colors group',
      lowStock
        ? 'border-orange-200 dark:border-orange-800/60'
        : 'border-gray-100 dark:border-gray-800 hover:border-brand-200 dark:hover:border-brand-800',
    )}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{product.name}</h3>
            {lowStock && (
              <span className="flex items-center gap-1 text-[10px] font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 px-1.5 py-0.5 rounded-full shrink-0">
                <AlertTriangle size={9} /> Baixo
              </span>
            )}
          </div>
          {product.brand && <p className="text-xs text-gray-400 dark:text-gray-600 mt-0.5">{product.brand}</p>}
        </div>
        <span className={cn(
          'text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0',
          product.category === 'venda'
            ? 'bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300'
            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
        )}>
          {product.category === 'venda' ? 'Venda' : 'Consumo'}
        </span>
      </div>

      {/* Stock bar */}
      <div className="mb-3">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-gray-500 dark:text-gray-400">Estoque</span>
          <span className={cn('font-semibold', lowStock ? 'text-orange-600 dark:text-orange-400' : 'text-gray-700 dark:text-gray-300')}>
            {product.stock} {product.unit}
          </span>
        </div>
        <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all', lowStock ? 'bg-orange-400' : 'bg-emerald-500')}
            style={{ width: `${pct}%` }}
          />
        </div>
        {product.minStock > 0 && (
          <p className="text-[10px] text-gray-400 dark:text-gray-600 mt-0.5">Mín: {product.minStock} {product.unit}</p>
        )}
      </div>

      {/* Prices */}
      <div className="flex items-center gap-3 mb-3 text-xs">
        <span className="text-gray-500 dark:text-gray-400">Custo: <strong className="text-gray-700 dark:text-gray-300">{fmt(product.costPrice)}</strong></span>
        {product.category === 'venda' && product.salePrice && (
          <span className="text-gray-500 dark:text-gray-400">Venda: <strong className="text-brand-600 dark:text-brand-400">{fmt(product.salePrice)}</strong></span>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-1.5 pt-3 border-t border-gray-50 dark:border-gray-800">
        <button
          onClick={() => onMove(product)}
          className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-medium rounded-lg bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 hover:bg-brand-100 dark:hover:bg-brand-900/40 transition-colors"
        >
          <Package size={12} /> Movimentar
        </button>
        <button onClick={() => onEdit(product)}
          className="p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors"
          aria-label={`Editar ${product.name}`}>
          <Edit2 size={13} />
        </button>
        <button onClick={() => onDelete(product)}
          className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          aria-label={`Remover ${product.name}`}>
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}


// ── Main Component ────────────────────────────────────────────────────────────
export default function Stock() {
  const { isAdmin } = useAuth();

  // Products
  const [products,      setProducts]      = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [search,        setSearch]        = useState('');
  const [catFilter,     setCatFilter]     = useState('');

  // Modals
  const [prodModal,     setProdModal]     = useState(false);
  const [movModal,      setMovModal]      = useState(false);
  const [deleteTarget,  setDeleteTarget]  = useState(null);
  const [editing,       setEditing]       = useState(null);
  const [movProduct,    setMovProduct]    = useState(null);

  // Forms
  const [form,          setForm]          = useState(EMPTY_FORM);
  const [movForm,       setMovForm]       = useState(EMPTY_MOV);
  const [saving,        setSaving]        = useState(false);
  const [formErr,       setFormErr]       = useState('');
  const [movErr,        setMovErr]        = useState('');
  const [deleting,      setDeleting]      = useState(false);

  // Movements tab
  const [movements,     setMovements]     = useState([]);
  const [movLoading,    setMovLoading]    = useState(false);

  // Tab
  const [activeTab,     setActiveTab]     = useState('products');

  // Redirect non-admin
  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Package size={40} className="text-gray-300 dark:text-gray-700 mb-3" />
        <p className="text-sm text-gray-500 dark:text-gray-400">Acesso restrito ao administrador.</p>
      </div>
    );
  }

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const loadProducts = useCallback(async () => {
    setLoading(true);
    const r = await ProductsAPI.getAll();
    if (r.ok) setProducts(r.data?.data || []);
    setLoading(false);
  }, []);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => { loadProducts(); }, [loadProducts]);

  const loadMovements = async () => {
    setMovLoading(true);
    const r = await ProductsAPI.getMovements();
    if (r.ok) setMovements(r.data?.data || []);
    setMovLoading(false);
  };

  // Load movements when tab changes
  const handleTabChange = tab => {
    setActiveTab(tab);
    if (tab === 'movements' && movements.length === 0) loadMovements();
  };

  // ── Product CRUD ─────────────────────────────────────────────────────────────
  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormErr('');
    setProdModal(true);
  };

  const openEdit = p => {
    setEditing(p);
    setForm({
      name:        p.name        || '',
      description: p.description || '',
      brand:       p.brand       || '',
      category:    p.category    || 'consumo',
      unit:        p.unit        || 'un',
      costPrice:   String(p.costPrice ?? ''),
      salePrice:   String(p.salePrice ?? ''),
      stock:       String(p.stock     ?? 0),
      minStock:    String(p.minStock  ?? 0),
    });
    setFormErr('');
    setProdModal(true);
  };

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSaveProd = async () => {
    if (!form.name || form.costPrice === '') return setFormErr('Nome e preço de custo são obrigatórios.');
    if (form.category === 'venda' && !form.salePrice) return setFormErr('Informe o preço de venda.');
    setFormErr(''); setSaving(true);

    const payload = {
      name:        form.name,
      description: form.description || undefined,
      brand:       form.brand       || undefined,
      category:    form.category,
      unit:        form.unit,
      costPrice:   Number(form.costPrice),
      salePrice:   form.salePrice ? Number(form.salePrice) : undefined,
      stock:       Number(form.stock)    || 0,
      minStock:    Number(form.minStock) || 0,
    };

    const r = editing
      ? await ProductsAPI.update(editing._id, payload)
      : await ProductsAPI.create(payload);

    setSaving(false);
    if (r.ok) {
      toast(editing ? 'Produto atualizado!' : 'Produto criado!');
      setProdModal(false);
      loadProducts();
    } else {
      setFormErr(r.data?.message || 'Erro ao salvar.');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const r = await ProductsAPI.delete(deleteTarget._id);
    setDeleting(false);
    if (r.ok) {
      toast('Produto removido.');
      setDeleteTarget(null);
      loadProducts();
    } else {
      toast(r.data?.message || 'Erro ao remover.', 'error');
    }
  };

  // ── Movement ─────────────────────────────────────────────────────────────────
  const openMove = p => {
    setMovProduct(p);
    setMovForm({
      ...EMPTY_MOV,
      unitCost:  String(p.costPrice  || ''),
      unitPrice: String(p.salePrice  || ''),
    });
    setMovErr('');
    setMovModal(true);
  };

  const setMov = k => e => setMovForm(f => ({ ...f, [k]: e.target.value }));

  const handleSaveMove = async () => {
    if (!movForm.quantity || Number(movForm.quantity) <= 0) return setMovErr('Informe a quantidade.');
    if (movForm.type === 'venda' && !movForm.unitPrice) return setMovErr('Informe o preço de venda.');
    setMovErr(''); setSaving(true);

    const payload = {
      type:      movForm.type,
      quantity:  Number(movForm.quantity),
      unitCost:  movForm.unitCost  ? Number(movForm.unitCost)  : undefined,
      unitPrice: movForm.unitPrice ? Number(movForm.unitPrice) : undefined,
      notes:     movForm.notes || undefined,
    };

    const r = await ProductsAPI.addMovement(movProduct._id, payload);
    setSaving(false);
    if (r.ok) {
      const label = MOV_TYPES.find(t => t.value === movForm.type)?.label || 'Movimentação';
      toast(`${label} registrada!`);
      setMovModal(false);
      loadProducts();
      if (activeTab === 'movements') loadMovements();
    } else {
      setMovErr(r.data?.message || 'Erro ao registrar movimentação.');
    }
  };

  // ── Filtered products ─────────────────────────────────────────────────────────
  const filtered = products.filter(p => {
    if (catFilter && p.category !== catFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return p.name?.toLowerCase().includes(q) || p.brand?.toLowerCase().includes(q);
    }
    return true;
  });

  const lowStockCount   = products.filter(p => p.stock <= p.minStock && p.minStock > 0).length;
  const totalStockValue = products.reduce((s, p) => s + p.stock * p.costPrice, 0);
  const forSaleCount    = products.filter(p => p.category === 'venda').length;

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 animate-fade-up">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Estoque</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Gerencie produtos de consumo e vendas
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus size={16} className="mr-1.5" /> Novo produto
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard label="Total de produtos"   value={products.length}          icon={Package}     color="bg-brand-500"  sub={`${forSaleCount} para venda`} />
        <KpiCard label="Valor em estoque"    value={fmt(totalStockValue)}      icon={DollarSign}  color="bg-teal-500"   />
        <KpiCard label="Para venda"          value={forSaleCount}              icon={ShoppingCart} color="bg-violet-500" />
        <KpiCard label="Estoque baixo"       value={lowStockCount}             icon={AlertTriangle} color="bg-orange-500" warn={lowStockCount > 0} sub={lowStockCount > 0 ? 'requer atenção' : 'tudo ok'} />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
        {[
          { id: 'products',  label: 'Produtos',      icon: Package   },
          { id: 'movements', label: 'Movimentações', icon: RefreshCw },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => handleTabChange(id)}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              activeTab === id
                ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300',
            )}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* ── Tab: Produtos ────────────────────────────────────────────────────── */}
      {activeTab === 'products' && (
        <>
          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-48">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Buscar produto..."
                className="w-full pl-9 pr-8 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors"
                aria-label="Buscar produtos"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  aria-label="Limpar busca"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <div className="flex gap-1">
              {[
                { v: '',          l: 'Todos'    },
                { v: 'consumo',   l: 'Consumo'  },
                { v: 'venda',     l: 'Venda'    },
              ].map(({ v, l }) => (
                <button key={v} onClick={() => setCatFilter(v)}
                  className={cn(
                    'px-3 py-2 text-xs rounded-xl border font-medium transition-colors',
                    catFilter === v
                      ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400'
                      : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300',
                  )}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-52 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Package size={40} className="text-gray-200 dark:text-gray-700 mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {products.length === 0 ? 'Nenhum produto cadastrado. Crie o primeiro!' : 'Nenhum produto encontrado.'}
              </p>
              {products.length === 0 && (
                <Button className="mt-4" size="sm" onClick={openCreate}>
                  <Plus size={14} className="mr-1.5" /> Criar produto
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map(p => (
                <ProductCard key={p._id} product={p} onEdit={openEdit} onMove={openMove} onDelete={setDeleteTarget} />
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Tab: Movimentações ───────────────────────────────────────────────── */}
      {activeTab === 'movements' && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Histórico de movimentações</h2>
            <Button size="sm" variant="secondary" onClick={loadMovements} loading={movLoading}>
              <RefreshCw size={13} className="mr-1.5" /> Atualizar
            </Button>
          </div>

          {movLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : movements.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <RefreshCw size={32} className="text-gray-200 dark:text-gray-700 mb-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400">Nenhuma movimentação registrada.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    {['Data', 'Produto', 'Tipo', 'Qtd', 'Custo Unit.', 'Preço Venda', 'Obs'].map(h => (
                      <th key={h} className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 py-2.5 px-4">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {movements.map(m => (
                    <tr key={m._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="py-2.5 px-4">
                        <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{fmtDate(m.createdAt)}</p>
                        <p className="text-[10px] text-gray-400 dark:text-gray-600">{fmtTime(m.createdAt)}</p>
                      </td>
                      <td className="py-2.5 px-4">
                        <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{m.product?.name || '—'}</p>
                        {m.product?.brand && <p className="text-[10px] text-gray-400 dark:text-gray-600">{m.product.brand}</p>}
                      </td>
                      <td className="py-2.5 px-4">
                        <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', MOV_COLOR[m.type])}>
                          {MOV_LABEL[m.type]}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-xs font-medium text-gray-700 dark:text-gray-300">
                        {m.quantity} {m.product?.unit || ''}
                      </td>
                      <td className="py-2.5 px-4 text-xs text-gray-500 dark:text-gray-400">{fmt(m.unitCost)}</td>
                      <td className="py-2.5 px-4 text-xs font-medium text-brand-600 dark:text-brand-400">
                        {m.type === 'venda' ? fmt(m.unitPrice) : '—'}
                      </td>
                      <td className="py-2.5 px-4 text-xs text-gray-400 dark:text-gray-600 max-w-32 truncate">{m.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}


      {/* ── Modal: Produto ───────────────────────────────────────────────────── */}
      <Modal open={prodModal} onClose={() => setProdModal(false)} title={editing ? 'Editar produto' : 'Novo produto'} size="full">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Input label="Nome do produto" required placeholder="Ex: Pomada Modeladora" value={form.name} onChange={set('name')} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Categoria <span className="text-red-400 ml-0.5">*</span></label>
              <select value={form.category} onChange={set('category')}
                className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors">
                <option value="consumo">Consumo interno</option>
                <option value="venda">Venda ao cliente</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Unidade</label>
              <select value={form.unit} onChange={set('unit')}
                className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors">
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <Input label="Marca" placeholder="Ex: American Crew" value={form.brand} onChange={set('brand')} />
            <Input label="Descrição" placeholder="Descrição opcional..." value={form.description} onChange={set('description')} />
            <Input label="Preço de custo (R$)" required type="number" min="0" step="0.01" placeholder="0.00" value={form.costPrice} onChange={set('costPrice')} />
            {form.category === 'venda' && (
              <Input label="Preço de venda (R$)" required type="number" min="0" step="0.01" placeholder="0.00" value={form.salePrice} onChange={set('salePrice')} />
            )}
            {!editing && (
              <Input label="Estoque inicial" type="number" min="0" placeholder="0" value={form.stock} onChange={set('stock')} />
            )}
            <Input label="Estoque mínimo (alerta)" type="number" min="0" placeholder="0" value={form.minStock} onChange={set('minStock')} />
          </div>

          {/* Margin preview for sale products */}
          {form.category === 'venda' && form.costPrice && form.salePrice && (
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 flex items-center gap-6 text-xs">
              <span className="text-gray-500 dark:text-gray-400">Margem de lucro:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                {fmt(Number(form.salePrice) - Number(form.costPrice))}
                {' '}({Number(form.costPrice) > 0 ? Math.round((Number(form.salePrice) - Number(form.costPrice)) / Number(form.costPrice) * 100) : 0}%)
              </span>
            </div>
          )}

          {formErr && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{formErr}</p>}
          <div className="flex gap-2 justify-end pt-1">
            <Button variant="secondary" onClick={() => setProdModal(false)}>Cancelar</Button>
            <Button onClick={handleSaveProd} loading={saving}>{editing ? 'Salvar' : 'Criar produto'}</Button>
          </div>
        </div>
      </Modal>

      {/* ── Modal: Movimentação ──────────────────────────────────────────────── */}
      <Modal open={movModal} onClose={() => setMovModal(false)} title={`Movimentar: ${movProduct?.name || ''}`}>
        <div className="space-y-4">
          {/* Type selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tipo de movimentação <span className="text-red-400 ml-0.5">*</span></label>
            <div className="grid grid-cols-2 gap-2">
              {MOV_TYPES.filter(t => t.value !== 'venda' || movProduct?.category === 'venda').map(({ value, label, icon: Icon, color }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setMovForm(f => ({ ...f, type: value }))}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all text-left',
                    movForm.type === value
                      ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300'
                      : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600',
                  )}
                >
                  <Icon size={14} className={movForm.type === value ? 'text-brand-500' : color} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <Input
            label={`Quantidade (${movProduct?.unit || 'un'})`} required
            type="number" min="0.01" step="0.01" placeholder="0"
            value={movForm.quantity}
            onChange={setMov('quantity')}
          />

          {movForm.type === 'entrada' && (
            <Input label="Custo unitário (R$)" type="number" min="0" step="0.01" placeholder="0.00"
              value={movForm.unitCost} onChange={setMov('unitCost')} />
          )}

          {movForm.type === 'venda' && (
            <>
              <Input label="Preço de venda unitário (R$)" required type="number" min="0" step="0.01" placeholder="0.00"
                value={movForm.unitPrice} onChange={setMov('unitPrice')} />
              {movForm.quantity && movForm.unitPrice && (
                <div className="bg-brand-50 dark:bg-brand-900/10 rounded-xl p-3 text-xs">
                  <span className="text-gray-500 dark:text-gray-400">Total da venda: </span>
                  <span className="font-bold text-brand-600 dark:text-brand-400">
                    {fmt(Number(movForm.quantity) * Number(movForm.unitPrice))}
                  </span>
                  {movForm.unitCost && (
                    <> · <span className="text-gray-500">Lucro: </span>
                      <span className="font-bold text-emerald-600">
                        {fmt(Number(movForm.quantity) * (Number(movForm.unitPrice) - Number(movForm.unitCost)))}
                      </span>
                    </>
                  )}
                </div>
              )}
            </>
          )}

          <Input label="Observações" placeholder="Opcional..." value={movForm.notes} onChange={setMov('notes')} />

          {movErr && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{movErr}</p>}
          <div className="flex gap-2 justify-end pt-1">
            <Button variant="secondary" onClick={() => setMovModal(false)}>Cancelar</Button>
            <Button onClick={handleSaveMove} loading={saving}>Registrar</Button>
          </div>
        </div>
      </Modal>

      {/* ── Modal: Confirmar Remoção ─────────────────────────────────────────── */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Remover produto">
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Deseja remover <strong className="text-gray-900 dark:text-gray-100">{deleteTarget?.name}</strong>? Todo o histórico de movimentações será apagado.
          </p>
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
            <Button variant="danger" onClick={handleDelete} loading={deleting}>Remover</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
