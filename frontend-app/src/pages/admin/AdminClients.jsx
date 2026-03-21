import { useState, useEffect } from 'react';
import { PlatformAdmin } from '../../utils/api';
import { Search, Building2, ChevronLeft, ChevronRight } from 'lucide-react';

const fmtCurrency = (v) => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtDate     = (d) => d ? new Date(d).toLocaleDateString('pt-BR') : '—';

const PLAN_COLORS = {
  free:    'bg-gray-700 text-gray-300',
  trial:   'bg-gray-700 text-gray-300',
  basic:   'bg-amber-900/50 text-amber-400',
  pro:     'bg-violet-900/50 text-violet-400',
  premium: 'bg-emerald-900/50 text-emerald-400',
};

export default function AdminClients() {
  const [clients, setClients] = useState([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);
  const [pages, setPages]     = useState(1);
  const [search, setSearch]   = useState('');
  const [plan, setPlan]       = useState('');
  const [loading, setLoading] = useState(true);

  const load = (p = page) => {
    setLoading(true);
    const params = { page: p, limit: 20 };
    if (search) params.search = search;
    if (plan)   params.plan = plan;
    PlatformAdmin.getClients(params).then(r => {
      setLoading(false);
      if (r.ok) {
        setClients(r.data.data.clients);
        setTotal(r.data.data.total);
        setPages(r.data.data.pages);
        setPage(r.data.data.page);
      }
    });
  };

  useEffect(() => { load(1); }, [search, plan]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Clientes (Estabelecimentos)</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome..."
            className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-800 rounded-xl text-white text-sm placeholder-gray-600 focus:border-violet-500 outline-none"
          />
        </div>
        <select value={plan} onChange={e => setPlan(e.target.value)}
          className="bg-gray-900 border border-gray-800 rounded-xl text-white text-sm px-3 py-2 focus:border-violet-500 outline-none">
          <option value="">Todos os planos</option>
          <option value="free">Free</option>
          <option value="basic">Basic</option>
          <option value="pro">Pro</option>
          <option value="premium">Premium</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 text-left border-b border-gray-800">
                <th className="px-4 py-3 font-medium">Estabelecimento</th>
                <th className="px-4 py-3 font-medium">Proprietario</th>
                <th className="px-4 py-3 font-medium">Plano</th>
                <th className="px-4 py-3 font-medium text-right">Faturamento</th>
                <th className="px-4 py-3 font-medium text-right">Uso IA</th>
                <th className="px-4 py-3 font-medium text-right">Cadastro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-8 text-gray-500">Carregando...</td></tr>
              ) : clients.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-gray-500">Nenhum resultado.</td></tr>
              ) : clients.map(c => (
                <tr key={c.id} className="hover:bg-gray-800/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Building2 size={14} className="text-gray-600 shrink-0" />
                      <span className="text-white font-medium">{c.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-400">{c.owner?.name || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PLAN_COLORS[c.plan] || PLAN_COLORS.free}`}>
                      {(c.plan || 'free').toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-emerald-400 font-medium">{fmtCurrency(c.revenue)}</td>
                  <td className="px-4 py-3 text-right text-gray-400">{(c.aiUsage || 0).toLocaleString('pt-BR')} msgs</td>
                  <td className="px-4 py-3 text-right text-gray-500">{fmtDate(c.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-800">
            <span className="text-xs text-gray-500">{total} resultado(s)</span>
            <div className="flex items-center gap-2">
              <button onClick={() => load(page - 1)} disabled={page <= 1}
                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-800 disabled:opacity-30">
                <ChevronLeft size={16} />
              </button>
              <span className="text-xs text-gray-400">{page} / {pages}</span>
              <button onClick={() => load(page + 1)} disabled={page >= pages}
                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-800 disabled:opacity-30">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
