import { useState, useEffect, useCallback } from 'react';
import { Financial } from '../../utils/api';
import { ArrowUpRight, ArrowDownRight, Plus, Trash2, Filter } from 'lucide-react';
import { toast } from '../../components/ui/Toast';
import { cn } from '../../utils/cn';

const fmtCurrency = (v) => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtDT       = (d) => d ? new Date(d).toLocaleString('pt-BR') : '—';

const DEFAULT_FEES = { dinheiro: 0, pix: 0, debito: 1.5, credito: 2.99, outro: 0 };
function loadFees() {
  try { return { ...DEFAULT_FEES, ...JSON.parse(localStorage.getItem('cashregister_fees') || '{}') }; }
  catch { return DEFAULT_FEES; }
}

const today    = () => new Date().toISOString().slice(0, 10);
const firstDay = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
};

const SHORTCUTS = [
  { label: 'Hoje',     s: today(),    e: today() },
  { label: 'Este mês', s: firstDay(), e: today() },
  {
    label: 'Últ. 3m',
    s: (() => { const d = new Date(); d.setMonth(d.getMonth() - 3); return d.toISOString().slice(0, 10); })(),
    e: today(),
  },
  { label: 'Tudo', s: '', e: '' },
];

const inputCls = 'px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-colors';

