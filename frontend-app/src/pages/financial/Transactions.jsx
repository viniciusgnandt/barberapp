import { useState, useEffect } from 'react';
import { Financial } from '../../utils/api';
import { ArrowUpRight, ArrowDownRight, Plus, Trash2 } from 'lucide-react';
import { toast } from '../../components/ui/Toast';

const fmtCurrency = (v) => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtDT       = (d) => d ? new Date(d).toLocaleString('pt-BR') : '—';

export default function Transactions() {
  const [txns, setTxns]           = useState([]);
  const [summary, setSummary]     = useState({ entradas: 0, saidas: 0, saldo: 0 });
  const [loading, setLoading]     = useState(true);
  const [showNew, setShowNew]     = useState(false);
  const [type, setType]           = useState('entrada');
  const [category, setCategory]   = useState('outros');
  const [amount, setAmount]       = useState('');
  const [desc, setDesc]           = useState('');
  const [payMethod, setPayMethod] = useState('dinheiro');
  const [creating, setCreating]   = useState(false);

  const load = () => {
    setLoading(true);
    Financial.getTransactions({ limit: 100 }).then(r => {
      setLoading(false);
      if (r.ok) {
        setTxns(r.data.data.transactions);
        setSummary(r.data.data.summary);
      }
    });
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!amount || Number(amount) <= 0) return;
    setCreating(true);
    const r = await Financial.createTransaction({ type, category, amount: Number(amount), description: desc, paymentMethod: payMethod });
    setCreating(false);
    if (r.ok) { toast('Lancamento criado!'); setShowNew(false); setAmount(''); setDesc(''); load(); }
    else toast(r.data?.message || 'Erro.', 'error');
  };

  const handleDelete = async (id) => {
    if (!confirm('Remover este lancamento?')) return;
    const r = await Financial.deleteTransaction(id);
    if (r.ok) { toast('Removido.'); load(); }
  };

  return (
    <div>
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-4 text-center">
          <p className="text-xs text-gray-400 mb-1">Entradas</p>
          <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{fmtCurrency(summary.entradas)}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-4 text-center">
          <p className="text-xs text-gray-400 mb-1">Saidas</p>
          <p className="text-lg font-bold text-red-600 dark:text-red-400">{fmtCurrency(summary.saidas)}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-4 text-center">
          <p className="text-xs text-gray-400 mb-1">Saldo</p>
          <p className={`text-lg font-bold ${summary.saldo >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>{fmtCurrency(summary.saldo)}</p>
        </div>
      </div>

      {/* New transaction */}
      <div className="flex items-center justify-end mb-4">
        <button onClick={() => setShowNew(!showNew)}
          className="flex items-center gap-1 px-3 py-1.5 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-xs font-medium transition-colors">
          <Plus size={14} /> Novo lancamento
        </button>
      </div>

      {showNew && (
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-4 mb-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
          <select value={type} onChange={e => setType(e.target.value)}
            className="col-span-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm px-3 py-2 outline-none">
            <option value="entrada">Entrada</option>
            <option value="saida">Saida</option>
          </select>
          <select value={category} onChange={e => setCategory(e.target.value)}
            className="col-span-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm px-3 py-2 outline-none">
            <option value="servico">Servico</option>
            <option value="produto">Produto</option>
            <option value="comissao">Comissao</option>
            <option value="despesa">Despesa</option>
            <option value="ajuste">Ajuste</option>
            <option value="outros">Outros</option>
          </select>
          <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Valor (R$)"
            className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm px-3 py-2 outline-none" />
          <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Descricao"
            className="col-span-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm px-3 py-2 outline-none" />
          <select value={payMethod} onChange={e => setPayMethod(e.target.value)}
            className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm px-3 py-2 outline-none">
            <option value="dinheiro">Dinheiro</option>
            <option value="pix">PIX</option>
            <option value="debito">Debito</option>
            <option value="credito">Credito</option>
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

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-400 text-left border-b border-gray-100 dark:border-gray-800">
              <th className="px-4 py-3 w-8"></th>
              <th className="px-4 py-3 font-medium">Descricao</th>
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
              <tr><td colSpan={7} className="text-center py-8 text-gray-400">Nenhum lancamento.</td></tr>
            ) : txns.map(t => (
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
                <td className={`px-4 py-3 text-right font-medium ${t.type === 'entrada' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                  {t.type === 'entrada' ? '+' : '-'}{fmtCurrency(t.amount)}
                </td>
                <td className="px-4 py-3 text-right text-gray-400 text-xs">{fmtDT(t.createdAt)}</td>
                <td className="px-4 py-3">
                  <button onClick={() => handleDelete(t._id)} className="text-gray-300 hover:text-red-400"><Trash2 size={14} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
