import { useState, useEffect } from 'react';
import { Financial } from '../../utils/api';
import { Wallet, DoorOpen, DoorClosed, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { toast } from '../../components/ui/Toast';

const fmtCurrency = (v) => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function CashRegister() {
  const [cash, setCash]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [openBal, setOpenBal]     = useState('');
  const [closeBal, setCloseBal]   = useState('');
  const [acting, setActing]       = useState(false);

  const load = async () => {
    setLoading(true);
    const r = await Financial.getCash();
    setLoading(false);
    if (r.ok) setCash(r.data.data);
  };

  useEffect(() => { load(); }, []);

  const handleOpen = async () => {
    setActing(true);
    const r = await Financial.openCash({ openingBalance: Number(openBal) || 0 });
    setActing(false);
    if (r.ok) { toast('Caixa aberto!'); setOpenBal(''); load(); }
    else toast(r.data?.message || 'Erro.', 'error');
  };

  const handleClose = async () => {
    setActing(true);
    const r = await Financial.closeCash({ closingBalance: closeBal ? Number(closeBal) : undefined });
    setActing(false);
    if (r.ok) { toast('Caixa fechado!'); setCloseBal(''); load(); }
    else toast(r.data?.message || 'Erro.', 'error');
  };

  if (loading) return <div className="flex justify-center py-12"><div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>;

  if (!cash) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-8 text-center">
        <Wallet size={32} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
        <p className="text-gray-500 dark:text-gray-400 mb-4">Nenhum caixa aberto</p>
        <div className="max-w-xs mx-auto space-y-3">
          <input
            type="number" value={openBal} onChange={e => setOpenBal(e.target.value)}
            placeholder="Saldo inicial (R$)"
            className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:border-brand-500 outline-none"
          />
          <button onClick={handleOpen} disabled={acting}
            className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50">
            <DoorOpen size={16} className="inline mr-1.5" /> Abrir caixa
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center">
              <Wallet size={18} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 dark:text-gray-100">Caixa aberto</p>
              <p className="text-xs text-gray-400">Aberto por {cash.openedBy?.name || '—'} em {new Date(cash.openedAt).toLocaleString('pt-BR')}</p>
            </div>
          </div>
          <span className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold rounded-full">ABERTO</span>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 text-center">
            <p className="text-xs text-gray-400 mb-1">Abertura</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">{fmtCurrency(cash.openingBalance)}</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 text-center">
            <p className="text-xs text-gray-400 mb-1">Movimentacoes</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">{cash.transactionCount || 0}</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 text-center">
            <p className="text-xs text-gray-400 mb-1">Saldo atual</p>
            <p className={`text-lg font-bold ${(cash.currentBalance || 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
              {fmtCurrency(cash.currentBalance)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="number" value={closeBal} onChange={e => setCloseBal(e.target.value)}
            placeholder="Saldo de fechamento (opcional)"
            className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:border-brand-500 outline-none"
          />
          <button onClick={handleClose} disabled={acting}
            className="px-5 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50">
            <DoorClosed size={16} className="inline mr-1.5" /> Fechar caixa
          </button>
        </div>
      </div>
    </div>
  );
}