export default function Transactions() {
  const [txns,       setTxns]       = useState([]);
  const [summary,    setSummary]    = useState({ entradas: 0, saidas: 0, saldo: 0 });
  const [loading,    setLoading]    = useState(true);
  const [showNew,    setShowNew]    = useState(false);
  const [type,       setType]       = useState('entrada');
  const [category,   setCategory]   = useState('outros');
  const [amount,     setAmount]     = useState('');
  const [desc,       setDesc]       = useState('');
  const [payMethod,  setPayMethod]  = useState('dinheiro');
  const [creating,   setCreating]   = useState(false);

  // ── Filtros de período
  const [startDate, setStartDate] = useState(firstDay());
  const [endDate,   setEndDate]   = useState(today());

  const load = useCallback(() => {
    setLoading(true);
    const params = { limit: 200 };
    if (startDate) params.startDate = startDate;
    if (endDate)   params.endDate   = endDate;
    Financial.getTransactions(params).then(r => {
      setLoading(false);
      if (r.ok) {
        setTxns(r.data.data.transactions);
        setSummary(r.data.data.summary);
      }
    });
  }, [startDate, endDate]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!amount || Number(amount) <= 0) return;
    setCreating(true);
    const r = await Financial.createTransaction({ type, category, amount: Number(amount), description: desc, paymentMethod: payMethod });
    setCreating(false);
    if (r.ok) { toast('Lançamento criado!'); setShowNew(false); setAmount(''); setDesc(''); load(); }
    else toast(r.data?.message || 'Erro.', 'error');
  };

  const handleDelete = async (id) => {
    if (!confirm('Remover este lançamento?')) return;
    const r = await Financial.deleteTransaction(id);
    if (r.ok) { toast('Removido.'); load(); }
  };

  const fees       = loadFees();
  const totalTaxas = txns
    .filter(t => t.type === 'entrada')
    .reduce((s, t) => s + t.amount * ((fees[t.paymentMethod] || 0) / 100), 0);
  const totalLiquido = summary.entradas - totalTaxas - summary.saidas;

  return (
    <div className="space-y-4">

      {/* ── Filtro de período ──────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl px-5 py-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider self-center">
            <Filter size={12} /> Período
          </div>
          <input type="date" value={startDate} max={endDate || today()}
            onChange={e => setStartDate(e.target.value)} className={inputCls} />
          <span className="text-gray-400 text-sm self-center">até</span>
          <input type="date" value={endDate} min={startDate} max={today()}
            onChange={e => setEndDate(e.target.value)} className={inputCls} />
          <div className="flex gap-1.5 flex-wrap">
            {SHORTCUTS.map(({ label, s, e }) => (
              <button key={label}
                onClick={() => { setStartDate(s); setEndDate(e); }}
                className={cn(
                  'px-2.5 py-1.5 text-xs rounded-lg border transition-colors',
                  s === startDate && e === endDate
                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400'
                    : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300',
                )}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Resumo ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-4 text-center">
          <p className="text-xs text-gray-400 mb-1">Entradas</p>
          <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{fmtCurrency(summary.entradas)}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-4 text-center">
          <p className="text-xs text-gray-400 mb-1">Saídas</p>
          <p className="text-lg font-bold text-red-600 dark:text-red-400">{fmtCurrency(summary.saidas)}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-4 text-center">
          <p className="text-xs text-gray-400 mb-1">Saldo Líquido</p>
          <p className={cn('text-lg font-bold', totalLiquido >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400')}>
            {fmtCurrency(totalLiquido)}
          </p>
        </div>
      </div>

      {/* ── Novo lançamento ───────────────────────────────────────────────── */}
      <div className="flex items-center justify-end">
        <button onClick={() => setShowNew(!showNew)}
          className="flex items-center gap-1 px-3 py-1.5 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-xs font-medium transition-colors">
          <Plus size={14} /> Novo lançamento
        </button>
      </div>

      {showNew && (
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
          <select value={type} onChange={e => setType(e.target.value)}
            className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm px-3 py-2 outline-none">
            <option value="entrada">Entrada</option>
            <option value="saida">Saída</option>
          </select>
          <select value={category} onChange={e => setCategory(e.target.value)}
            className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm px-3 py-2 outline-none">
            <option value="servico">Serviço</option>
            <option value="produto">Produto</option>
            <option value="comissao">Comissão</option>
            <option value="despesa">Despesa</option>
            <option value="ajuste">Ajuste</option>
            <option value="outros">Outros</option>
          </select>
          <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Valor (R$)"
            className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm px-3 py-2 outline-none" />
          <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Descrição"
            className="col-span-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm px-3 py-2 outline-none" />
          <select value={payMethod} onChange={e => setPayMethod(e.target.value)}
            className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm px-3 py-2 outline-none">
            <option value="dinheiro">Dinheiro</option>
            <option value="pix">PIX</option>
            <option value="debito">Débito</option>
            <option value="credito">Crédito</option>
            <option value="outro">Outro</option>
          </select>
          <div className="col-span-full flex justify-end">
            <button onClick={handleCreate} disabled={creating}
              className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-sm font-medium disabled:opacity-50">
              {creating ? '...' : 'Salvar'}
            </button>
          </div>
        </div>
      )}

      {/* ── Tabela ───────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-400 text-left border-b border-gray-100 dark:border-gray-800">
              <th className="px-4 py-3 w-8"></th>
              <th className="px-4 py-3 font-medium">Descrição</th>
              <th className="px-4 py-3 font-medium">Categoria</th>
              <th className="px-4 py-3 font-medium">Pagamento</th>
              <th className="px-4 py-3 font-medium text-right">Valor</th>
              <th className="px-4 py-3 font-medium text-right">Data</th>
              <th className="px-4 py-3 w-8"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {loading ? (
              <tr><td colSpan={7} className="text-center py-8 text-gray-400">Carregando...</td></tr>
            ) : !txns.length ? (
              <tr><td colSpan={7} className="text-center py-8 text-gray-400">Nenhum lançamento no período.</td></tr>
            ) : txns.map(t => {
              const feeRate = t.type === 'entrada' ? (fees[t.paymentMethod] || 0) : 0;
              const feeAmt  = t.amount * feeRate / 100;
              const netAmt  = t.amount - feeAmt;

              return (
                <>
                  <tr key={t._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-3">
                      {t.type === 'entrada'
                        ? <ArrowUpRight size={14} className="text-emerald-500" />
                        : <ArrowDownRight size={14} className="text-red-500" />
                      }
                    </td>
                    <td className="px-4 py-3 text-gray-900 dark:text-white">{t.description || '—'}</td>
                    <td className="px-4 py-3 text-gray-400 capitalize">{t.category}</td>
                    <td className="px-4 py-3 text-gray-400 capitalize">{t.paymentMethod}</td>
                    <td className={cn('px-4 py-3 text-right font-medium', t.type === 'entrada' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400')}>
                      {t.type === 'entrada' ? '+' : '−'}{fmtCurrency(t.amount)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-400 text-xs">{fmtDT(t.createdAt)}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleDelete(t._id)} className="text-gray-300 hover:text-red-400"><Trash2 size={14} /></button>
                    </td>
                  </tr>

                  {t.type === 'entrada' && (fees[t.paymentMethod] || 0) > 0 && (
                    <tr key={`${t._id}-fee`} className="bg-amber-50/50 dark:bg-amber-900/5">
                      <td />
                      <td colSpan={3} className="px-4 py-1.5 text-[11px] text-amber-600 dark:text-amber-400 italic">
                        Taxa {t.paymentMethod} ({fees[t.paymentMethod]}%) — líquido {fmtCurrency(netAmt)}
                      </td>
                      <td className="px-4 py-1.5 text-right text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                        − {fmtCurrency(feeAmt)}
                      </td>
                      <td colSpan={2} />
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
