import { useState, useEffect, useCallback } from 'react';
import { Financial } from '../../utils/api';
import {
  Wallet, DoorOpen, DoorClosed, ArrowUpRight, ArrowDownRight,
  Plus, Banknote, CreditCard, Smartphone, Receipt, X,
  TrendingUp, TrendingDown, Clock, ChevronDown,
} from 'lucide-react';
import { toast } from '../../components/ui/Toast';
import { cn } from '../../utils/cn';

const fmt = (v) => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtTime = (d) => new Date(d).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
const fmtDate = (d) => new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

// ── Métodos de pagamento ─────────────────────────────────────────────────────
const PAYMENT_METHODS = [
  { key: 'dinheiro', label: 'Dinheiro',       icon: Banknote,    color: 'emerald' },
  { key: 'pix',      label: 'Pix',            icon: Smartphone,  color: 'violet' },
  { key: 'debito',   label: 'Débito',         icon: CreditCard,  color: 'blue' },
  { key: 'credito',  label: 'Crédito',        icon: CreditCard,  color: 'amber' },
  { key: 'outro',    label: 'Outro',          icon: Receipt,     color: 'gray' },
];

const PM_COLORS = {
  emerald: { bg: 'bg-emerald-50 dark:bg-emerald-900/20',  border: 'border-emerald-300 dark:border-emerald-600',  text: 'text-emerald-700 dark:text-emerald-300',  icon: 'text-emerald-600 dark:text-emerald-400',  badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
  violet:  { bg: 'bg-violet-50 dark:bg-violet-900/20',   border: 'border-violet-300 dark:border-violet-600',    text: 'text-violet-700 dark:text-violet-300',    icon: 'text-violet-600 dark:text-violet-400',    badge: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300' },
  blue:    { bg: 'bg-blue-50 dark:bg-blue-900/20',       border: 'border-blue-300 dark:border-blue-600',        text: 'text-blue-700 dark:text-blue-300',        icon: 'text-blue-600 dark:text-blue-400',        badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  amber:   { bg: 'bg-amber-50 dark:bg-amber-900/20',     border: 'border-amber-300 dark:border-amber-600',      text: 'text-amber-700 dark:text-amber-300',      icon: 'text-amber-600 dark:text-amber-400',      badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  gray:    { bg: 'bg-gray-50 dark:bg-gray-800/40',       border: 'border-gray-300 dark:border-gray-600',        text: 'text-gray-700 dark:text-gray-300',        icon: 'text-gray-500 dark:text-gray-400',        badge: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
};

const CATEGORIES_IN  = ['serviço', 'produto', 'gorjeta', 'outros'];
const CATEGORIES_OUT = ['fornecedor', 'salário', 'aluguel', 'manutenção', 'materiais', 'outros'];

// ── Modal de movimentação ─────────────────────────────────────────────────────
function MovimentacaoModal({ type, cashId, onSuccess, onClose }) {
  const [amount,        setAmount]        = useState('');
  const [description,   setDescription]   = useState('');
  const [paymentMethod, setPaymentMethod] = useState('dinheiro');
  const [category,      setCategory]      = useState('');
  const [saving,        setSaving]        = useState(false);

  const cats = type === 'entrada' ? CATEGORIES_IN : CATEGORIES_OUT;
  const isEntrada = type === 'entrada';

  const handleSubmit = async (e) => {
    e.preventDefault();
    const val = parseFloat(amount.replace(',', '.'));
    if (!val || val <= 0) { toast('Informe um valor válido.', 'error'); return; }
    setSaving(true);
    const r = await Financial.createTransaction({
      type,
      amount: val,
      description: description.trim() || undefined,
      paymentMethod,
      category: category || 'outros',
      cashRegister: cashId,
    });
    setSaving(false);
    if (r.ok) { toast(isEntrada ? 'Entrada registrada!' : 'Saída registrada!', 'success'); onSuccess(); }
    else toast(r.data?.message || 'Erro ao registrar.', 'error');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">

        {/* Header */}
        <div className={cn('px-5 py-4 flex items-center justify-between', isEntrada ? 'bg-emerald-500' : 'bg-red-500')}>
          <div className="flex items-center gap-3">
            {isEntrada
              ? <ArrowUpRight size={20} className="text-white" />
              : <ArrowDownRight size={20} className="text-white" />
            }
            <p className="text-white font-bold text-base">{isEntrada ? 'Registrar Entrada' : 'Registrar Saída'}</p>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white transition-colors"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">

          {/* Valor */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Valor</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">R$</span>
              <input
                type="number" step="0.01" min="0.01" required
                value={amount} onChange={e => setAmount(e.target.value)}
                placeholder="0,00"
                className="w-full pl-9 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-base font-bold text-gray-900 dark:text-white placeholder-gray-300 focus:border-brand-500 dark:focus:border-brand-400 outline-none transition-colors"
              />
            </div>
          </div>

          {/* Método de pagamento */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Forma de pagamento</label>
            <div className="grid grid-cols-5 gap-2">
              {PAYMENT_METHODS.map(pm => {
                const c = PM_COLORS[pm.color];
                const selected = paymentMethod === pm.key;
                const Icon = pm.icon;
                return (
                  <button
                    key={pm.key} type="button"
                    onClick={() => setPaymentMethod(pm.key)}
                    className={cn(
                      'flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 transition-all text-center',
                      selected ? `${c.bg} ${c.border} ${c.text}` : 'bg-gray-50 dark:bg-gray-800/40 border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 hover:border-gray-300 dark:hover:border-gray-600'
                    )}
                  >
                    <Icon size={16} className={selected ? c.icon : ''} />
                    <span className="text-[10px] font-semibold leading-none">{pm.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Categoria */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Categoria</label>
            <select
              value={category} onChange={e => setCategory(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:border-brand-500 outline-none transition-colors"
            >
              <option value="">Selecionar categoria</option>
              {cats.map(c => <option key={c} value={c} className="capitalize">{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
            </select>
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Descrição <span className="normal-case text-gray-400 font-normal">(opcional)</span></label>
            <input
              type="text" maxLength={120}
              value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Ex: Corte + barba — João"
              className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:border-brand-500 outline-none transition-colors"
            />
          </div>

          {/* Ações */}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className={cn(
                'flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-colors disabled:opacity-50',
                isEntrada ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-red-500 hover:bg-red-600'
              )}>
              {saving ? 'Salvando...' : isEntrada ? 'Registrar entrada' : 'Registrar saída'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Badge método de pagamento ─────────────────────────────────────────────────
function PmBadge({ method }) {
  const pm = PAYMENT_METHODS.find(p => p.key === method) || PAYMENT_METHODS[4];
  const c  = PM_COLORS[pm.color];
  const Icon = pm.icon;
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold', c.badge)}>
      <Icon size={10} />
      {pm.label}
    </span>
  );
}

// ── Resumo por método de pagamento ───────────────────────────────────────────
function PmSummaryBar({ txns }) {
  const byMethod = PAYMENT_METHODS.map(pm => {
    const entradas = txns.filter(t => t.type === 'entrada' && t.paymentMethod === pm.key).reduce((s, t) => s + t.amount, 0);
    const saidas   = txns.filter(t => t.type === 'saida'   && t.paymentMethod === pm.key).reduce((s, t) => s + t.amount, 0);
    return { ...pm, entradas, saidas, total: entradas - saidas };
  }).filter(pm => pm.entradas > 0 || pm.saidas > 0);

  if (byMethod.length === 0) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
      {byMethod.map(pm => {
        const c = PM_COLORS[pm.color];
        const Icon = pm.icon;
        return (
          <div key={pm.key} className={cn('rounded-xl border p-3 space-y-1', c.bg, c.border)}>
            <div className={cn('flex items-center gap-1.5 text-xs font-semibold', c.text)}>
              <Icon size={12} />{pm.label}
            </div>
            {pm.entradas > 0 && <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">+{fmt(pm.entradas)}</p>}
            {pm.saidas   > 0 && <p className="text-[11px] text-red-500 dark:text-red-400 font-medium">−{fmt(pm.saidas)}</p>}
          </div>
        );
      })}
    </div>
  );
}

// ── Página principal ─────────────────────────────────────────────────────────
export default function CashRegister() {
  const [cash,        setCash]        = useState(null);
  const [txns,        setTxns]        = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [openBal,     setOpenBal]     = useState('');
  const [closeBal,    setCloseBal]    = useState('');
  const [acting,      setActing]      = useState(false);
  const [modal,       setModal]       = useState(null); // 'entrada' | 'saida' | null
  const [showTxns,    setShowTxns]    = useState(true);
  const [closingMode, setClosingMode] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [cashR, txnR] = await Promise.all([
      Financial.getCash(),
      Financial.getTransactions({ limit: 100 }),
    ]);
    setLoading(false);
    if (cashR.ok) setCash(cashR.data.data);
    if (txnR.ok) {
      const cashId = cashR.data?.data?._id;
      const all = txnR.data.data?.transactions || [];
      setTxns(cashId ? all.filter(t => t.cashRegister === cashId || t.cashRegister?._id === cashId) : []);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleOpen = async () => {
    setActing(true);
    const r = await Financial.openCash({ openingBalance: parseFloat(openBal) || 0 });
    setActing(false);
    if (r.ok) { toast('Caixa aberto!', 'success'); setOpenBal(''); load(); }
    else toast(r.data?.message || 'Erro.', 'error');
  };

  const handleClose = async () => {
    setActing(true);
    const r = await Financial.closeCash({ closingBalance: closeBal ? parseFloat(closeBal) : undefined });
    setActing(false);
    if (r.ok) { toast('Caixa fechado!', 'success'); setCloseBal(''); setClosingMode(false); load(); }
    else toast(r.data?.message || 'Erro.', 'error');
  };

  const afterMovimentacao = () => { setModal(null); load(); };

  // ── Loading
  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── Caixa fechado
  if (!cash) {
    return (
      <div className="max-w-sm mx-auto mt-6">
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-8 text-center">
          <div className="w-14 h-14 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Wallet size={26} className="text-gray-400" />
          </div>
          <p className="text-base font-bold text-gray-900 dark:text-gray-100 mb-1">Caixa fechado</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mb-6">Abra o caixa para começar a registrar movimentações.</p>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 text-left mb-1.5 uppercase tracking-wider">Saldo inicial</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">R$</span>
                <input
                  type="number" step="0.01" min="0" value={openBal} onChange={e => setOpenBal(e.target.value)}
                  placeholder="0,00"
                  className="w-full pl-9 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:border-emerald-500 outline-none"
                />
              </div>
            </div>
            <button onClick={handleOpen} disabled={acting}
              className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              <DoorOpen size={16} /> Abrir caixa
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Totais do caixa atual
  const totalEntradas = txns.filter(t => t.type === 'entrada').reduce((s, t) => s + t.amount, 0);
  const totalSaidas   = txns.filter(t => t.type === 'saida').reduce((s, t) => s + t.amount, 0);
  const saldoAtual    = (cash.openingBalance || 0) + totalEntradas - totalSaidas;

  return (
    <>
      {/* Modal de movimentação */}
      {modal && (
        <MovimentacaoModal
          type={modal}
          cashId={String(cash._id)}
          onSuccess={afterMovimentacao}
          onClose={() => setModal(null)}
        />
      )}

      <div className="space-y-4">

        {/* ── Status + KPIs ────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">

          {/* Header caixa */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center">
                <Wallet size={18} className="text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-gray-900 dark:text-gray-100">Caixa aberto</p>
                  <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold rounded-full">ABERTO</span>
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  <Clock size={10} className="inline mr-1" />
                  {cash.openedBy?.name || '—'} · {fmtDate(cash.openedAt)} às {fmtTime(cash.openedAt)}
                </p>
              </div>
            </div>

            {/* Botão fechar */}
            <button onClick={() => setClosingMode(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
              <DoorClosed size={13} /> Fechar caixa
            </button>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 text-center">
              <p className="text-[11px] text-gray-400 dark:text-gray-500 mb-1">Abertura</p>
              <p className="text-base font-bold text-gray-700 dark:text-gray-300">{fmt(cash.openingBalance)}</p>
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-900/15 rounded-xl p-3 text-center">
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mb-1 flex items-center justify-center gap-1"><TrendingUp size={10} /> Entradas</p>
              <p className="text-base font-bold text-emerald-700 dark:text-emerald-400">{fmt(totalEntradas)}</p>
            </div>
            <div className="bg-red-50 dark:bg-red-900/15 rounded-xl p-3 text-center">
              <p className="text-[11px] text-red-500 dark:text-red-400 mb-1 flex items-center justify-center gap-1"><TrendingDown size={10} /> Saídas</p>
              <p className="text-base font-bold text-red-600 dark:text-red-400">{fmt(totalSaidas)}</p>
            </div>
            <div className={cn('rounded-xl p-3 text-center', saldoAtual >= 0 ? 'bg-brand-50 dark:bg-brand-900/20' : 'bg-red-50 dark:bg-red-900/20')}>
              <p className="text-[11px] text-gray-400 dark:text-gray-500 mb-1">Saldo atual</p>
              <p className={cn('text-base font-bold', saldoAtual >= 0 ? 'text-brand-700 dark:text-brand-400' : 'text-red-600 dark:text-red-400')}>{fmt(saldoAtual)}</p>
            </div>
          </div>

          {/* Resumo por método de pagamento */}
          {txns.length > 0 && <PmSummaryBar txns={txns} />}

          {/* Painel de fechamento */}
          {closingMode && (
            <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/15 rounded-xl border border-red-200 dark:border-red-800/40 space-y-3">
              <p className="text-sm font-semibold text-red-700 dark:text-red-400">Confirmar fechamento do caixa</p>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">R$</span>
                <input
                  type="number" step="0.01" min="0" value={closeBal} onChange={e => setCloseBal(e.target.value)}
                  placeholder={`Saldo contado (calculado: ${fmt(saldoAtual)})`}
                  className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-red-200 dark:border-red-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:border-red-500 outline-none"
                />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setClosingMode(false)}
                  className="flex-1 py-2 rounded-xl text-sm font-semibold border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-800 transition-colors">
                  Cancelar
                </button>
                <button onClick={handleClose} disabled={acting}
                  className="flex-1 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  <DoorClosed size={14} /> {acting ? 'Fechando...' : 'Confirmar fechamento'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Botões de movimentação ────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => setModal('entrada')}
            className="flex items-center justify-center gap-2 py-4 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white rounded-2xl text-sm font-bold transition-all shadow-lg shadow-emerald-200 dark:shadow-emerald-900/30">
            <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center">
              <ArrowUpRight size={16} />
            </div>
            Registrar Entrada
          </button>
          <button onClick={() => setModal('saida')}
            className="flex items-center justify-center gap-2 py-4 bg-red-500 hover:bg-red-600 active:scale-95 text-white rounded-2xl text-sm font-bold transition-all shadow-lg shadow-red-200 dark:shadow-red-900/30">
            <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center">
              <ArrowDownRight size={16} />
            </div>
            Registrar Saída
          </button>
        </div>

        {/* ── Movimentações do caixa ────────────────────────────────────── */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800">
          <button onClick={() => setShowTxns(v => !v)}
            className="w-full flex items-center justify-between px-5 py-4 text-left">
            <div className="flex items-center gap-2">
              <Receipt size={15} className="text-brand-500" />
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Movimentações do caixa</span>
              {txns.length > 0 && (
                <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-xs rounded-full">{txns.length}</span>
              )}
            </div>
            <ChevronDown size={15} className={cn('text-gray-400 transition-transform', showTxns && 'rotate-180')} />
          </button>

          {showTxns && (
            <>
              {txns.length === 0 ? (
                <div className="px-5 pb-6 text-center">
                  <p className="text-sm text-gray-400 dark:text-gray-500">Nenhuma movimentação ainda.</p>
                  <p className="text-xs text-gray-300 dark:text-gray-600 mt-1">Use os botões acima para registrar entradas e saídas.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50 dark:divide-gray-800/80 px-1 pb-2">
                  {txns.map((t, i) => (
                    <div key={t._id || i} className="flex items-center justify-between gap-3 px-4 py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={cn(
                          'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                          t.type === 'entrada' ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-red-100 dark:bg-red-900/30'
                        )}>
                          {t.type === 'entrada'
                            ? <ArrowUpRight size={14} className="text-emerald-600 dark:text-emerald-400" />
                            : <ArrowDownRight size={14} className="text-red-500 dark:text-red-400" />
                          }
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                            {t.description || (t.type === 'entrada' ? 'Entrada' : 'Saída')}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <PmBadge method={t.paymentMethod || 'outro'} />
                            {t.category && t.category !== 'outros' && (
                              <span className="text-[10px] text-gray-400 dark:text-gray-500 capitalize">{t.category}</span>
                            )}
                            <span className="text-[10px] text-gray-300 dark:text-gray-600">{fmtTime(t.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                      <p className={cn('text-sm font-bold shrink-0', t.type === 'entrada' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400')}>
                        {t.type === 'entrada' ? '+' : '−'}{fmt(t.amount)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

      </div>
    </>
  );
}
