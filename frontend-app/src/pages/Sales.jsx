import { useState, useEffect } from 'react';
import {
  ShoppingCart, Plus, RefreshCw, TrendingUp, DollarSign, Package, Search, X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Products as ProductsAPI } from '../utils/api';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import { toast } from '../components/ui/Toast';
import { cn } from '../utils/cn';

const fmt      = v  => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
const fmtDate  = iso => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
const fmtTime  = iso => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

export default function Sales() {
  const { isAdmin } = useAuth();

  const [sales,        setSales]        = useState([]);
  const [products,     setProducts]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState('');
  const [saleModal,    setSaleModal]    = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [saleErr,      setSaleErr]      = useState('');
  const [form,         setForm]         = useState({ productId: '', quantity: '', unitPrice: '', notes: '' });

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <ShoppingCart size={40} className="text-gray-300 dark:text-gray-700 mb-3" />
        <p className="text-sm text-gray-500 dark:text-gray-400">Acesso restrito ao administrador.</p>
      </div>
    );
  }

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const loadSales = async () => {
    setLoading(true);
    const r = await ProductsAPI.getMovements({ type: 'venda' });
    if (r.ok) setSales(r.data?.data || []);
    setLoading(false);
  };

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const loadProducts = async () => {
    const r = await ProductsAPI.getAll({ category: 'venda' });
    if (r.ok) setProducts((r.data?.data || []).filter(p => p.category === 'venda'));
  };

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => { loadSales(); loadProducts(); }, []);

  const openSaleModal = () => {
    setForm({ productId: '', quantity: '', unitPrice: '', notes: '' });
    setSaleErr('');
    setSaleModal(true);
  };

  const handleProductChange = e => {
    const p = products.find(p => p._id === e.target.value);
    setForm(f => ({ ...f, productId: e.target.value, unitPrice: p ? String(p.salePrice || '') : '' }));
  };

  const handleSave = async () => {
    if (!form.productId)                           return setSaleErr('Selecione o produto.');
    if (!form.quantity || Number(form.quantity) <= 0) return setSaleErr('Informe a quantidade.');
    if (!form.unitPrice || Number(form.unitPrice) <= 0) return setSaleErr('Informe o preço de venda.');
    setSaleErr('');
    setSaving(true);
    const r = await ProductsAPI.addMovement(form.productId, {
      type:      'venda',
      quantity:  Number(form.quantity),
      unitPrice: Number(form.unitPrice),
      notes:     form.notes || undefined,
    });
    setSaving(false);
    if (r.ok) {
      toast('Venda registrada!');
      setSaleModal(false);
      loadSales();
      loadProducts();
    } else {
      setSaleErr(r.data?.message || 'Erro ao registrar venda.');
    }
  };

  const filtered = search
    ? sales.filter(s => s.product?.name?.toLowerCase().includes(search.toLowerCase()))
    : sales;

  const totalRevenue = sales.reduce((s, m) => s + (m.quantity * m.unitPrice), 0);
  const totalProfit  = sales.reduce((s, m) => s + (m.quantity * ((m.unitPrice || 0) - (m.unitCost || 0))), 0);
  const totalUnits   = sales.reduce((s, m) => s + m.quantity, 0);

  const selectedProduct = products.find(p => p._id === form.productId);
  const saleTotal = form.quantity && form.unitPrice
    ? Number(form.quantity) * Number(form.unitPrice)
    : null;

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Vendas</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Histórico de vendas de produtos</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={loadSales} title="Atualizar">
            <RefreshCw size={15} />
          </Button>
          <Button onClick={openSaleModal}>
            <Plus size={16} className="mr-1.5" /> Registrar venda
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Receita total',  value: fmt(totalRevenue), icon: DollarSign,  color: 'bg-brand-500'   },
          { label: 'Lucro total',    value: fmt(totalProfit),  icon: TrendingUp,  color: 'bg-emerald-500' },
          { label: 'Unidades vendidas', value: totalUnits,     icon: Package,     color: 'bg-violet-500'  },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4 flex items-start gap-3">
            <div className={cn('p-2 rounded-xl shrink-0', color)}>
              <Icon size={16} className="text-white" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-xs">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar produto..."
          className="w-full pl-9 pr-8 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors"
          aria-label="Buscar vendas"
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

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <ShoppingCart size={36} className="text-gray-200 dark:text-gray-700 mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {sales.length === 0 ? 'Nenhuma venda registrada.' : 'Nenhum resultado encontrado.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  {['Data', 'Produto', 'Qtd', 'Preço Unit.', 'Total', 'Lucro', 'Obs'].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 py-3 px-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {filtered.map(s => {
                  const total  = s.quantity * (s.unitPrice || 0);
                  const profit = s.quantity * ((s.unitPrice || 0) - (s.unitCost || 0));
                  return (
                    <tr key={s._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="py-3 px-4">
                        <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{fmtDate(s.createdAt)}</p>
                        <p className="text-[10px] text-gray-400">{fmtTime(s.createdAt)}</p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{s.product?.name || '—'}</p>
                        {s.product?.brand && <p className="text-[10px] text-gray-400">{s.product.brand}</p>}
                      </td>
                      <td className="py-3 px-4 text-xs font-medium text-gray-700 dark:text-gray-300">
                        {s.quantity} {s.product?.unit || ''}
                      </td>
                      <td className="py-3 px-4 text-xs text-gray-500 dark:text-gray-400">{fmt(s.unitPrice)}</td>
                      <td className="py-3 px-4 text-xs font-semibold text-brand-600 dark:text-brand-400">{fmt(total)}</td>
                      <td className="py-3 px-4 text-xs font-semibold text-emerald-600 dark:text-emerald-400">{fmt(profit)}</td>
                      <td className="py-3 px-4 text-xs text-gray-400 max-w-32 truncate">{s.notes || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Registrar venda */}
      <Modal open={saleModal} onClose={() => setSaleModal(false)} title="Registrar venda" size="sm"
        footer={<>
          <Button variant="ghost" onClick={() => setSaleModal(false)}>Cancelar</Button>
          <Button onClick={handleSave} loading={saving}><ShoppingCart size={14} className="mr-1.5" />Registrar</Button>
        </>}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Produto <span className="text-red-400 ml-0.5">*</span></label>
            <select
              value={form.productId}
              onChange={handleProductChange}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
            >
              <option value="">— Selecione —</option>
              {products.map(p => (
                <option key={p._id} value={p._id}>
                  {p.name}{p.brand ? ` (${p.brand})` : ''} — estoque: {p.stock} {p.unit}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label={`Quantidade${selectedProduct ? ` (${selectedProduct.unit})` : ''}`} required
              type="number" min="0.01" step="0.01" placeholder="0"
              value={form.quantity}
              onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
            />
            <Input
              label="Preço de venda (R$)" required
              type="number" min="0" step="0.01" placeholder="0.00"
              value={form.unitPrice}
              onChange={e => setForm(f => ({ ...f, unitPrice: e.target.value }))}
            />
          </div>

          {saleTotal !== null && (
            <div className="bg-brand-50 dark:bg-brand-900/20 rounded-xl p-3 text-xs flex items-center gap-4">
              <span className="text-gray-500 dark:text-gray-400">Total:</span>
              <span className="font-bold text-brand-600 dark:text-brand-400">{fmt(saleTotal)}</span>
            </div>
          )}

          <Input
            label="Observações"
            placeholder="Opcional..."
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          />

          {saleErr && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{saleErr}</p>}
        </div>
      </Modal>
    </div>
  );
}
