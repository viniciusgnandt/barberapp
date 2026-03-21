import { useState, useEffect } from 'react';
import { Financial, Barbershops } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { Percent, DollarSign, CheckCircle } from 'lucide-react';
import { toast } from '../../components/ui/Toast';

const fmtCurrency = (v) => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtDate     = (d) => d ? new Date(d).toLocaleDateString('pt-BR') : '—';

export default function Commissions() {
  const { user } = useAuth();
  const [commissions, setCommissions] = useState([]);
  const [summary, setSummary]         = useState([]);
  const [barbers, setBarbers]         = useState([]);
  const [loading, setLoading]         = useState(true);
  const [barber, setBarber]           = useState('');
  const [status, setStatus]           = useState('');
  const [startDate, setStartDate]     = useState('');
  const [endDate, setEndDate]         = useState('');
  const [selected, setSelected]       = useState([]);
  const [paying, setPaying]           = useState(false);

  const load = () => {
    setLoading(true);
    const params = {};
    if (barber)    params.barber = barber;
    if (status)    params.status = status;
    if (startDate) params.startDate = startDate;
    if (endDate)   params.endDate = endDate;
    Financial.getCommissions(params).then(r => {
      setLoading(false);
      if (r.ok) {
        setCommissions(r.data.data.commissions);
        setSummary(r.data.data.summary);
      }
    });
  };

  useEffect(() => {
    Barbershops.getEmployees(user.barbershop).then(r => {
      if (r.ok) setBarbers(r.data.data || r.data);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [barber, status, startDate, endDate]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleSelect = (id) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const selectAllPending = () => {
    const pending = commissions.filter(c => c.status === 'pendente').map(c => c._id);
    setSelected(pending);
  };

  const handlePay = async () => {
    if (!selected.length) return;
    setPaying(true);
    const r = await Financial.payCommissions({ commissionIds: selected });
    setPaying(false);
    if (r.ok) { toast(`${selected.length} comissao(oes) pagas!`); setSelected([]); load(); }
    else toast(r.data?.message || 'Erro.', 'error');
  };

  // Summary by barber
  const barberSummary = {};
  summary.forEach(s => {
    if (!barberSummary[s.barberName]) barberSummary[s.barberName] = { pendente: 0, pago: 0 };
    barberSummary[s.barberName][s.status] = s.total;
  });

  return (
    <div>
      {/* Summary cards */}
      {Object.keys(barberSummary).length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
          {Object.entries(barberSummary).map(([name, vals]) => (
            <div key={name} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-4">
              <p className="text-sm font-bold text-gray-900 dark:text-white mb-2">{name}</p>
              <div className="flex gap-4 text-xs">
                <div>
                  <span className="text-gray-400">Pendente</span>
                  <p className="font-bold text-amber-600 dark:text-amber-400">{fmtCurrency(vals.pendente)}</p>
                </div>
                <div>
                  <span className="text-gray-400">Pago</span>
                  <p className="font-bold text-emerald-600 dark:text-emerald-400">{fmtCurrency(vals.pago)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select value={barber} onChange={e => setBarber(e.target.value)}
          className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm px-3 py-2 focus:border-brand-500 outline-none">
          <option value="">Todos os profissionais</option>
          {barbers.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
        </select>
        <select value={status} onChange={e => setStatus(e.target.value)}
          className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm px-3 py-2 focus:border-brand-500 outline-none">
          <option value="">Todos os status</option>
          <option value="pendente">Pendente</option>
          <option value="pago">Pago</option>
        </select>
        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
          className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm px-3 py-2 focus:border-brand-500 outline-none" />
        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
          className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm px-3 py-2 focus:border-brand-500 outline-none" />
      </div>

      {/* Pay selected */}
      {selected.length > 0 && (
        <div className="flex items-center gap-3 mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-xl">
          <span className="text-sm text-amber-700 dark:text-amber-400">{selected.length} selecionada(s)</span>
          <button onClick={handlePay} disabled={paying}
            className="ml-auto px-4 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-semibold disabled:opacity-50">
            <DollarSign size={12} className="inline mr-1" /> Pagar comissoes
          </button>
          <button onClick={() => setSelected([])} className="text-xs text-gray-400 hover:text-gray-600">Limpar</button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-400 text-left border-b border-gray-100 dark:border-gray-800">
                <th className="px-4 py-3 w-8">
                  <button onClick={selectAllPending} className="text-gray-400 hover:text-brand-500" title="Selecionar pendentes">
                    <CheckCircle size={14} />
                  </button>
                </th>
                <th className="px-4 py-3 font-medium">Profissional</th>
                <th className="px-4 py-3 font-medium">Servico</th>
                <th className="px-4 py-3 font-medium text-right">Valor servico</th>
                <th className="px-4 py-3 font-medium text-right">Taxa</th>
                <th className="px-4 py-3 font-medium text-right">Comissao</th>
                <th className="px-4 py-3 font-medium text-center">Status</th>
                <th className="px-4 py-3 font-medium text-right">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {loading ? (
                <tr><td colSpan={8} className="text-center py-8 text-gray-400">Carregando...</td></tr>
              ) : !commissions.length ? (
                <tr><td colSpan={8} className="text-center py-8 text-gray-400">Nenhuma comissao encontrada.</td></tr>
              ) : commissions.map(c => (
                <tr key={c._id} className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${selected.includes(c._id) ? 'bg-brand-50 dark:bg-brand-900/10' : ''}`}>
                  <td className="px-4 py-3">
                    {c.status === 'pendente' && (
                      <input type="checkbox" checked={selected.includes(c._id)} onChange={() => toggleSelect(c._id)}
                        className="rounded border-gray-300 dark:border-gray-600" />
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-900 dark:text-white font-medium">{c.barber?.name || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{c.serviceName || c.service?.name || '—'}</td>
                  <td className="px-4 py-3 text-right text-gray-500">{fmtCurrency(c.serviceAmount)}</td>
                  <td className="px-4 py-3 text-right text-gray-400">{c.commissionRate}%</td>
                  <td className="px-4 py-3 text-right font-bold text-gray-900 dark:text-white">{fmtCurrency(c.commissionAmount)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.status === 'pago' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                      {c.status === 'pago' ? 'Pago' : 'Pendente'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-400 text-xs">{fmtDate(c.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
