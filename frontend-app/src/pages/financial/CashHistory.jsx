import { useState, useEffect } from 'react';
import { Financial } from '../../utils/api';

const fmtCurrency = (v) => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtDT       = (d) => d ? new Date(d).toLocaleString('pt-BR') : '—';

export default function CashHistory() {
  const [registers, setRegisters] = useState([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    Financial.getCashHistory({ limit: 50 }).then(r => {
      setLoading(false);
      if (r.ok) setRegisters(r.data.data.registers);
    });
  }, []);

  if (loading) return <div className="flex justify-center py-12"><div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>;

  if (!registers.length) return <p className="text-center text-gray-400 py-12">Nenhum registro de caixa.</p>;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-gray-400 text-left border-b border-gray-100 dark:border-gray-800">
            <th className="px-4 py-3 font-medium">Abertura</th>
            <th className="px-4 py-3 font-medium">Fechamento</th>
            <th className="px-4 py-3 font-medium">Aberto por</th>
            <th className="px-4 py-3 font-medium text-right">Saldo inicial</th>
            <th className="px-4 py-3 font-medium text-right">Saldo final</th>
            <th className="px-4 py-3 font-medium text-center">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {registers.map(r => (
            <tr key={r._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
              <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{fmtDT(r.openedAt)}</td>
              <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{fmtDT(r.closedAt)}</td>
              <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{r.openedBy?.name || '—'}</td>
              <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">{fmtCurrency(r.openingBalance)}</td>
              <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">{r.closingBalance != null ? fmtCurrency(r.closingBalance) : '—'}</td>
              <td className="px-4 py-3 text-center">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${r.status === 'open' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}`}>
                  {r.status === 'open' ? 'Aberto' : 'Fechado'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
