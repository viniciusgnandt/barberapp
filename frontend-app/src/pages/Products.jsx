import { useState, useEffect, useCallback } from 'react';
import {
  Package, Plus, Edit2, Trash2,
  AlertTriangle, Search, ShoppingCart, DollarSign,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Products as ProductsAPI } from '../utils/api';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import { toast } from '../components/ui/Toast';
import { cn } from '../utils/cn';

const UNITS = ['un', 'ml', 'g', 'l', 'kg', 'cx', 'fr', 'pc'];

const EMPTY_FORM = {
  name: '', description: '', brand: '', category: 'consumo',
  unit: 'un', costPrice: '', salePrice: '', stock: '0', minStock: '0',
};

const fmt = v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

// ── Product Card ───────────────────────────────────────────────────────────────
function ProductCard({ product, onEdit, onDelete }) {
  const lowStock = product.stock <= product.minStock && product.minStock > 0;
  const pct = product.minStock > 0
    ? Math.min(100, Math.round((product.stock / (product.minStock * 2)) * 100))
    : 100;

  return (
    <div className={cn(
      'bg-white dark:bg-gray-900 rounded-xl border p-4 transition-colors',
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
          {product.brand && <p className="text-xs text-gray-400 mt-0.5">{product.brand}</p>}
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

      <div className="flex items-center gap-3 mb-3 text-xs">
        <span className="text-gray-500 dark:text-gray-400">
          Custo: <strong className="text-gray-700 dark:text-gray-300">{fmt(product.costPrice)}</strong>
        </span>
        {product.category === 'venda' && product.salePrice && (
          <span className="text-gray-500 dark:text-gray-400">
            Venda: <strong className="text-brand-600 dark:text-brand-400">{fmt(product.salePrice)}</strong>
          </span>
        )}
      </div>

      <div className="flex gap-1.5 pt-3 border-t border-gray-50 dark:border-gray-800">
        <button
          onClick={() => onEdit(product)}
          className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-medium rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-brand-50 dark:hover:bg-brand-900/20 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
        >
          <Edit2 size={12} /> Editar
        </button>
        <button
          onClick={() => onDelete(product)}
          className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────
export default function Products() {
  const { isAdmin } = useAuth();

  const [products,     setProducts]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState('');
  const [catFilter,    setCatFilter]    = useState('');
  const [modal,        setModal]        = useState(false);
  const [editing,      setEditing]      = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form,         setForm]         = useState(EMPTY_FORM);
  const [saving,       setSaving]       = useState(false);
  const [deleting,     setDeleting]     = useState(false);
  const [formErr,      setFormErr]      = useState('');

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Package size={40} className="text-gray-300 dark:text-gray-700 mb-3" />
        <p className="text-sm text-gray-500 dark:text-gray-400">Acesso restrito ao administrador.</p>
      </div>
    );
  }

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const load = useCallback(async () => {
    setLoading(true);
    const r = await ProductsAPI.getAll();
    if (r.ok) setProducts(r.data?.data || []);
    setLoading(false);
  }, []);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => { load(); }, [load]);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormErr('');
    setModal(true);
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
    setModal(true);
  };

  const handleSave = async () => {
    if (!form.name || form.costPrice === '') return setFormErr('Nome e preço de custo são obrigatórios.');
    if (form.category === 'venda' && !form.salePrice) return setFormErr('Informe o preço de venda.');
    setFormErr('');
    setSaving(true);
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
    if (r.ok) { toast(editing ? 'Produto atualizado!' : 'Produto criado!'); setModal(false); load(); }
    else      setFormErr(r.data?.message || 'Erro ao salvar.');
  };

  const handleDelete = async () => {
    setDeleting(true);
    const r = await ProductsAPI.delete(deleteTarget._id);
    setDeleting(false);
    if (r.ok) { toast('Produto removido.'); setDeleteTarget(null); load(); }
    else      toast(r.data?.message || 'Erro ao remover.', 'error');
  };

  const filtered = products.filter(p => {
    if (catFilter && p.category !== catFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return p.name?.toLowerCase().includes(q) || p.brand?.toLowerCase().includes(q);
    }
    return true;
  });

  const lowCount    = products.filter(p => p.stock <= p.minStock && p.minStock > 0).length;
  const saleCount   = products.filter(p => p.category === 'venda').length;
  const stockValue  = products.reduce((s, p) => s + p.stock * (p.costPrice || 0), 0);

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Produtos</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Catálogo de produtos de consumo e venda</p>
        </div>
        <Button onClick={openCreate}><Plus size={16} className="mr-1.5" /> Novo produto</Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total',        value: products.length,     icon: Package,       color: 'bg-brand-500'   },
          { label: 'Valor em estoque', value: fmt(stockValue), icon: DollarSign,    color: 'bg-teal-500'    },
          { label: 'Para venda',   value: saleCount,           icon: ShoppingCart,  color: 'bg-violet-500'  },
          { label: 'Estoque baixo',value: lowCount,            icon: AlertTriangle, color: 'bg-orange-500', warn: lowCount > 0 },
        ].map(({ label, value, icon: Icon, color, warn }) => (
          <div key={label} className={cn(
            'bg-white dark:bg-gray-900 rounded-xl border p-4 flex items-start gap-3',
            warn ? 'border-orange-200 dark:border-orange-800 ring-1 ring-orange-200 dark:ring-orange-800/50'
                 : 'border-gray-100 dark:border-gray-800',
          )}>
            <div className={cn('p-2 rounded-xl shrink-0', color)}>
              <Icon size={16} className="text-white" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
              <p className={cn('text-xl font-bold', warn ? 'text-orange-600 dark:text-orange-400' : 'text-gray-900 dark:text-gray-100')}>{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar produto..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors"
          />
        </div>
        <div className="flex gap-1">
          {[{ v: '', l: 'Todos' }, { v: 'consumo', l: 'Consumo' }, { v: 'venda', l: 'Venda' }].map(({ v, l }) => (
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

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => <div key={i} className="h-52 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Package size={40} className="text-gray-200 dark:text-gray-700 mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {products.length === 0 ? 'Nenhum produto cadastrado.' : 'Nenhum produto encontrado.'}
          </p>
          {products.length === 0 && (
            <Button className="mt-4" size="sm" onClick={openCreate}><Plus size={14} className="mr-1.5" /> Criar produto</Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(p => <ProductCard key={p._id} product={p} onEdit={openEdit} onDelete={setDeleteTarget} />)}
        </div>
      )}

      {/* Modal: Produto */}
      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Editar produto' : 'Novo produto'} size="full">
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
        </div>
        <div className="flex gap-2 justify-end mt-4">
          <Button variant="secondary" onClick={() => setModal(false)}>Cancelar</Button>
          <Button onClick={handleSave} loading={saving}>{editing ? 'Salvar' : 'Criar produto'}</Button>
        </div>
      </Modal>

      {/* Modal: Confirmar remoção */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Remover produto" size="sm">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Deseja remover <strong className="text-gray-900 dark:text-gray-100">{deleteTarget?.name}</strong>? O histórico de movimentações será apagado.
        </p>
        <div className="flex gap-2 justify-end mt-4">
          <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
          <Button variant="danger" onClick={handleDelete} loading={deleting}>Remover</Button>
        </div>
      </Modal>
    </div>
  );
}
