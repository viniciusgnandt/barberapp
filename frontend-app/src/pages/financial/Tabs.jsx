import { useState, useEffect, useRef } from 'react';
import { Financial, Services as ServicesAPI, Products as ProductsAPI, Clients as ClientsAPI } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { Receipt, Plus, X, Package, Scissors, Trash2, CreditCard, Search, User, Printer, RotateCcw, Banknote, Smartphone } from 'lucide-react';
import { toast } from '../../components/ui/Toast';
import { cn } from '../../utils/cn';

const PM_OPTIONS = [
  { key: 'dinheiro', label: 'Dinheiro',  icon: Banknote   },
  { key: 'pix',      label: 'PIX',       icon: Smartphone },
  { key: 'debito',   label: 'Débito',    icon: CreditCard },
  { key: 'credito',  label: 'Crédito',   icon: CreditCard },
  { key: 'outro',    label: 'Outro',     icon: Receipt    },
];

function PaymentModal({ tab, discount, onConfirm, onClose }) {
  const [method,   setMethod]   = useState('dinheiro');
  const [disc,     setDisc]     = useState(String(discount || ''));
  const subtotal = tab.subtotal || 0;
  const discVal  = Math.max(0, Math.min(parseFloat(disc) || 0, subtotal));
  const total    = subtotal - discVal;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div className="px-5 py-4 flex items-center justify-between bg-emerald-500">
          <div className="flex items-center gap-2">
            <CreditCard size={18} className="text-white" />
            <p className="text-white font-bold text-base">Finalizar Comanda</p>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Forma de pagamento</label>
            <div className="grid grid-cols-5 gap-2">
              {PM_OPTIONS.map(pm => {
                const Icon = pm.icon;
                const sel  = method === pm.key;
                return (
                  <button key={pm.key} type="button" onClick={() => setMethod(pm.key)}
                    className={cn(
                      'flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 transition-all text-center',
                      sel
                        ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-400 dark:border-emerald-600 text-emerald-700 dark:text-emerald-300'
                        : 'bg-gray-50 dark:bg-gray-800/40 border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 hover:border-gray-300'
                    )}>
                    <Icon size={16} />
                    <span className="text-[10px] font-semibold leading-none">{pm.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Desconto (R$)</label>
            <input type="number" min="0" step="0.01" value={disc} onChange={e => setDisc(e.target.value)}
              placeholder="0,00"
              className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:border-emerald-500 outline-none transition-colors"
            />
          </div>
          <div className="rounded-xl bg-gray-50 dark:bg-gray-800/40 p-3 space-y-1 text-sm">
            <div className="flex justify-between text-gray-500 dark:text-gray-400">
              <span>Subtotal</span><span>{(subtotal).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
            </div>
            {discVal > 0 && (
              <div className="flex justify-between text-red-500">
                <span>Desconto</span><span>− {discVal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-gray-900 dark:text-white border-t border-gray-200 dark:border-gray-700 pt-1">
              <span>Total</span><span className="text-emerald-600 dark:text-emerald-400">{total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
            </div>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              Cancelar
            </button>
            <button type="button" onClick={() => onConfirm(method, discVal)}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-emerald-500 hover:bg-emerald-600 transition-colors">
              Confirmar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

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
  const [newName, setNewName]         = useState('');
  const [newClientId, setNewClientId] = useState(null);
  const [clientSearch, setClientSearch] = useState('');
  const [clientSuggestions, setClientSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [allClients, setAllClients]   = useState([]);
  const suggestRef = useRef(null);
  const [closing, setClosing]     = useState(false);
  const [payModal, setPayModal]   = useState(false);

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
    ClientsAPI.getAll({ limit: 500 }).then(r => { if (r.ok) setAllClients(r.data.data || r.data || []); });
  }, []);

  // Fecha sugestões ao clicar fora
  useEffect(() => {
    const handler = (e) => { if (suggestRef.current && !suggestRef.current.contains(e.target)) setShowSuggestions(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleClientInput = (value) => {
    setClientSearch(value);
    setNewName(value);
    setNewClientId(null);
    if (value.trim().length < 1) { setClientSuggestions([]); setShowSuggestions(false); return; }
    const q = value.toLowerCase();
    const matches = allClients.filter(c =>
      c.name?.toLowerCase().includes(q) || c.phone?.includes(q)
    ).slice(0, 8);
    setClientSuggestions(matches);
    setShowSuggestions(matches.length > 0);
  };

  const selectClient = (client) => {
    setNewName(client.name);
    setClientSearch(client.name);
    setNewClientId(client._id);
    setShowSuggestions(false);
  };

  const handleCreate = async () => {
    const body = { clientName: newName.trim() || 'Cliente', barber: user.id };
    if (newClientId) body.client = newClientId;
    const r = await Financial.createTab(body);
    if (r.ok) {
      setShowNew(false); setNewName(''); setClientSearch(''); setNewClientId(null);
      load(); toast('Comanda criada!');
    } else toast(r.data?.message || 'Erro.', 'error');
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

  const handleClose = async (method, discVal) => {
    setClosing(true);
    const r = await Financial.closeTab(selectedTab._id, { paymentMethod: method, discount: discVal });
    setClosing(false);
    setPayModal(false);
    if (r.ok) { setSelectedTab(null); load(); toast('Comanda finalizada!'); }
    else toast(r.data?.message || 'Erro.', 'error');
  };

  const handleReopen = async (tabId) => {
    const r = await Financial.reopenTab(tabId);
    if (r.ok) { setSelectedTab(r.data.data); load(); toast('Comanda reaberta!'); }
    else toast(r.data?.message || 'Erro.', 'error');
  };

  const openDetail = async (id) => {
    const r = await Financial.getTab(id);
    if (r.ok) setSelectedTab(r.data.data);
  };

  const handlePrint = (tab) => {
    const win = window.open('', '_blank', 'width=400,height=600');
    const lines = (tab.items || []).map(item =>
      `<tr><td>${item.name}${item.quantity > 1 ? ` x${item.quantity}` : ''}</td><td style="text-align:right">${fmtCurrency(item.total)}</td></tr>`
    ).join('');
    win.document.write(`
      <html><head><title>Comanda #${tab._id.slice(-6)}</title>
      <style>body{font-family:monospace;padding:16px;font-size:13px}table{width:100%;border-collapse:collapse}td{padding:4px 0}hr{border:none;border-top:1px dashed #999}</style>
      </head><body>
      <h3 style="text-align:center;margin:0">Comanda #${tab._id.slice(-6)}</h3>
      <p style="text-align:center;margin:4px 0;font-size:12px">${tab.clientName || 'Cliente'} — ${tab.barber?.name || ''}</p>
      <hr/>
      <table>${lines}</table>
      <hr/>
      <table><tr><td><strong>Total</strong></td><td style="text-align:right"><strong>${fmtCurrency(tab.total || tab.subtotal)}</strong></td></tr>
      ${tab.paymentMethod ? `<tr><td>Pagamento</td><td style="text-align:right">${tab.paymentMethod}</td></tr>` : ''}
      </table>
      <hr/>
      <p style="text-align:center;font-size:11px">${new Date().toLocaleString('pt-BR')}</p>
      </body></html>
    `);
    win.document.close();
    win.focus();
    win.print();
  };

  return (
    <>
    {payModal && selectedTab && (
      <PaymentModal
        tab={selectedTab}
        discount={0}
        onConfirm={handleClose}
        onClose={() => setPayModal(false)}
      />
    )}
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
          <div className="flex gap-2 mb-4" ref={suggestRef}>
            <div className="flex-1 relative">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  value={clientSearch}
                  onChange={e => handleClientInput(e.target.value)}
                  onFocus={() => clientSearch && setShowSuggestions(clientSuggestions.length > 0)}
                  placeholder="Buscar cliente ou digitar nome..."
                  className="w-full pl-8 pr-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:border-brand-500 outline-none"
                />
                {newClientId && (
                  <User size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-500" />
                )}
              </div>
              {showSuggestions && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-50 overflow-hidden">
                  {clientSuggestions.map(c => (
                    <button
                      key={c._id}
                      type="button"
                      onMouseDown={() => selectClient(c)}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors"
                    >
                      <div className="w-6 h-6 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center shrink-0">
                        <User size={11} className="text-brand-600 dark:text-brand-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{c.name}</p>
                        {c.phone && <p className="text-[10px] text-gray-400 dark:text-gray-500">{c.phone}</p>}
                      </div>
                    </button>
                  ))}
                  {clientSearch.trim() && !clientSuggestions.some(c => c.name.toLowerCase() === clientSearch.toLowerCase()) && (
                    <div className="px-3 py-2 border-t border-gray-100 dark:border-gray-800">
                      <p className="text-[10px] text-gray-400 dark:text-gray-500">
                        Pressione "Criar" para usar <strong>"{clientSearch}"</strong> como nome avulso
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
            <button onClick={handleCreate} className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-sm font-medium transition-colors whitespace-nowrap">
              Criar
            </button>
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
            <div className="flex items-center gap-2">
              <button onClick={() => handlePrint(selectedTab)} title="Imprimir comanda"
                className="text-gray-400 hover:text-brand-600 transition-colors p-1 rounded-lg hover:bg-brand-50 dark:hover:bg-brand-900/20">
                <Printer size={15} />
              </button>
              <button onClick={() => setSelectedTab(null)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
            </div>
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
                  <button onClick={() => handleRemoveItem(selectedTab._id, item._id)} className="text-gray-300 hover:text-red-400">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Add item buttons (open and finalized tabs) */}
          {(selectedTab.status === 'aberta' || selectedTab.status === 'finalizada') && (
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
                <div className="flex justify-between text-sm font-bold">
                  <span className="text-gray-900 dark:text-white">Total</span>
                  <span className="text-brand-600 dark:text-brand-400">{fmtCurrency(selectedTab.subtotal || 0)}</span>
                </div>
                <button onClick={() => setPayModal(true)} disabled={closing}
                  className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50">
                  <CreditCard size={14} className="inline mr-1.5" /> Finalizar comanda
                </button>
              </>
            )}
            {selectedTab.status === 'finalizada' && (
              <>
                <div className="flex justify-between text-sm font-bold">
                  <span className="text-gray-900 dark:text-white">Total pago</span>
                  <span className="text-emerald-600 dark:text-emerald-400">{fmtCurrency(selectedTab.total)}</span>
                </div>
                <div className="flex gap-2 mt-1">
                  <button onClick={() => handlePrint(selectedTab)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl text-sm font-medium transition-colors">
                    <Printer size={14} /> Imprimir
                  </button>
                  <button onClick={() => handleReopen(selectedTab._id)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-xl text-sm font-medium transition-colors">
                    <RotateCcw size={14} /> Reabrir
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
    </>
  );
}
