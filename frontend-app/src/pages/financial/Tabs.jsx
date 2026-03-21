import { useState, useEffect } from 'react';
import { Financial, Services as ServicesAPI, Products as ProductsAPI } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { Receipt, Plus, X, Package, Scissors, Trash2, CreditCard, ChevronDown } from 'lucide-react';
import { toast } from '../../components/ui/Toast';

const fmtCurrency = (v) => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function Tabs() {
  const { user } = useAuth();
  const [tabs, setTabs]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [filter, setFilter]       = useState('aberta');
  const [selectedTab, setSelectedTab] = useState(null);
  const [services, setServices]   = useState([]);
  const [products, setProducts]   = useState([]);
  const [showNew, setShowNew]     = useState(false);
  const [newName, setNewName]     = useState('');
  const [closing, setClosing]     = useState(false);
  const [payMethod, setPayMethod] = useState('dinheiro');
  const [discount, setDiscount]   = useState('');

  const load = () => {
    setLoading(true);
    Financial.getTabs({ status: filter, limit: 100 }).then(r => {
      setLoading(false);
      if (r.ok) setTabs(r.data.data.tabs);
    });
  };

  useEffect(() => { load(); }, [filter]);

  useEffect(() => {
    ServicesAPI.getAll().then(r => { if (r.ok) setServices(r.data.data || r.data); });
    ProductsAPI.getAll().then(r => { if (r.ok) setProducts(r.data.data || r.data); });
  }, []);

  const handleCreate = async () => {
    const r = await Financial.createTab({ clientName: newName || 'Cliente', barber: user.id });
    if (r.ok) { setShowNew(false); setNewName(''); load(); toast('Comanda criada!'); }
    else toast(r.data?.message || 'Erro.', 'error');
  };

  const handleAddItem = async (tabId, type, id) => {
    const body = type === 'servico' ? { type, serviceId: id } : { type, productId: id };
    const r = await Financial.addTabItem(tabId, body);
    if (r.ok) {
      setSelectedTab(r.data.data);
      load();
    }
  };

  const handleRemoveItem = async (tabId, itemId) => {
    const r = await Financial.removeTabItem(tabId, itemId);
    if (r.ok) { setSelectedTab(r.data.data); load(); }
  };

  const handleClose = async (tabId) => {
    setClosing(true);
    const r = await Financial.closeTab(tabId, { paymentMethod: payMethod, discount: Number(discount) || 0 });
    setClosing(false);
    if (r.ok) { setSelectedTab(null); load(); toast('Comanda finalizada!'); }
    else toast(r.data?.message || 'Erro.', 'error');
  };

  const openDetail = async (id) => {
    const r = await Financial.getTab(id);
    if (r.ok) setSelectedTab(r.data.data);
  };

  return (
    <div className="flex gap-4">
      {/* Left: list */}
      <div className="flex-1">
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-2">
            {['aberta', 'finalizada'].map(s => (
              <button key={s} onClick={() => setFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === s ? 'bg-brand-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>
                {s === 'aberta' ? 'Abertas' : 'Finalizadas'}
              </button>
            ))}
          </div>
          <button onClick={() => setShowNew(!showNew)}
            className="flex items-center gap-1 px-3 py-1.5 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-xs font-medium transition-colors">
            <Plus size={14} /> Nova comanda
          </button>
        </div>

        {showNew && (
          <div className="flex gap-2 mb-4">
            <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nome do cliente"
              className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:border-brand-500 outline-none" />
            <button onClick={handleCreate} className="px-4 py-2 bg-brand-500 text-white rounded-xl text-sm font-medium">Criar</button>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-8"><div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : !tabs.length ? (
          <p className="text-center text-gray-400 py-8">Nenhuma comanda {filter === 'aberta' ? 'aberta' : 'finalizada'}.</p>
        ) : (
          <div className="space-y-2">
            {tabs.map(t => (
              <button key={t._id} onClick={() => openDetail(t._id)}
                className={`w-full text-left bg-white dark:bg-gray-900 border rounded-xl px-4 py-3 transition-colors hover:border-brand-300 dark:hover:border-brand-700 ${selectedTab?._id === t._id ? 'border-brand-400 dark:border-brand-600' : 'border-gray-100 dark:border-gray-800'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Receipt size={14} className="text-brand-500" />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{t.clientName || 'Cliente'}</span>
                    <span className="text-xs text-gray-400">#{t._id.slice(-6)}</span>
                  </div>
                  <span className="text-sm font-bold text-gray-900 dark:text-white">{fmtCurrency(t.total)}</span>
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-gray-400">{t.barber?.name}</span>
                  <span className="text-xs text-gray-400">{t.items?.length || 0} itens</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right: detail */}
      {selectedTab && (
        <div className="w-80 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5 sticky top-20 self-start">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">
              Comanda #{selectedTab._id.slice(-6)}
            </h3>
            <button onClick={() => setSelectedTab(null)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
          </div>

          <p className="text-xs text-gray-400 mb-4">{selectedTab.clientName || 'Cliente'} — {selectedTab.barber?.name}</p>

          {/* Items */}
          <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
            {(selectedTab.items || []).map(item => (
              <div key={item._id} className="flex items-center justify-between text-sm gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  {item.type === 'servico' ? <Scissors size={12} className="text-brand-400 shrink-0" /> : <Package size={12} className="text-emerald-400 shrink-0" />}
                  <span className="truncate text-gray-700 dark:text-gray-300">{item.name}</span>
                  {item.quantity > 1 && <span className="text-xs text-gray-400">x{item.quantity}</span>}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="font-medium text-gray-900 dark:text-white">{fmtCurrency(item.total)}</span>
                  {selectedTab.status === 'aberta' && (
                    <button onClick={() => handleRemoveItem(selectedTab._id, item._id)} className="text-gray-300 hover:text-red-400">
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Add item buttons (only for open tabs) */}
          {selectedTab.status === 'aberta' && (
            <>
              <div className="border-t border-gray-100 dark:border-gray-800 pt-3 mb-3">
                <p className="text-xs font-medium text-gray-400 mb-2">Adicionar servico</p>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                  {services.map(s => (
                    <button key={s._id} onClick={() => handleAddItem(selectedTab._id, 'servico', s._id)}
                      className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-lg text-xs text-gray-700 dark:text-gray-300 hover:bg-brand-100 dark:hover:bg-brand-900/30 transition-colors">
                      {s.name} <span className="text-gray-400">{fmtCurrency(s.price)}</span>
                    </button>
                  ))}
                </div>
              </div>
              {products.length > 0 && (
                <div className="border-t border-gray-100 dark:border-gray-800 pt-3 mb-3">
                  <p className="text-xs font-medium text-gray-400 mb-2">Adicionar produto</p>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                    {products.map(p => (
                      <button key={p._id} onClick={() => handleAddItem(selectedTab._id, 'produto', p._id)}
                        className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-lg text-xs text-gray-700 dark:text-gray-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors">
                        {p.name} <span className="text-gray-400">{fmtCurrency(p.salePrice)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Totals + close */}
          <div className="border-t border-gray-100 dark:border-gray-800 pt-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Subtotal</span>
              <span className="text-gray-900 dark:text-white font-medium">{fmtCurrency(selectedTab.subtotal)}</span>
            </div>
            {selectedTab.status === 'aberta' && (
              <>
                <input type="number" value={discount} onChange={e => setDiscount(e.target.value)} placeholder="Desconto (R$)"
                  className="w-full px-2 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs focus:border-brand-500 outline-none" />
                <select value={payMethod} onChange={e => setPayMethod(e.target.value)}
                  className="w-full px-2 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs focus:border-brand-500 outline-none">
                  <option value="dinheiro">Dinheiro</option>
                  <option value="pix">PIX</option>
                  <option value="debito">Debito</option>
                  <option value="credito">Credito</option>
                  <option value="outro">Outro</option>
                </select>
                <div className="flex justify-between text-sm font-bold">
                  <span className="text-gray-900 dark:text-white">Total</span>
                  <span className="text-brand-600 dark:text-brand-400">{fmtCurrency((selectedTab.subtotal || 0) - (Number(discount) || 0))}</span>
                </div>
                <button onClick={() => handleClose(selectedTab._id)} disabled={closing}
                  className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50">
                  <CreditCard size={14} className="inline mr-1.5" /> Finalizar comanda
                </button>
              </>
            )}
            {selectedTab.status === 'finalizada' && (
              <div className="flex justify-between text-sm font-bold">
                <span className="text-gray-900 dark:text-white">Total pago</span>
                <span className="text-emerald-600 dark:text-emerald-400">{fmtCurrency(selectedTab.total)}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
